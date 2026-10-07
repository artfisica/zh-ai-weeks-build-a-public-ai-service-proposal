'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function harness(options = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  let script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  script = script.replace('  load(); renderConn(); render();', '  globalThis.__app = {state,conn,validate,sourceBlock,diffBranches,renderStory,renderTree,renderDetail,mapLabelLines,doneKey,isDone,converse,applySuggestedStory,storyWithVars,answersFor,scenarioKey,adopt,keep,systemPrompt,userPrompt,followSystem,extractJSON,fetchTree,startStory,stageStory,propose,proposeAnswer,answer,derive,render,reset,undo,leaveExplore,printPlan,setLang,reconcileIds,cancelRequests,connect}; load(); renderConn(); render();');
  const elements = new Map(), events = new Map(), storage = new Map(options.storage || []);
  function element(id) { if (!elements.has(id)) elements.set(id, { innerHTML:'',textContent:'',hidden:true,style:{},className:'',clientWidth:options.width || 1060,attrs:{},classes:new Set(),listeners:{},classList:{toggle(c,v){this.owner.classes[v?'add':'delete'](c)}},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.listeners[k]=f},scrollIntoView(){},getAttribute(k){return this.attrs[k] || null} }); const e = elements.get(id); e.classList.owner = e; return e; }
  const windowEvents = new Map();
  const context = { document:{documentElement:{},body:{classList:{toggle(){}}},getElementById:element,querySelector:s=>element(s),addEventListener:(name,fn)=>{events.set(name,(events.get(name)||[]).concat([fn]))}},window:{innerWidth:options.viewport || 1440,addEventListener:(k,f)=>windowEvents.set(k,f),print:()=>{context.printed=true}},location:{protocol:'http:',hostname:'localhost'}, navigator:{language:'en'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},sessionStorage:{getItem:()=>null,setItem(){}},fetch:async()=>({ok:false,json:async()=>null}),setTimeout,clearTimeout,AbortController,MouseEvent:class {constructor(type,options){this.type=type;Object.assign(this,options)}},console,Date };
  vm.createContext(context); vm.runInContext(script,context);
  function reply(content, prov = {provider:'fixture',model:'fixture-model'}) { return {ok:true,status:200,json:async()=>({choices:[{message:{content:typeof content === 'string' ? content : JSON.stringify(content)}}],provenance:prov})}; }
  function queue(contents) { const calls=[]; context.fetch=async(url,options)=> { if(!url.endsWith('/chat'))return {ok:false,json:async()=>null};const request=JSON.parse(options.body);calls.push(request);if(!contents.length)throw new Error('Unexpected model call');const item=contents.shift();if(item instanceof Error)throw item;return reply(item);}; return calls; }
  function click(selector,dataset={}) { const target={dataset,closest:s=>s===selector?target:null};for(const f of events.get('click')||[])f({target}); }
  return {html,context,app:context.__app,element,storage,queue,reply,click,events,windowEvents};
}
module.exports = {harness};
