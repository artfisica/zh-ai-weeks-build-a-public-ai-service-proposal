'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),file=path.join(root,'index.html');
const source=fs.readFileSync(path.join(root,'lib/journey-contract.js'),'utf8').replace("'use strict';\n",'').replace('module.exports =','const Journey =');
const block='  // BEGIN GENERATED JOURNEY CONTRACT\n'+source+'\n  // END GENERATED JOURNEY CONTRACT';
const html=fs.readFileSync(file,'utf8');
const next=html.includes('// BEGIN GENERATED JOURNEY CONTRACT')?html.replace(/  \/\/ BEGIN GENERATED JOURNEY CONTRACT[\s\S]*?  \/\/ END GENERATED JOURNEY CONTRACT/,()=>block):html.replace("(function () {\n  'use strict';",()=>"(function () {\n  'use strict';\n"+block);
if(!next.includes('// BEGIN GENERATED JOURNEY CONTRACT'))throw new Error('No insertion marker');
if(process.argv.includes('--write'))fs.writeFileSync(file,next);else if(next!==html)throw new Error('Generated journey contract is stale');else console.log('Journey contract generated output passed');
