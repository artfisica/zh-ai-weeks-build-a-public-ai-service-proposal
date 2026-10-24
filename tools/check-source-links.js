#!/usr/bin/env node
'use strict';
// Availability evidence only: never changes review status or asserts source support.
const fs=require('node:fs'),path=require('node:path');
const {validatePacks}=require('./catalogue');
const entries=validatePacks(fs.readdirSync(path.join(__dirname,'../packs')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../packs',f),'utf8'))));
async function main(){
  const output=process.argv[2];if(!output)throw new Error('Usage: node tools/check-source-links.js OUTPUT.json');
  const report={checkedAt:new Date().toISOString(),scope:'HTTP availability only; content and source/step matches unreviewed',sources:[]};
  let next=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<entries.length){const c=entries[next++];let result;
      try{const r=await fetch(c.url,{method:'HEAD',signal:AbortSignal.timeout(10000)});result={id:c.id,url:c.url,status:r.status,finalUrl:r.url,redirected:r.redirected};}
      catch(e){result={id:c.id,url:c.url,status:null,error:e.name==='TimeoutError'?'timeout':'network failure'};}
      report.sources.push(result);
    }
  }));
  report.sources.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  const needsCheck=report.sources.filter(r=>r.status!==200||r.redirected);console.log(entries.length+' URLs checked; '+needsCheck.length+' need inspection. Content review remains pending.');
  if(needsCheck.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
