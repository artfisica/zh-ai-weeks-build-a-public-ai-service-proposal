'use strict';
const {test,expect}=require('@playwright/test');
const {map,story,extended}=require('../fixtures');
test.beforeEach(async({page,context})=>{
  context.__runtimeErrors=[];const watch=p=>p.on('pageerror',error=>context.__runtimeErrors.push(error.message));watch(page);context.on('page',watch);
  await context.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await context.route('**/proxy-url.json',route=>route.fulfill({json:{url:'https://fixture.invalid'}}));
  await context.route('https://fixture.invalid/health',route=>route.fulfill({json:{ready:true,maxTokens:3500,provider:'fixture',model:'fixture-model'}}));
  await context.route('https://fixture.invalid/chat',route=>{
    const prompt=route.request().postDataJSON().messages.at(-1).content;
    const sentence=(prompt.match(/^Situation: ([^\n]+)/)||[])[1]||story;
    return route.fulfill({json:{choices:[{message:{content:JSON.stringify(map(sentence.includes('Gland')?'Gland':'Saint-Cergue'))}}],provenance:{provider:'fixture',model:'fixture-model'}}});
  });
  await page.goto('/');await expect(page.locator('#conn-label')).toContainText('fixture');
});
test.afterEach(async({context})=>{expect(context.__runtimeErrors).toEqual([]);});
async function draw(page){await page.locator('[data-start-form] textarea').fill(story);await page.locator('[data-start-form] button').click();await expect(page.locator('.journey-map')).toBeVisible();}
async function alternative(page){await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Gland"]').click();await expect(page.locator('.map-comparison')).toBeVisible();}
test('A malformed answer shows repair progress and sends the failed answer for one repair',async({page})=>{
  const failed='{"variables":[]}, {"branches":[]}';let calls=0,repair;
  await page.route('https://fixture.invalid/chat',async route=>{
    if(++calls===1)return route.fulfill({json:{choices:[{message:{content:failed}}]}});
    repair=route;
  });
  await page.locator('[data-start-form] textarea').fill('What steps are needed to obtain legal insurance?');
  await page.locator('[data-start-form] button').click();
  await expect(page.locator('#tree-host').getByRole('status')).toContainText('one retry');
  const messages=repair.request().postDataJSON().messages;
  expect(messages[2]).toEqual({role:'assistant',content:failed});
  expect(messages.at(-1).content).toContain('multiple JSON objects');
  await repair.fulfill({json:{choices:[{message:{content:JSON.stringify(map())}}]}});
  await expect(page.locator('.journey-map')).toBeVisible();expect(calls).toBe(2);
});
test('Provider authentication failure explains configuration and preserves the draft',async({page})=>{
  let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{calls++;return route.fulfill({status:502,json:{error:'upstream 401'}});});
  await page.locator('[data-start-form] textarea').fill('What steps are needed to obtain legal insurance?');
  await page.locator('[data-start-form] button').click();
  await expect(page.locator('#tree-host .err')).toContainText('provider rejected the API credentials');
  await expect(page.locator('[data-start-form] textarea')).toHaveValue('What steps are needed to obtain legal insurance?');
  await expect(page.locator('[data-start-form] button')).toBeEnabled();expect(calls).toBe(1);
});
test('An additional insurance request asks for clarification and preserves the existing answer',async({page})=>{
  await draw(page);
  await page.evaluate(()=>{const key='public-ai-commune.v5',saved=JSON.parse(localStorage.getItem(key));saved.answers={insurance_scope:'Tenancy issues'};saved.qtexts={insurance_scope:'Which disputes need cover?'};saved.questionDefs={insurance_scope:{id:'insurance_scope',text:'Which disputes need cover?',why:'Your needs',type:'text',options:[]}};localStorage.setItem(key,JSON.stringify(saved));});
  await page.reload();await expect(page.locator('#conn-label')).toContainText('fixture');
  let calls=0;const next=map();next.branches.push({id:'life',name:'Life insurance',steps:[{id:'life_cover',short:'Discuss life cover',title:'Discuss life cover with a provider',why:'Clarify your needs',depends_on:[],sources:[],authority:'other',confirm_with:'Insurance provider'}]});
  await page.route('https://fixture.invalid/chat',route=>{calls++;expect(route.request().postDataJSON().messages[1].content).toContain('"insurance_scope":"Tenancy issues"');return route.fulfill({json:{choices:[{message:{content:JSON.stringify(next)}}]}});});
  await page.locator('[data-converse-form] input').fill('can I have also a live insurance? how?');await page.locator('[data-converse-form] button').click();
  await expect(page.locator('#story')).toContainText('Did you mean life insurance?');expect(calls).toBe(0);
  await page.getByRole('button',{name:'Yes, add life insurance',exact:true}).click();
  await expect(page.locator('.map-comparison')).toContainText('1 added');await expect(page.locator('[data-answered="insurance_scope"]')).toContainText('Tenancy issues');expect(calls).toBe(1);
  await page.getByRole('button',{name:'Adopt',exact:true}).click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).answers.insurance_scope)).toBe('Tenancy issues');
  await expect(page.locator('[data-lane="life"], [data-lane-select="life"]').first()).toBeVisible();
});
test('An incomplete initial map has an actionable completion button',async({page})=>{
  const raw=JSON.stringify(map()),cut=raw.slice(0,raw.indexOf('"school_contact"')+12);let calls=0;
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:++calls===1?cut:raw}}]}}));
  await draw(page);await expect(page.getByRole('button',{name:'Complete map',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Complete map',exact:true}).click();
  await expect(page.getByRole('button',{name:'Complete map',exact:true})).toHaveCount(0);await expect(page.locator('.journey-map')).toBeVisible();expect(calls).toBe(2);
});
test('Completion rejects dropped partial actions and a successful extension can be undone',async({page})=>{
  const raw=JSON.stringify(map()),cut=raw.slice(0,raw.indexOf('"school_contact"')+12),bad=map();bad.branches.shift();let calls=0;
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:++calls===1?cut:JSON.stringify(bad)}}]}}));
  await draw(page);await page.getByRole('button',{name:'Complete map',exact:true}).click();
  await expect(page.locator('#story')).toContainText('alternative omitted existing steps');
  await expect(page.getByRole('button',{name:/^Announce departure/})).toBeVisible();await expect(page.getByRole('button',{name:'Complete map',exact:true})).toBeVisible();expect(calls).toBe(3);
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:raw}}]}}));
  await page.getByRole('button',{name:'Complete map',exact:true}).click();await expect(page.getByRole('button',{name:'Complete map',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.getByRole('button',{name:'Complete map',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/^Announce departure/})).toBeVisible();
});
test('Completion cannot silently swap accepted origin and destination facts',async({page})=>{
  const raw=JSON.stringify(map()),cut=raw.slice(0,raw.indexOf('"school_contact"')+12),bad=map();bad.variables.find(v=>v.id==='origin').value='Saint-Cergue';bad.variables.find(v=>v.id==='origin').span='Saint-Cergue';let calls=0;
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:++calls===1?cut:JSON.stringify(bad)}}]}}));
  await draw(page);await page.getByRole('button',{name:'Complete map',exact:true}).click();
  await expect(page.locator('#story')).toContainText('fact/origin');expect(calls).toBe(3);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).vars.find(v=>v.id==='origin').value)).toBe('Nyon');
  await expect(page.getByRole('button',{name:'Complete map',exact:true})).toBeVisible();
});
test('Completion retains an unchanged action’s saved source note and keeps refresh available',async({page})=>{
  await draw(page);
  await page.evaluate(()=>{const key='public-ai-commune.v5',saved=JSON.parse(localStorage.getItem(key));saved.tree.incomplete=true;saved.tree.catalogueVersion='0000000000000000';const ref=saved.tree.branches[0].steps[0].sources[0];ref.record.revision='0000000000000000';ref.record.note.text='Saved original catalogue note';localStorage.setItem(key,JSON.stringify(saved));});
  await page.reload();await expect(page.locator('#conn-label')).toContainText('fixture');
  const renamed=extended();renamed.branches[0].id='generated_registration';renamed.branches[0].steps[0].id='generated_departure';await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify(renamed)}}]}}));
  await page.getByRole('button',{name:'Complete map',exact:true}).click();
  await expect(page.getByRole('button',{name:'Complete map',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Compare current sources',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^Announce departure/}).click();await expect(page.locator('#detail')).toContainText('Saved original catalogue note');
});
test('An accepted six-branch map can gain a seventh path without losing its old branches',async({page})=>{
  await draw(page);
  await page.evaluate(()=>{const key='public-ai-commune.v5',saved=JSON.parse(localStorage.getItem(key));for(let i=0;i<3;i++)saved.tree.branches.push({id:'extra_'+i,name:'Extra '+i,steps:[{id:'extra_step_'+i,short:'Check extra '+i,title:'Check extra '+i,why:'Confirm with provider',depends_on:[],sources:[],authority:'other',confirm_with:'Provider'}]});localStorage.setItem(key,JSON.stringify(saved));});
  await page.reload();await expect(page.locator('#conn-label')).toContainText('fixture');
  const next=map();for(let i=0;i<3;i++)next.branches.push({id:'extra_'+i,name:'Extra '+i,steps:[{id:'extra_step_'+i,short:'Check extra '+i,title:'Check extra '+i,why:'Confirm with provider',depends_on:[],sources:[],authority:'other',confirm_with:'Provider'}]});next.branches.push({id:'life',name:'Life insurance',steps:[{id:'life_cover',short:'Ask about cover',title:'Ask about life cover',why:'Clarify your needs',depends_on:[],sources:[],authority:'other',confirm_with:'Provider'}]});
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify(next)}}]}}));
  await page.locator('[data-converse-form] input').fill('Can I also buy life insurance?');await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toContainText('1 added');
  await page.getByRole('button',{name:'Adopt',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).tree.branches.length)).toBe(7);
});
test('Generate, compare, Keep, Adopt and Undo preserve the accepted situation',async({page},info)=>{
  await draw(page);await page.screenshot({path:info.outputPath('initial.png'),fullPage:true,animations:'disabled'});
  await alternative(page);await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  await page.getByRole('button',{name:'Keep',exact:true}).click();await expect(page.locator('.map-comparison')).toHaveCount(0);
  await alternative(page);await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('.sentence')).toContainText('Gland');
  await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Answer, Explore, reload and completion stay isolated',async({page})=>{
  await draw(page);await page.getByRole('button',{name:/^Announce departure/}).press('Enter');await page.locator('[data-done="departure"]').click();await page.locator('[data-action="close-detail"]').click();await page.locator('[data-q="nationality"]').click();await page.getByRole('button',{name:'EU/EFTA',exact:true}).click();
  await page.locator('#mode-explore').click();await alternativeInExplore(page);
  await page.locator('#mode-situation').click();await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  await expect(page.locator('[data-answered="nationality"]')).toContainText('EU/EFTA');
  await page.reload();await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  await page.getByRole('button',{name:/^Announce departure/}).press('Enter');await expect(page.locator('[data-done="departure"]')).toContainText('Done');
  await expect(page.locator('[data-answered="nationality"]')).toContainText('EU/EFTA');
});
async function alternativeInExplore(page){await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Gland"]').click();await expect(page.locator('.sentence')).toContainText('Gland');}
test('Print plan includes all branches and Chromium exports a PDF',async({page,browserName},info)=>{
  await draw(page);await page.getByRole('button',{name:'My plan',exact:true}).click();
  await page.evaluate(()=>{window.print=()=>{window.__printRequested=true;};});
  await page.getByRole('button',{name:'Print / PDF',exact:true}).click();
  await expect(page.locator('#print-plan')).toContainText('Transport');await expect(page.locator('#print-plan')).toContainText('unreviewed by a commune');
  expect(await page.evaluate(()=>window.__printRequested)).toBe(true);
  if(browserName==='chromium')await page.pdf({path:info.outputPath('fictional-plan.pdf'),format:'A4'});
  else {await page.emulateMedia({media:'print'});await expect(page.locator('#print-plan')).toBeVisible();await page.screenshot({path:info.outputPath('print-layout.png'),fullPage:true,animations:'disabled'});}
});
test('Generation failure leaves a retryable draft and a working connection',async({page})=>{
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({status:502,json:{error:'upstream unreachable'}}));
  await page.locator('[data-start-form] textarea').fill(story);await page.locator('[data-start-form] button').click();
  await expect(page.locator('.empty [role="alert"]')).toContainText('provider could not be reached');await expect(page.locator('[data-start-form] textarea')).toHaveValue(story);
  await expect(page.locator('#conn-label')).toContainText('fixture');
});

test('Step rows can be selected by ordinary pointer clicks without precision aiming',async({page})=>{
  await draw(page);await page.getByRole('button',{name:/^Announce departure/}).click();await expect(page.locator('[data-done="departure"]')).toBeVisible();
});
test('Device-save opt-out is honoured by another open tab',async({page,context})=>{
  await draw(page);const other=await context.newPage();await other.goto('/');await expect(other.locator('.journey-map')).toBeVisible();
  await page.getByRole('button',{name:'Save on this device: on',exact:true}).click();
  await expect(other.getByRole('button',{name:'Save on this device: off',exact:true})).toBeVisible();
  await other.getByRole('button',{name:/^Announce departure/}).press('Enter');await other.locator('[data-done="departure"]').click();
  expect(await other.evaluate(()=>localStorage.getItem('public-ai-commune.v5'))).toBeNull();await page.reload();await expect(page.locator('[data-start-form]')).toBeVisible();
});
test('A corrupt saved map recovers through Start over',async({page})=>{
  await page.evaluate(()=>localStorage.setItem('public-ai-commune.v5','{invalid'));await page.reload();await expect(page.locator('.empty [role="alert"]')).toContainText('could not be loaded');await page.locator('#clear-btn').click();expect(await page.evaluate(()=>localStorage.getItem('public-ai-commune.v5'))).toBeNull();await draw(page);
});
test('Cancelled alternatives cannot replace the accepted map',async({page})=>{
  await draw(page);let deliver,seen;const arrived=new Promise(resolve=>seen=resolve);
  await page.route('https://fixture.invalid/chat',route=>new Promise(resolve=>{deliver=async()=>{try{await route.fulfill({json:{choices:[{message:{content:JSON.stringify(map('Gland'))}}]}});}catch(_){}resolve();};seen();}));
  await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Gland"]').click();await arrived;
  await page.locator('[data-action="cancel-request"]').click();await deliver();await expect(page.locator('.sentence')).toContainText('Saint-Cergue');await expect(page.locator('.map-comparison')).toHaveCount(0);await expect(page.locator('.loading')).toHaveCount(0);
});
test('Failed translation restores both the map and saved language',async({page})=>{
  await draw(page);await page.route('https://fixture.invalid/chat',route=>route.fulfill({status:502,json:{error:'upstream unavailable'}}));await page.locator('#lang-fr').click();await expect(page.locator('html')).toHaveAttribute('lang','en');expect(await page.evaluate(()=>localStorage.getItem('public-ai-commune.lang'))).toBe('en');await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
});
test('Initial form, map and source detail pass automated WCAG A/AA checks',async({page},info)=>{
  test.setTimeout(60000);
  const AxeBuilder=require('@axe-core/playwright').default;
  const check=async name=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();await info.attach(name,{body:JSON.stringify(result.violations,null,2),contentType:'application/json'});expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);};
  await check('initial-accessibility');await draw(page);await check('map-accessibility');await page.getByRole('button',{name:/^Announce departure/}).press('Enter');await check('detail-accessibility');
});

test('A workplace hypothetical retains the home destination and reaches interpretation',async({page})=>{
  await draw(page);let calls=0;const text='What if I work in Gland but still move to Saint-Cergue?',next=map();next.variables.push({id:'workplace',label:'Workplace',value:'Gland',span:'Gland',alternatives:[]});
  await page.route('https://fixture.invalid/chat',route=>{const body=route.request().postDataJSON();const response=++calls===1?{kind:'compare',update:'add_fact',story:story+' '+text,answer:'',steps:[]}:next;if(calls===1)expect(body.messages[1].content).toContain(text);return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  await page.locator('[data-converse-form] input').fill(text);await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();expect(calls).toBe(2);
  await page.getByRole('button',{name:'Adopt',exact:true}).click();
  const values=await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).vars);expect(values.find(v=>v.id==='destination').value).toBe('Saint-Cergue');expect(values.find(v=>v.id==='workplace').value).toBe('Gland');await expect(page.locator('[data-var="destination"]')).toContainText('Saint-Cergue');
});
test('Adding an ordinary fact retains confirmed nationality and a completed departure after reload',async({page})=>{
  await draw(page);await page.getByRole('button',{name:/^Announce departure/}).click();await page.locator('[data-done="departure"]').click();await page.locator('[data-action="close-detail"]').click();await page.locator('[data-q="nationality"]').click();await page.getByRole('button',{name:'EU/EFTA',exact:true}).click();
  let calls=0;const next=map();next.variables.push({id:'workplace',label:'Workplace',value:'Geneva',span:'Geneva',alternatives:[]});
  await page.route('https://fixture.invalid/chat',route=>{const response=++calls===1?{kind:'fact',update:'add_fact',story:story+' I also work in Geneva.',answer:'',steps:[]}:next;expect(route.request().postDataJSON().messages[1].content).toContain('EU/EFTA');return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  await page.locator('[data-converse-form] input').fill('I also work in Geneva.');await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();await page.getByRole('button',{name:'Adopt',exact:true}).click();
  await page.reload();await expect(page.locator('[data-answered="nationality"]')).toContainText('EU/EFTA');await page.getByRole('button',{name:/^Announce departure/}).click();await expect(page.locator('[data-done="departure"]')).toContainText('Done');expect(calls).toBe(2);
  await page.locator('[data-action="close-detail"]').click();await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.locator('.sentence')).not.toContainText('Geneva');await expect(page.locator('[data-answered="nationality"]')).toContainText('EU/EFTA');
});

test('A destination replacement repairs an unauthorized origin change before offering adoption',async({page})=>{
  await draw(page);let calls=0;const bad=map('Gland');Object.assign(bad.variables.find(v=>v.id==='origin'),{value:'Gland',span:'Gland'});
  await page.route('https://fixture.invalid/chat',route=>{const body=route.request().postDataJSON();const response=++calls===1?{kind:'compare',update:'replace_fact',story:story.replace('Saint-Cergue','Gland'),answer:'',steps:[]}:calls===2?bad:map('Gland');if(calls===3)expect(body.messages.at(-1).content).toContain('fact/origin');return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  await page.locator('[data-converse-form] input').fill('We will move to Gland rather than Saint-Cergue.');await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();expect(calls).toBe(3);await page.getByRole('button',{name:'Adopt',exact:true}).click();
  const values=await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).vars);expect(values.find(v=>v.id==='origin').value).toBe('Nyon');expect(values.find(v=>v.id==='destination').value).toBe('Gland');
});
test('Adding a job rejects repeated unrelated departure rewrites and retains its completed mark',async({page})=>{
  await draw(page);await page.getByRole('button',{name:/^Announce departure/}).click();await page.locator('[data-done="departure"]').click();await page.locator('[data-action="close-detail"]').click();let calls=0;const bad=map();bad.branches[0].steps[0].title='A different departure action';
  await page.route('https://fixture.invalid/chat',route=>{const response=++calls===1?{kind:'fact',update:'add_fact',story:story+' I also work in Geneva.',answer:'',steps:[]}:bad;return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  await page.locator('[data-converse-form] input').fill('I also work in Geneva.');await page.locator('[data-converse-form] button').click();await expect(page.locator('#story')).toContainText('registration/departure');expect(calls).toBe(3);await expect(page.locator('.map-comparison')).toHaveCount(0);await expect(page.getByRole('button',{name:'Adopt',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/^Announce departure/}).click();await expect(page.locator('[data-done="departure"]')).toContainText('Done');await expect(page.locator('.sentence')).not.toContainText('Geneva');
});

test('Adding a fact repairs an existing branch rename before adoption',async({page})=>{
  await draw(page);const bad=map();bad.branches[0].name='Employment';let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{const response=++calls===1?{kind:'fact',update:'add_fact',story:story+' I also work in Geneva.',answer:'',steps:[]}:calls===2?bad:map();if(calls===3)expect(route.request().postDataJSON().messages.at(-1).content).toContain('registration');return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  await page.locator('[data-converse-form] input').fill('I also work in Geneva.');await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();expect(calls).toBe(3);await page.getByRole('button',{name:'Adopt',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).tree.branches[0].name)).toBe('Registration');
});
test('An additional goal cannot adopt a renamed duplicate of an old branch',async({page})=>{
  await draw(page);const bad=map(),copy=JSON.parse(JSON.stringify(bad.branches[2]));copy.id='life';copy.name='Life insurance';copy.steps.forEach(st=>st.id='new_'+st.id);bad.branches.push(copy);let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{calls++;return route.fulfill({json:{choices:[{message:{content:JSON.stringify(bad)}}]}});});
  await page.locator('[data-converse-form] input').fill('Can I also buy life insurance?');await page.locator('[data-converse-form] button').click();await expect(page.locator('#story')).toContainText('did not add steps in a new branch');expect(calls).toBe(2);await expect(page.locator('.map-comparison')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).tree.branches.length)).toBe(3);
});

test('Echoing an incomplete map keeps completion available until a real extension succeeds',async({page})=>{
  await draw(page);await page.evaluate(()=>{const key='public-ai-commune.v5',saved=JSON.parse(localStorage.getItem(key));saved.tree.incomplete=true;localStorage.setItem(key,JSON.stringify(saved));});await page.reload();await expect(page.locator('#conn-label')).toContainText('fixture');let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{calls++;return route.fulfill({json:{choices:[{message:{content:JSON.stringify(map())}}]}});});await page.getByRole('button',{name:'Complete map',exact:true}).click();await expect(page.locator('#story')).toContainText('map remains incomplete');await expect(page.getByRole('button',{name:'Complete map',exact:true})).toBeVisible();expect(calls).toBe(2);
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify(extended())}}]}}));await page.getByRole('button',{name:'Complete map',exact:true}).click();await expect(page.getByRole('button',{name:'Complete map',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.getByRole('button',{name:'Complete map',exact:true})).toBeVisible();
});

test('A legacy unrecorded source retains explicit refresh after completion and Undo',async({page})=>{
  await draw(page);await page.evaluate(()=>{const key='public-ai-commune.v5',saved=JSON.parse(localStorage.getItem(key));saved.tree.incomplete=true;delete saved.tree.branches[0].steps[0].sources[0].record;localStorage.setItem(key,JSON.stringify(saved));});await page.reload();await expect(page.locator('#conn-label')).toContainText('fixture');await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify(extended())}}]}}));
  await page.getByRole('button',{name:'Complete map',exact:true}).click();await expect(page.getByRole('button',{name:'Complete map',exact:true})).toHaveCount(0);await expect(page.locator('.catalogue-update')).toContainText('original source version was not recorded');await page.getByRole('button',{name:'Compare current sources',exact:true}).click();await expect(page.locator('.map-comparison')).toBeVisible();await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.getByRole('button',{name:'Compare current sources',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.getByRole('button',{name:'Compare current sources',exact:true})).toBeVisible();
});

test('A changed destination cannot restore an old commune source on an affected action',async({page})=>{
  const prior=map();Object.assign(prior.branches[0].steps[1],{short:'Register',title:'Register with the residents office',why:'Confirm registration with the residents office'});await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify(prior)}}]}}));await draw(page);const next=map('Gland');next.branches[0].steps[1]=JSON.parse(JSON.stringify(prior.branches[0].steps[1]));await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify(next)}}]}}));await alternative(page);await page.getByRole('button',{name:'Adopt',exact:true}).click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')));expect(saved.vars.find(v=>v.id==='destination').value).toBe('Gland');expect(saved.tree.branches[0].steps[1].sources).toEqual([]);expect(saved.tree.branches[0].steps[0].sources[0].record.schemaVersion).toBe(1);
});
test('A new fact repairs dropped open questions and renamed branches before adoption',async({page})=>{
  await draw(page);const bad=map();bad.questions=[];bad.branches[0].name='Employment';let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{const response=++calls===1?{kind:'fact',update:'add_fact',story:story+' I also work in Geneva.',answer:'',steps:[]}:calls===2?bad:map();if(calls===3){expect(route.request().postDataJSON().messages.at(-1).content).toContain('question/nationality');expect(route.request().postDataJSON().messages.at(-1).content).toContain('registration');}return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});await page.locator('[data-converse-form] input').fill('I also work in Geneva.');await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();expect(calls).toBe(3);await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('[data-q="nationality"]')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).tree.branches[0].name)).toBe('Registration');
});

test('An interpreted replacement repairs missing values and restores archived answers when revisiting a scenario',async({page})=>{
  await draw(page);await page.getByRole('button',{name:/^Register in/}).click();await page.locator('[data-done="arrival"]').click();await page.locator('[data-action="close-detail"]').click();await page.locator('[data-q="nationality"]').click();await page.getByRole('button',{name:'EU/EFTA',exact:true}).click();
  const gland=map('Gland');gland.questions.push({id:'local_choice',text:'Which local option?',why:'The local service',type:'choice',options:['Local A','Local B']});gland.branches[0].steps.push({id:'local_action',short:'Local option',title:'Check the local option',why:'Confirm the local service',depends_on:['local_choice'],sources:[],authority:'other',confirm_with:'Provider'});const bad=JSON.parse(JSON.stringify(gland));bad.variables=bad.variables.filter(v=>v.id!=='destination');const answered=JSON.parse(JSON.stringify(gland));answered.questions=answered.questions.filter(q=>q.id!=='local_choice');let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{const body=route.request().postDataJSON();calls++;const response=calls===1?{kind:'compare',update:'replace_fact',story:story.replace('Saint-Cergue','Gland'),changes:[{id:'destination',value:'Gland'}],answer:'',steps:[]}:calls===2?bad:calls===3?gland:calls===4?answered:map();if(calls===3)expect(body.messages.at(-1).content).toContain('fact/destination');if(calls===5)expect(body.messages[1].content.split('Previous map')[0]).not.toContain('Local A');return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  await page.locator('[data-converse-form] input').fill('We will move to Gland rather than Saint-Cergue.');await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();expect(calls).toBe(3);await page.getByRole('button',{name:'Adopt',exact:true}).click();await page.locator('[data-q="local_choice"]').click();await page.getByRole('button',{name:'Local A',exact:true}).click();await expect(page.locator('[data-answered="local_choice"]')).toContainText('Local A');await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Saint-Cergue"]').click();await expect(page.locator('.map-comparison')).toBeVisible();await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('[data-answered="local_choice"]')).toHaveCount(0);await expect(page.locator('[data-answered="nationality"]')).toContainText('EU/EFTA');await page.getByRole('button',{name:/^Register in/}).click();await expect(page.locator('[data-done="arrival"]')).toContainText('Done');expect(calls).toBe(5);
});
test('A directly stated nationality is previewed before resolving the question and a later correction is reversible',async({page})=>{
  await draw(page);const next=map();next.questions=[];
  await page.route('https://fixture.invalid/chat',route=>{const body=route.request().postDataJSON(),follow=body.messages[0].content.includes('They now write a follow-up');const french=body.messages[1].content.includes('Follow-up: I am French.');const value=french?'French':'Swiss';const response=follow?{kind:'fact',update:french?'replace_fact':'add_fact',story:story+' I am '+value+'.',answers:[{id:'nationality',value,quote:'I am '+value}],answer:'',steps:[]}:next;return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  const submit=async text=>{await page.locator('[data-converse-form] input').fill(text);await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();};
  await submit('I am Swiss.');await expect(page.locator('.proposed-answers')).toContainText(/What is your nationality\?[^]*Swiss/);await expect(page.locator('[data-answered="nationality"]')).toHaveCount(0);await page.getByRole('button',{name:'Keep',exact:true}).click();await expect(page.locator('[data-q="nationality"]')).toBeVisible();await submit('I am Swiss.');await page.getByRole('button',{name:'Confirm answer',exact:true}).click();await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('[data-answered="nationality"]')).toContainText('Swiss');await expect(page.locator('[data-q="nationality"]')).toHaveCount(0);await submit('I am French.');await expect(page.locator('.proposed-answers')).toContainText('French');await expect(page.locator('[data-answered="nationality"]')).toContainText('Swiss');await page.getByRole('button',{name:'Confirm answer',exact:true}).click();await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('[data-answered="nationality"]')).toContainText('French');await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.locator('[data-answered="nationality"]')).toContainText('Swiss');
});

test('A wrongly assigned workplace answer cannot be adopted as nationality without answering that question',async({page})=>{
  await draw(page);const next=map();next.questions=[];let calls=0;await page.route('https://fixture.invalid/chat',route=>{const response=++calls===1?{kind:'fact',update:'add_fact',story:story+' I work in Geneva.',answer:'',answers:[{id:'nationality',value:'Geneva',quote:'I work in Geneva'}]}:next;return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});await page.locator('[data-converse-form] input').fill('I work in Geneva.');await page.locator('[data-converse-form] button').click();await expect(page.locator('.proposed-answers')).toContainText('What is your nationality?');await expect(page.locator('.proposed-answers')).toContainText('Geneva');await expect(page.getByRole('button',{name:'Adopt',exact:true})).toBeDisabled();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).answers.nationality)).toBeUndefined();await page.getByRole('button',{name:'Confirm answer',exact:true}).click();await expect(page.getByRole('button',{name:'Adopt',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Undo confirmation',exact:true}).click();await expect(page.getByRole('button',{name:'Adopt',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Keep',exact:true}).click();await expect(page.locator('[data-q="nationality"]')).toBeVisible();await expect(page.locator('[data-answered="nationality"]')).toHaveCount(0);
});

test('The original request rejects an invented town and a saved return drops a current-only open question',async({page})=>{
  await draw(page);await page.locator('[data-q="nationality"]').click();await page.getByRole('button',{name:'EU/EFTA',exact:true}).click();const gland=map('Gland');gland.questions.push({id:'gland_only',text:'Which Gland service?',why:'The local service',type:'text',options:[]});gland.branches[0].steps.push({id:'gland_service',short:'Gland service',title:'Ask the Gland service',why:'Confirm the local service',depends_on:['gland_only'],sources:[],authority:'other',confirm_with:'Provider'});let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{calls++;const response=calls===1?{kind:'compare',update:'replace_fact',story:story.replace('Saint-Cergue','Lugano'),changes:[{id:'destination',value:'Lugano'}]}:calls===2?{kind:'compare',update:'replace_fact',story:story.replace('Saint-Cergue','Gland'),changes:[{id:'destination',value:'Gland'}]}:calls===3?gland:map();return route.fulfill({json:{choices:[{message:{content:JSON.stringify(response)}}]}});});
  const text='We will move to Gland rather than Saint-Cergue.';await page.locator('[data-converse-form] input').fill(text);await page.locator('[data-converse-form] button').click();await expect(page.locator('#story')).toContainText('not stated in your message');await expect(page.locator('.map-comparison')).toHaveCount(0);await expect(page.locator('[data-converse-form] input')).toHaveValue(text);expect(calls).toBe(1);await page.locator('[data-converse-form] button').click();await expect(page.locator('.map-comparison')).toBeVisible();await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('[data-q="gland_only"]')).toBeVisible();await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Saint-Cergue"]').click();await expect(page.locator('.map-comparison')).toBeVisible();await expect(page.locator('#story')).toContainText('Questions outside the proposed path: Which Gland service?');await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('[data-q="gland_only"]')).toHaveCount(0);expect(calls).toBe(4);
});

test('Returning to a saved scenario retains its unanswered question even when the current scenario answered it',async({page})=>{
  await draw(page);await alternative(page);await page.getByRole('button',{name:'Adopt',exact:true}).click();await page.locator('[data-q="nationality"]').click();await page.getByRole('button',{name:'EU/EFTA',exact:true}).click();const bad=map();bad.questions=[];let calls=0;await page.route('https://fixture.invalid/chat',route=>{calls++;if(calls===2)expect(route.request().postDataJSON().messages.at(-1).content).toContain('question/nationality');return route.fulfill({json:{choices:[{message:{content:JSON.stringify(calls===1?bad:map())}}]}});});await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Saint-Cergue"]').click();await expect(page.locator('.map-comparison')).toBeVisible();expect(calls).toBe(2);await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('[data-q="nationality"]')).toBeVisible();await expect(page.locator('[data-answered="nationality"]')).toHaveCount(0);
});
