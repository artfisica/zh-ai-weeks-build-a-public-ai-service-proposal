#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { harness } = require('../tests/harness');
const cases = require('../tests/evaluation-cases.json');
const J=require('../lib/journey-contract');
const {reserve}=require('./live-budget');

async function evaluate({ proxy, output, maxCalls = 24, caseIds = cases.map(c => c.id), fetchImpl = fetch }) {
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > 40 || !Array.isArray(caseIds) || !caseIds.length || new Set(caseIds).size !== caseIds.length || caseIds.some(id => !cases.some(c => c.id === id))) throw new Error('Invalid call cap or case selection');
  const parsed = new URL(proxy);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)))) throw new Error('Use HTTPS or loopback HTTP, without credentials, query or fragment');
  const selected = cases.filter(c => caseIds.includes(c.id));
  const report = { schemaVersion:2, startedAt:new Date().toISOString(), mode:'live-model', proxyOrigin:parsed.origin,
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
        reserve(process.env.EVAL_TOTAL_BUDGET_FILE,'case-'+scenario.id);
        report.calls++; save();
      }
      const response = await fetchImpl(url, {...options,headers:{...options.headers,Origin:origin}});
      if (url.endsWith('/chat')) {
        const text = await response.clone().text(), limited = text.slice(0,65536);
        let body; try { body = JSON.parse(limited); } catch (_) { body = limited; }
        raw.push({call:report.calls,at:new Date().toISOString(),status:response.status,body,truncated:text.length > limited.length});
      }
      return response;
    };
    await a.setLang(scenario.language);
    const began = Date.now();
    await a.startStory(scenario.story);
    let dependenciesResolve=false,dependencyError=null;
    try{if(a.state.tree){J.dependencies(a.state.tree,a.state.vars,a.state.answers);dependenciesResolve=true;}}catch(e){dependencyError=e.message;}
    const editableFacts=a.state.vars.map(f=>({id:f.id,type:f.type || null,label:f.label,value:f.value,literal:J.literal(scenario.story,f.span || f.value)}));
    let comparison={attempted:false,successful:false};
    if(scenario.id===1 && a.state.tree && report.calls<maxCalls){
      const before=JSON.stringify(a.state.tree),destination=a.state.vars.find(f=>f.id==='destination');
      if(destination){comparison.attempted=true;const at=Date.now();await a.propose(destination.id,'Gland');comparison={attempted:true,successful:!!a.state.pending && a.state.pending.vars.some(f=>f.id===destination.id&&f.value==='Gland')&&JSON.stringify(a.state.tree)===before,milliseconds:Date.now()-at,error:a.state.error || null,changedActions:a.state.pending?a.diffBranches(a.state.tree.branches,a.state.pending.tree.branches).flatMap(b=>b.cmp.filter(c=>c.kind!=='same').map(c=>({id:c.id,kind:c.kind}))):[],proposedTree:a.state.pending && a.state.pending.tree};a.keep();}
    }
    const expectedNeeds=J.expectedNeeds(scenario.story,a.state.vars),renderedNeeds=a.state.tree?(a.state.tree.branches || []).map(b=>b.need || null):[];
    report.cases.push({id:scenario.id,story:scenario.story,language:scenario.language,inspect:scenario.inspect,
      failureToWatch:scenario.failureToWatch,milliseconds:Date.now()-began,
      technicalStatus:a.state.tree && !a.state.tree.incomplete ? 'complete' : a.state.tree ? 'incomplete' : 'failed',
      error:a.state.error || null,editableFacts,factsEditable:editableFacts.length>0&&editableFacts.every(f=>f.literal),dependenciesResolve,dependencyError,branchCoverage:{expected:expectedNeeds,rendered:renderedNeeds,missing:expectedNeeds.filter(n=>!renderedNeeds.includes(n))},comparison,sourceCorrectness:'human inspection pending',tree:a.state.tree,rawResponses:raw,humanReview:'pending'});
    save();
    if (report.calls >= maxCalls) break;
  }
  report.finishedAt = new Date().toISOString();
  report.selectionComplete = report.cases.length === selected.length && report.cases.every(c => c.technicalStatus === 'complete' && c.factsEditable && c.dependenciesResolve && !c.branchCoverage.missing.length && (!c.comparison.attempted || c.comparison.successful));
  report.completeSet = report.cases.length === cases.length;
  save(); return report;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (flag,fallback) => {const at=args.indexOf(flag);return at < 0 ? fallback : args[at+1];};
  if (args.includes('--list')) console.log(cases.map(c => c.id + '. ' + c.story).join('\n'));
  else {
    const proxy=get('--proxy',process.env.EVAL_PROXY_URL),output=get('--output',null),maxCalls=Number(get('--max-calls','24'));
    const ids=String(get('--cases',cases.map(c => c.id).join(',')) || '').split(',').map(Number);
    if (!proxy || !output) {console.error('Usage: node tools/evaluate.js --proxy URL --output FILE [--max-calls 24] [--cases 1,2] | --list');process.exitCode=1;}
    else evaluate({proxy,output,maxCalls,caseIds:ids}).then(report => {
      console.log(report.blocked ? 'Blocked: ' + report.blocked.reason : report.cases.length + ' cases recorded; ' + report.calls + ' model calls; human review pending.');
      if (!report.selectionComplete) process.exitCode=1;
    }).catch(error => {console.error(error.message);process.exitCode=1;});
  }
}
module.exports = { evaluate };
