# Validation record — 24 October 2026

The four pilot PR branches were combined in a temporary local checkout, separate from `main`. Their changes merged together after ignore-file entries were made independent.

| Check | Result |
| --- | --- |
| Application/state/source regressions | 55 passed |
| Real HTTP proxy integration | 8 passed |
| Budget persistence/corruption/rollover | 4 passed |
| Source-pack schema/selection/review changes | 6 passed |
| Evaluation-runner fixture tests | 2 passed |
| Desktop/mobile Chromium journeys | 8 passed |
| Inline JavaScript, catalogue regeneration, shell syntax, diff whitespace | Passed |

Total: 83 automated tests passed on the combined software. Tests use fictional situations and fixture credentials. Browser evidence includes initial desktop/mobile screenshots, actual generated PDFs and failure traces when applicable. The desktop screenshot and PDF text were inspected locally; this does not constitute resident or accessibility acceptance. Browser CI repeats the journeys on Linux with Node 24 and retains artifacts for fourteen days. The container workflow builds and checks an unprivileged image with fixture configuration; no live provider call or deployment is part of that check.

The link-availability check recorded HTTP 200 at all fourteen source URLs, with one transport-data language redirect. No note was promoted to reviewed. Availability cannot establish that a page supports a model-generated step.

The published Codespaces proxy returned HTTP 404 on `/health`. The ten-case live-model run is therefore blocked on an active endpoint, and no live inference success is claimed. Docker was not running locally, so local image build/runtime validation was unavailable; the dedicated CI workflow supplies that check. No paid resources, provider settings or production deployment were changed.

The [consultant handover](CONSULTANT-HANDOVER.md) lists the human review, service ownership and resident testing still required for a bounded pilot. A complete technical map or a green CI run is not a civic-content approval.
