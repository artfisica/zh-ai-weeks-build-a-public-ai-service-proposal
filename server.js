// Arbre de parcours — Apertus proxy for GitHub Codespaces (plain Node 20, no dependencies)
//
// Runs inside a Codespace; the page on GitHub Pages calls the Codespace's public forwarded port.
// The key comes from the Codespaces secret APERTUS_API_KEY and never touches the repository or the page.
//
// The demo server:
//   - one provider, one model, pinned here;
//   - /chat is open to visitors of the public page; the origin check controls browsers,
//     while the overall budget bounds calls made by any client;
//   - per-Codespace daily budget and per-caller hourly limit, stored in .budget.json
//     so a restart of this Codespace within the same day keeps the count;
//   - max_tokens cap, message size cap;
//   - every answer carries provenance { provider, model }; GET /health never returns the key.
//
// Configuration: proxy/proxy.config.json (committed, no secrets) + environment (Codespaces secrets):
//   APERTUS_API_KEY   secret, required
//   DEMO_TOKEN        optional secret for a private rehearsal; leave unset for a public demo
//   PORT              default 8787

'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cfgPath = path.join(__dirname, 'proxy.config.json');
const cfg = Object.assign({
  provider: 'swisscom', upstreamBase: '', upstreamModel: '', allowedOrigins: [],
  dailyBudget: 120, hourlyPerCaller: 40, maxTokens: 400, authHeader: 'Authorization', authPrefix: 'Bearer ', extraHeaders: {}
}, fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {});
// Codespaces secrets override the committed config, so a fresh Codespace needs no file edits.
if (process.env.UPSTREAM_BASE) cfg.upstreamBase = process.env.UPSTREAM_BASE;
if (process.env.UPSTREAM_MODEL) cfg.upstreamModel = process.env.UPSTREAM_MODEL;
if (process.env.UPSTREAM_PROVIDER) cfg.provider = process.env.UPSTREAM_PROVIDER;
if (process.env.AUTH_HEADER) cfg.authHeader = process.env.AUTH_HEADER;
if (process.env.AUTH_PREFIX !== undefined) cfg.authPrefix = process.env.AUTH_PREFIX;
const KEY = process.env.APERTUS_API_KEY || '';
const TOKENS = String(process.env.DEMO_TOKEN || '').split(',').map(s => s.trim()).filter(Boolean);
const PORT = parseInt(process.env.PORT || '8787', 10);
const providerName = p => p === 'swisscom' ? 'Swisscom' : p === 'publicai' ? 'Public AI' : (p || 'fournisseur');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// ---- budget (one Codespace / one process; fail closed if persistence fails) ----
const budgetPath = path.join(__dirname, '.budget.json');
let budget = { day: '', used: 0, callers: {} };
try { budget = Object.assign(budget, JSON.parse(fs.readFileSync(budgetPath, 'utf8'))); } catch (e) { /* fresh */ }
function today() { return new Date().toISOString().slice(0, 10); }
function hourKey() { return new Date().toISOString().slice(0, 13); }
function roll() { const d = today(); if (budget.day !== d) budget = { day: d, used: 0, callers: {} }; const h = hourKey(); for (const k of Object.keys(budget.callers)) if (!k.endsWith(':' + h)) delete budget.callers[k]; }
function peek() { roll(); return { day: budget.day, used: budget.used, limit: cfg.dailyBudget, remaining: Math.max(0, cfg.dailyBudget - budget.used) }; }
function take(caller) {
  roll();
  const ck = caller + ':' + hourKey(), cUsed = budget.callers[ck] || 0;
  if (budget.used >= cfg.dailyBudget) return { ok: false, reason: 'daily', used: budget.used, limit: cfg.dailyBudget, remaining: 0 };
  if (cUsed >= cfg.hourlyPerCaller) return { ok: false, reason: 'caller', used: budget.used, limit: cfg.dailyBudget, remaining: cfg.dailyBudget - budget.used };
  budget.used++; budget.callers[ck] = cUsed + 1;
  try { fs.writeFileSync(budgetPath, JSON.stringify(budget)); }
  catch (e) { return { ok: false, reason: 'storage', used: budget.used, limit: cfg.dailyBudget, remaining: 0 }; }
  return { ok: true, used: budget.used, limit: cfg.dailyBudget, remaining: cfg.dailyBudget - budget.used };
}

function readiness() {
  const missing = [];
  if (!KEY) missing.push('APERTUS_API_KEY (Codespaces secret)');
  if (!cfg.upstreamBase) missing.push('UPSTREAM_BASE (Codespaces secret) or upstreamBase in proxy.config.json');
  if (!cfg.upstreamModel) missing.push('UPSTREAM_MODEL (Codespaces secret) or upstreamModel in proxy.config.json');
  if (!cfg.allowedOrigins.length) missing.push('allowedOrigins (proxy.config.json)');
  return { ready: missing.length === 0, missing };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const originOk = !!origin && cfg.allowedOrigins.includes(origin);
  const cors = {
    'Access-Control-Allow-Origin': originOk ? origin : (cfg.allowedOrigins[0] || 'null'),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Demo-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  const send = (status, obj) => { res.writeHead(status, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors)); res.end(JSON.stringify(obj)); };
  const url = new URL(req.url, 'http://x');

  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (origin && !originOk) return send(403, { error: 'origin not allowed' });

  const rd = readiness();
  if (url.pathname === '/health' && req.method === 'GET') {
    return send(rd.ready ? 200 : 503, { ok: rd.ready, ready: rd.ready, missing: rd.missing, provider: providerName(cfg.provider), model: cfg.upstreamModel || null, tokenRequired: TOKENS.length > 0, budget: peek() });
  }

  if (url.pathname === '/chat' && req.method === 'POST') {
    if (!rd.ready) return send(503, { error: 'proxy not ready', missing: rd.missing });
    const token = req.headers['x-demo-token'] || '';
    if (TOKENS.length) { if (!TOKENS.includes(token)) return send(401, { error: 'demo token required' }); }
    else if (!originOk) return send(403, { error: 'allowed browser origin required' });
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const caller = TOKENS.length ? 't:' + sha(token) : 'ip:' + sha(ip);
    const verdict = take(caller);
    if (!verdict.ok) return send(verdict.reason === 'storage' ? 503 : 429, { error: verdict.reason === 'daily' ? 'daily demo budget exhausted' : verdict.reason === 'storage' ? 'budget unavailable' : 'hourly limit reached for this caller', budget: verdict });

    let raw = ''; req.on('data', c => { raw += c; if (raw.length > 120000) req.destroy(); });
    req.on('end', async () => {
      let body; try { body = JSON.parse(raw); } catch (e) { return send(400, { error: 'invalid JSON' }); }
      const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : null;
      if (!messages || !messages.every(m => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))) return send(400, { error: 'messages required' });
      if (messages.reduce((n, m) => n + m.content.length, 0) > 40000) return send(413, { error: 'request too large' });
      const maxTokens = Math.min(Math.max(1, parseInt(body.max_tokens, 10) || cfg.maxTokens), cfg.maxTokens);
      const headers = Object.assign({ 'Content-Type': 'application/json', 'User-Agent': 'arbre-de-parcours-proxy/1.1' }, cfg.extraHeaders || {});
      headers[cfg.authHeader || 'Authorization'] = (cfg.authPrefix === undefined ? 'Bearer ' : cfg.authPrefix) + KEY;
      let up, text;
      try {
        up = await fetch(cfg.upstreamBase.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers, body: JSON.stringify({ model: cfg.upstreamModel, messages, max_tokens: maxTokens, temperature: typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : 0.2 }) });
        text = await up.text();
      } catch (e) { return send(502, { error: 'upstream unreachable' }); }
      if (!up.ok) return send(up.status === 429 ? 429 : 502, { error: 'upstream ' + up.status, detail: text.slice(0, 300) });
      let data; try { data = JSON.parse(text); } catch (e) { return send(502, { error: 'upstream returned non-JSON' }); }
      data.provenance = { provider: providerName(cfg.provider), model: data.model || cfg.upstreamModel, requestedModel: cfg.upstreamModel };
      data.budget = { used: verdict.used, limit: verdict.limit, remaining: verdict.remaining };
      return send(200, data);
    });
    return;
  }
  send(404, { error: 'not found' });
});

server.listen(PORT, () => {
  const rd = readiness();
  console.log('Apertus proxy listening on port ' + PORT + ' — provider ' + providerName(cfg.provider) + ', model ' + (cfg.upstreamModel || '(missing)'));
  console.log(rd.ready ? 'ready: yes' : 'ready: NO — missing ' + rd.missing.join(', '));
  console.log('tokens configured: ' + TOKENS.length + ' · daily budget ' + cfg.dailyBudget + ' · allowed origins: ' + (cfg.allowedOrigins.join(', ') || '(none)'));
});
