// State and interaction regressions. No dependencies, no API key or network.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness}=require('./harness');
const {story,map,withAnswer,clone,step,extended}=require('./fixtures');
let checks=0;
const test=async(name,fn)=>{try{await fn();checks++;console.log('✓ '+name)}catch(e){process.exitCode=1;console.error('FAILED '+name+'\n'+e.stack)}};
function saved(h,raw=map(),text=story){const a=h.app;Object.assign(a.state,{story:text,tree:a.validate(clone(raw),text),vars:clone(raw.variables),answers:{},qtexts:{},questionDefs:{},trees:{},history:[],done:[],turns:[],loading:'',mode:'situation',pending:null,prevTree:null,note:null});a.conn.status='ok';a.conn.proxyUrl='https://fixture.invalid';a.conn.prov={provider:'fixture',model:'fixture-model'};a.render();return a;}
(async()=>{
 await test('Unknown URLs and claims are discarded; draft provenance stays visible',()=>{const h=harness();const raw=map();raw.branches[0].steps[0].sources.push({id:'invented',claim:'invented'});const t=h.app.validate(raw,story);assert.equal(t.branches[0].steps[0].sources.length,1);assert.match(h.app.sourceBlock(t.branches[0].steps[0]),/Unreviewed/);assert.match(h.app.sourceBlock(t.branches[0].steps[0]),/review pending/);assert.match(h.app.sourceBlock(t.branches[0].steps[0]),/Draft · Confederation/);});
 await test('A quoted Spain span cannot justify an invented Swiss nationality or a stray letter C',()=>{const h=harness();const raw=map();raw.variables.push({id:'nationality',value:'Swiss',span:'Spain',label:'Nationality',alternatives:['Spanish']},{id:'inferred_permit',value:'C',span:'C',label:'Permit'});const t=h.app.validate(raw,'I arrive from Spain to Saint-Cergue.');assert.ok(!t.variables.some(v=>v.value==='Swiss'||v.value==='C'));assert.ok(t.questions.some(q=>q.inferred));});
 await test('Diff keeps exact shared steps and draws changed, added and removed steps',()=>{const h=harness(),a=saved(h);const next=a.validate(map('Gland'),story.replace('Saint-Cergue','Gland'));next.branches[0].steps.push(step('new','New step','Ask another office',null));next.branches=next.branches.filter(b=>b.id!=='transport');const diff=a.diffBranches(a.state.tree.branches,next.branches);assert.equal(diff[0].cmp.find(c=>c.id==='departure').kind,'same');assert.equal(diff[0].cmp.find(c=>c.id==='arrival').kind,'changed');assert.ok(diff[0].cmp.some(c=>c.kind==='added'));assert.ok(diff.some(r=>r.removed));});
 await test('Exact unchanged titles and references repair changed IDs without semantic guesses',()=>{const h=harness(),a=saved(h);const next=a.validate(map('Gland'),story.replace('Saint-Cergue','Gland'));next.branches[0].id='registration_renamed';next.branches[0].steps[0].id='renamed_departure';a.reconcileIds(next,a.state.tree);assert.equal(next.branches[0].id,'registration');assert.equal(next.branches[0].steps[0].id,'departure');});
 await test('Duplicate IDs cannot select or mark two unrelated steps',()=>{const h=harness();const raw=map();raw.branches[1].steps[0].id='arrival';raw.branches[2].id='school';const tree=h.app.validate(raw,story);const ids=tree.branches.flatMap(b=>b.steps.map(s=>s.id));assert.equal(new Set(ids).size,ids.length);assert.equal(new Set(tree.branches.map(b=>b.id)).size,tree.branches.length);});
 await test('Desktop labels wrap within the map; questions no longer expand its width',()=>{const h=harness(),a=saved(h);const raw=map();raw.branches[0].name='Importing a car from France to Switzerland';raw.branches[0].steps=Array.from({length:4},(_,i)=>step('car_'+i,'Pay import duties and VAT','Import action '+i,null));raw.questions=Array.from({length:6},(_,i)=>({id:'q_'+i,text:'A question with several words?',type:'text',why:'Context'}));a.state.tree=a.validate(raw,story);a.render();const html=h.element('tree-host').innerHTML;assert.match(html,/aria-label="Importing a car from France to Switzerland"/);assert.match(html,/map-viewport/);assert.match(html,/question-links/);assert.doesNotMatch(html,/min-width:1320px/);assert.ok(a.mapLabelLines('Pay import duties and VAT',18,2).length===2);assert.doesNotMatch(h.html,/\.tree svg\{[^}]*overflow:visible/);assert.doesNotMatch(h.html,/addEventListener\('mouseover'/);});
 await test('Mobile becomes a vertical tree with one selectable path, not a scaled desktop canvas',()=>{const h=harness({viewport:390,width:360}),a=saved(h);assert.match(h.element('tree-host').innerHTML,/mobile-map/);assert.match(h.element('tree-host').innerHTML,/lane-tabs/);assert.match(h.element('tree-host').innerHTML,/viewBox="0 0 360 /);h.click('[data-lane-select]',{laneSelect:'transport'});assert.match(h.element('tree-host').innerHTML,/aria-label="Transport"/);assert.doesNotMatch(h.element('tree-host').innerHTML,/style="width:.*px;max-width:none"/);});
 await test('Nyon-only links are withheld on a Gland arrival and the reason is visible',()=>{const h=harness(),raw=map('Gland');raw.branches[0].steps[1].sources=[{id:'nyon-cdh',claim:'c1'}];const tree=h.app.validate(raw,story.replace('Saint-Cergue','Gland'));const st=tree.branches[0].steps[1];assert.equal(st.sources.length,0);assert.equal(st.sourceGaps.length,1);assert.match(h.app.sourceBlock(st),/Reference withheld/);assert.match(h.app.sourceBlock(st),/nyon/);});
 await test('Vaud-only links are withheld for a named Geneva step; federal moving links remain',()=>{const h=harness(),raw=map('Geneva');raw.branches[0].steps[1].sources=[{id:'vd-address',claim:'c1'},{id:'ch-move',claim:'c1'}];const tree=h.app.validate(raw,story.replace('Saint-Cergue','Geneva'));assert.equal(tree.branches[0].steps[1].sources.length,1);assert.equal(tree.branches[0].steps[1].sources[0].id,'ch-move');assert.equal(tree.branches[0].steps[0].sources[0].id,'ch-move');});
 await test('An exact returned catalogue note becomes c1; a model paraphrase cannot become verified evidence',()=>{const h=harness(),raw=map();raw.branches[0].steps[0].sources=[{id:'ch-move',claim:'For a move between communes, announce departure to the old commune and arrival to the new one.'}];assert.equal(h.app.validate(raw,story).branches[0].steps[0].sources[0].claim,'c1');raw.branches[0].steps[0].sources[0].claim='You must move in five days';assert.equal(h.app.validate(raw,story).branches[0].steps[0].sources[0].claim,null);});
 await test('An altered action cannot inherit completion from an unchanged ID',()=>{const h=harness(),a=saved(h);a.state.done=[a.doneKey('departure')];a.state.tree.branches[0].steps[0].title='A new action with the same id';assert.equal(a.isDone('departure'),false);});
 await test('Legacy saved maps receive the source-scope guard on reload',()=>{const h=harness(),raw=map('Gland');raw.branches[0].steps[1].sources=[{id:'nyon-cdh',claim:'c1'}];const saved={story:story.replace('Saint-Cergue','Gland'),vars:raw.variables,tree:raw,done:[],answers:{}};const loaded=harness({storage:[['public-ai-commune.v5',JSON.stringify(saved)]]}).app;assert.equal(loaded.state.tree.branches[0].steps[1].sources.length,0);assert.equal(loaded.state.tree.branches[0].steps[1].sourceGaps.length,1);});

 await test('Start over during the initial health check does not break an otherwise healthy connection',async()=>{const h=harness(),a=h.app;a.conn.proxyUrl='https://fixture.invalid';let resolve,signal;h.context.fetch=async(url,opt)=>new Promise(r=>{resolve=r;signal=opt.signal});const connection=a.connect();await Promise.resolve();a.reset();assert.equal(signal.aborted,false);resolve({ok:true,status:200,json:async()=>({ready:true,provider:'fixture',model:'fixture-model',maxTokens:3500})});await connection;assert.equal(a.conn.status,'ok');assert.equal(a.state.story,'');});

 await test('Keyboard activation works on an SVG node even when it has no click() method',()=>{const h=harness(),a=saved(h);let prevented=false;const target={dataset:{sel:'0|arrival|0'},closest:s=>s==='[data-sel]'?target:null,dispatchEvent:event=>{assert.equal(event.bubbles,true);for(const f of h.events.get('click'))f({target})}};for(const f of h.events.get('keydown'))f({key:'Enter',target,preventDefault:()=>{prevented=true}});assert.equal(prevented,true);assert.equal(a.state.sel.id,'arrival');assert.match(h.element('detail').innerHTML,/Saint-Cergue/);});
 await test('Rendering the story cannot mutate the accepted model map or its shared variable objects',()=>{const h=harness(),a=saved(h);a.state.vars=a.state.tree.variables;const before=JSON.stringify(a.state.tree);a.render();assert.equal(JSON.stringify(a.state.tree),before);});
 await test('Simultaneous edits cannot cascade into each other or replace substrings',()=>{
   const a=harness().app;
   const original=[{id:'a',value:'Nyon'},{id:'b',value:'Gland'}],next=[{id:'a',value:'Gland'},{id:'b',value:'Geneva'}];
   assert.equal(a.storyWithVars('Nyon to Gland',next,original),'Gland to Geneva');
   assert.equal(a.storyWithVars('I visit Nyonnais and Nyon',next,original),'I visit Nyonnais and Gland');
 });
 await test('Unknown completion dependencies conservatively include the full situation',()=>{
   const h=harness(),a=saved(h);a.state.tree.branches[0].steps[0].depends_on=['unknown'];const key=a.doneKey('departure');a.state.vars[0].value='Lausanne';assert.notEqual(a.doneKey('departure'),key);
 });
 await test('Corrupt stored maps recover without a half-loaded situation',()=>{
   for(const value of ['{',JSON.stringify({story:'A corrupt story',vars:[],tree:{branches:[null],questions:[],variables:[]}}),JSON.stringify({story,vars:map().variables,tree:map(),turns:[null]})]){
     const h=harness({storage:[['public-ai-commune.v5',value]]});assert.equal(h.app.state.story,'');assert.equal(h.app.state.tree,null);assert.match(h.element('tree-host').innerHTML,/saved map could not be loaded/);assert.equal(h.element('clear-btn').hidden,false);
   }
 });
 await test('A storage quota failure is visible while the in-memory map remains usable',async()=>{
   const h=harness(),a=saved(h);h.context.localStorage.setItem=()=>{throw new Error('quota')};h.click('[data-done]',{done:'departure'});assert.ok(a.state.tree);assert.match(h.element('story').innerHTML,/browser cannot save/);assert.equal(a.isDone('departure'),true);
 });
 await test('Device persistence can be disabled before generation and re-enabled without changing the map',async()=>{
   const h=harness(),a=saved(h);h.click('[data-done]',{done:'departure'});assert.ok(h.storage.has('public-ai-commune.v5'));
   h.click('[data-action]',{action:'toggle-remember'});assert.equal(h.storage.has('public-ai-commune.v5'),false);assert.equal(h.storage.get('public-ai-commune.v5.remember'),'no');
   h.click('[data-done]',{done:'arrival'});assert.equal(h.storage.has('public-ai-commune.v5'),false);assert.ok(a.state.tree);
   h.click('[data-action]',{action:'toggle-remember'});assert.ok(h.storage.has('public-ai-commune.v5'));
 });
 await test('A stale health check cannot overwrite a newer proxy connection',async()=>{
   const h=harness(),a=h.app;const pending=[];h.context.fetch=async()=>new Promise(resolve=>pending.push(resolve));a.conn.proxyUrl='https://old.invalid';const old=a.connect();a.conn.proxyUrl='https://new.invalid';const current=a.connect();
   const health=provider=>({ok:true,status:200,json:async()=>({ready:true,maxTokens:3500,provider,model:'fixture'})});pending[1](health('new'));await current;pending[0](health('old'));await old;assert.equal(a.conn.prov.provider,'new');assert.equal(a.conn.proxyUrl,'https://new.invalid');
 });
 await test('Resizing an empty map cannot replace the initial situation form while typing',async()=>{
   const h=harness();h.element('tree-host').innerHTML='a form containing an unsent draft';h.windowEvents.get('resize')();await new Promise(resolve=>setTimeout(resolve,180));assert.equal(h.element('tree-host').innerHTML,'a form containing an unsent draft');
 });
 await test('Reserved and duplicate model input ids are rejected for bounded repair',()=>{
   const a=harness().app,bad=map();bad.questions[0].id='constructor';assert.throws(()=>a.validate(bad,story),/Reserved/);
   const repeated=map();repeated.variables.push(clone(repeated.variables[0]));assert.throws(()=>a.validate(repeated,story),/Duplicate/);
 });
 await test('Scenario and completion identities cannot inherit a short-hash collision',()=>{
   const h=harness(),a=saved(h);assert.notEqual(a.scenarioKey([{id:'x',value:'Aa'}]),a.scenarioKey([{id:'x',value:'BB'}]));
   a.state.tree.branches[0].steps[0].depends_on=['x'];a.state.vars=[{id:'x',value:'Aa'}];const key=a.doneKey('departure');a.state.vars=[{id:'x',value:'BB'}];assert.notEqual(a.doneKey('departure'),key);
 });
 await test('Legacy v2 completion marks migrate with their accepted map and Undo snapshots',()=>{
   const h=harness(),a=saved(h),key=a.doneKey('departure'),context=key.slice(key.indexOf('|v4|')+4);let hash=0;for(const c of context)hash=(hash*31+c.charCodeAt(0))|0;
   const old='departure|v2|'+(hash>>>0).toString(36),snapshot={story,vars:a.state.vars,tree:a.state.tree,answers:{},done:[old]};const loaded=harness({storage:[['public-ai-commune.v5',JSON.stringify({...snapshot,history:[snapshot]})]]}).app;assert.equal(loaded.isDone('departure'),true);loaded.undo();assert.equal(loaded.isDone('departure'),true);
 });
 await test('Corrupt archived question definitions recover before any state is installed',()=>{
   const raw=map();raw.questions=[];const d={story,vars:raw.variables,tree:raw,answers:{nationality:'EU/EFTA'},qtexts:{nationality:'Nationality?'},questionDefs:{nationality:{id:'nationality',text:'Nationality?',type:'choice',why:'A question',options:'invalid'}}};
   const h=harness({storage:[['public-ai-commune.v5',JSON.stringify(d)]]});assert.equal(h.app.state.tree,null);assert.match(h.element('tree-host').innerHTML,/could not be loaded/);
 });
 await test('Disabling saving in another tab prevents this tab from recreating the stored plan',()=>{
   const h=harness(),a=saved(h);h.storage.set('public-ai-commune.v5.remember','no');h.storage.delete('public-ai-commune.v5');h.click('[data-done]',{done:'departure'});assert.equal(h.storage.has('public-ai-commune.v5'),false);assert.match(h.element('story').innerHTML,/Save on this device: off/);
 });
 await test('A plan deleted in another tab cannot be silently recreated by a stale open plan',()=>{
   const h=harness(),a=saved(h);h.windowEvents.get('storage')({key:'public-ai-commune.v5',newValue:null});h.click('[data-done]',{done:'departure'});assert.equal(h.storage.has('public-ai-commune.v5'),false);assert.match(h.element('story').innerHTML,/Save on this device: off/);
 });
 await test('A model choice question with no usable options still accepts a free-text answer',()=>{
   const h=harness(),raw=map();raw.questions[0].options=[''];const a=saved(h,raw);h.click('[data-q]',{q:'nationality'});assert.match(h.element('detail').innerHTML,/data-answer-form="nationality"/);
 });
 await test('A branch-first split response cannot silently lose its following questions and facts',()=>{
   const a=harness().app;
   assert.throws(()=>a.extractJSON(JSON.stringify({branches:map().branches})+',\n'+JSON.stringify({questions:map().questions,variables:map().variables})),/multiple JSON objects/);
 });
 console.log('\n'+checks+' regression checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
