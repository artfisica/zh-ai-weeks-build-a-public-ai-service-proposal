# Resident journey validation — 29 October 2026

Proposed PR #10, based on main `42c625569003a9dc73c57613888b95fc595c32d8`. This is a development validation record, not a deployment or human content approval.

## Current result

The [fresh live acceptance journey](evidence/live-core-working-build-2026-10-29.json) passed every requested stage using Public AI / `swiss-ai/apertus-v1.5-70b`, with eight provider requests. It exercised five editable facts, a real Saint-Cergue → Gland proposal and source inspection, Keep/repeat/Adopt/Undo, preserved nationality and completed departure after adding Geneva employment, workplace Gland without changing the home destination, confirmed additional insurance, Explore isolation, reload and Print/PDF. [Initial screenshot](evidence/live-core-working-build-2026-10-29-initial.png), [comparison screenshot](evidence/live-core-working-build-2026-10-29-comparison.png), and [printed plan](evidence/live-core-working-build-2026-10-29.pdf) are from that actual provider run. Its exact HTML SHA256 is `2548c81fbdac156ed942b4996a1a08e4d618e9116602c35fda2ab993d320e556`.

That pass does **not** establish that every ordinary situation works. The subsequent [independent twelve-case corpus](evidence/live-independent-oracle-2026-10-29.json) used sixteen provider requests and passed nine cases. Cases 5, 6 and 10 failed fact extraction. Expected personal facts and resident needs are independently specified in `tests/evaluation-cases.json`; successful parsing alone does not pass this evaluation.

The three failures exposed incorrect character offsets on otherwise exact literal quotations and French goal/recent-past phrases incorrectly treated as supplied personal facts. The proposed corrections resolve an exact quotation only if it occurs uniquely, still reject invented or ambiguous evidence, and distinguish future rental goals/recent-past verbs from current tenure/country. Raw-response regressions cover these failures. **Their live retest and a fresh final-build acceptance journey remain pending:** the public Codespace forwarding URL returned HTTP 404 despite a healthy local proxy. [Blocked targeted attempt](evidence/live-independent-oracle-blocked-forwarding-2026-10-29.json) made no provider calls. The user is rebuilding the Codespace.

## Request accounting

The user explicitly increased the combined evaluation allowance from 40 to 100 requests. The original [40-call ledger](evidence/live-request-ledger-2026-10-29.json) remains historical evidence. The [extended ledger](evidence/live-request-ledger-extended-2026-10-29.json) contains 64 attempted provider calls, including the original forty; 36 remain. Health probes do not consume provider requests. Failed network chat attempts are conservatively counted. No separate ledger resets the total.

The original [corpus](evidence/live-contract-evaluation-2026-10-29.json), [targeted rerun](evidence/live-contract-rerun-2026-10-29.json) and earlier browser artifacts document preceding iterations. They must not be substituted for final-build validation. Fixture-backed browser screenshots establish interface behaviour only; they are not live Apertus evidence.

## Implementation and review corrections

Typed fact extraction precedes journey generation. Roles distinguish workplace, origin, destination, housing, children, permit and citizenship, with literal evidence and focused confirmation. Follow-ups use one command type and revisioned operations. The application copies unchanged accepted actions and owns answers, completion, provenance and archived evidence. A model response cannot authorise a reset. Provider calls are bounded by four per operation, one repair per stage and an overall deadline.

The six independent review findings are addressed by structured action addresses, supplementation of partial fact extraction, service-scoped sources and competent contacts, institutional verification tasks, field-level provenance and dependency reassessment independent of text equality. Private insurance retains a source gap rather than acquiring a cantonal authority. Source re-scoping includes unchanged affected actions. Added goals cannot insert into existing branches, and ordinary fact additions use the same coverage checks as initial understanding.

Latest inline findings on `cb4d327` are addressed in the proposed amendment: required replacements inspect all displayed action fields, and post-processing rejects stale prior values; verification tasks follow changed facts. The live-resume tool derives skipped stages from recorded successes, requires matching durable checkpoints and refuses transient comparison resumes. Fresh runs remain the release acceptance evidence.

## Deterministic verification and limits

See [local validation](evidence/local-validation-2026-10-29.json) for exact build hashes and current counts. The complete final run with four workers passed 123 Node tests, 30 storage/rendering regressions and all 132 browser checks across Chromium desktop/mobile, Firefox and WebKit mobile. A preceding unrestricted-worker run passed 127/132 checks with five timeouts; the four Safari failures passed individually and all five passed in the complete four-worker rerun. No assertion or timeout was weakened. Node, catalogue, proxy, storage and browser checks remain separate from model and source correctness.

All fifteen source entries remain drafts. [Six exact official-page inspections](evidence/pilot-source-inspection-2026-10-29.json) record narrow findings and exclusions; successful HTTP responses are not human review. Unsupported obligations become neutral verification tasks with visible source gaps. No municipal approval, permit entitlement or processing guarantee is asserted by this validation.

Published discovery and a clearly labelled interactive recorded outage example are a separate, unmerged availability change. Main and the public site have not been modified by this PR. Latest-commit review and live final-build validation are required before merge consideration; no automatic merge or publication is authorised.
