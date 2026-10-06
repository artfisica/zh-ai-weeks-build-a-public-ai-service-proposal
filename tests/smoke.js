// Run with: node tests/smoke.js (no dependencies, no provider key)
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
script = script.replace('  load(); renderConn(); render();',
  '  globalThis.__app = {state, conn, validate, sourceBlock, diffBranches, renderStory, doneKey, isDone, converse, applySuggestedStory, storyWithVars, answersFor, scenarioKey, adopt}; load(); renderConn(); render();');
const els = new Map();
function element(id) {
  if (!els.has(id)) els.set(id, {
    innerHTML: '', textContent: '', hidden: true, style: {}, className: '',
    classList: { toggle() {} }, setAttribute() {}, addEventListener() {},
    scrollIntoView() {}, getAttribute() { return null; }
  });
  return els.get(id);
}
const storage = new Map();
const context = {
  document: { documentElement: {}, body: { classList: { toggle() {} } }, getElementById: element, addEventListener() {} },
  window: { innerWidth: 1280 }, location: { protocol: 'http:', hostname: 'localhost' },
  navigator: { language: 'en' },
  localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
  sessionStorage: { getItem: () => null, setItem() {} },
  fetch: async () => ({ ok: false }), setTimeout() {}, console
};
vm.createContext(context);
vm.runInContext(script, context);
const { state, conn, validate, sourceBlock, diffBranches, renderStory, doneKey, isDone, converse, storyWithVars, answersFor, scenarioKey, adopt } = context.__app;
const story = 'I live in Nyon and will move to Saint-Cergue. I hold a B permit.';
const raw = {
  variables: [{ id: 'commune', value: 'Saint-Cergue', span: 'Saint-Cergue', alternatives: ['Gland'] }],
  questions: [], branches: [{ id: 'registration', name: 'Registration', steps: [{
    id: 'arrive', title: 'Register your arrival', short: 'Register arrival', why: 'Commune changes',
    depends_on: ['commune'], authority: 'commune', confirm_with: 'Residents office',
    sources: [{ id: 'stcergue-arrival', claim: 'c1' }, { id: 'invented', claim: 'c1' }]
  }] }]
};
const tree = validate(raw, story);
assert.equal(tree.branches[0].steps[0].sources.length, 1);
assert.equal(tree.branches[0].steps[0].sources[0].id, 'stcergue-arrival');
assert.match(sourceBlock(tree.branches[0].steps[0]), /review pending/);
assert.doesNotMatch(sourceBlock(tree.branches[0].steps[0]), /Checked 25/);
const a = tree.branches[0].steps[0], b = { ...a, why: 'Another reason' };
assert.equal(diffBranches([{ id: 'registration', name: 'Registration', steps: [a] }],
  [{ id: 'registration', name: 'Registration', steps: [b] }])[0].cmp[0].kind, 'changed');
state.vars = tree.variables; state.answers = {}; state.done = [doneKey('arrive')];
assert.equal(isDone('arrive'), true);
state.vars = [{ ...tree.variables[0], value: 'Gland' }];
assert.equal(isDone('arrive'), false);
state.vars = tree.variables;
assert.equal(isDone('arrive'), true);
assert.equal(storyWithVars(story, [{ ...tree.variables[0], value: 'Gland' }], tree.variables),
  'I live in Nyon and will move to Gland. I hold a B permit.');
state.answers = { q_permit: 'EU/EFTA' };
state.answerSets[scenarioKey(tree.variables)] = { answers: state.answers };
assert.equal(Object.keys(answersFor([{ ...tree.variables[0], value: 'Gland' }])).length, 0);
assert.equal(answersFor(tree.variables).q_permit, 'EU/EFTA');
state.answers = {}; state.answerSets = {};
state.story = story; state.tree = tree; state.vars = tree.variables;
state.answers = { q_permit: 'EU/EFTA' };
state.pending = { id: 'commune', from: 'Saint-Cergue', to: 'Gland', vars: [{ ...tree.variables[0], value: 'Gland' }], tree };
adopt();
assert.match(state.story, /move to Gland/);
assert.equal(Object.keys(state.answers).length, 0);
assert.equal(state.vars[0].span, 'Gland');
state.pending = { id: 'commune', from: 'Gland', to: 'Saint-Cergue', vars: [{ ...state.vars[0], value: 'Saint-Cergue' }], tree };
adopt();
assert.equal(state.story, story);
assert.equal(state.answers.q_permit, 'EU/EFTA');
state.answers = {}; state.answerSets = {};
state.story = 'I live in Nyon & my child is 8. Saint-Cergue is the destination.';
state.tree = tree; state.vars = [
  { id: 'home', label: 'Home', value: 'Nyon', span: 'Nyon', alternatives: [] },
  { id: 'child', label: 'Child', value: '8', span: '8', alternatives: [] },
  { id: 'destination', label: 'Destination', value: 'Saint-Cergue', span: 'Saint-Cergue', alternatives: [] }
];
renderStory({ tree, previewOn: false, exploreOn: false });
const storyHtml = element('story').innerHTML;
assert.match(storyHtml, /I live in <button/);
assert.match(storyHtml, /Nyon<\/button> &amp; my child is <button/);
assert.match(storyHtml, /Saint-Cergue<\/button> is the destination/);

// Follow-up facts stay a visible proposal until the visitor adopts them.
conn.status = 'ok'; conn.proxyUrl = 'https://example.invalid';
context.fetch = async url => url.endsWith('/chat') ? ({ ok: true, json: async () => ({
  choices: [{ message: { content: JSON.stringify({ kind: 'fact', story: 'I now rent in Gland.', answer: '', steps: [], not_covered: false }) } }],
  provenance: { provider: 'test', model: 'test' }
}) }) : ({ ok: false });
converse('I now rent in Gland.').then(() => {
  assert.equal(state.story, 'I live in Nyon & my child is 8. Saint-Cergue is the destination.');
  assert.equal(state.suggestedStory, 'I now rent in Gland.');
  assert.match(element('story').innerHTML, /Adopt and redraw/);
  console.log('smoke checks passed');
}).catch(e => { console.error(e); process.exitCode = 1; });
