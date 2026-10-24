# Source pack maintenance

Implemented pilot boundary: fourteen existing catalogue entries are now maintained in five JSON packs. All imported notes remain **draft**, with no reviewer or source-check date invented. `node tools/catalogue.js --write` regenerates the catalogue embedded in the static page. Commit the packs and generated page together; `node tools/catalogue.js` and CI reject stale output. The page still needs no build step when served.

This is a limited first version, not the full retrieval proposal. The existing explicit place list selects federal/unscoped references and matching cantonal/municipal entries. No recognised place means no local pack is offered. The model cannot cite an id outside that request's selection. The catalogue content digest participates in map-cache keys, and printed plans carry its revision and per-source pack versions. The place list is not a national gazetteer; ambiguous/unsupported places still need human clarification. Topic retrieval, evidence snapshots and a complete commune register remain future work.

## Review workflow

1. Choose the exact source and its jurisdiction. Open the page in its original language; check that each narrow note is supported, including qualifications and exceptions. A working URL alone is not a content check.
2. Keep `exact: false` for entry sites and tools that do not establish the proposed action. `level` is the publisher category; `jurisdiction` is the applicability filter. Independent tools remain `other`.
3. Record the note's `kind` (`regulation`, `practice`, `community`), status, reviewer, review date, source check date and recheck date. A reviewed note requires all review fields. A conflict needs `status: disputed` plus a `dispute`; community knowledge requires attribution.
4. Increase the pack version, regenerate, run checks and submit a PR. Get a content owner in the relevant jurisdiction to approve the wording. Code review and a name in JSON do not authenticate that person's approval; retain the approval record in the client's agreed system.
5. Recheck on the recorded date and when the source changes. Retired, disputed and community notes are withheld from model note prompts. Community knowledge needs its own attributed interface before it can be included; it is not silently treated as regulation.

Reviewed catalogue wording does not approve a model's step or prove that the note supports that generated step. The interface continues to label the model/source match unreviewed. An approved deterministic rule layer needs its own review of conditions before consequential obligations can be called reviewed.

No new rights to third-party text are asserted by extracting these existing repository notes. Agree licensing and contribution terms with content owners before accepting new contributed or copied material. Do not put interviews, personal stories or identifiable participant information into public packs or PRs.

## Link availability

`node tools/check-source-links.js /tmp/source-links.json` checks HTTP HEAD availability with bounded concurrency and timeouts. Redirects, non-200 statuses and network failures require inspection; a server can reject HEAD while its page still works. The report does not update review dates, verify facts or approve a generated step. This optional network check is separate from deterministic CI so third-party outages do not silently alter packs.

The [24 October availability report](evidence/source-links-2026-10-24.json) recorded HTTP 200 for all fourteen existing URLs. The transport-data root redirected to its German entry page; this remains an entry site, not a computed timetable or an exact procedure. These results do not change any note's draft status or check date.
