// Validate the inline application script without fetching fonts or calling a provider.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
if (scripts.length !== 1 || !scripts[0][1].trim()) {
  throw new Error('Expected exactly one nonempty inline application script');
}
new vm.Script(scripts[0][1], { filename: 'index.html (inline)' });
console.log('inline script syntax passed');
