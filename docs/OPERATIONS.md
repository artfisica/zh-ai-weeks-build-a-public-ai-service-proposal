# Pilot operations

This repository supplies a single-process proxy, not a hosted service. No host has been provisioned by these changes. Use Node 24 LTS; Node 20 is end of life ([Node release schedule](https://nodejs.org/en/about/previous-releases)). Rebuild an existing Codespace after the base-image upgrade.

## Deployment contract

Run one replica per API budget. Use a durable writable directory for `BUDGET_DIR`, with the same owner as the process. Multiple processes must not share this file; a transactional shared counter is required before adding replicas. Daily/hourly limits count dispatched requests, including failed or cancelled requests. Budget writes use atomic replacement and sync the new file before renaming. Corrupt or unwritable storage blocks new model calls and makes health unready.

Build `docker build -t commune-proxy .`. Run behind an HTTPS reverse proxy, with a persistent volume at `/data`, environment secrets `APERTUS_API_KEY`, `UPSTREAM_BASE`, `UPSTREAM_MODEL`, and a mount containing the operator-approved `proxy/proxy.config.json` at `/app/proxy/proxy.config.json:ro`. Do not bake secrets into an image. The container runs as an unprivileged user. Mount ownership must permit that user to write counters. Test the image on the selected host before release; a Dockerfile alone is not a hosting guarantee.

`TRUST_PROXY=true` enables the leftmost `X-Forwarded-For` address only when the operator has established that the ingress strips client-supplied forwarding headers and supplies its own. Otherwise the socket address is used. Origin and address checks remain abuse controls, not authentication. For a restricted pilot set `DEMO_TOKEN`, distribute rehearsal tokens out of band and keep allowed origins narrow. Public demos have a bounded shared key and can still be exhausted by non-browser callers.

Limits: `dailyBudget`, `hourlyPerCaller`, `maxTokens`, `maxConcurrent` (default 4), `maxUpstreamBytes` (1 MiB), `upstreamTimeoutMs` (55 seconds). Invalid limit configuration stops startup. Upstreams require HTTPS except loopback test servers. Upstream diagnostics are withheld; the proxy never deliberately logs message bodies or secret headers. Provider processing location and retention require separate verification.

## Codespaces

The startup script now starts the checked-out version without pulling, committing or publishing automatically. Run `git pull --ff-only` explicitly, then `bash proxy/start.sh`. A PID file limits restarts to this checkout; it does not kill unrelated Node processes. A pre-existing server started by an older script must be stopped once by the operator. A failed readiness check exits nonzero and never publishes a URL.

To deliberately publish a demo endpoint and update the static discovery file, use `PUBLISH_PROXY_URL=1 bash proxy/start.sh` from a clean branch with repository push access. Check the diff first; this action makes the port public and commits/pushes `proxy-url.json`. A regular startup leaves port visibility unchanged. Recheck the page's connection panel afterwards.

## Before exposing a pilot

Assign an operational owner and backup. Verify `/health` reports the intended model, token policy and durable budget; test one fictional generation, a wrong token, quota exhaustion on a test instance and restart persistence. Configure host availability checks without logging request text. Establish an incident contact, key rotation procedure and funding limit. SIGTERM aborts active upstream work and closes the server; allow at least six seconds before forced termination.

For budget corruption, stop the process, preserve the damaged counter for investigation and establish a conservative remaining allowance from provider accounting. Repair the JSON with a valid UTC day, nonnegative integer `used` and `callers` object, then restart. Never erase a damaged budget to reset spend without the cost owner's approval. If the persistent volume is lost, keep the service closed until spend is reconciled.

Rollback: deploy the previous known-good commit/image with the same budget volume and secrets. Do not roll back or delete the counter. Recheck health and a fictional request. Codespaces and the container image require different deployment paths; choose one owner-operated path before a resident pilot.
