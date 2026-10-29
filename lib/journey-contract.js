'use strict';
// Pure contracts shared by the static app and Node tests. No network or DOM.
module.exports = (() => {
  const copy=x=>JSON.parse(JSON.stringify(x));
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o || {},k);
  const fail=message=>{throw new Error(message);};
  const id=x=>typeof x==='string' && /^[a-z][a-z0-9_]{0,63}$/.test(x) && !own(Object.prototype,x);
  const roles={current_commune:['origin','Current commune','Commune actuelle'],destination_commune:['destination','Destination commune','Commune de destination'],workplace:['workplace','Workplace','Lieu de travail'],housing_location:['home_location','Home location','Localisation du logement'],current_country:['origin_country','Country coming from','Pays de provenance'],housing_status:['housing','Housing','Logement'],children:['children','Children','Enfants'],permit:['permit','Permit','Permis'],citizenship:['nationality','Citizenship','Nationalité'],household:['household','Household','Ménage'],transport:['transport','Transport','Transport']};
  const literal=(text,value)=>{const v=String(value || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return !!v && new RegExp('(?<![\\p{L}\\p{N}])'+v+'(?![\\p{L}\\p{N}])','iu').test(text);};
  function validateFacts(input,text,language='en') {
    if(!Array.isArray(input)||input.length>16)fail('Return at most sixteen typed facts');
    const seen=new Set();return input.map(f=>{
      if(!f||!roles[f.type]||seen.has(f.type)||typeof f.value!=='string'||!f.value.trim()||typeof f.span!=='string')fail('Invalid, duplicate or untyped personal fact');
      let start=f.evidence && f.evidence.start,end=f.evidence && f.evidence.end;
      if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>text.length||text.slice(start,end)!==f.span){
        const at=f.span?text.indexOf(f.span):-1;if(at<0||text.indexOf(f.span,at+1)!==-1)fail('Personal fact has no unambiguous literal evidence');start=at;end=at+f.span.length;
      }
      if(!literal(f.span,f.value))fail('Personal fact has no literal evidence');
      if(f.confidence && !['explicit','confirm'].includes(f.confidence))fail('Unknown fact confidence');
      seen.add(f.type);return {id:roles[f.type][0],type:f.type,label:roles[f.type][language==='fr'?2:1],value:f.value.trim(),span:f.span,evidence:{start,end,quote:f.span},alternatives:[],confidence:f.confidence || 'explicit'};
    });
  }
  function extract(text,language='en') {
    const facts=[];
    const add=(type,value,at)=>{if(!value||facts.some(f=>f.type===type))return;facts.push({type,value,span:value,evidence:{start:at,end:at+value.length},confidence:'explicit'});};
    const place="([\\p{Lu}][\\p{L}’'\\-]*(?:[ \\u00a0]+(?:[\\p{Lu}][\\p{L}’'\\-]*|sur|sous|de|du|la|les)){0,3})";
    const match=(type,prefix)=>{const m=new RegExp(prefix+place,'u').exec(text);if(m){const value=m[1].trim().replace(/\s+(?:I|We|Je|My)$/,'');add(type,value,m.index+m[0].indexOf(m[1]));}};
    match('current_commune',"(?:[Nn]ous habitons à |[Nn]ous vivons à |[Nn]otre famille habite à |[Ww]e live in )");
    match('current_commune',"(?:\\bI (?:live|reside) in |\\bje vis (?:seule? )?(?:à|a) |\\bJe vis (?:seule? )?(?:à|a) |[Jj]['’]habite (?:à|a) |[Jj]e réside à )");
    match('destination_commune',"(?:\\b(?:move|moving|relocate|relocating) to |[Dd]éménag(?:er|e|ement) (?:à|vers) |m['’]installer à )");
    match('housing_location',"(?:\\b(?:chalet|house|home|flat) in )");
    match('workplace',"(?:\\bwork(?:ing)? in |[Tt]ravaille(?:r)? (?:à|a) )");
    match('current_country',"(?:\\b(?:coming|arriving|arrive|come) from |[Jj]e viens (?:de |d['’])|[Jj]['’]arrive (?:de |d['’]))");
    const patterns={housing_status:/\b(?:own my home|own a (?:chalet|house|flat|home)|rent a (?:flat|house|room)|We will rent|we will rent|I rent|je suis propriétaire|Je suis propriétaire|je suis locataire|Je suis locataire)\b/iu,children:/\b(?:my child is (?:\d+|[a-z]+)|My child is (?:\d+|[a-z]+)|(?:an? |my )?(?:\d+|[a-z]+)-year-old child|mon enfant a \d+ ans|with my wife and baby|with my (?:child|children)|avec (?:mon|mes) enfants?)\b/iu,permit:/\b(?:[BCLFGNS] permit|permit [BCLFGNS]|permis [BCLFGNS])\b/iu,household:/\b(?:je vis seule|Je vis seule|I live alone|my wife and baby|My \d+-year-old mother)\b/u,transport:/\b(?:sans voiture|without a car|no car)\b/iu};
    for(const [type,re] of Object.entries(patterns)){const m=re.exec(text);if(m)add(type,m[0],m.index);}
    // Location is not nationality. Third-person citizenship needs interpretation.
    const citizenship=/\b(?:I am |I'm |Je suis |je suis )(Swiss|French|Spanish|Suisse|Français|Française|EU\/EFTA)\b/u.exec(text);if(citizenship)add('citizenship',citizenship[1],citizenship.index+citizenship[0].indexOf(citizenship[1]));
    const extra={housing_status:/\b(?:[Ww]e rent our home|[Ww]e rent|[Nn]ous sommes propriétaires|[Nn]ous sommes locataires|[Nn]ous louons)\b/u,children:/\b(?:(?:two|three|four|\d+) children(?: aged [\d ,and]+)?|(?:our|their|my) (?:daughter|son)(?: is \d+)?|(?:notre|leur|ma|mon) (?:fille|fils)(?: a \d+ ans)?|(?:nos|leurs) enfants)\b/iu,permit:/\b(?:residence permit [BCLFGNS]|permis [BCLFGNS])\b/iu};for(const [type,re] of Object.entries(extra)){const m=re.exec(text);if(m)add(type,m[0],m.index);}
    const valid=validateFacts(facts,text,language);return {facts:valid,questions:expectedQuestions(valid,language),needs:needs(text)};
  }
  function factCoverage(text,facts) {
    // Role cues deliberately differ from extraction grammar: a partial match
    // must not hide another explicitly mentioned personal circumstance.
    if(!/\b(?:I|we|my|our|she|he|they|their|her|his|nous|notre|nos|je|mon|ma|mes|elle|il|ils|elles|leur)\b/iu.test(text))return {supplied:[],missing:[]};
    const cues={current_commune:/\b(?:I|we|they|she|he) (?:lives?|resides?)|\b(?:sister|mother|father|brother) (?:lives?|resides?)|habit(?:e|ons|ent)|(?:je|nous|ils|elles) viv(?:ons|ent)|je vis/iu,destination_commune:/\b(?:move|moving|relocat)|déménag|emménag/iu,workplace:/\b(?:my |our |her |his )?workplace (?:is|in)|\bwork(?:ing)? in|travaill(?:e|er|ons|ent) [àa]/iu,current_country:/\b(?:coming|arriving|arrive|come) from|viens de|venons de|arriv.*(?:de |d['’])/iu,housing_status:/\b(?:owns?|rents?|propriétaire|propriétaires|locataire|locataires|louons|loue|louent)\b/iu,children:/\b(?:child|children|kids|daughter|son|baby|enfant|enfants|fille|fils|bébé)\b/iu,permit:/\b(?:permit|permis) [BCLFGNS]\b|\b[BCLFGNS] permit\b/iu,citizenship:/\b(?:I am|I'm|she is|he is|they are|je suis|elle est|il est|nous sommes) (?:Swiss|French|Spanish|Suisse|Français|Française|suisses|EU\/EFTA)\b/iu};
    const originText=text.replace(/(?:[Jj]e viens|[Nn]ous venons) de [\p{Ll}][\p{L}]*(?:er|ir|re)\b/gu,'');
    const supplied=Object.entries(cues).filter(([type,re])=>re.test(type==='current_country'?originText:text)).map(([type])=>type),missing=supplied.filter(type=>!facts.some(f=>f.type===type));return {supplied,missing};
  }
  function needs(text) {
    const found=[];const rules={registration:/\b(move|moving|arriv|coming|relocat|déménag|emménag)/i,school:/\b(child|children|school|enfant|école|scolair)/i,housing:/\b(home|house|rent|roof|chalet|flat|housing|logement|chambre|louer|toit|propriétaire)/i,renovation:/\b(roof|renovat|insulat|toit|isol|travaux)/i,energy:/\b(solar|energy|solaire|énergie)/i,volunteering:/\b(firefighter|volunteer|pompier|bénévol)/i,insurance:/\b(insurance|assurance)/i,business:/\b(business|entreprise|commerce)/i,transport:/\b(transport|car|voiture|journey|trajet)/i};for(const [key,re] of Object.entries(rules))if(re.test(text))found.push(key);return found;
  }
  function expectedQuestions(facts,language='en') {
    const fr=language==='fr',result=[];
    if(facts.some(f=>['permit','current_country'].includes(f.type))&&!facts.some(f=>f.type==='citizenship'))result.push({id:'nationality',text:fr?'Quelle est la nationalité de la personne qui déménage ?':'What is the moving person’s citizenship?',why:fr?'Le pays de provenance ne précise pas la nationalité. Cette réponse permet de préparer la question du séjour.':'Country of departure does not establish citizenship. This answer frames the residence questions.',type:'choice',options:fr?['Suisse','UE/AELE','État tiers','Je préfère ne pas répondre']:['Swiss','EU/EFTA','Third country','Prefer not to answer']});
    if(facts.some(f=>f.type==='current_country')&&!facts.some(f=>f.type==='destination_commune'))result.push({id:'residence_commune',text:fr?'Dans quelle commune envisagez-vous d’habiter ?':'Which commune are you planning to live in?',why:fr?'Le lieu de travail peut être différent du domicile.':'Workplace and home destination can be different.',type:'text',options:[]});
    return result;
  }
  function expectedNeeds(text,facts) {
    const detected=needs(text),moving=/move|moving|arriv|coming|relocat|déménag|emménag/i.test(text),result=[];
    if(moving)result.push('registration');
    if(moving&&facts.some(f=>f.type==='children'))result.push('school');
    if(detected.includes('housing')&&!detected.includes('renovation')||moving&&facts.some(f=>f.type==='housing_status'))result.push('housing');
    for(const need of ['renovation','energy','volunteering','insurance','business','transport'])if(detected.includes(need))result.push(need);
    return [...new Set(result)];
  }
  function parseEnvelope(text) {
    const raw=String(text).replace(/```json|```/g,'').trim();
    try{return JSON.parse(raw);}catch(original){
      const start=raw.indexOf('{');if(start<0)throw original;
      const stack=[];let quoted=false,escape=false,removed=0,candidate='';
      for(const c of raw.slice(start)){
        if(quoted){candidate+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}
        if(c==='"'){quoted=true;candidate+=c;continue;}
        if(c==='{'||c==='[')stack.push(c==='{'?'}':']');
        else if(c==='}'||c===']'){
          // Apertus sometimes writes ...action}}}] instead of ...action}}].
          // Remove one redundant object closer at an array boundary only.
          // Never invent values, close a partial object or merge envelopes.
          if(c==='}'&&stack[stack.length-1]===']'&&!removed){removed++;continue;}
          if(stack.pop()!==c)throw original;
        }
        candidate+=c;
      }
      if(removed!==1||stack.length||quoted)throw original;return JSON.parse(candidate);
    }
  }
  function validateCommand(raw,text,context) {
    if(raw && ['ask','add_fact','replace_fact','add_goal','clarify'].includes(raw.type)){
      raw=copy(raw);
      if(raw.type!=='replace_fact' && (raw.target===undefined || raw.target===null || /^(?:none|null)?$/i.test(String(raw.target).trim()))){
        delete raw.target;
        if(raw.value===undefined || raw.value===null || /^(?:none|null)?$/i.test(String(raw.value).trim()) || ['add_fact','add_goal'].includes(raw.type)&&typeof raw.value==='string'&&literal(text,raw.value))delete raw.value;
      }
      if(raw.type!=='clarify' && /^(?:none|null)?$/i.test(String(raw.question || '').trim()))delete raw.question;
    }
    if(!raw || !['ask','add_fact','replace_fact','add_goal','clarify'].includes(raw.type)||own(raw,'kind')||own(raw,'update')||own(raw,'story'))fail('Use one command type; a comparison cannot start a new situation');
    if(Object.keys(raw).some(k=>!['type','target','value','question','answers'].includes(k)))fail('Unknown command field');
    const command=copy(raw);
    if(raw.type==='replace_fact'){
      const fact=context.facts.find(f=>f.id===raw.target),question=(context.questions || []).find(q=>q.id===raw.target)||own(context.answers,raw.target);
      if(!fact&&!question)fail('Choose an existing personal fact or question to change');
      if(typeof raw.value!=='string'||!literal(text,raw.value))fail('The replacement must quote the original message');
      if(fact){const esc=String(fact.value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(?:still|keep|continue|toujours|garde)[^,.;!?]*'+esc,'iu').test(text))fail('That change conflicts with a fact you want to retain');
        if(fact.type==='destination_commune' && /\b(?:work|working|travaille)\b/i.test(text) && !new RegExp('(?:move|moving|destination|déménag|instead|plutôt)[^.!?]*'+String(raw.value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'iu').test(text))fail('Is this your workplace or your destination?');
      }
    } else if(own(raw,'target')||own(raw,'value'))fail('Only a replacement has a target and value');
    if(raw.type==='clarify' && (typeof raw.question!=='string'||!raw.question.trim()||/full.*address|permit number|medical|certificate|find.*office|adresse complète|numéro.*permis|certificat|trouv.*bureau/i.test(raw.question)))fail('Ask one focused clarification');
    return command;
  }
  function revision(tree,facts,answers){const text=JSON.stringify([tree,facts,answers]);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return 'r'+(h>>>0).toString(16);}
  function dependencies(tree,facts,answers={}){
    const factIds=(facts || []).map(f=>f.id),questionIds=(tree.questions || []).map(q=>q.id);if(new Set([...factIds,...questionIds]).size!==factIds.length+questionIds.length)fail('Fact and question IDs must be distinct');
    const inputs=new Set([...factIds,...questionIds,...Object.keys(answers)]),actions=new Set(),seen=new Set();
    for(const b of tree.branches)for(const s of b.steps){if(actions.has(s.id)||!id(s.id))fail('Duplicate or invalid action id');actions.add(s.id);}
    for(const b of tree.branches)for(const s of b.steps){if(!Array.isArray(s.depends_on)||s.depends_on.some(d=>!inputs.has(d)||actions.has(d)))fail('Action '+s.id+' has an unknown input dependency or step id');if(s.prerequisites!==undefined && (!Array.isArray(s.prerequisites)||s.prerequisites.some(p=>!seen.has(p))))fail('Action prerequisites must name earlier actions');seen.add(s.id);}
    return true;
  }
  function normalizePrerequisites(input,only=null) {
    const tree=copy(input),all=new Set(tree.branches.flatMap(b=>b.steps.map(s=>s.id))),earlier=new Map();
    for(const branch of tree.branches)for(const step of branch.steps){
      if(only && !only.has(step.id)){earlier.set(step.id,step);continue;}
      const inputs=[],prerequisites=[...(step.prerequisites || [])];
      for(const dependency of step.depends_on || []){
        if(all.has(dependency)){
          const prior=earlier.get(dependency);if(!prior)fail('A prerequisite must name an earlier action: '+dependency);
          prerequisites.push(dependency);inputs.push(...prior.depends_on);
        }else inputs.push(dependency);
      }
      for(const dependency of prerequisites){const prior=earlier.get(dependency);if(!prior)fail('A prerequisite must name an earlier action: '+dependency);inputs.push(...prior.depends_on);}
      step.depends_on=[...new Set(inputs)];if(prerequisites.length || step.prerequisites!==undefined)step.prerequisites=[...new Set(prerequisites)];earlier.set(step.id,step);
    }return tree;
  }
  function unaffected(action,tree,context){const known=new Set([...(tree.variables || []).map(f=>f.id),...(tree.questions || []).map(q=>q.id),...Object.keys(context.answers || {})]);return action.depends_on.length>0 && action.depends_on.every(d=>known.has(d)&&!(context.changedIds || []).includes(d));}
  const actionFields=['id','short','title','why','depends_on','prerequisites','sources','authority','confirm_with','purpose','mode'];
  function validAction(a){if(!a||!id(a.id)||typeof a.title!=='string'||!a.title.trim()||Object.keys(a).some(k=>!actionFields.includes(k))||!Array.isArray(a.depends_on)||!Array.isArray(a.sources)||a.sources.some(r=>!r||Object.keys(r).some(k=>!['id','claim'].includes(k))))fail('Only action content and nominal references may be proposed');return copy(a);}
  const visibleActionText=action=>[action.title,action.short,action.why,action.confirm_with,...(action.sourceGaps || []).map(g=>g.question || '')].join(' ');
  function inputValues(facts,answers){return {...Object.fromEntries((facts || []).map(f=>[f.id,f.value])),...(answers || {})};}
  function requiredTargets(previous,context) {
    if(!['replace_fact'].includes(context.kind))return [];
    const before=inputValues(previous.variables,context.previousAnswers),after=inputValues(context.facts,context.answers);
    return previous.branches.flatMap(b=>b.steps.filter(s=>s.depends_on.some(id=>context.changedIds.includes(id)&&typeof before[id]==='string'&&before[id]&&before[id]!==after[id]&&literal(visibleActionText(s),before[id]))).map(s=>({branch:b.id,target:s.id})));
  }
  function bindInputs(input,facts,answers={},only=null) {
    const tree=copy(input),known=new Set(facts.map(f=>f.id).concat(tree.questions.map(q=>q.id),Object.keys(answers)));
    const roles={departure:['origin'],arrival:['destination','origin_country','permit','nationality','residence_commune'],online_registration:['origin','destination','origin_country','permit','nationality'],school:['destination','children'],housing:['origin','destination','housing'],renovation:['home_location','housing'],energy:['home_location','housing'],permit:['destination','origin_country','permit','nationality'],volunteering:['origin'],business:['origin','workplace','permit','nationality'],transport:['origin','destination','workplace','children','transport']};
    for(const branch of tree.branches)for(const step of branch.steps){if(only&&!only.has(step.id))continue;const purpose=purposeFor(step,branch);step.purpose=purpose;const allowed=roles[purpose];const declared=step.depends_on.filter(id=>!allowed || !facts.some(f=>f.id===id) || allowed.includes(id));step.depends_on=[...new Set(declared.concat((allowed || []).filter(id=>known.has(id))))];}
    return tree;
  }
  function actionIdentity(action) {
    const words=x=>String(x || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const aliases={announce:'notify',inform:'notify',declare:'notify',review:'check',verify:'check',annoncer:'notify',informer:'notify',vérifier:'check'};
    const terms=words(action.title).split(' ').filter(w=>!['the','a','an','your','to','of','at','for','with','le','la','les','un','une','votre','de','du','au','des'].includes(w)).map(w=>aliases[w] || w).sort();
    return JSON.stringify([terms,words(action.why),(action.depends_on || []).slice().sort(),(action.sources || []).map(r=>[r.id,r.claim || null]).sort(),action.authority,words(action.confirm_with)]);
  }
  function assertFreshFields(previous,tree,context){
    const changed=context.changedIds || [],before=inputValues(previous.variables,context.previousAnswers),after=inputValues(context.facts,context.answers);
    for(const target of requiredTargets(previous,context)){
      const old=previous.branches.find(b=>b.id===target.branch).steps.find(s=>s.id===target.target),next=(tree.branches.find(b=>b.id===target.branch) || {steps:[]}).steps.find(s=>s.id===target.target);if(!next)continue;
      for(const input of changed){const prior=before[input];if(typeof prior!=='string'||!prior||prior===after[input]||!old.depends_on.includes(input)||Object.entries(after).some(([id,value])=>id!==input&&value===prior&&next.depends_on.includes(id)))continue;if(literal(visibleActionText(next),prior))fail('The replacement still contains the previous input value: '+JSON.stringify(target));}
    }
    return true;
  }
  function applyProposal(previous,proposal,context,expectedRevision){
    if(!proposal||proposal.revision!==expectedRevision||Object.keys(proposal).some(k=>!['revision','operations'].includes(k))||!Array.isArray(proposal.operations)||proposal.operations.length>24)fail('Stale revision or invalid proposal envelope');
    let tree=copy(previous);const touched=new Set(),allIds=new Set(tree.branches.flatMap(b=>b.steps.map(s=>s.id))),changed=context.changedIds || [];
    const assertKeys=(op,keys)=>{if(Object.keys(op).some(k=>!keys.includes(k)))fail('Unauthorised proposal field');};
    for(const supplied of proposal.operations){
      let op=supplied;
      if(op&&['replace_action','remove_action'].includes(op.op)&&typeof op.target==='string'&&op.target.includes('/')){
        const branch=previous.branches.find(b=>b.id===op.branch),target=branch&&branch.steps.find(s=>op.target===branch.id+'/'+s.id);
        if(!target)fail('Unknown qualified branch/action target');
        op={...op,target:target.id};if(op.action){if(![target.id,branch.id+'/'+target.id].includes(op.action.id))fail('Replacement action does not match the exact target');op.action={...op.action,id:target.id};}
      }
      if(!op||!['add_branch','add_action','replace_action','remove_action','add_question','remove_question'].includes(op.op))fail('Unknown proposal operation');
      if(context.kind==='add_goal'&&!['add_branch','add_question'].includes(op.op))fail('Additional goals may add a distinct branch or personal question only; existing branches are preserved');
      if(op.op==='add_branch'){
        assertKeys(op,['op','branch']);const b=op.branch;if(!b||!id(b.id)||typeof b.name!=='string'||!Array.isArray(b.steps)||!b.steps.length||Object.keys(b).some(k=>!['id','name','need','steps'].includes(k))||tree.branches.some(x=>x.id===b.id))fail('Invalid added branch');
        if(b.need && !['registration','school','housing','renovation','energy','volunteering','insurance','business','transport','residence','other'].includes(b.need))fail('Choose a known resident need');const branch={id:b.id,name:b.name,need:b.need || 'other',steps:b.steps.map(validAction)};for(const s of branch.steps){if(allIds.has(s.id))fail('Action id already exists');allIds.add(s.id);}tree.branches.push(branch);continue;
      }
      if(op.op==='add_question'){
        assertKeys(op,['op','question']);const q=op.question;if(!q||!id(q.id)||typeof q.text!=='string'||typeof q.why!=='string'||!['text','yesno','choice'].includes(q.type)||!Array.isArray(q.options)||q.options.some(v=>typeof v!=='string')||allIds.has(q.id)||Object.keys(q).some(k=>!['id','text','why','type','options','affects'].includes(k))||tree.questions.some(x=>x.id===q.id)||context.facts.some(f=>f.id===q.id)||own(context.answers,q.id))fail('Invalid added question');tree.questions.push(copy(q));continue;
      }
      if(op.op==='remove_question'){
        assertKeys(op,['op','target']);const q=tree.questions.find(q=>q.id===op.target);if(!q||!changed.includes(op.target)||!own(context.answers,op.target))fail('Only an explicitly resolved question may be removed: question/'+op.target);tree.questions=tree.questions.filter(q=>q.id!==op.target);continue;
      }
      const branch=tree.branches.find(b=>b.id===op.branch);if(!branch)fail('Unknown target branch');
      if(op.op==='add_action'){
        assertKeys(op,['op','branch','after','action']);const action=validAction(op.action);if(allIds.has(action.id))fail('Action id already exists');const index=op.after===null?branch.steps.length-1:branch.steps.findIndex(s=>s.id===op.after);if(op.after!==null&&index<0)fail('Unknown insertion target');branch.steps.splice(index+1,0,action);allIds.add(action.id);continue;
      }
      assertKeys(op,op.op==='replace_action'?['op','branch','target','action']:['op','branch','target']);
      const index=branch.steps.findIndex(s=>s.id===op.target),prior=branch.steps[index],key=op.branch+'/'+op.target;if(!prior||touched.has(key))fail('Unknown or duplicate action target: '+key);
      if(['add_goal','add_fact','completion'].includes(context.kind)||unaffected(prior,previous,context)||!prior.depends_on.some(d=>changed.includes(d)))fail('The alternative omitted existing steps or rewrote unrelated work: '+key);
      touched.add(key);if(op.op==='remove_action')branch.steps.splice(index,1);else{const action=validAction(op.action);if(action.id!==prior.id)fail('Replacing an action must retain its id');if(prior.purpose && action.purpose && prior.purpose!==action.purpose)fail('An existing action must retain its purpose');if(prior.purpose)action.purpose=prior.purpose;branch.steps[index]=action;}
    }
    for(const target of requiredTargets(previous,context)){const key=target.branch+'/'+target.target;if(!touched.has(key))fail('The proposal still names the old value in an affected action: '+JSON.stringify(target));}
    const accepted=new Set(previous.branches.flatMap(b=>b.steps.map(actionIdentity)));
    const added=proposal.operations.flatMap(o=>o.op==='add_branch'?o.branch.steps:o.op==='add_action'?[o.action]:[]);
    if(context.kind==='add_goal' && (!proposal.operations.some(o=>o.op==='add_branch') || proposal.operations.filter(o=>o.op==='add_branch').some(o=>!o.branch.steps.some(s=>!accepted.has(actionIdentity(s))))))fail('An additional goal needs a new action in a distinct branch');
    if(context.kind==='completion' && !added.some(s=>!accepted.has(actionIdentity(s))))fail('Completion needs a new action; the map remains incomplete');
    tree.branches=tree.branches.filter(b=>b.steps.length);if(!tree.branches.length)fail('A proposal cannot erase the journey');tree.variables=copy(context.facts);
    const newIds=new Set(proposal.operations.flatMap(o=>o.op==='add_branch'?o.branch.steps.map(s=>s.id):o.action?[o.action.id.includes('/')?o.action.id.split('/').at(-1):o.action.id]:[]));tree=normalizePrerequisites(tree,newIds);dependencies(tree,context.facts,context.answers);return tree;
  }
  const purposes={departure:['Ask {place} how to announce departure','Demander à {place} comment annoncer le départ'],arrival:['Ask {place} how to register arrival','Demander à {place} comment annoncer l’arrivée'],online_registration:['Ask whether online registration covers this move','Demander si l’annonce en ligne couvre ce déménagement'],school:['Ask about school arrangements for your child','Demander les possibilités de scolarisation de votre enfant'],housing:['Check housing options and what applies to your home','Examiner les options pour votre logement'],renovation:['Ask which conditions apply to the planned works','Demander quelles conditions concernent les travaux envisagés'],energy:['Ask about options for the proposed energy work','Demander les possibilités pour les travaux énergétiques'],permit:['Ask which residence process applies to your circumstances','Demander quelle procédure de séjour correspond à votre situation'],insurance:['Compare coverage and ask which options fit your needs','Comparer les couvertures et les options adaptées'],business:['Ask which process applies to the proposed business','Demander quelle procédure concerne l’activité envisagée'],volunteering:['Ask the local fire service how to join','Demander au service du feu local comment le rejoindre'],transport:['Check transport options for your journey','Examiner les options de transport pour votre trajet'],other:['Ask what applies to this part of your situation','Demander ce qui concerne cette partie de votre situation']};
  const shortLabels={departure:['Departure from {place}','Départ de {place}'],arrival:['Arrival in {place}','Arrivée à {place}'],online_registration:['Online registration option','Option d’annonce en ligne'],school:['School and childcare','École et accueil'],housing:['Housing options','Options de logement'],renovation:['Planned renovation','Rénovation envisagée'],energy:['Energy options','Options énergétiques'],permit:['Residence questions','Questions de séjour'],insurance:['Compare coverage','Comparer les couvertures'],business:['Business questions','Questions sur l’activité'],volunteering:['Joining the fire service','Rejoindre le service du feu'],transport:['Transport options','Options de transport'],other:['Check applicability','Vérifier l’applicabilité']};
  const explanations={departure:['Your current commune identifies the starting contact. A different destination does not itself change this starting point.','Votre commune actuelle identifie le premier interlocuteur. Une autre destination ne change pas à elle seule ce point de départ.'],arrival:['The proposed destination changes the local arrival contact and the questions to verify there. Individual conditions remain unconfirmed.','La destination proposée change le contact local et les questions à vérifier à l’arrivée. Les conditions individuelles restent à confirmer.'],school:['Your child’s needs and proposed home location frame the school or childcare questions. Placement and conditions remain unconfirmed.','Les besoins de votre enfant et le domicile envisagé précisent les questions sur l’école ou l’accueil. La place et les conditions restent à confirmer.'],housing:['Your stated housing situation frames the options to compare. This map does not establish contract or property obligations.','Votre situation de logement précise les options à comparer. Cette carte ne détermine pas les obligations liées au bail ou au bien.'],renovation:['The planned work and property location frame the question to the local service. Whether permission applies has not been established.','Les travaux envisagés et le lieu du bien précisent la question au service local. La nécessité d’une autorisation n’est pas établie.'],energy:['The proposed energy work opens options to compare. Permission, eligibility and financial support remain unverified.','Les travaux énergétiques envisagés ouvrent des options à comparer. Autorisations, admissibilité et aides restent à vérifier.'],permit:['Your stated residence circumstances frame this question. Country of departure is not citizenship and no eligibility decision is established.','Votre situation de séjour précise cette question. Le pays de provenance n’est pas la nationalité et aucune décision d’admissibilité n’est établie.'],insurance:['Your chosen risks and coverage needs frame this comparison. No coverage or eligibility is established by this map.','Les risques et couvertures souhaités précisent cette comparaison. Cette carte ne confirme aucune couverture ni admissibilité.'],business:['Your proposed activity and location frame the questions to verify. Permission to trade and required documents have not been established.','L’activité et le lieu envisagés précisent les questions à vérifier. Le droit d’exercer et les pièces nécessaires ne sont pas établis.'],volunteering:['Your interests and location frame how to ask about joining. Eligibility, documents and medical conditions remain unverified.','Vos intérêts et le lieu précisent la demande pour rejoindre le service. Admissibilité, pièces et conditions médicales restent à vérifier.'],transport:['The proposed journey frames which transport options to inspect. This map has not calculated a live route, timetable or fare.','Le trajet envisagé précise les options à examiner. Cette carte ne calcule aucun itinéraire, horaire ou tarif en direct.']};
  function purposeFor(step,branch){if(purposes[step.purpose])return step.purpose;const text=[step.title,branch.name,branch.need].join(' ');if(/departure|départ|deregister/i.test(step.title))return 'departure';if(/arrival|arriv|register.*(?:in|at)|inscri/i.test(step.title))return 'arrival';if(/online|eDéménagement/i.test(step.title))return 'online_registration';if(purposes[branch.need])return branch.need;const branchPurpose=needs(branch.name || '').find(n=>purposes[n]);if(branchPurpose)return branchPurpose;return needs(text).find(n=>purposes[n]) || (/permit|permis|residen/i.test(text)?'permit':'other');}
  function sourceApplies(source,purpose) {
    return !!source&&Array.isArray(source.services)&&source.services.includes(purpose);
  }
  function residentQuestion(q) {
    const text=String(q.text || '');
    if(/\b(?:require|deadline|regulat|mandatory|obligat|documents?|medical)\b|délai|règlement|autorisation|exige/iu.test(text))return false;
    return /(?:what|which).*?(?:citizenship|nationality)|quelle.*nationalité|(?:what|which).*permit.*(?:hold|have)|quel.*permis.*(?:avez|déten)|(?:how old|how many|what age|quel âge|combien)|(?:when|quand).*(?:move|moving|plan|expect|déménag|prévoi)|(?:what|which|quel).*(?:coverage|risks|disputes|business|activity|couverture|risques|activité)|(?:where|which commune|what commune|dans quelle commune|où).*(?:live|living|move|plan|work|habit|déménag|travaill)|prefer|préfér|(?:do you|will you|are you).*(?:rent|own|live|car|child|school|work)|(?:voulez|avez|vivez|travaillez|envisagez)/iu.test(text);
  }
  function safeMap(input,{language='en',catalogue=[],facts=input.variables || [],answers={},onlyActions=null,onlyQuestions=null}={}){
    const tree=copy(input),fr=language==='fr',f=key=>facts.find(f=>f.id===key),values=facts.map(f=>f.value).join(' '),citizenship=answers.nationality || (f('nationality') || {}).value || '';
    const verificationTasks=[...(tree.verificationTasks || [])],safeQuestions=[];for(const q of tree.questions || []){
      if(onlyQuestions && !onlyQuestions.has(q.id)){safeQuestions.push(q);continue;}
      if(/full (?:street )?address|permit number|passport|street name|adresse (?:complète|exacte)|numéro (?:de|du) permis|(?:what|which) (?:documents|papers)|medical|médical|certificate|certificat|required documents|mandatory|obligatoire|date of birth|date de naissance|which (?:office|web|page|regulation)|find (?:the|a) (?:office|page)|competent office|quel.*(?:bureau|page|règlement)/i.test(q.text || ''))continue;
      if(facts.some(f=>f.type==='current_country')&&!facts.some(f=>f.type==='current_commune')&&/which commune.*(?:leave|depart)|quelle commune.*(?:quitt|départ)/i.test(q.text))continue;
      if(!residentQuestion(q)){
        const purpose=purposeFor({title:q.text}, {name:q.text}),action=tree.branches.flatMap(b=>b.steps.map(step=>({step,branch:b}))).find(({step,branch})=>purposeFor(step,branch)===purpose);
        verificationTasks.push({id:q.id,purpose,actionId:action? action.step.id:null,text:purpose==='school'?(fr?'Vérifier le calendrier applicable à la scolarisation.':'Check the timing applicable to school arrangements.'):purposes[purpose][fr?1:0].replace('{place}',(f('destination')||{}).value || (fr?'la commune':'the commune')),origin:'application',reason:fr?'C’est une vérification institutionnelle, pas une information à fournir par le résident.':'This is an institutional verification task, not a fact the resident must supply.'});continue;
      }
      safeQuestions.push({...q,textOrigins:{text:{kind:expectedQuestions(facts,language).some(u=>u.id===q.id)?'application':'model'},why:{kind:'application'}},why:fr?'Cette réponse aide à préciser les pistes concernées ci-dessous.':'This personal answer helps refine the affected paths below.'});
    }tree.questions=safeQuestions;tree.verificationTasks=verificationTasks;
    const tasks=new Map(verificationTasks.map(task=>[task.id,task]));for(const branch of tree.branches)for(const step of branch.steps){if(onlyActions&&!onlyActions.has(step.id))continue;step.depends_on=step.depends_on.filter(id=>!tasks.has(id));}
    for(const b of tree.branches)for(const s of b.steps){if(onlyActions && !onlyActions.has(s.id))continue;
      const purpose=purposeFor(s,b),place=(f(purpose==='departure'?'origin':'destination') || {}).value || (fr?'la commune':'the commune');
      const refs=(s.sources || []).filter(r=>{if(r.id==='sem-b-eu'&&!/^(?:EU\/EFTA|UE\/AELE)$/i.test(citizenship.trim()))return false;if(r.id==='sem-third'&&!/third.country|non.?EU|état.*tiers/i.test(citizenship))return false;return catalogue.some(c=>c.id===r.id&&sourceApplies(c,purpose));});if(!refs.length){const placeValue=(f(purpose==='departure'?'origin':'destination') || f('home_location') || f('origin') || {}).value || '';const slug=placeValue.toLowerCase().replace(/\s+/g,'-');let entry=['departure','arrival','online_registration'].includes(purpose)?catalogue.find(c=>c.jurisdiction && c.jurisdiction.commune===slug):null;if(!entry){const fallback=purpose==='transport'?'otd':purpose==='school'?'vd-root':['departure','arrival'].includes(purpose)&&!f('origin_country')?'ch-move':purpose==='online_registration'?'vd-address':null;entry=fallback&&catalogue.find(c=>c.id===fallback&&sourceApplies(c,purpose));}if(entry)refs.push({id:entry.id,claim:null});}s.sources=refs;s.source=refs[0] && refs[0].id || null;
      // Pilot notes are drafts. A URL or model-selected claim never authorises
      // an obligation. Only an exact, reviewed, applicable action could do so.
      const supported=refs.map(r=>{const c=catalogue.find(c=>c.id===r.id),claim=(c.claims || []).find(k=>k.id===r.claim);return {c,claim};}).find(({claim})=>claim && claim.status==='reviewed' && claim.actionText && claim.conditions && claim.conditions.every(c=>facts.some(f=>f.type===c.type&&f.value===c.value)) && claim.actionText[language]===s.title && claim.explanation && claim.explanation[language]===s.why);
      if(!supported){const neutral=/^(?:Ask|Check|Compare|Contact|Demander|Vérifier|Comparer|Contacter)\b/iu.test(s.title) && !/must|required|mandatory|approval|medical|documents|deadline|\d|oblig|autorisa|médic|délai/i.test(s.title);s.title=neutral?s.title:purposes[purpose][fr?1:0].replace('{place}',place);s.short=shortLabels[purpose][fr?1:0].replace('{place}',place);s.why=fr?'Cette piste prépare une question, pas une obligation confirmée. Les conditions, documents et délais applicables restent à vérifier.':'This prepares a question, not a confirmed obligation. Applicable conditions, documents and timing remain unverified.';if(explanations[purpose])s.why=explanations[purpose][fr?1:0];s.mode='verify';s.purpose=purpose;s.textOrigins={title:{kind:neutral?'model':'application'},short:{kind:'application'},why:{kind:'application'},confirm_with:{kind:'application'}};s.sourceGaps=[{reason:fr?'Applicabilité non établie par une note relue.':'Applicability is not established by a reviewed note.',question:s.title}];}
      const entry=refs.map(r=>catalogue.find(c=>c.id===r.id)).find(Boolean);s.authority=entry?entry.level:'other';s.confirm_with=entry&&Array.isArray(entry.contactFor)&&entry.contactFor.includes(purpose)?entry.title:fr?'Interlocuteur compétent à confirmer':'Competent contact not yet established';if(s.textOrigins)s.textOrigins.confirm_with=entry&&entry.contactFor&&entry.contactFor.includes(purpose)?{kind:'catalogue',sourceId:entry.id}:{kind:'application'};
      if(/EU|EFTA|UE\/AELE/i.test(b.name)&&!/EU|EFTA|UE|AELE/i.test(citizenship))b.name=fr?'Séjour et résidence':'Residence';
    }
    tree.textOrigins={...(tree.textOrigins || {}),note:{kind:'application'}};
    tree.note=fr?'Les pistes préparent vos questions. Les sources proposées et leurs conditions attendent une relecture humaine.':'These paths prepare your questions. Suggested sources and their applicability await human review.';
    return tree;
  }
  function localize(input,facts,language) {
    const tree=copy(input),fr=language==='fr',labels={registration:['Registration','Annonces de départ et d’arrivée'],school:['School','Scolarité'],housing:['Housing','Logement'],renovation:['Renovation','Rénovation'],energy:['Energy','Énergie'],volunteering:['Volunteering','Bénévolat'],insurance:['Insurance','Assurance'],business:['Business','Activité professionnelle'],transport:['Transport','Transport'],residence:['Residence','Séjour'],other:['Your next questions','Vos prochaines questions']};
    for(const branch of tree.branches){if(labels[branch.need])branch.name=labels[branch.need][fr?1:0];for(const step of branch.steps){if(step.mode!=='verify')continue;step.textOrigins={...(step.textOrigins || {}),title:{kind:'application'},short:{kind:'application'},why:{kind:'application'}};const purpose=purposeFor(step,branch),place=(facts.find(f=>f.id===(purpose==='departure'?'origin':'destination')) || {}).value || (fr?'la commune':'the commune');step.title=purposes[purpose][fr?1:0].replace('{place}',place);step.short=shortLabels[purpose][fr?1:0].replace('{place}',place);step.why=fr?'Cette piste prépare une question, pas une obligation confirmée. Les conditions applicables restent à vérifier.':'This prepares a question, not a confirmed obligation. Applicable conditions remain unverified.';}}
    tree.textOrigins={...(tree.textOrigins || {}),note:{kind:'application'}};
    tree.note=fr?'Les pistes préparent vos questions. Les sources proposées et leurs conditions attendent une relecture humaine.':'These paths prepare your questions. Suggested sources and their applicability await human review.';return tree;
  }
  function scopeVerificationTasks(tree,facts,language,affected){
    const fr=language==='fr';tree.verificationTasks=(tree.verificationTasks || []).map(task=>{
      if(task.actionId&&!affected.has(task.actionId))return task;
      const step=tree.branches.flatMap(b=>b.steps).find(step=>step.id===task.actionId),purpose=purposes[task.purpose]?task.purpose:step&&purposes[step.purpose]?step.purpose:'other',place=(facts.find(f=>f.id===(purpose==='departure'?'origin':'destination')) || {}).value || (fr?'la commune':'the commune');
      return {...task,purpose,text:purpose==='school'?(fr?'Vérifier le calendrier applicable à la scolarisation.':'Check the timing applicable to school arrangements.'):purposes[purpose][fr?1:0].replace('{place}',place),origin:'application'};
    });return tree;
  }
  function stampProvenance(tree,provider,onlyActions=null,onlyQuestions=null){
    const stamp=origin=>origin&&origin.kind==='model'?{...origin,provider:copy(provider || {})}:origin;
    for(const branch of tree.branches)for(const step of branch.steps){if(onlyActions&&!onlyActions.has(step.id))continue;step.textOrigins=Object.fromEntries(Object.entries(step.textOrigins || {title:{kind:'model'},short:{kind:'model'},why:{kind:'model'}}).map(([field,origin])=>[field,stamp(origin)]));}
    for(const q of tree.questions){if(onlyQuestions&&!onlyQuestions.has(q.id))continue;q.textOrigins=Object.fromEntries(Object.entries(q.textOrigins || {text:{kind:'model'},why:{kind:'model'}}).map(([field,origin])=>[field,stamp(origin)]));}return tree;
  }
  return {roles,literal,extract,validateFacts,factCoverage,sourceApplies,residentQuestion,scopeVerificationTasks,stampProvenance,needs,expectedNeeds,expectedQuestions,parseEnvelope,validateCommand,revision,dependencies,normalizePrerequisites,unaffected,requiredTargets,assertFreshFields,bindInputs,actionIdentity,applyProposal,safeMap,localize};
})();
