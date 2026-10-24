'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=process.env.APP_ROOT || path.join(__dirname,'../..');
http.createServer((req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname;
  if(!['/','/index.html','/proxy-url.json'].includes(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.json')?'application/json':'text/html');
  res.end(fs.readFileSync(path.join(root,file==='/'?'index.html':file.slice(1))));
}).listen(8137,'127.0.0.1');
