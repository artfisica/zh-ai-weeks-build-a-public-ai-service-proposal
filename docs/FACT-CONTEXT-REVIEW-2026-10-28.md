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
