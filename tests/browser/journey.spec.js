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
