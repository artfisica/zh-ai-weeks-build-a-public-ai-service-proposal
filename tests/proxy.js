// Exercise the real HTTP proxy against a local upstream, with an isolated budget.
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

const origin = 'http://localhost:8000';
const validBody = { messages: [{ role: 'user', content: 'A fictional situation' }] };
function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
async function promptly(promise) {
  let timer;
  try {
    await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Upstream was not cancelled promptly')), 1500);
    })]);
  } finally { clearTimeout(timer); }
}
async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'commune-proxy-test-'));
  const state = { mode: 'ok', calls: [], started: deferred(), closed: deferred() };
  const upstream = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    state.calls.push({ headers: req.headers, body: JSON.parse(body) });
    res.on('close', () => state.closed.resolve());
    state.started.resolve();
    if (state.mode === 'hang') return;
    if (state.mode === 'body-hang') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{'); return; }
    if (state.mode === 'null') return res.end('null');
    if (state.mode === 'bad-json') return res.end('{');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: 'fixture reply' } }] }));
  });
  let child;
  t.after(async () => {
    if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => { upstream.once('error', reject); upstream.listen(0, '127.0.0.1', resolve); });
  const root = path.join(__dirname, '..');
  await fs.mkdir(path.join(directory, 'proxy'));
  await fs.copyFile(path.join(root, 'proxy/server.js'), path.join(directory, 'proxy/server.js'));
  await fs.copyFile(path.join(root, 'server.js'), path.join(directory, 'server.js'));
  await fs.writeFile(path.join(directory, 'proxy/proxy.config.json'), JSON.stringify({
    allowedOrigins: [origin], dailyBudget: options.dailyBudget || 30, hourlyPerCaller: 30,
    upstreamTimeoutMs: options.upstreamTimeoutMs || 1000
  }));
  // An obsolete root config must not be loaded by the compatibility entry point.
  await fs.writeFile(path.join(directory, 'proxy.config.json'), 'obsolete configuration');
  child = spawn(process.execPath, [options.rootEntry ? 'server.js' : 'proxy/server.js'], {
    cwd: directory,
    env: { PATH: process.env.PATH, PORT: '0', APERTUS_API_KEY: 'upstream-fixture-key',
      UPSTREAM_BASE: `http://127.0.0.1:${upstream.address().port}`, UPSTREAM_MODEL: 'fixture-model',
      DEMO_TOKEN: options.token || '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Proxy exited ${code}: ${stderr}`)));
    child.stdout.on('data', chunk => { output += chunk; const match = output.match(/listening on port (\d+)/); if (match) resolve(match[1]); });
  });
  const url = `http://127.0.0.1:${port}`;
  const chat = (body = validBody, headers = {}) => fetch(url + '/chat', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  const health = async () => (await fetch(url + '/health', { headers: { Origin: origin } })).json();
  return { state, url, chat, health, child };
}

test('Request validation preserves the budget and the process remains available', { timeout: 15000 }, async t => {
  const f = await fixture(t, { dailyBudget: 2 });
  for (const body of ['null', 'invalid', '[]', '42', '{}', '{"messages":[]}', '{"messages":[null]}']) {
    assert.equal((await f.chat(body)).status, 400, body);
  }
  assert.equal((await f.chat({ messages: [{ role: 'user', content: 'x'.repeat(40001) }] })).status, 413);
  assert.equal((await f.chat('x'.repeat(120001))).status, 413);
  assert.equal((await f.health()).budget.used, 0);
  assert.equal(f.state.calls.length, 0);
  assert.equal((await f.chat()).status, 200);
  assert.equal((await f.chat()).status, 200);
  assert.equal((await f.chat()).status, 429);
  assert.equal((await f.health()).budget.used, 2);
  assert.equal(f.state.calls.length, 2);
  assert.equal(f.child.exitCode, null);
});

test('Private rehearsal and the root entry point use the maintained proxy', { timeout: 15000 }, async t => {
  const f = await fixture(t, { rootEntry: true, token: 'rehearsal-fixture-token' });
  assert.equal((await f.health()).tokenRequired, true);
  assert.equal((await f.chat()).status, 401);
  assert.equal((await f.chat(validBody, { 'X-Demo-Token': 'wrong' })).status, 401);
  assert.equal((await f.health()).budget.used, 0);
  const response = await f.chat({ ...validBody, max_tokens: 99999 }, { 'X-Demo-Token': 'rehearsal-fixture-token' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).provenance.requestedModel, 'fixture-model');
  assert.equal(f.state.calls[0].body.max_tokens, 3500);
  assert.equal(f.state.calls[0].headers.authorization, 'Bearer upstream-fixture-key');
  assert.equal(f.state.calls[0].headers['x-demo-token'], undefined);
});

for (const mode of ['hang', 'body-hang']) {
  test(`Upstream deadline cancels ${mode} and leaves the proxy usable`, { timeout: 15000 }, async t => {
    const f = await fixture(t); f.state.mode = mode;
    const response = await f.chat();
    assert.equal(response.status, 504);
    assert.equal((await response.json()).error, 'upstream timed out');
    await f.state.closed.promise;
    f.state.mode = 'ok';
    assert.equal((await f.chat()).status, 200);
  });
}

test('Client disconnection cancels the in-flight upstream request', { timeout: 15000 }, async t => {
  const f = await fixture(t, { upstreamTimeoutMs: 10000 }); f.state.mode = 'hang';
  const controller = new AbortController();
  const pending = fetch(f.url + '/chat', { method: 'POST', signal: controller.signal,
    headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(validBody) });
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await f.state.started.promise;
  controller.abort();
  await rejected;
  await promptly(f.state.closed.promise);
  f.state.mode = 'ok';
  assert.equal((await f.chat()).status, 200);
});

test('Malformed upstream responses return 502 without terminating the proxy', { timeout: 15000 }, async t => {
  const f = await fixture(t);
  for (const mode of ['null', 'bad-json']) {
    f.state.mode = mode;
    assert.equal((await f.chat()).status, 502);
  }
  f.state.mode = 'ok';
  assert.equal((await f.chat()).status, 200);
});
