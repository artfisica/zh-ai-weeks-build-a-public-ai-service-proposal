#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { harness } = require('../tests/harness');
const cases = require('../tests/evaluation-cases.json');

async function evaluate({ proxy, output, maxCalls = 25, caseIds = cases.map(c => c.id), fetchImpl = fetch }) {
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || !Array.isArray(caseIds) || !caseIds.length || new Set(caseIds).size !== caseIds.length || caseIds.some(id => !cases.some(c => c.id === id))) throw new Error('Invalid call cap or case selection');
  const parsed = new URL(proxy);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)))) throw new Error('Use HTTPS or loopback HTTP, without credentials, query or fragment');
  const selected = cases.filter(c => caseIds.includes(c.id));
  const report = { schemaVersion:1, startedAt:new Date().toISOString(), mode:'live-model', proxyOrigin:parsed.origin,
    releaseApproved:false, humanReview:'pending', maxCalls, calls:0, requestedCases:caseIds, selectionComplete:false, completeSet:false, cases:[] };
  const save = () => {
    fs.writeFileSync(output + '.tmp', JSON.stringify(report,null,2) + '\n', {mode:0o600});
    fs.renameSync(output + '.tmp', output);
  };
  save(); // Detect an unusable output path before spending model calls.
  const origin = process.env.EVAL_ORIGIN || 'https://artfisica.github.io';
  let health;
  try {
    const response = await fetchImpl(proxy.replace(/\/$/,'') + '/health', {headers:{Origin:origin}, signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw Object.assign(new Error('Proxy health returned HTTP ' + response.status), {status:response.status});
    health = await response.json();
    if (!health || !health.ready) throw new Error('Proxy is not ready');
    if (health.tokenRequired && !process.env.EVAL_DEMO_TOKEN) throw new Error('Set EVAL_DEMO_TOKEN for this proxy');
  } catch (error) {
    report.blocked = {stage:'health', status:error.status || null, reason:error.message};
    report.finishedAt = new Date().toISOString(); save(); return report;
  }
  report.provider = health.provider; report.model = health.model;
  for (const scenario of selected) {
    const h = harness(), a = h.app, raw = [];
    Object.assign(a.conn, {proxyUrl:proxy,status:'ok',prov:{provider:health.provider,model:health.model},
      tokenRequired:!!health.tokenRequired,demoToken:process.env.EVAL_DEMO_TOKEN || ''});
    h.context.fetch = async (url, options = {}) => {
      if (url.endsWith('/chat')) {
        if (report.calls >= maxCalls) throw new Error('Evaluation call cap reached');
        report.calls++; save();
      }
      const response = await fetchImpl(url, {...options,headers:{...options.headers,Origin:origin}});
      if (url.endsWith('/chat')) {
        const text = await response.clone().text(), limited = text.slice(0,65536);
        let body; try { body = JSON.parse(limited); } catch (_) { body = limited; }
        raw.push({status:response.status,body,truncated:text.length > limited.length});
      }
      return response;
    };
    await a.setLang(scenario.language);
    const began = Date.now();
    await a.startStory(scenario.story);
    report.cases.push({id:scenario.id,story:scenario.story,language:scenario.language,inspect:scenario.inspect,
      failureToWatch:scenario.failureToWatch,milliseconds:Date.now()-began,
      technicalStatus:a.state.tree && !a.state.tree.incomplete ? 'complete' : a.state.tree ? 'incomplete' : 'failed',
      error:a.state.error || null,tree:a.state.tree,rawResponses:raw,humanReview:'pending'});
    save();
    if (report.calls >= maxCalls) break;
  }
  report.finishedAt = new Date().toISOString();
  report.selectionComplete = report.cases.length === selected.length && report.cases.every(c => c.technicalStatus === 'complete');
  report.completeSet = report.cases.length === cases.length;
  save(); return report;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (flag,fallback) => {const at=args.indexOf(flag);return at < 0 ? fallback : args[at+1];};
  if (args.includes('--list')) console.log(cases.map(c => c.id + '. ' + c.story).join('\n'));
  else {
    const proxy=get('--proxy',process.env.EVAL_PROXY_URL),output=get('--output',null),maxCalls=Number(get('--max-calls','25'));
    const ids=String(get('--cases',cases.map(c => c.id).join(',')) || '').split(',').map(Number);
    if (!proxy || !output) {console.error('Usage: node tools/evaluate.js --proxy URL --output FILE [--max-calls 25] [--cases 1,2] | --list');process.exitCode=1;}
    else evaluate({proxy,output,maxCalls,caseIds:ids}).then(report => {
      console.log(report.blocked ? 'Blocked: ' + report.blocked.reason : report.cases.length + ' cases recorded; ' + report.calls + ' model calls; human review pending.');
      if (!report.selectionComplete) process.exitCode=1;
    }).catch(error => {console.error(error.message);process.exitCode=1;});
  }
}
module.exports = { evaluate };
