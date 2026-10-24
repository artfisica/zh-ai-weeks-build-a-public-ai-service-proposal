# Preparing the prototype for the Public AI follow-up

The goal is to improve this personal project before Monday's reply to the Public AI people.

## What has improved

The changes address concrete prototype problems: malformed proxy requests, budget persistence, missing rehearsal-token support, lost hypothetical answers, corrupt browser data, stale connection checks, simultaneous sentence edits and mobile draft loss. The source catalogue now has editable versioned packs and limits which references a particular request may cite. All existing civic notes remain drafts.

Real Chromium checks exercise the desktop and mobile journeys, including Keep/Adopt/Undo, Explore, reload and PDF export. The combined changes passed 83 automated tests. Those fixture tests establish application behaviour; they do not establish live model quality or the accuracy of civic advice.

## Before replying on Monday

1. Merge the reviewed prototype fixes. PR #3 precedes #5; inspect the startup/runtime changes in #2 before adopting them. Container hosting is optional and is not needed for the reply.
2. Start the existing Codespace and check the published `/health` endpoint and the page's connection label. It returned 404 during the 24 October check, so restoring the existing demo connection is the immediate practical blocker.
3. Rehearse the Nyon → Saint-Cergue example, compare Gland, Keep, Adopt and Undo. Check one answered-question change and return from Explore. Try the mobile layout and an exported PDF.
4. Run the fictional live-model evaluation when the endpoint is available. Inspect unsupported statements, source mismatches and failures. Do not present fixture-generated screenshots as live Apertus results.
5. In the reply, describe the improvements actually observed, link the working demo/repository, and distinguish what works from what you would like to explore with Public AI. The existing proposal in `PILOT.md` remains a possible next step, not an agreed engagement.

## Optional live checks

`node tools/evaluate.js --list` lists the ten fictional cases from `EVALUATION.md`. With the proxy running:

```
EVAL_ORIGIN=https://artfisica.github.io node tools/evaluate.js \
  --proxy https://YOUR-PROXY --output /tmp/public-ai-rehearsal.json --max-calls 25
```

Set `EVAL_DEMO_TOKEN` in the environment if rehearsal access requires one. The runner saves raw fictional responses, model identity, durations and normalized maps after each case. A technical result always leaves content review pending. A failed or incomplete requested selection exits nonzero; a successful subset exits zero while `completeSet` remains false. `--cases 1,2,3,7` intentionally records a partial rehearsal rather than a completed ten-case evaluation.

For browser checks: `npm ci --ignore-scripts`, `npx playwright install chromium`, then `npm run test:browser`. Screenshots, PDFs and reports are retained as CI artifacts. A broader hosting migration, municipal content approval or resident study can be discussed later; none is a prerequisite for an honest reply about this prototype on Monday.
