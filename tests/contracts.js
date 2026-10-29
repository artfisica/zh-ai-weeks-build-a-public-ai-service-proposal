'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const J=require('../lib/journey-contract');
const {story,map,clone}=require('./fixtures');
test('Observed personal situations expose typed, literal editable facts before map generation',()=>{
  for(const text of [story,...require('./evaluation-cases.json').filter(c=>[1,3,4,5,7].includes(c.id)).map(c=>c.story)]){
    const result=J.extract(text);assert.ok(result.facts.length,text);assert.deepEqual(J.validateFacts(result.facts,text),result.facts);
    for(const f of result.facts)assert.equal(text.slice(f.evidence.start,f.evidence.end),f.span);
  }
  const f=J.extract(story).facts;for(const id of ['origin','destination','housing','children','permit'])assert.ok(f.some(v=>v.id===id),id);
  const work=J.extract('I work in Gland but still move to Saint-Cergue.').facts;assert.equal(work.find(v=>v.id==='destination').value,'Saint-Cergue');assert.equal(work.find(v=>v.id==='workplace').value,'Gland');
  assert.ok(!J.extract('I arrive from Spain.').facts.some(f=>f.type==='citizenship'));
});
test('Extraction rejects unsupported interpretations, overlapping roles and identifier fields',()=>{
  const f=J.extract(story).facts;assert.throws(()=>J.validateFacts([{...f[0],value:'Lugano'}],story));assert.throws(()=>J.validateFacts([f[0],f[0]],story));assert.throws(()=>J.validateFacts([{...f[0],type:'permit_number'}],story));assert.deepEqual(J.extract('How does legal insurance work?').facts,[]);
});
test('One command type rejects contradictory legacy intent and invented replacements',()=>{
 const facts=J.extract(story).facts,ctx={facts,questions:[],answers:{}};
 assert.throws(()=>J.validateCommand({kind:'compare',update:'new_situation'},'What if Gland?',ctx));
 assert.throws(()=>J.validateCommand({type:'replace_fact',target:'destination',value:'Lugano'},'What if Gland?',ctx));
 assert.throws(()=>J.validateCommand({type:'replace_fact',target:'destination',value:'Gland'},'I work in Gland but still move to Saint-Cergue.',ctx));
 assert.throws(()=>J.validateCommand({type:'new_situation'},'What if Gland?',ctx));
 assert.equal(J.validateCommand({type:'replace_fact',target:'destination',value:'Gland'},'What if I choose Gland instead of Saint-Cergue?',ctx).type,'replace_fact');
 assert.throws(()=>J.validateCommand({type:'replace_fact',target:'missing',value:'Gland'},'Gland',ctx));
});
test('Input dependencies and ordered action prerequisites are separate validated graphs',()=>{
 const t=map();J.dependencies(t,t.variables,{});for(const bad of ['unknown','departure']){const n=clone(t);n.branches[0].steps[1].depends_on=[bad];assert.throws(()=>J.dependencies(n,n.variables,{}));}
 const n=clone(t);n.branches[0].steps[1].prerequisites=['departure'];J.dependencies(n,n.variables,{});n.branches[0].steps[0].prerequisites=['arrival'];assert.throws(()=>J.dependencies(n,n.variables,{}));
});
test('Revisioned operations copy accepted objects and reject stale or unauthorised writes',()=>{
 const t=map(),revision=J.revision(t,t.variables,{}),ctx={facts:t.variables,answers:{},changedIds:['destination'],kind:'replace_fact'};
 t.branches[0].steps[0].sources[0].record={private:'archived evidence'};const before=clone(t),rev=J.revision(t,t.variables,{});
 const action={...clone(t.branches[0].steps[1]),title:'Ask about Gland arrival',sources:[]};const patch={revision:rev,operations:[{op:'replace_action',branch:'registration',target:'arrival',action}]};const next=J.applyProposal(t,patch,ctx,rev);
 assert.deepEqual(next.branches[0].steps[0],before.branches[0].steps[0]);assert.deepEqual(t,before);assert.throws(()=>J.applyProposal(t,{...patch,revision},ctx,rev));
 assert.throws(()=>J.applyProposal(t,{...patch,operations:[{op:'remove_action',branch:'registration',target:'departure'}]},ctx,rev));
 assert.throws(()=>J.applyProposal(t,{...patch,operations:[{op:'replace_action',branch:'registration',target:'arrival',action:{...action,done:true}}]},ctx,rev));
 assert.throws(()=>J.applyProposal(t,{...patch,operations:[{op:'remove_action',branch:'registration',target:'missing'}]},ctx,rev));
 const unknown=clone(t);unknown.branches[0].steps[0].depends_on=['unknown'];assert.equal(J.unaffected(unknown.branches[0].steps[0],unknown,ctx),false);
});
test('Unsupported obligations cannot leak through action, note or question text',()=>{
 const raw=map();raw.branches=[{id:'roof',name:'Roof',need:'renovation',steps:[{...raw.branches[0].steps[0],title:'Obtain mandatory approval and medical clearance',why:'You must supply documents within 14 days.',sources:[]}]}];raw.note='Your B permit guarantees approval.';raw.questions=[{id:'address',text:'What is your full street address?',why:'Find the competent office.',type:'text',options:[]}];
 const safe=J.safeMap(raw,{language:'en',catalogue:[],facts:raw.variables});assert.doesNotMatch(JSON.stringify(safe),/mandatory|medical clearance|must supply|guarantees approval|full street address|Find the competent/);assert.match(safe.branches[0].steps[0].title,/Ask|Check/);assert.ok(safe.branches[0].steps[0].sourceGaps.length);
});
test('Grounded add-fact values with empty unused targets normalize without authorising replacement',()=>{const facts=J.extract('I live in Nyon.').facts;assert.deepEqual(J.validateCommand({type:'add_fact',target:'',value:'I also work in Geneva',question:'none'},'I also work in Geneva.',{facts,questions:[],answers:{}}),{type:'add_fact'});assert.throws(()=>J.validateCommand({type:'add_fact',target:'destination',value:'Gland'},'I also work in Gland.',{facts,questions:[],answers:{}}));assert.throws(()=>J.validateCommand({type:'add_fact',target:'',value:'Lugano'},'I also work in Geneva.',{facts,questions:[],answers:{}}));});
test('A single redundant object closer at an array boundary is normalized without rewriting data',()=>{const good={revision:'r1',operations:[{op:'add_action',branch:'registration',after:null,action:{id:'work',title:'Ask about work',why:'Literal } inside a string',depends_on:['workplace'],sources:[]}}]};const bad=JSON.stringify(good).replace(/}}\]}/,'}}}]}');assert.deepEqual(J.parseEnvelope(bad),good);assert.throws(()=>J.parseEnvelope(JSON.stringify(good)+' '+JSON.stringify(good)));assert.throws(()=>J.parseEnvelope(JSON.stringify(good).replace(/}}\]}/,'}}}}]}')));});
