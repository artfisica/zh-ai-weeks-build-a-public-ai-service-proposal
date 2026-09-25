# Public AI for every commune — proposal and prototype

Swiss {ai} Weeks, Zurich · "Build a public AI service" challenge

**What this is:** a working journey-tree prototype with official source links and an Apertus connection. A person tells their situation in one sentence; the guide grows five branches (registration & permit, school, housing, transport, costs); changing an earlier answer shows, before anything is applied, which steps would change, appear or disappear; every step says what its official source establishes, whether a commune has reviewed it, and who to confirm with. The demonstration case is a move from Nyon to Saint-Cergue, with Gland as the alternative.

**What it is not yet:** commune packs authored by communes, and live public-data integration. Transport open data is identified in the interface but not loaded. No commune has reviewed the content; every card says so.

**Why it is a public service:** it helps a resident understand the consequences of a choice, see which office owns each step, and inspect the source. Apertus reads a person's words and explains a comparison; the application keeps the path, links and decision state inspectable. The Nyon → Saint-Cergue journey is one human case. The long-term plan is a shared engine with versioned commune content packs, so a small commune can contribute without building its own AI service.

Live page: https://artfisica.github.io/zh-ai-weeks-build-a-public-ai-service-proposal/

## Repository

```
index.html                         the prototype, one self-contained file (GitHub Pages serves it)
SPEC.md                            interaction and data-model spec
proxy/server.js                    the proxy (Node, runs in one Codespace): key, demo tokens, budget, provenance
proxy/proxy.config.json            provider, model, allowed origins, budget (no secrets)
.devcontainer/devcontainer.json    starts the proxy in the Codespace, forwards port 8787
DEMO.md                            the three-minute solo demo script
```

## Run locally

```
python3 -m http.server 8000
```

Open http://localhost:8000. Everything works offline except the Apertus connection; the guide texts are labelled "texte préparé" until a model is connected.

## Where the key lives (GitHub only)

GitHub Pages is static and cannot hold a secret at runtime. The proxy therefore runs in a **GitHub Codespace** (`proxy/server.js`, plain Node, no dependencies), and the key is a **Codespaces secret** injected as an environment variable. It never enters the repository, the build output or the page. Anyone can use the public page and try the model while the Codespace runs. The proxy pins one provider and one model, allows up to 120 requests per UTC day in this Codespace, and limits requests per visitor address to 12 per hour. The total budget is the important protection: browser origins and visitor addresses are not authentication. Another Codespace would have its own counter. If the proxy is unavailable, the prepared journey tree remains usable on GitHub Pages.

## Deploy in order

1. **Pages.** Settings → Pages → Source "Deploy from a branch" → `main` / `(root)`. Live at the URL above within a minute or two, everything labelled "texte préparé".
2. **Codespaces secret.** Your profile picture → Settings → Codespaces → Secrets → New secret. Create `APERTUS_API_KEY` (the Swisscom key). Under "Repository access", select this repository. Leave `DEMO_TOKEN` unset so every visitor can use the model.
3. **Provider.** Edit `proxy/proxy.config.json` on GitHub: `upstreamBase` (the API base from the Swisscom hacker guide, the part before `/chat/completions`) and `upstreamModel` (the Apertus model id). Commit to main. Change `authHeader`/`authPrefix` only if the guide documents something other than `Authorization: Bearer`.
4. **Start the proxy.** Repo → green "Code" button → tab "Codespaces" → "Create codespace on main". Wait for the editor; the startup log shows `ready: yes` (or what is missing). If the log is not visible, run `cat /tmp/public-ai-commune-proxy.log` in the Codespace terminal.
5. **Make the port public.** Bottom panel → tab "Ports" → row `8787` → right-click → Port Visibility → Public. Copy the "Forwarded Address" (`https://…-8787.app.github.dev`). Paste it in a new tab with `/health` at the end: you want `"ready": true`.
6. **Let visitors connect automatically.** After port 8787 is public and `/health` is ready, edit the single `PUBLIC_PROXY_URL = ''` line near the start of `index.html` on GitHub. Put the forwarded address between the quotes and commit it. GitHub Pages will then check `/health` when each visitor opens the page and connect automatically. No visitor needs a token, key or setup instructions. Leave the line empty if you only want the static guide online.

Before creating the Codespace, Settings → Codespaces → "Default idle timeout" → 240 minutes (the maximum). Keep interacting with the Codespace during the demo: an open browser tab alone does not reset the idle timer. After a restart, check `/health`, reselect **Public** for port 8787 (GitHub resets port visibility to private), and check its forwarded address before reconnecting the page. GitHub Pages stays online; live AI works only while this Codespace and public port are available.

## Sources used by the prototype

Specific pages: Nyon Contrôle des habitants; Saint-Cergue "Arrivée à St-Cergue"; Vaud change-of-address procedure (eDéménagement conditions by permit, list of communes); SEM permit B EU/EFTA; SEM permits for third-country nationals; ch.ch moving checklist; Statistique Vaud communal tax decrees; Vaud directive on communal voting rights. Site roots, flagged as such in the interface: Gland, DGEO, ACI, Mobilis, opentransportdata.swiss, Saint-Cergue éducation and taxes. Content is illustrative and hedged; each step says where to verify.

## Next steps

- Extract the existing Nyon, Saint-Cergue and Gland content into versioned commune packs, preserving the same step identifiers and provenance display; add a small review workflow before any commune is named as reviewer.
- Add one visible, dated public-data integration: an NStCM journey from the Swiss Open Journey Planner, subject to its API access, alongside the official link and the prepared fallback.
- Add another case beyond moving, such as owner versus tenant home repairs, to demonstrate the engine is reusable across life events.
- Finish the mobile layout (vertical tree, one branch at a time), run a screen-reader pass, and let visitors give feedback on where a step or link is unclear.

The solo demo run, timings and fallbacks are in `DEMO.md`.
