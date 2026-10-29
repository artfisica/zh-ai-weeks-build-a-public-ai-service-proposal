# Source pack maintenance

Implemented pilot boundary: fifteen catalogue entries are maintained in six JSON packs. All notes remain **draft**, with no human reviewer or approval date invented. Six exact official pages were read on 29 October; the recorded source-check date means agent inspection, not human approval. `node tools/catalogue.js --write` regenerates the catalogue embedded in the static page. Commit the packs and generated page together; `node tools/catalogue.js` and CI reject stale output. The page still needs no build step when served.

This is a limited first version, not the full retrieval proposal. The existing explicit place list selects federal/unscoped references and matching cantonal/municipal entries. No recognised place means no local pack is offered. The model cannot cite an id outside that request's selection. The catalogue content digest participates in map-cache keys, and printed plans carry its revision and per-source pack versions. The place list is not a national gazetteer; ambiguous/unsupported places still need human clarification. Topic retrieval, evidence snapshots and a complete commune register remain future work.

## Review workflow

1. Choose the exact source and its jurisdiction. Open the page in its original language; check that each narrow note is supported, including qualifications and exceptions. A working URL alone is not a content check.
2. Keep `exact: false` for entry sites and tools that do not establish the proposed action. `level` is the publisher category; `jurisdiction` is the applicability filter. Independent tools remain `other`.
3. Record the note's `kind` (`regulation`, `practice`, `community`), status, reviewer, review date, source check date and recheck date. A reviewed note requires all review fields. A conflict needs `status: disputed` plus a `dispute`; community knowledge requires attribution.
4. Increase the pack version, regenerate, run checks and submit a PR. Get a content owner in the relevant jurisdiction to approve the wording. Code review and a name in JSON do not authenticate that person's approval; retain the approval record in the PR or a linked review record.
5. Recheck on the recorded date and when the source changes. Retired, disputed and community notes are withheld from model note prompts. Community knowledge needs its own attributed interface before it can be included; it is not silently treated as regulation.

Reviewed catalogue wording does not approve a model's step or prove that the note supports that generated step. The interface continues to label the model/source match unreviewed. An approved deterministic rule layer needs its own review of conditions before consequential obligations can be called reviewed.

No new rights to third-party text are asserted by extracting these existing repository notes. Agree licensing and contribution terms with content owners before accepting new contributed or copied material. Do not put interviews, personal stories or identifiable participant information into public packs or PRs.

## Link availability

`node tools/check-source-links.js /tmp/source-links.json` checks HTTP HEAD availability with bounded concurrency and timeouts. Redirects, non-200 statuses and network failures require inspection; a server can reject HEAD while its page still works. The report does not update review dates, verify facts or approve a generated step. This optional network check is separate from deterministic CI so third-party outages do not silently alter packs.

The [24 October availability report](evidence/source-links-2026-10-24.json) recorded HTTP 200 for all fourteen existing URLs. The transport-data root redirected to its German entry page; this remains an entry site, not a computed timetable or an exact procedure. These results do not change any note's draft status or check date.

## Saved-plan provenance

New maps retain a validated record of each selected page and note, stamped from the catalogue after model validation. Source details and print output use that record instead of silently replacing it with later wording. The model cannot provide archive records, and restored records cannot introduce script URLs or a different publisher. Archived versions are labelled; stale notes are withheld from follow-up guidance. A catalogue-update comparison is a proposal with Keep/Adopt/Undo, so refreshing cannot silently replace the saved map. Older maps without records show that their original source version was not recorded.

Archive metadata is stripped from subsequent model prompts, avoiding prompt growth as plans are revisited. The place list recognises explicit canton names and common Saint-Cergue spellings, but remains deliberately limited rather than guessing a jurisdiction for every Swiss place.

## 29 October source inspection and change proposals

[The inspection record](evidence/pilot-source-inspection-2026-10-29.json) identifies exact Nyon, Saint-Cergue, Gland, Vaud and SEM pages, content hashes, narrow claims, applicability and exclusions. Citizenship is an unanswered personal question; arriving from Spain does not answer it. The pilot renders neutral preparation/questions while conditions await human review. Unsupported renovation, document, medical or permit assertions are withheld in titles, explanations and notes. A contact or entry page helps verify a question; its URL alone does not prove an obligation. Source gaps are included in print output.

Follow-up proposals contain operations, not replacement maps. The app copies unchanged accepted actions and archived records itself. Only newly added or replaced actions receive new catalogue records; the provider cannot author archives or review metadata. Explicit source refresh is also a reversible comparison.

## Service and contact applicability

`services` declares the resident needs for which a page is a relevant entry point; `contactFor` separately records when the page actually identifies the competent contact. Publisher level and a matching canton do not establish either condition. Initial maps and all actions affected by a changed input are checked against these declarations. Unrelated references are withheld with a visible gap. Private-insurance steps have no catalogue fallback. These declarations are agent-maintained pilot scope, not human approval of an obligation.
