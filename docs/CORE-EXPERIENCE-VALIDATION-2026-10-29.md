# Resident facts and reversible journey changes — 29 October 2026

Proposed build on `feat/resident-change-contract`, based on `42c625569003a9dc73c57613888b95fc595c32d8`. Upstream main was checked again before submission and remained at that commit. This record describes a proposed PR, not a deployment or content approval.

## Result and limits

Personal facts are extracted separately from journey generation, with typed roles and literal text evidence. The app owns their editable controls, question IDs and accepted state. Follow-ups return revisioned operations; unchanged accepted actions, answers and source archives are copied by the app. A hypothetical never authorises a reset. Keep discards a proposal; Adopt applies it; Undo restores its full accepted snapshot. Old saved zero-fact maps offer explicit recovery without silently discarding the old plan.

Unreviewed instructions become neutral preparation questions. A source URL is an entry point, not evidence of a resident's obligation. Citizenship is not inferred from Spain as a country of departure. All fifteen source entries remain drafts. Six exact official pages were read: [inspection, narrow findings and exclusions](evidence/pilot-source-inspection-2026-10-29.json). Human approval remains pending.

This is **not a full live acceptance pass**. The shared 40-request allowance is exhausted. The additional insurance goal failed during live browser testing; repair was blocked by the cap. Live Explore fact-change/return and reload/Print acceptance steps were not executed. They have deterministic browser coverage only. The final goal-specific prompt and malformed-envelope guards have regression coverage but no further live retest. Remaining work is a separately authorised live rehearsal and human content review, not another invisible evaluation loop.

## Deterministic verification

`npm run test:all` covers inline syntax, generated contracts/catalogue, 30 storage/rendering regressions, 96 Node tests, and browser journeys in Chromium desktop/mobile, Firefox and WebKit mobile. All 100 browser checks passed (25 journeys across four configurations). Catalogue review-change checks against the baseline and `git diff --check` also run before submission.

The [baseline failure](evidence/omitted-facts-before.txt) reproduces the supplied-facts omission against original main using the new test. Raw operation regressions cover unknown dependencies, step prerequisites, contradictory intent, invented replacement values, unknown targets, stale revisions/responses, cancellation, bounded repairs, question-specific confirmation, previous nationality and completed departure, destination/workplace distinction, source archives, goal preservation, no-op detection, language switching and saved-plan recovery.

[Migration inventory](evidence/contract-test-migration.json): 30 provider-independent smoke tests remain. Tests that required the provider to reproduce whole accepted maps were replaced by raw typed-contract and operation tests. The test adapter does not translate legacy model output into passing proposals. Browser provider responses are explicit fixtures; their results and screenshots establish UI behaviour, not live Apertus quality.

## Live evidence — Public AI / swiss-ai/apertus-v1.5-70b

All requests went through the real configured public proxy on port 8788. No key was provided to the evaluation tools. The [shared ledger](evidence/live-request-ledger-2026-10-29.json) records 40 attempted chat calls, including network failures. Health checks are separate. No further provider call was made after exhaustion.

- [Initial ten-case corpus](evidence/live-contract-evaluation-2026-10-29.json): 14 requests, seven cases accepted and three dependency failures. It records timing, actual raw output, editable facts, dependency resolution, relevant needs and comparison results.
- [Targeted rerun of cases 2, 3 and 9](evidence/live-contract-rerun-2026-10-29.json): three requests; those three accepted after dependency normalization. The combined corpus therefore exercised all ten cases successfully across iterations, **not all on one final build**. A technically accepted map does not certify its source correctness.
- The remaining 23 requests were real browser attempts. [First connection attempt](evidence/live-core-journey-2026-10-29.json) was blocked while the Codespace was off. [First resumed run](evidence/live-core-journey-resumed-2026-10-29.json) exposed incorrect arrival scope. [Next run](evidence/live-core-journey-final-2026-10-29.json) reached Keep/Adopt/Undo, then exposed intent sentinels and insertion ordering. [Verified run](evidence/live-core-journey-verified-2026-10-29.json) again reached Keep/Adopt/Undo but a later request exposed redundant JSON braces. [Continuation](evidence/live-core-continuation-2026-10-29.json) preserved the same failure for inspection.
- [Last allowance](evidence/live-core-last-allowance-2026-10-29.json) resumed the actual prior live checkpoint. Adding Geneva employment preserved nationality, source records and the completed departure. The Gland workplace hypothetical kept Saint-Cergue as the destination. The additional goal returned an unauthorised operation in an existing branch; rejection preserved accepted work. Its repair could not run because the ledger reached 40. Earlier successful steps are explicitly labelled `previous-live-pass`, not rerun passes.

[Actual live comparison screenshot](evidence/live-core-journey-verified-2026-10-29-comparison.png) shows editable facts, unchanged departure, proposed Gland arrival, both versions, source status and Keep/Adopt. These images use actual provider responses, not fixtures. Each live report records the exact page/contract SHA-256 at execution; later corrections are not retroactively attributed to those builds. Raw model replies are failure evidence and may contain unsupported statements that the rendering policy withholds.

Observed times vary: successful workplace additions/comparisons in the last allowance took roughly 3.6–3.8 seconds; initial corpus generations took longer, with timings per case. Network forwarding also failed independently of model generation. No latency guarantee is claimed.

## Reproduction and operation

Run `npm test`, then `npm run test:browser -- --workers=4`. After editing `lib/journey-contract.js`, run `node tools/contracts.js --write`; after pack changes run `node tools/catalogue.js --write`. Commit the generated page with its source modules/packs.

Live tooling is opt-in: `tools/evaluate.js` records corpus metrics, and `tools/live-journey.js` drives the real browser sequence. Both accept a shared `EVAL_TOTAL_BUDGET_FILE` ledger. Do not reset this run's exhausted ledger to manufacture a pass. Reports use fictional situations only. Browser fixtures and live tools are separate.

The proxy implementation and published `proxy-url.json` are unchanged. Published discovery still points at 8787; this rehearsal used the manually configured running 8788 endpoint. Codespaces must remain running and forwarding publicly for visitors to connect. This PR does not publish a runtime URL or deploy the proposed app.

## Final checks and review

Final local checks passed: 96 Node tests, 30 storage/rendering regressions, 100 browser checks, generated contract/catalogue checks, catalogue review-change validation and whitespace checks. PR checks and latest-commit review must be inspected before any future merge. This task does not authorise merging or publishing.

## PR review corrections

Review of `4efbf4a` found [stale alternatives on scenario restore](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/10#discussion_r4408036225) and [archived labels restored in the wrong language](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/10#discussion_r4408036228). Both were reproduced with failing regressions before correction. Restoration now rebuilds alternatives and records scenario language. A cross-language restoration localizes app-owned action labels and validates translation of the archived question/definition inventory, keeping source archives, answers and completion. Failure leaves accepted work intact; translated completion identities are added only on adoption. The existing bounded question-label stage is shared with the language switch. No further live provider calls were made.
