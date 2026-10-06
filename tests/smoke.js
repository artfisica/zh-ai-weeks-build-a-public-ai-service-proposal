// Run with: node tests/smoke.js (no dependencies, no provider key)
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
script = script.replace('  load(); renderConn(); render();',
  '  globalThis.__app = {state, conn, validate, sourceBlock, diffBranches, renderStory, renderTree, mapLabelLines, doneKey, isDone, converse, applySuggestedStory, storyWithVars, answersFor, scenarioKey, adopt, systemPrompt, extractJSON, fetchTree}; load(); renderConn(); render();');
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
const { state, conn, validate, sourceBlock, diffBranches, renderStory, renderTree, mapLabelLines, doneKey, isDone, converse, storyWithVars, answersFor, scenarioKey, adopt, systemPrompt, extractJSON, fetchTree } = context.__app;
assert.match(systemPrompt(), /"sources" MUST be an array/);
assert.doesNotMatch(systemPrompt(), /"source" MUST be one of these catalog ids/);
assert.match(systemPrompt(), /one to five branches/);
assert.doesNotMatch(systemPrompt(), /at least 3 branches/);
assert.match(html, /id="announcer"[^>]+aria-live="polite"/);
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
const brokenSuffix = JSON.stringify(raw).replace(/}\s*$/, ']}');
assert.equal(extractJSON(brokenSuffix).truncated, true);
assert.equal(tree.branches[0].steps[0].sources.length, 1);
assert.equal(tree.branches[0].steps[0].sources[0].id, 'stcergue-arrival');
assert.match(sourceBlock(tree.branches[0].steps[0]), /review pending/);
assert.match(sourceBlock(tree.branches[0].steps[0]), /Unreviewed/);
assert.match(sourceBlock(tree.branches[0].steps[0]), /Draft · Commune/);
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

// Four nodes plus a long branch name and six questions used to paint over the detail panel.
const carSteps = Array.from({ length: 4 }, (_, i) => ({ ...a, id: 'car_' + i, short: 'Pay import duties and VAT' }));
const carQuestions = Array.from({ length: 6 }, (_, i) => ({ id: 'question_' + i, text: 'A question with several words?' }));
renderTree({ tree: { ...tree, questions: carQuestions }, rows: [{ id: 'car', name: 'Importing a car from France to Switzerland', cmp: carSteps.map(st => ({ id: st.id, a: st, b: null, kind: 'same' })) }], answers: {}, previewOn: false, exploreOn: false });
const mapHtml = element('tree-host').innerHTML;
const mapWidth = Number(mapHtml.match(/viewBox="0 0 (\d+) /)[1]);
assert.ok(mapWidth >= 1320, `map should include the last question and branch label, got ${mapWidth}`);
assert.match(mapHtml, new RegExp(`min-width:${mapWidth}px`));
assert.match(mapHtml, /aria-label="Importing a car from France to Switzerland"/);
assert.ok(mapLabelLines('Pay import duties and VAT', 18, 2).length === 2);
assert.doesNotMatch(html, /\.tree svg\{[^}]*overflow:visible/);

// Follow-up facts stay a visible proposal until the visitor adopts them.
conn.status = 'ok'; conn.proxyUrl = 'https://example.invalid';
context.fetch = async url => url.endsWith('/chat') ? ({ ok: true, json: async () => ({
  choices: [{ message: { content: JSON.stringify({ kind: 'fact', story: 'I now rent in Gland.', answer: '', steps: [], not_covered: false }) } }],
  provenance: { provider: 'test', model: 'test' }
}) }) : ({ ok: false });
converse('I now rent in Gland.').then(async () => {
  assert.equal(state.story, 'I live in Nyon & my child is 8. Saint-Cergue is the destination.');
  assert.equal(state.suggestedStory, 'I now rent in Gland.');
  assert.match(element('story').innerHTML, /Adopt and redraw/);
  // A malformed first map gets one shorter retry, as in the live Gland fork.
  let calls = 0;
  context.fetch = async url => url.endsWith('/chat') ? ({ ok: true, json: async () => ({
    choices: [{ message: { content: ++calls === 1 ? '{"variables":[]}]' : JSON.stringify(raw) } }],
    provenance: { provider: 'test', model: 'test' }
  }) }) : ({ ok: false });
  const retried = await fetchTree(story + ' retry test', [], {}, tree, { id: 'commune', from: 'Saint-Cergue', to: 'Gland' });
  assert.equal(calls, 2);
  assert.equal(retried.branches[0].steps[0].title, 'Register your arrival');
  assert.equal(retried.incomplete, false);
  console.log('smoke checks passed');
}).catch(e => { console.error(e); process.exitCode = 1; });
