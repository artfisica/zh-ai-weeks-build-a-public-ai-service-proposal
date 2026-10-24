'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validatePacks,build}=require('../tools/catalogue');
const {harness}=require('./harness');const {map}=require('./fixtures');
const packs=()=>fs.readdirSync(path.join(__dirname,'../packs')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../packs',f))));
test('All imported notes remain explicitly unreviewed',()=>{const entries=validatePacks(packs());assert.equal(entries.length,14);assert.ok(entries.flatMap(c=>c.claims).every(c=>c.status==='draft' && c.reviewer===null && c.sourceCheckedOn===null));assert.match(build(),/CATALOG_VERSION/);});
test('Review status cannot be asserted without provenance',()=>{const p=packs();const c=p.find(p=>p.entries.some(c=>c.claims.length)).entries.find(c=>c.claims.length).claims[0];c.status='reviewed';assert.throws(()=>validatePacks(p),/reviewer/);});
test('Duplicate ids and unsafe source URLs are rejected',()=>{const p=packs();p[0].entries.push({...p[0].entries[0]});assert.throws(()=>validatePacks(p),/duplicate/);const q=packs();q[0].entries[0].url='javascript:alert(1)';assert.throws(()=>validatePacks(q),/HTTPS/);});
test('Geneva-only generation excludes and rejects Vaud and Nyon catalogue ids',async()=>{const h=harness(),a=h.app;a.conn.status='ok';a.conn.proxyUrl='https://fixture.invalid';a.conn.prov={provider:'fixture',model:'fixture'};const raw=map();raw.variables=[];raw.branches[0].steps[0].sources=[{id:'nyon-cdh',claim:'c1'}];const calls=h.queue([raw]);await a.startStory('I live in Geneva and need help with a document.');assert.doesNotMatch(calls[0].messages[0].content,/nyon-cdh \[/);assert.doesNotMatch(calls[0].messages[0].content,/vd-address \[/);assert.equal(a.state.tree.branches[0].steps[0].sources.length,0);assert.ok(a.state.tree.catalogueVersion);a.printPlan(a.derive());assert.ok(h.element('print-plan').innerHTML.includes(a.state.tree.catalogueVersion));});
test('No recognised place offers only federal and unscoped references',async()=>{const h=harness(),a=h.app;a.conn.status='ok';a.conn.proxyUrl='https://fixture.invalid';const raw=map();raw.variables=[];h.queue([raw]);await a.startStory('I need to ask about my documents.');assert.ok(!a.state.tree.sourceSelection.includes('vd-address'));assert.ok(a.state.tree.sourceSelection.includes('ch-root'));});
test('Changed reviewed wording requires a new approval date and pack version',()=>{
  const {validateReviewedChanges}=require('../tools/catalogue');const before=packs();const pack=before.find(p=>p.entries.some(c=>c.claims.length)),note=pack.entries.find(c=>c.claims.length).claims[0];Object.assign(note,{status:'reviewed',reviewer:'Fictional test reviewer',sourceCheckedOn:'2026-01-01',reviewedOn:'2026-01-02',recheckOn:'2027-01-01'});
  const after=JSON.parse(JSON.stringify(before)),next=after.find(p=>p.id===pack.id);next.entries.find(c=>c.claims.length).claims[0].text+=' changed';assert.throws(()=>validateReviewedChanges(before,after),/new version|later review date/);
  next.version++;next.entries.find(c=>c.claims.length).claims[0].reviewedOn='2026-01-03';assert.doesNotThrow(()=>validateReviewedChanges(before,after));
});
async function generated(){const h=harness(),a=h.app;a.conn.status='ok';a.conn.proxyUrl='https://fixture.invalid';h.queue([map()]);await a.startStory(require('./fixtures').story);return h;}
test('Saved maps and PDFs keep their original notes and pack versions after a catalogue update',async()=>{
  const h=await generated(),old=h.app.state.tree.branches[0].steps[0].sources[0].record.note.text;
  const data=JSON.parse(h.storage.get('public-ai-commune.v5'));data.tree.catalogueVersion='0000000000000000';data.tree.branches.forEach(b=>b.steps.forEach(s=>s.sources.forEach(r=>{r.record.revision='0000000000000000'})));
  const loaded=harness({storage:[['public-ai-commune.v5',JSON.stringify(data)]],beforeLoad:a=>{const c=a.catalogById('ch-move');c.claims[0].text='A replacement catalogue note';c.packVersion=2;}}),a=loaded.app;
  assert.ok(a.sourceBlock(a.state.tree.branches[0].steps[0]).includes(old));assert.doesNotMatch(a.sourceBlock(a.state.tree.branches[0].steps[0]),/replacement catalogue note/);
  a.printPlan(a.derive());assert.ok(loaded.element('print-plan').innerHTML.includes(old));assert.match(loaded.element('print-plan').innerHTML,/ch v1/);assert.match(loaded.element('tree-host').innerHTML,/Compare current sources/);
});
test('Model-supplied source records are replaced by catalogue-stamped metadata',async()=>{
  const h=harness(),a=h.app;a.conn.status='ok';a.conn.proxyUrl='https://fixture.invalid';const raw=map();raw.branches[0].steps[0].sources[0].record={source:{url:'javascript:alert(1)'},note:{text:'A forged official claim'}};h.queue([raw]);await a.startStory(require('./fixtures').story);
  assert.equal(a.state.tree.branches[0].steps[0].sources[0].record.source.url,a.catalogById('ch-move').url);assert.doesNotMatch(a.sourceBlock(a.state.tree.branches[0].steps[0]),/forged official|javascript:/);
});
test('Source records cannot inject active or foreign-publisher links from local storage',async()=>{
  const h=await generated(),st=h.app.state.tree.branches[0].steps[0];for(const url of ['javascript:alert(1)','https://unrelated.invalid/phishing']){st.sources[0].record.source.url=url;assert.doesNotMatch(h.app.sourceBlock(st),/javascript:|unrelated.invalid/);}
});
test('Refreshing sources is reversible and does not send archive payloads to the model',async()=>{
  const h=await generated(),a=h.app,before=JSON.stringify(a.state.tree);const calls=h.queue([map()]);await a.refreshSources();assert.equal(JSON.stringify(a.state.tree),before);assert.equal(a.state.pending.kind,'refresh');assert.equal(calls.length,1);assert.doesNotMatch(calls[0].messages[1].content,/"record":/);a.adopt();assert.ok(a.state.tree.catalogueVersion);a.undo();assert.equal(JSON.stringify(a.state.tree),before);
});
test('Explicit canton names and common Saint-Cergue spellings retain relevant references',()=>{
  const a=harness().app;const vaud=a.selectCatalog('Je vis dans le canton de Vaud.').map(c=>c.id);assert.ok(vaud.includes('vd-address'));assert.ok(!vaud.includes('nyon-cdh'));assert.ok(!vaud.includes('stcergue-arrival'));
  assert.ok(a.selectCatalog('I live in St. Cergue').some(c=>c.id==='stcergue-arrival'));
});
test('Catalogue text and jurisdiction types cannot silently coerce into misleading notes',()=>{
  for(const mutate of [p=>{p[0].entries[0].title={unexpected:'object'}},p=>{p[0].entries[0].claims[0].text=['not text']},p=>{p[0].entries[0].jurisdiction.commune={unexpected:'object'}}]){const p=packs();mutate(p);assert.throws(()=>validatePacks(p));}
});
