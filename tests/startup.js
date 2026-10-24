'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const exec=promisify(execFile);
async function fixture(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'commune startup ')),root=path.join(__dirname,'..');
  await fs.mkdir(path.join(dir,'proxy'));
  for(const file of ['server.js','budget.js','start.sh'])await fs.copyFile(path.join(root,'proxy',file),path.join(dir,'proxy',file));
  await fs.writeFile(path.join(dir,'proxy/proxy.config.json'),JSON.stringify({allowedOrigins:['http://localhost:8000']}));
  await fs.writeFile(path.join(dir,'proxy-url.json'),JSON.stringify({url:'https://old.invalid'}));
  const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const env={PATH:process.env.PATH,TMPDIR:dir,PORT:String(port),APERTUS_API_KEY:'fixture',UPSTREAM_BASE:'https://example.invalid/v1',UPSTREAM_MODEL:'fixture'};
  const owned=new Set();
  const run=async(extra={})=>{try{return await exec('bash',[path.join(dir,'proxy/start.sh')],{cwd:dir,env:{...env,...extra},timeout:20000});}finally{
    try{const pid=Number((await fs.readFile(path.join(dir,'proxy/.proxy.pid'),'utf8')).trim());if(pid!==process.pid)owned.add(pid);}catch(_){}
  }};
  t.after(async()=>{for(const pid of owned){try{process.kill(pid,'SIGTERM');}catch(_){}}await fs.rm(dir,{recursive:true,force:true});});
  const health=async()=>{const r=await fetch(`http://127.0.0.1:${port}/health`);return r.json();};
  return{dir,port,run,health,env};
}
test('Startup and restart in a checkout with spaces preserve budget and identify the right process',{timeout:30000},async t=>{
  const f=await fixture(t);await f.run();const first=await f.health();assert.equal(first.ready,true);
  const budget=path.join(f.dir,'proxy/.budget.json');const savedDay=new Date().toISOString().slice(0,10);await fs.writeFile(budget,JSON.stringify({day:savedDay,used:7,callers:{}}));
  await f.run();const second=await f.health();assert.notEqual(second.instance,first.instance);assert.equal(second.budget.used,second.budget.day===savedDay?7:0);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.dir,'proxy-url.json'),'utf8')).url,'https://old.invalid');
});
test('A foreign PID is never stopped and the startup lock is released',{timeout:30000},async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.dir,'proxy/.proxy.pid'),String(process.pid));
  await assert.rejects(f.run(),/refusing to stop/);assert.doesNotThrow(()=>process.kill(process.pid,0));await assert.rejects(fs.access(path.join(f.dir,'proxy/.start-lock')));
});
test('An occupied port cannot masquerade as this proxy readiness',{timeout:30000},async t=>{
  const f=await fixture(t),other=http.createServer((req,res)=>res.end(JSON.stringify({ready:true,instance:process.pid})));
  await new Promise(r=>other.listen(f.port,'127.0.0.1',r));t.after(()=>new Promise(r=>other.close(r)));
  await assert.rejects(f.run());assert.equal((await f.health()).instance,process.pid);
});
test('Codespace hook explicitly preserves automatic public-port and discovery setup',{timeout:30000},async t=>{
  const f=await fixture(t),bin=path.join(f.dir,'bin'),log=path.join(f.dir,'commands');await fs.mkdir(bin);
  const fake='#!/usr/bin/env node\nconst fs=require("fs"),args=process.argv.slice(2);fs.appendFileSync(process.env.COMMAND_LOG,require("path").basename(process.argv[1])+" "+args.join(" ")+"\\n");if(args[0]==="diff"&&args.includes("proxy-url.json"))process.exit(1);\n';
  for(const command of ['git','gh']){await fs.writeFile(path.join(bin,command),fake);await fs.chmod(path.join(bin,command),0o755);}
  await f.run({PATH:bin+path.delimiter+process.env.PATH,COMMAND_LOG:log,PUBLISH_PROXY_URL:'1',CODESPACE_NAME:'fixture-space',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'example.invalid'});
  const commands=await fs.readFile(log,'utf8');assert.match(commands,/gh codespace ports visibility \d+:public -c fixture-space/);assert.match(commands,/--only -- proxy-url.json/);assert.match(commands,/git push/);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.dir,'proxy-url.json'),'utf8')).url,`https://fixture-space-${f.port}.example.invalid`);
  const config=JSON.parse(await fs.readFile(path.join(__dirname,'../.devcontainer/devcontainer.json'),'utf8'));assert.match(config.postStartCommand,/PUBLISH_PROXY_URL=1/);
});
