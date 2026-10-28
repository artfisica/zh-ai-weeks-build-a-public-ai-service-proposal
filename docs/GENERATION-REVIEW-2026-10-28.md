# Generation repair and live checks — 28 October 2026

The live PublicAI proxy reproduced the reported question, “What steps are needed to obtain legal insurance?” The first answer took 15.7 seconds and split the map into two top-level JSON objects. The extractor accepted only the variables object; validation rejected it because it contained no branches. A second call returned an empty map. The old repair prompt supplied neither the failed answer nor an assistant turn containing it. The first answer also confused legal-expenses protection with health insurance. These are separate format and content failures, not an authentication failure.

The update requests a single branch-first object, distinguishes focused private-service requests from broad life transitions, and asks for clarification rather than substituting a different service. It tightens instructions about unsupported obligations and questions that should ask for personal facts rather than regulations. A repair receives the actual failed response (bounded to 10,000 characters), the validation error and the original request. Multiple top-level objects are rejected rather than silently losing later fields. Source filtering, validation, comparison continuity and the bounded retry policy remain in force. A valid answer is not replaced with invented local fallback steps.

Repair and coverage progress are now visible. The initial message no longer promises 10–30 seconds. Recognized upstream authentication, quota and timeout errors have distinct messages; authentication failures no longer suggest rephrasing. Raw provider error bodies are not displayed. The discovery file now points to the current running Codespace; saved tab connection settings can still override discovery.

## Live validation

Requests used the existing Codespace proxy, which reported provider `Public AI` and model `swiss-ai/apertus-v1.5-70b`. No API key was retrieved or stored locally. These are individual observations with fictional inputs, not a statistically meaningful latency benchmark. The model and service can vary between calls.

| Input | Model calls | Observed duration | Technical result |
| --- | ---: | ---: | --- |
| English legal-insurance question from the report | 1 | 6.9 s | Complete map |
| French legal-expenses-insurance question | 1 | 7.7 s | Complete map |
| Nyon → Saint-Cergue, homeowner, child, B permit | 2 | 23.3 s | Complete map |
| Arrival from Spain to work in Nyon with family | 1 | 13.6 s | Complete map |
| Roof repair, insulation and solar panels in La Cure | 1 | 7.2 s | Complete map |
| Saint-Cergue → Geneva for work with a child | 2 | 20.5 s | Complete map |

“Complete” means accepted by the application, not factually approved. The complex Spain-arrival response still framed parts as an intercommunal move, discussed an EU-specific permit before nationality was answered and suggested checking an online domestic move service. The moving responses sometimes grouped multiple areas in one branch and omitted useful paths despite the coverage check. These cases remain unsuitable as evidence of reliable civic advice. Prompt instructions improve behavior but do not guarantee relevance, source support or legal accuracy. All source notes remain drafts. Further independent scenario review is required before a civic pilot or claims of factual reliability.

Raw fictional request/response traces were retained temporarily outside the repository during diagnosis. Automated regressions cover split responses, actual-response repair context, a bounded empty-map failure, visible repair cancellation, credential errors and timeout/quota handling. Browser regressions check repair progress, recovery, authentication feedback and preservation of the initial draft. Automated fixtures establish application behavior, not live model quality.
