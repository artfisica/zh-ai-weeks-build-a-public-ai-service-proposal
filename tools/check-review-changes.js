'use strict';
const {execFileSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const {validateReviewedChanges}=require('./catalogue');
const base=process.env.CATALOGUE_BASE;
if(!base||!(/^[a-f0-9]{40}$/.test(base)))throw new Error('CATALOGUE_BASE must be a commit SHA');
const files=execFileSync('git',['ls-tree','-r','--name-only',base,'--','packs'],{encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.json'));
const before=files.map(f=>JSON.parse(execFileSync('git',['show',base+':'+f],{encoding:'utf8'})));
const after=fs.readdirSync(path.join(__dirname,'../packs')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../packs',f),'utf8')));
validateReviewedChanges(before,after);console.log('Reviewed-note change checks passed');
