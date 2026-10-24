# Consultant handover and pilot acceptance

Baseline: PR #1 is merged. The follow-on PRs separate proxy operations, device/state recovery, source-pack governance, and browser/evaluation evidence. They prepare a bounded pilot; they do not establish an operating municipal service or an approved knowledge base.

## Evidence to hand to the client

Run the application regressions, proxy tests and any pack checks added by the other PRs. `npm ci --ignore-scripts && npx playwright install chromium && npm run test:browser` runs real desktop/mobile Chromium journeys with fictional model fixtures. CI retains screenshots, HTML reports, failure traces and generated PDFs for fourteen days. A fixture run proves browser behaviour under controlled responses; it does not evaluate Apertus or civic truth. Inspect the generated PDF and narrow-screen screenshots before acceptance.

The ten scenarios in `tests/evaluation-cases.json` are the fictional situations from `EVALUATION.md`. `node tools/evaluate.js --list` prints them. To run actual model calls after the operator starts the proxy:

```
EVAL_ORIGIN=https://artfisica.github.io node tools/evaluate.js \
  --proxy https://YOUR-PROXY --output /tmp/commune-evaluation.json --max-calls 25
```

Use an environment variable `EVAL_DEMO_TOKEN` for a restricted proxy, never a CLI argument or committed file. The runner makes sequential calls with a hard call-count cap, retains raw fictional responses, durations, model identity and normalized maps, and saves after every case. Coverage reviews can consume a second request. A complete technical map always remains `humanReview: pending` and `releaseApproved: false`. Failed/partial runs exit nonzero. `--cases 1,2` can rehearse a subset, which is explicitly an incomplete set. Do not use this runner with real participant stories.

On 24 October 2026 the repository's published Codespaces URL returned HTTP 404 on `/health`. No live-model evaluation is claimed from that endpoint. Restarting or replacing it requires the operational owner's active Codespace/provider access. No inference account or hosting contract has been changed by these PRs.

## Acceptance gates and responsibilities

| Gate | Evidence required | Accountable owner | Current boundary |
| --- | --- | --- | --- |
| Software behaviour | Passing checks, inspected desktop/mobile screenshots and PDFs, regression report | Technical consultant/client technical owner | Automated fixture tests available; human UX acceptance still required |
| Civic content | Exact pages, narrow claims, jurisdiction, reviewer identity, approval record, dates and recheck plan | Named municipal/cantonal content owner | Imported notes remain drafts |
| Consequential rules | Reviewed applicability conditions, exceptions, test cases and office approval | Domain owner with technical implementer | No reviewed deterministic obligations are claimed |
| Model quality | Ten live cases with each action/source match and unsupported assertion reviewed; failure log | Domain reviewer and evaluation lead | Runnable set; endpoint must be restored and human review completed |
| Operations | Selected host, durable counters, verified ingress, health checks, incident owner, backup/rollback rehearsal | Client operational owner | Deployment contract available; no host provisioned |
| Data handling | Provider terms/retention/location checked, operator contact, participant information and consent process | Client service/data owner | Browser control does not establish a complete privacy programme |
| Resident usability | Five consented observed sessions including FR/EN and mobile; accessible interaction observations | Research lead/client | Automated browser tests are not resident sessions |
| Release decision | Named sign-off against the evidence above and documented residual risks | Client sponsor | No automatic production approval |

Confirm these owners and a funded pilot scope at kickoff. Never present Public AI, a municipality or a provider as a partner without its agreement. Do not publish personal interviews, consent forms or identifiable situations in public GitHub artifacts.

## Implementation sequence after these PRs

1. Restore one maintained inference endpoint and rerun the ten cases; record failed and unsupported steps rather than smoothing them into a success narrative.
2. Have content owners review the bounded Nyon/Saint-Cergue journey and Gland comparison. Preserve gaps where no approved page exists.
3. Translate approved conditions into deterministic, versioned rules with explicit unknown/contradiction handling. Until those conditions are signed off, leave model steps labelled proposals.
4. Run the observed resident sessions, fix evidenced usability issues, rehearse incident/rollback handling and make a documented expand/revise/stop decision.

A national gazetteer, two-model comparison, evidence snapshots, live transport integration and additional languages remain separately scoped expansion decisions. They are not prerequisites for evaluating one bounded journey and are not silently promised as completed features.
