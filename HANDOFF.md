# Current handover

The October prototype has moved from ZIP-based patches to reviewed GitHub pull requests. Do not copy files from an older update package over the current checkout. Start from the merged `main`, inspect the open PRs and their CI evidence, and merge the focused changes through review.

The detailed consultant handover and acceptance gates are in [CONSULTANT-HANDOVER.md](docs/CONSULTANT-HANDOVER.md). The companion operations, device-data and source-governance documents arrive with their respective PRs; merge those PRs before treating the combined handover as complete.

## Software checks

`npm ci --ignore-scripts`, `node tests/check-inline.js`, `node tests/smoke.js`, `node --test tests/proxy.js` and `npm run test:browser` cover the prototype and its real Chromium interactions using fictional responses. The operations/source-pack PRs add budget and catalogue checks; run their documented commands as well. Browser reports, screenshots and PDFs are retained as CI artifacts. Do not confuse these fixtures with live model evaluation.

## Before use with residents

The operator must restore the inference endpoint, establish the hosted deployment and verify its retention/processing account. The content owner must review the bounded journey and source/action matches. Run the ten-case live evaluation, inspect every consequential assertion, and complete observed FR/EN/mobile sessions before release acceptance. The published proxy returned 404 during the 24 October review; no successful live evaluation is claimed.

Use fictional data for development. Keep keys and rehearsal tokens out of Git, command-line arguments, issue bodies and screenshots. No municipal endorsement, production availability or reviewed deterministic civic rules are claimed by these PRs. Those require named client owners and evidence, as detailed in the handover.
