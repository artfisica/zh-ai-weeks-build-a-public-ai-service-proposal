'use strict';
const {test,expect}=require('@playwright/test');
const {map,story}=require('../fixtures');
test.beforeEach(async({page})=>{
  await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.route('**/proxy-url.json',route=>route.fulfill({json:{url:'https://fixture.invalid'}}));
  await page.route('https://fixture.invalid/health',route=>route.fulfill({json:{ready:true,maxTokens:3500,provider:'fixture',model:'fixture-model'}}));
  await page.route('https://fixture.invalid/chat',route=>{
    const prompt=route.request().postDataJSON().messages.at(-1).content;
    const sentence=(prompt.match(/^Situation: ([^\n]+)/)||[])[1]||story;
    return route.fulfill({json:{choices:[{message:{content:JSON.stringify(map(sentence.includes('Gland')?'Gland':'Saint-Cergue'))}}],provenance:{provider:'fixture',model:'fixture-model'}}});
  });
  await page.goto('/');await expect(page.locator('#conn-label')).toContainText('fixture');
});
async function draw(page){await page.locator('[data-start-form] textarea').fill(story);await page.locator('[data-start-form] button').click();await expect(page.locator('.journey-map')).toBeVisible();}
async function alternative(page){await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Gland"]').click();await expect(page.locator('.map-comparison')).toBeVisible();}
test('Generate, compare, Keep, Adopt and Undo preserve the accepted situation',async({page},info)=>{
  await draw(page);await page.screenshot({path:info.outputPath('initial.png'),fullPage:true,animations:'disabled'});
  await alternative(page);await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  await page.getByRole('button',{name:'Keep',exact:true}).click();await expect(page.locator('.map-comparison')).toHaveCount(0);
  await alternative(page);await page.getByRole('button',{name:'Adopt',exact:true}).click();await expect(page.locator('.sentence')).toContainText('Gland');
  await page.getByRole('button',{name:'Undo change',exact:true}).click();await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Answer, Explore, reload and completion stay isolated',async({page})=>{
  await draw(page);await page.locator('[data-sel="0|departure|0"]').first().click();await page.locator('[data-done="departure"]').click();await page.locator('[data-action="close-detail"]').click();await page.locator('[data-q="nationality"]').click();await page.getByRole('button',{name:'EU/EFTA',exact:true}).click();
  await page.locator('#mode-explore').click();await alternativeInExplore(page);
  await page.locator('#mode-situation').click();await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  await expect(page.locator('[data-answered="nationality"]')).toContainText('EU/EFTA');
  await page.reload();await expect(page.locator('.sentence')).toContainText('Saint-Cergue');
  await page.locator('[data-sel="0|departure|0"]').first().click();await expect(page.locator('[data-done="departure"]')).toContainText('Done');
  await expect(page.locator('[data-answered="nationality"]')).toContainText('EU/EFTA');
});
async function alternativeInExplore(page){await page.locator('[data-var="destination"]').click();await page.locator('[data-propose="destination"][data-value="Gland"]').click();await expect(page.locator('.sentence')).toContainText('Gland');}
test('Print plan includes all branches and produces an actual PDF',async({page},info)=>{
  await draw(page);await page.getByRole('button',{name:'My plan',exact:true}).click();
  await page.evaluate(()=>{window.print=()=>{window.__printRequested=true;};});
  await page.getByRole('button',{name:'Print / PDF',exact:true}).click();
  await expect(page.locator('#print-plan')).toContainText('Transport');await expect(page.locator('#print-plan')).toContainText('unreviewed by a commune');
  expect(await page.evaluate(()=>window.__printRequested)).toBe(true);
  await page.pdf({path:info.outputPath('fictional-plan.pdf'),format:'A4'});
});
test('Generation failure leaves a retryable draft and a working connection',async({page})=>{
  await page.route('https://fixture.invalid/chat',route=>route.fulfill({status:502,json:{error:'upstream unreachable'}}));
  await page.locator('[data-start-form] textarea').fill(story);await page.locator('[data-start-form] button').click();
  await expect(page.locator('.empty [role="alert"]')).toContainText('502');await expect(page.locator('[data-start-form] textarea')).toHaveValue(story);
  await expect(page.locator('#conn-label')).toContainText('fixture');
});
