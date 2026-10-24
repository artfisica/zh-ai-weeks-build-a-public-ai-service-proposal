'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BudgetStore } = require('../proxy/budget');
function fixture(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(),'commune-budget-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); return path.join(dir,'.budget.json'); }
test('Budget survives restart and enforces both limits', t => {
  const file=fixture(t), store=new BudgetStore(file,3,1);
  assert.equal(store.take('one').ok,true);assert.equal(store.take('one').reason,'caller');
  const restarted=new BudgetStore(file,3,1);assert.equal(restarted.peek().used,1);
  assert.equal(restarted.take('two').ok,true);assert.equal(restarted.take('three').ok,true);assert.equal(restarted.take('four').reason,'daily');
  assert.equal(fs.existsSync(file+'.tmp'),false);
});
test('Corrupt and malformed budgets fail closed rather than resetting allowance', t => {
  const file=fixture(t);
  for (const text of ['{','null','{}','{"day":"2026-10-24","used":-1,"callers":{}}','{"day":"2026-10-24","used":1,"callers":{"x":null}}']) {
    fs.writeFileSync(file,text);const store=new BudgetStore(file,3,1);assert.equal(store.take('one').reason,'storage');assert.equal(store.peek().remaining,0);assert.equal(fs.readFileSync(file,'utf8'),text);
  }
});
test('A failed persistence attempt blocks subsequent calls',t=>{
  const file=fixture(t),store=new BudgetStore(file,3,1);assert.equal(new BudgetStore(path.join(file,'missing'),3,1).take('one').reason,'storage');fs.mkdirSync(file+'.tmp');
  assert.equal(store.take('one').reason,'storage');fs.rmdirSync(file+'.tmp');assert.equal(store.take('two').reason,'storage');assert.equal(store.peek().used,0);
});
test('UTC hour and day rollover reset only their own limits',t=>{
  const file=fixture(t);let date=new Date('2026-10-24T10:01:00Z');const store=new BudgetStore(file,2,1,()=>date);
  assert.equal(store.take('one').ok,true);date=new Date('2026-10-24T11:01:00Z');assert.equal(store.take('one').ok,true);assert.equal(store.take('two').reason,'daily');
  date=new Date('2026-10-25T00:01:00Z');assert.equal(store.take('one').ok,true);assert.equal(store.peek().used,1);
});
