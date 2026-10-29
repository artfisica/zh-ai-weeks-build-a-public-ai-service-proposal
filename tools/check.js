#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
function run(args){const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status || 1);}
run(['tests/check-inline.js']);run(['tools/contracts.js']);run(['tests/smoke.js']);
if(fs.existsSync(path.join(root,'tools/catalogue.js')))run(['tools/catalogue.js']);
const suites=['proxy','budget','startup','catalogue','evaluate','contracts','journey-contract'].map(name=>'tests/'+name+'.js').filter(file=>fs.existsSync(path.join(root,file)));
run(['--test',...suites]);
