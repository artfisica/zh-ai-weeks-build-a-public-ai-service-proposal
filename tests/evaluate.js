'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {evaluate}=require('../tools/evaluate'),{map}=require('./fixtures');
async function fixtureBudget(dir){const file=path.join(dir,'fixture-budget.json');await fs.writeFile(file,JSON.stringify({maxCalls:40,calls:[]}));return file;}
test('Evaluation saves fictional raw evidence and never asserts human approval', {timeout:15000},async t=>{
  let calls=0;const server=http.createServer(async(req,res)=>{
    for await(const _ of req){}
    res.setHeader('Content-Type','application/json');
    if(req.url==='/health')return res.end(JSON.stringify({ready:true,provider:'test',model:'fixture'}));
    calls++;res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({variables:[],questions:[],branches:[{id:'volunteering',name:'Volunteering',need:'volunteering',steps:[{id:'join',short:'Ask how to join',title:'Ask the fire service how to join',why:'Find suitable options',depends_on:['origin'],sources:[],authority:'other',confirm_with:null}]}]})}}],provenance:{provider:'test',model:'fixture'}}));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const dir=await fs.mkdtemp(path.join(os.tmpdir(),'commune-eval-'));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});});
  const output=path.join(dir,'report.json');const report=await evaluate({budgetFile:await fixtureBudget(dir),proxy:'http://127.0.0.1:'+server.address().port,output,maxCalls:1,caseIds:[7]});
  assert.equal(calls,1);assert.equal(report.calls,1);assert.match(report.buildSha256,/^[a-f0-9]{64}$/);assert.match(report.contractSha256,/^[a-f0-9]{64}$/);assert.equal(report.releaseApproved,false);assert.equal(report.humanReview,'pending');assert.equal(report.cases[0].id,7);assert.equal(report.cases[0].rawResponses.length,1);assert.equal(report.completeSet,false);assert.equal(report.selectionComplete,true);
  assert.equal(JSON.parse(await fs.readFile(output,'utf8')).releaseApproved,false);
});
test('The versioned evaluation set contains twelve fictional scenarios with independent fact and need expectations',()=>{const cases=require('./evaluation-cases.json');assert.equal(cases.length,12);assert.equal(new Set(cases.map(c=>c.id )).size,12);assert.equal(cases.filter(c=>c.language==='fr').length,3);assert.ok(cases.every(c=>c.inspect&&c.failureToWatch&&Array.isArray(c.expectedFacts)&&c.expectedFacts.length&&Array.isArray(c.expectedNeeds)&&c.expectedNeeds.length));});
test('Unavailable Codespaces endpoints produce an explicit blocked report without spending calls',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'commune-eval-blocked-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const output=path.join(dir,'report.json');const report=await evaluate({budgetFile:await fixtureBudget(dir),proxy:'https://fixture.invalid',output,fetchImpl:async()=>new Response('',{status:404})});
  assert.equal(report.calls,0);assert.equal(report.blocked.status,404);assert.equal(report.selectionComplete,false);assert.match(report.blocked.reason,/HTTP 404/);assert.equal(JSON.parse(await fs.readFile(output,'utf8')).blocked.stage,'health');
});
test('Malformed provider responses are retained as failure evidence and the hard call cap is respected',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'commune-eval-failure-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let calls=0;
  const report=await evaluate({budgetFile:await fixtureBudget(dir),proxy:'https://fixture.invalid',output:path.join(dir,'report.json'),caseIds:[1,2],maxCalls:1,fetchImpl:async url=>{
    if(url.endsWith('/health'))return Response.json({ready:true,provider:'fixture',model:'fixture'});calls++;return new Response('<html>upstream unavailable</html>',{status:502});
  }});assert.equal(calls,1);assert.equal(report.cases.length,1);assert.equal(report.selectionComplete,false);assert.equal(report.cases[0].rawResponses[0].status,502);assert.match(report.cases[0].rawResponses[0].body,/upstream unavailable/);
});
test('Invalid evaluation selections and insecure proxy URLs fail before any network call',async()=>{
  const options={proxy:'https://fixture.invalid',output:'/unused',fetchImpl:()=>{throw new Error('unexpected network')}};
  await assert.rejects(evaluate({...options,maxCalls:0}),/Invalid/);await assert.rejects(evaluate({...options,caseIds:[1,1]}),/Invalid/);await assert.rejects(evaluate({...options,proxy:'http://public.invalid'}),/HTTPS/);
});
test('An explicitly smaller live allowance is enforced without changing the exhausted ledger',async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'commune-eval-allowance-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const file=path.join(dir,'allowance.json');await fs.writeFile(file,JSON.stringify({maxCalls:1,calls:[]}));const {reserve}=require('../tools/live-budget');reserve(file,'one allowed attempt');assert.throws(()=>reserve(file,'not allowed'),/cap reached \(1\)/);assert.equal(JSON.parse(await fs.readFile(file,'utf8')).calls.length,1);assert.equal(JSON.parse(await fs.readFile(file,'utf8')).maxCalls,1);});
test('An authorised total allowance increase retains the original forty attempts',async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'commune-eval-extended-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const file=path.join(dir,'allowance.json'),calls=Array.from({length:40},(_,i)=>({stage:'original-'+i}));await fs.writeFile(file,JSON.stringify({maxCalls:100,calls}));require('../tools/live-budget').reserve(file,'extended-attempt');const saved=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(saved.calls.length,41);assert.deepEqual(saved.calls.slice(0,40),calls);});
test('A missing or exhausted shared ledger fails before any health or model request',async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'commune-required-ledger-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let calls=0;const options={proxy:'https://fixture.invalid',output:path.join(dir,'report.json'),fetchImpl:async()=>{calls++;return new Response('',{status:404});}};await assert.rejects(evaluate({...options,budgetFile:null}),/ledger/i);const ledger=path.join(dir,'ledger.json');await fs.writeFile(ledger,JSON.stringify({maxCalls:1,calls:[{stage:'spent'}]}));await assert.rejects(evaluate({...options,budgetFile:ledger}),/cap reached/i);await assert.rejects(evaluate({...options,budgetFile:path.join(dir,'missing.json')}),/ENOENT/);assert.equal(calls,0);});
