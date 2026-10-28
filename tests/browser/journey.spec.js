'use strict';
const {test,expect}=require('@playwright/test');
const {map,story}=require('../fixtures');
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
  const renamed=map();renamed.branches[0].id='generated_registration';renamed.branches[0].steps[0].id='generated_departure';await page.route('https://fixture.invalid/chat',route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify(renamed)}}]}}));
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

test('An additional goal cannot adopt a renamed duplicate of an old branch',async({page})=>{
  await draw(page);const bad=map(),copy=JSON.parse(JSON.stringify(bad.branches[2]));copy.id='life';copy.name='Life insurance';copy.steps.forEach(st=>st.id='new_'+st.id);bad.branches.push(copy);let calls=0;
  await page.route('https://fixture.invalid/chat',route=>{calls++;return route.fulfill({json:{choices:[{message:{content:JSON.stringify(bad)}}]}});});
  await page.locator('[data-converse-form] input').fill('Can I also buy life insurance?');await page.locator('[data-converse-form] button').click();await expect(page.locator('#story')).toContainText('did not add steps in a new branch');expect(calls).toBe(2);await expect(page.locator('.map-comparison')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('public-ai-commune.v5')).tree.branches.length)).toBe(3);
});
