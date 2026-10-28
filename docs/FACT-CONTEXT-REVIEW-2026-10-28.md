# Follow-up facts and context, 2026-10-28

The independent review of main at `c4c2709` identified two reproducible failures: a workplace hypothetical selected a home-destination shortcut, and adopting an ordinary job fact cleared nationality and completed actions. Both also reproduced on PR #8 at `040f1a3`.

## Resulting behavior

The direct shortcut accepts only whole-sentence replacements naming the existing value and its known alternative. Natural sentences go through interpretation with their original text. The interpreter distinguishes an added fact, a replacement and a new situation. A stated fact to keep, such as “still move to Saint-Cergue,” cannot be contradicted by an interpreted target or changes array without clarification.

Adding a fact preserves accepted variable definitions and permits additional grounded variables, such as a workplace separate from a home destination. Same-situation updates and variable replacements send existing confirmed answers to generation and retain them on adoption. Answered question ids cannot acquire a different meaning. Unchanged actions retain archived source evidence; completion marks continue to depend on action meaning and relevant facts. Changing destination therefore preserves a completed departure but does not complete the changed arrival.

A new situation requires Start over or an explicit “New situation: …” command. The latter previews the reset and clears previous answers and completion marks only on adoption; Undo restores the previous situation. A model response cannot independently authorize that reset.

## Verification

Eight new named regressions cover interpretation, conflicting retained facts, natural replacements, job additions, answered-question meaning, affected completion marks, explicit new situations and unauthorized resets. Existing checks remain in place. Browser coverage includes both originally reported journeys. `npm run test:all -- --workers=4` passed: 113 named application regressions, 44 Node tests, and 80 browser cases across desktop Chromium, mobile Chromium, Firefox and mobile WebKit (237 checks total).

Live-provider validation is pending while the published Codespaces proxy is unavailable. Fixture/browser checks verify application behavior, not the provider's interpretation quality or the correctness of administrative guidance.

## Required merge gate

Per the repository owner's instruction: before merging any PR, wait for review to finish on the latest commit, inspect both general and inline comments, address the findings, and wait for the updated commit's review. Green CI alone does not authorize merging. Apply this to PR #8 and this follow-up independently; merge in dependency order and evaluate each result before proceeding.

## Review findings addressed

- [Restrict replacements to facts the user named](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/9#discussion_r4403066624): replacement permissions are calculated from the requested/interpreted input before calling map generation. An interpreter changes array explicitly supplies affected ids; a full edited story permits changing only facts absent from that input. The returned map cannot authorize extra replacements. Protected variable definitions and unrelated actions must remain unchanged. Targeted variable replacements also validate protected facts and the requested new value.
- [Reject unrelated action rewrites when adding a fact](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/9#discussion_r4403066639): accepted actions whose known dependencies remain unchanged must match exactly, including dependency ids, wording and sources. Unchanged accepted source archives are restored before comparison. A job addition may add a work-related action; it cannot rewrite a completed origin-only departure. Repeated failures leave the accepted map in place and offer no Adopt button.

Four further named regressions cover both story and changes-array replacements, bounded failure, action-field mutations, permitted new actions and targeted replacements. Two additional browser journeys cover repair before adoption and repeated-repair failure with the completed action retained. `npm run test:all -- --workers=4` passed on this revision: 117 application regressions, 44 Node tests and 88 browser cases (249 checks total).

A refreshed review found [accepted branch labels could change during fact additions](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/9#discussion_r4403509752). Fact additions now require every accepted branch name to remain unchanged, as well as preserving ids and order. A repeated rename is rejected without changing the saved map; a valid repair retains Registration before adoption. Both regression and browser checks cover the finding.
