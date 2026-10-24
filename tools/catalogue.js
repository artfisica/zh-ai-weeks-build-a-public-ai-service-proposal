'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname,'..');
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0,10) === value;
function validatePacks(packs) {
  const ids=new Set(), packIds=new Set();
  for(const pack of packs){
    if(pack.schemaVersion!==1 || typeof pack.id!=='string' || packIds.has(pack.id) || !Number.isSafeInteger(pack.version) || pack.version<1 || !Array.isArray(pack.entries))throw new Error('Invalid or duplicate pack');
    packIds.add(pack.id);
    for(const c of pack.entries){
      if(!c || !/^[a-z][a-z0-9-]+$/.test(c.id) || ids.has(c.id))throw new Error('Invalid or duplicate source id');ids.add(c.id);
      if(!['confederation','canton','commune','other'].includes(c.level) || typeof c.exact!=='boolean' || !c.jurisdiction || (c.jurisdiction.canton!==null && !/^[A-Z]{2}$/.test(c.jurisdiction.canton)))throw new Error('Invalid jurisdiction: '+c.id);
      if(c.level==='commune' && (!c.jurisdiction.commune || !c.jurisdiction.canton))throw new Error('Municipal scope required: '+c.id);
      const url=new URL(c.url);if(url.protocol!=='https:' || url.username || url.password)throw new Error('HTTPS source URL required: '+c.id);
      if(!c.title || !c.covers || !Array.isArray(c.claims))throw new Error('Missing source fields: '+c.id);
      const notes=new Set();for(const k of c.claims){
        if(!k || !/^c\d+$/.test(k.id) || notes.has(k.id) || !k.text || !k.fr)throw new Error('Invalid note: '+c.id);notes.add(k.id);
        if(!['regulation','practice','community'].includes(k.kind) || !['draft','reviewed','disputed','retired'].includes(k.status))throw new Error('Invalid note status: '+c.id);
        if(k.status==='reviewed' && (!k.reviewer || !date(k.reviewedOn) || !date(k.sourceCheckedOn) || !date(k.recheckOn) || k.sourceCheckedOn>k.reviewedOn || k.recheckOn<k.reviewedOn))throw new Error('Reviewed note requires reviewer and coherent check/review/recheck dates: '+c.id);
        if(k.kind==='community' && !k.attribution)throw new Error('Community note requires attribution: '+c.id);
        if(k.status==='disputed' && !k.dispute)throw new Error('Disputed note requires conflict: '+c.id);
      }
    }
  }
  return packs.flatMap(p=>p.entries.map(c=>({...c,pack:p.id,packVersion:p.version})));
}
function validateReviewedChanges(before, after) {
  validatePacks(after);
  for (const p of before) { const next=after.find(n=>n.id===p.id); if(next && JSON.stringify(p.entries)!==JSON.stringify(next.entries) && next.version<=p.version) throw new Error('Changed pack requires a new version: '+p.id); }
  const notes = new Map(after.flatMap(p => p.entries.flatMap(c => c.claims.map(k => [c.id+'/'+k.id, {pack:p,entry:c,note:k}]))));
  for (const p of before) for (const c of p.entries) for (const k of c.claims) {
    if (k.status !== 'reviewed') continue;
    const next = notes.get(c.id+'/'+k.id);
    if (!next) throw new Error('Retire reviewed notes explicitly instead of deleting: '+c.id+'/'+k.id);
    const changed = JSON.stringify([c.url,c.level,c.jurisdiction,c.exact,c.covers,k.text,k.fr,k.kind]) !== JSON.stringify([next.entry.url,next.entry.level,next.entry.jurisdiction,next.entry.exact,next.entry.covers,next.note.text,next.note.fr,next.note.kind]);
    if (changed && next.note.status === 'reviewed' && (!(next.pack.version>p.version) || !(next.note.reviewedOn>k.reviewedOn))) throw new Error('Changed reviewed wording requires a new pack version and later review date: '+c.id+'/'+k.id);
  }
}
function build() {
  const packs=fs.readdirSync(path.join(root,'packs')).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(fs.readFileSync(path.join(root,'packs',f),'utf8')));
  const entries=validatePacks(packs), revision=crypto.createHash('sha256').update(JSON.stringify(packs)).digest('hex').slice(0,16);
  return '  // BEGIN GENERATED CATALOGUE\n  // Edit packs/*.json and run node tools/catalogue.js --write.\n  const CATALOG_VERSION = '+JSON.stringify(revision)+';\n  const CATALOG = '+JSON.stringify(entries,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\n  // END GENERATED CATALOGUE';
}
if(require.main===module){
  const file=path.join(root,'index.html'),html=fs.readFileSync(file,'utf8'),block=build();
  const next=html.replace(/  \/\/ BEGIN GENERATED CATALOGUE[\s\S]*?  \/\/ END GENERATED CATALOGUE/,block);
  if(!html.includes('// BEGIN GENERATED CATALOGUE'))throw new Error('Catalogue markers missing');
  if(process.argv.includes('--write'))fs.writeFileSync(file,next);
  else if(html!==next){console.error('Generated catalogue is stale; run node tools/catalogue.js --write');process.exitCode=1;}
  else console.log('Catalogue schema and generated output passed');
}
module.exports={validatePacks,validateReviewedChanges,build};
