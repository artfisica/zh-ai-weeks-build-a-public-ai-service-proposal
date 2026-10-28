# Additional goals and comparison clarity

The user’s report showed an additional insurance question being treated as a replacement of an existing tenancy-dispute answer, with an unchanged alternative map, oversized buttons and a truncation warning that named an unavailable Redraw action. The interaction required application fixes, not special user phrasing.

A live reproduction with a fictional legal-insurance map and the confirmed answer “Tenancy issues” classified “can I have also a live insurance? how?” as a comparison. It generated a proposal without a useful additional path. Another captured response nested variables, clarification questions and the note inside a branch, so the old validator discarded those fields. The model also guessed an incorrect meaning for “live insurance”; its unsupported answer was withheld by the existing catalogue-only guidance rule.

## Changes

- Explicit additional requests bypass replacement routing and retain the original story, answers and unchanged actions. The new path must contain an added action; a repeated original map is a failure, not a successful addition.
- “Live insurance” in an additional request asks for confirmation of “life insurance” before any model call. The user can confirm or edit the original wording. No coverage interpretation is silently applied.
- Addition proposals preserve the original answer definitions and completion context through Adopt and Undo. A failed addition retains its addition intent when retried.
- Ordinary questions cannot use a model-supplied target to overwrite an answered question unless the user expressed replacement/comparison intent.
- Nested root fields trigger bounded repair. Truncated comparative maps also trigger repair and cannot be offered for adoption. Initial partial maps remain explicitly incomplete and have a working Complete map button.
- Comparison buttons use short labels. Answer-only proposals explicitly explain that the mapped steps remain unchanged. Empty provider-note cards are omitted.
- Empty HTTP 404 responses identify an unavailable Codespace/address rather than exposing a JSON parser error.

## Validation and limits

Application regressions cover preservation of the original answer, completion context, Adopt/Undo, no-op additions, changed/deleted old actions, ordinary-question routing, truncation, completion, typo clarification, nested fields and retry context. Browser checks exercise clarification → addition → Adopt and completion of an initial partial map in Chromium, Firefox and WebKit, including mobile layouts.

The final confirmed-addition live check was interrupted when the Codespace endpoint returned HTTP 404. Therefore the corrected complete follow-up has automated fixture coverage but is not yet live-model approved. Prompt adherence and civic-content accuracy remain unresolved evaluation concerns; see the earlier generation review. Do not claim a technically accepted map is factually verified.

## PR #7 review corrections

The subsequent automated review identified three valid gaps: [completion could discard partial actions](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/7#discussion_r4397522590), [an addition could be folded into an old branch](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/7#discussion_r4397522591), and [an old branch could be renamed](https://github.com/artfisica/zh-ai-weeks-build-a-public-ai-service-proposal/pull/7#discussion_r4397522596).

Completion now has an explicit preservation contract: existing branch names and actions must remain unchanged before a completed response can replace the partial tree. Both the completion button and legacy redraw form use this path. A failed response gets one repair attempt and leaves the saved partial map unchanged; a successful completion records history for Undo. Explore completion remains isolated from the saved situation. Additional goals require a genuinely new branch with an action, and both completion and addition validate existing branch names as well as step content.

Regressions reproduce all three pre-fix failures, cover five ways a completion could lose or alter existing work, verify saved-data preservation after failure and Undo after success, and exercise the completion failure/repair/recovery flow in all browser projects. These checks do not require live model access.
