# October 6 review package

This is a local proposed update to the September 25 main-branch ZIP. Nothing in this package has been pushed to GitHub or connected to a real provider key.

## Apply to the repository

Copy only the files in this update package into your existing repository checkout, preserving their paths. `index.html`, `README.md`, `SPEC.md` and `DEMO.md` replace the root files. `proxy/server.js` replaces that path under `proxy/`. `PILOT.md`, `LICENSE`, `NOTICE`, `HANDOFF.md` and `tests/smoke.js` are new. Review the diff, commit and push from your own checkout. Do not put `APERTUS_API_KEY` or other secrets in the repository.

**Do not replace** the live `proxy-url.json`, `proxy/proxy.config.json`, `proxy/start.sh`, `.devcontainer/` or `demo.gif`. They are unchanged by this update. The old duplicate root-level `server.js`, `start.sh` and `proxy.config.json` can be removed after checking that your Codespace still starts through `proxy/start.sh`; this cleanup is not needed for Thursday's demo.

Then, in the Codespace, restart the old server (a running Node process does not pick up a changed file):

```bash
git pull --ff-only
pkill -f '[n]ode proxy/server.js' || true
bash proxy/start.sh
```

Check the Codespace **Ports** tab for public port 8787, `/health` for `ready: true`, and the live page header for the expected model. The static page and the proxy are deployed separately; a pushed `index.html` can be live while the old proxy is still running.

## What changed

- The first-screen map preview, path animation, plan panel, follow-up field and multiple catalogue references are included.
- Two stale ch.ch links were replaced. A generic arrival deadline was removed; Vaud's precise eDéménagement conditions are linked instead.
- Catalogue notes are draft notes, shown in French or English, with no invented check date or reviewer. A source id is validated, but the match between a model-generated step and the page is still pending review.
- A fact from the follow-up field proposes an editable new sentence; it cannot silently rewrite the accepted story. Adopting a word in the visible fork now changes the saved sentence too.
- Question answers and done marks are scoped to the scenario. Answers are set aside for a different commune and restored on a round trip. Explore does not accept answers or done marks.
- A provider name no longer implies that processing happened in Switzerland. A processing-location label appears only when explicitly configured after independent verification.
- README, SPEC and DEMO now match the shipped prototype. `PILOT.md` gives Public AI a narrow six-week decision with owners and measurable outputs. The full Apache 2.0 text is in LICENSE.

## Checks and limitations

`node tests/smoke.js` checks source-id filtering, draft status, changed-step detection, word placement, scenario-scoped done/answers, the adopted sentence round trip and follow-up fact confirmation. Inline JavaScript and proxy syntax checks pass. A real model request and browser click test could not be run in the sandbox; the local runtime cannot open a listening port. Rehearse the exact Nyon → Saint-Cergue → Gland sequence in the live Codespace before the recorded session.

The application still lets Apertus generate consequential steps and pick catalogue references. The code restricts URLs, not the truth of a sentence. The proposed pilot moves reviewed conditions into deterministic, maintained packs. The public Codespace is still a presenter-operated demo and may sleep; it is not a production endpoint.
