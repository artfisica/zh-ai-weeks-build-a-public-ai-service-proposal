#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {harness}=require('../tests/harness');
const cases=require('../tests/evaluation-cases.json');
async function evaluate({proxy,output,maxCalls=25,caseIds=cases.map(c=>c.id)}){
  const parsed=new URL(proxy);if(parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('Use a proxy URL without credentials, query or fragment');
  const report={schemaVersion:1,startedAt:new Date().toISOString(),mode:'live-model',proxyOrigin:parsed.origin,releaseApproved:false,humanReview:'pending',maxCalls,calls:0,cases:[]};
  const origin=process.env.EVAL_ORIGIN||'https://artfisica.github.io';
  const headers={Origin:origin};
  const healthResponse=await fetch(proxy.replace(/\/$/,'')+'/health',{headers,signal:AbortSignal.timeout(12000)});
  const health=await healthResponse.json();if(!healthResponse.ok||!health.ready)throw new Error('Evaluation blocked: proxy not ready (HTTP '+healthResponse.status+')');
  if(health.tokenRequired&&!process.env.EVAL_DEMO_TOKEN)throw new Error('Evaluation blocked: set EVAL_DEMO_TOKEN');
  report.provider=health.provider;report.model=health.model;
  for(const scenario of cases.filter(c=>caseIds.includes(c.id))){
    const h=harness(),a=h.app,raw=[];a.conn.proxyUrl=proxy;a.conn.status='ok';a.conn.prov={provider:health.provider,model:health.model};a.conn.tokenRequired=!!health.tokenRequired;a.conn.demoToken=process.env.EVAL_DEMO_TOKEN||'';
    h.context.fetch=async(url,options={})=>{
      if(url.endsWith('/chat')){if(report.calls>=maxCalls)throw new Error('Evaluation call cap reached');report.calls++;}
      const response=await fetch(url,{...options,headers:{...options.headers,Origin:origin}});
      if(url.endsWith('/chat'))raw.push({status:response.status,body:await response.clone().json()});
      return response;
    };
    // Set UI language before a map exists; this does not invoke the provider.
    await a.setLang(scenario.language);
    const began=Date.now();await a.startStory(scenario.story);
    report.cases.push({id:scenario.id,story:scenario.story,language:scenario.language,inspect:scenario.inspect,failureToWatch:scenario.failureToWatch,milliseconds:Date.now()-began,technicalStatus:a.state.tree&&!a.state.tree.incomplete?'complete':a.state.tree?'incomplete':'failed',error:a.state.error||null,tree:a.state.tree,rawResponses:raw,humanReview:'pending'});
    // Save after every fictional case so an interrupted run retains evidence.
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    if(report.calls>=maxCalls)break;
  }
  report.finishedAt=new Date().toISOString();report.completeSet=report.cases.length===cases.length;
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');return report;
}
if(require.main===module){
  const args=process.argv.slice(2),get=(flag,fallback)=>{const at=args.indexOf(flag);return at<0?fallback:args[at+1];};
  if(args.includes('--list'))console.log(cases.map(c=>c.id+'. '+c.story).join('\n'));
  else{
    const proxy=get('--proxy',process.env.EVAL_PROXY_URL),output=get('--output',null),maxCalls=Number(get('--max-calls','25'));
    const ids=get('--cases',cases.map(c=>c.id).join(',')).split(',').map(Number);
    if(!proxy||!output||!Number.isSafeInteger(maxCalls)||maxCalls<1||ids.some(id=>!cases.some(c=>c.id===id))){console.error('Usage: node tools/evaluate.js --proxy URL --output FILE [--max-calls 25] [--cases 1,2] | --list');process.exitCode=1;}
    else evaluate({proxy,output,maxCalls,caseIds:ids}).then(report=>{console.log(report.cases.length+' cases recorded; '+report.calls+' model calls; human review pending.');if(!report.completeSet||report.cases.some(c=>c.technicalStatus!=='complete'))process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});
  }
}
module.exports={evaluate};
