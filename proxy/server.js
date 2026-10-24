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
const { BudgetStore } = require('./budget');

const cfgPath = path.join(__dirname, 'proxy.config.json');
const cfg = Object.assign({
  provider: 'swisscom', upstreamBase: '', upstreamModel: '', allowedOrigins: [],
  dailyBudget: 120, hourlyPerCaller: 40, maxTokens: 3500, upstreamTimeoutMs: 55000, maxConcurrent: 4, maxUpstreamBytes: 1048576, authHeader: 'Authorization', authPrefix: 'Bearer ', extraHeaders: {}
}, fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {});
// Codespaces secrets override the committed config, so a fresh Codespace needs no file edits.
if (process.env.UPSTREAM_BASE) cfg.upstreamBase = process.env.UPSTREAM_BASE;
if (process.env.UPSTREAM_MODEL) cfg.upstreamModel = process.env.UPSTREAM_MODEL;
if (process.env.UPSTREAM_PROVIDER) cfg.provider = process.env.UPSTREAM_PROVIDER;
if (process.env.UPSTREAM_PROCESSING) cfg.processing = process.env.UPSTREAM_PROCESSING;
if (process.env.AUTH_HEADER) cfg.authHeader = process.env.AUTH_HEADER;
if (process.env.AUTH_PREFIX !== undefined) cfg.authPrefix = process.env.AUTH_PREFIX;
const KEY = process.env.APERTUS_API_KEY || '';
const TOKENS = String(process.env.DEMO_TOKEN || '').split(',').map(s => s.trim()).filter(Boolean);
const PORT = parseInt(process.env.PORT || '8787', 10);
const providerName = p => p === 'swisscom' ? 'Swisscom' : p === 'publicai' ? 'Public AI' : (p || 'fournisseur');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// ---- budget (one Codespace / one process; fail closed if persistence fails) ----
const budgetPath = path.join(process.env.BUDGET_DIR || __dirname, '.budget.json');
for (const field of ['dailyBudget', 'hourlyPerCaller', 'maxTokens', 'upstreamTimeoutMs', 'maxConcurrent', 'maxUpstreamBytes']) {
  if (!Number.isSafeInteger(cfg[field]) || cfg[field] < 1) throw new Error('Invalid positive integer configuration: ' + field);
}
if (!Array.isArray(cfg.allowedOrigins) || cfg.allowedOrigins.some(origin => { try { return new URL(origin).origin !== origin; } catch (_) { return true; } })) throw new Error('Invalid allowedOrigins');
if (cfg.upstreamBase) {
  const upstream = new URL(cfg.upstreamBase);
  if (upstream.username || upstream.password || upstream.search || upstream.hash || (upstream.protocol !== 'https:' && !(upstream.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(upstream.hostname)))) throw new Error('Upstream must use HTTPS (HTTP allowed only on loopback)');
}
const budget = new BudgetStore(budgetPath, cfg.dailyBudget, cfg.hourlyPerCaller);
const inFlight = new Set();
let stopping = false;

function readiness() {
  const missing = [];
  if (budget.error) missing.push('budget storage unavailable; operator repair required');
  if (stopping) missing.push('proxy stopping');
  if (!KEY) missing.push('APERTUS_API_KEY (Codespaces secret)');
  if (!cfg.upstreamBase) missing.push('UPSTREAM_BASE (Codespaces secret) or upstreamBase in proxy.config.json');
  if (!cfg.upstreamModel) missing.push('UPSTREAM_MODEL (Codespaces secret) or upstreamModel in proxy.config.json');
  if (!cfg.allowedOrigins.length) missing.push('allowedOrigins (proxy.config.json)');
  return { ready: missing.length === 0, missing };
}

// Reject malformed or oversized bodies before charging the shared model budget.
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    const cleanup = () => { req.removeListener('data', onData); req.removeListener('end', onEnd); req.removeListener('error', onError); req.removeListener('aborted', onAborted); };
    const fail = (status, message) => { cleanup(); reject(Object.assign(new Error(message), { status })); };
    const onData = chunk => {
      size += chunk.length;
      if (size > 120000) { fail(413, 'request too large'); req.resume(); }
      else chunks.push(chunk);
    };
    const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks).toString('utf8')); };
    const onError = () => fail(400, 'request read failed');
    const onAborted = () => fail(400, 'request aborted');
    req.on('data', onData); req.on('end', onEnd); req.on('error', onError); req.on('aborted', onAborted);
  });
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
  const send = (status, obj) => { if (res.destroyed || res.writableEnded) return; res.writeHead(status, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors)); res.end(JSON.stringify(obj)); };
  try {
    const url = new URL(req.url, 'http://x');

    if (req.method === 'OPTIONS') { if (!originOk) return send(403, { error: 'origin not allowed' }); res.writeHead(204, cors); return res.end(); }
    if (origin && !originOk) return send(403, { error: 'origin not allowed' });

    const rd = readiness();
    if (url.pathname === '/health' && req.method === 'GET') {
      return send(rd.ready ? 200 : 503, { ok: rd.ready, ready: rd.ready, instance: process.pid, missing: rd.missing, provider: providerName(cfg.provider), model: cfg.upstreamModel || null, maxTokens: cfg.maxTokens, processing: cfg.processing || '', tokenRequired: TOKENS.length > 0, budget: budget.peek() });
    }

    if (url.pathname === '/chat' && req.method === 'POST') {
      if (!rd.ready) return send(503, { error: 'proxy not ready', missing: rd.missing });
      const token = req.headers['x-demo-token'] || '';
      if (TOKENS.length) { if (!TOKENS.includes(token)) return send(401, { error: 'demo token required' }); }
      else if (!originOk) return send(403, { error: 'allowed browser origin required' });
      const ip = ((process.env.TRUST_PROXY === 'true' && req.headers['x-forwarded-for']) || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
      const caller = TOKENS.length ? 't:' + sha(token) : 'ip:' + sha(ip);
      const raw = await readBody(req);
      let body; try { body = JSON.parse(raw); } catch (e) { return send(400, { error: 'invalid JSON' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'messages required' });
      const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : null;
      if (!messages || !messages.length || !messages.every(m => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))) return send(400, { error: 'messages required' });
      if (messages.reduce((n, m) => n + m.content.length, 0) > 40000) return send(413, { error: 'request too large' });
      if (res.destroyed) return;
      if (inFlight.size >= cfg.maxConcurrent) return send(429, { error: 'proxy busy; try again shortly' });
      const verdict = budget.take(caller);
      if (!verdict.ok) return send(verdict.reason === 'storage' ? 503 : 429, { error: verdict.reason === 'daily' ? 'daily demo budget exhausted' : verdict.reason === 'storage' ? 'budget unavailable' : 'hourly limit reached for this caller', budget: verdict });

      const maxTokens = Math.min(Math.max(1, parseInt(body.max_tokens, 10) || cfg.maxTokens), cfg.maxTokens);
      const headers = Object.assign({ 'Content-Type': 'application/json', 'User-Agent': 'arbre-de-parcours-proxy/1.1' }, cfg.extraHeaders || {});
      headers[cfg.authHeader || 'Authorization'] = (cfg.authPrefix === undefined ? 'Bearer ' : cfg.authPrefix) + KEY;
      let up, text;
      const controller = new AbortController();
      inFlight.add(controller);
      const timeout = Number.isFinite(cfg.upstreamTimeoutMs) && cfg.upstreamTimeoutMs > 0 ? cfg.upstreamTimeoutMs : 55000;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
      const onClose = () => { if (!res.writableEnded) controller.abort(); };
      res.once('close', onClose);
      try {
        up = await fetch(cfg.upstreamBase.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers, signal: controller.signal, body: JSON.stringify({ model: cfg.upstreamModel, messages: messages.map(({ role, content }) => ({ role, content })), max_tokens: maxTokens, temperature: typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : 0.2 }) });
        const chunks = []; let bytes = 0;
        for await (const chunk of up.body) {
          bytes += chunk.length;
          if (bytes > cfg.maxUpstreamBytes) { controller.abort(); throw new Error('upstream response too large'); }
          chunks.push(chunk);
        }
        text = Buffer.concat(chunks).toString('utf8');
      } catch (e) { return send(timedOut ? 504 : 502, { error: timedOut ? 'upstream timed out' : 'upstream unreachable' }); }
      finally { clearTimeout(timer); res.removeListener('close', onClose); inFlight.delete(controller); }
      if (!up.ok) return send(up.status === 429 ? 429 : 502, { error: 'upstream ' + up.status });
      let data; try { data = JSON.parse(text); } catch (e) { return send(502, { error: 'upstream returned non-JSON' }); }
      if (!data || !Array.isArray(data.choices) || !data.choices.length || data.choices.some(c => !c || !c.message || typeof c.message.content !== 'string')) return send(502, { error: 'upstream returned invalid response' });
      data.provenance = { provider: providerName(cfg.provider), model: data.model || cfg.upstreamModel, requestedModel: cfg.upstreamModel };
      data.budget = { used: verdict.used, limit: verdict.limit, remaining: verdict.remaining };
      return send(200, { choices: data.choices.map(c => ({ message: { role: 'assistant', content: c.message.content } })), provenance: data.provenance, budget: data.budget });
    }
    send(404, { error: 'not found' });
  } catch (e) { send(e.status || 500, { error: e.status ? e.message : 'proxy request failed' }); }
});

server.listen(PORT, () => {
  const rd = readiness();
  console.log('Apertus proxy listening on port ' + server.address().port + ' — provider ' + providerName(cfg.provider) + ', model ' + (cfg.upstreamModel || '(missing)'));
  console.log(rd.ready ? 'ready: yes' : 'ready: NO — missing ' + rd.missing.join(', '));
  console.log('tokens configured: ' + TOKENS.length + ' · daily budget ' + cfg.dailyBudget + ' · allowed origins: ' + (cfg.allowedOrigins.join(', ') || '(none)'));
});

function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const controller of inFlight) controller.abort();
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
