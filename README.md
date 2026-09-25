# Public AI for every commune — proposal and prototype

Swiss {ai} Weeks, Zurich · "Build a public AI service" challenge

**What this is:** a working journey-tree prototype with official source links and an Apertus connection. A person tells their situation in one sentence; the guide grows five branches (registration & permit, school, housing, transport, costs); changing an earlier answer shows, before anything is applied, which steps would change, appear or disappear; every step says what its official source establishes, whether a commune has reviewed it, and who to confirm with. The demonstration case is a move from Nyon to Saint-Cergue, with Gland as the alternative.

**What it is not yet:** commune packs authored by communes, and live public-data integration. Transport open data is identified in the interface but not loaded. No commune has reviewed the content; every card says so.

**Why it is a public service:** it helps a resident understand the consequences of a choice, see which office owns each step, and inspect the source. Apertus reads a person's words and explains a comparison; the application keeps the path, links and decision state inspectable. The Nyon → Saint-Cergue journey is one human case. The long-term plan is a shared engine with versioned commune content packs, so a small commune can contribute without building its own AI service.

Live page: https://artfisica.github.io/zh-ai-weeks-build-a-public-ai-service-proposal/

The interface is bilingual: FR / EN toggle in the header; the language follows the browser by default and is remembered. Apertus answers in the chosen language.

## Repository

```
index.html                         the prototype, one self-contained file (GitHub Pages serves it)
SPEC.md                            interaction and data-model spec
proxy/server.js                    the proxy (Node, runs in one Codespace): key, demo tokens, budget, provenance
proxy/proxy.config.json            allowed origins, budget, defaults (no secrets; base and model come from secrets)
proxy/start.sh                     runs on Codespace start: proxy, public port, proxy-url.json for the page
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

## Deploy: three secrets, one button

Nothing in the repository is edited by hand. The Swisscom values live in Codespaces secrets next to the key; the Codespace publishes its own address for the page.

1. **Pages.** Settings → Pages → Source "Deploy from a branch" → `main` / `(root)`. The static guide is live at the URL above within a minute or two.
2. **Secrets.** Profile picture → Settings → Codespaces → Secrets → New secret, three times, each with this repository ticked under "Repository access":
   - `APERTUS_API_KEY` — the Swisscom key
   - `UPSTREAM_BASE` — the API base URL from the Swisscom guide (the part before `/chat/completions`, usually ending in `/v1`)
   - `UPSTREAM_MODEL` — the Apertus model id from the guide
3. **Codespace.** Repo → green "Code" → Codespaces → "Create codespace on main". When it opens, `proxy/start.sh` runs by itself: it starts the proxy, checks `/health`, makes port 8787 public, and pushes `proxy-url.json` so the page on GitHub Pages connects without anyone editing `index.html`. The terminal prints `ready: yes` and the proxy URL.

If the terminal shows nothing, or after any change, run `bash proxy/start.sh` in the Codespace terminal; it is safe to repeat. If it says the port could not be set automatically, one click: Ports tab → row `8787` → right-click → Port Visibility → Public.

Set Settings → Codespaces → "Default idle timeout" to 240 minutes. Live Apertus works while the Codespace runs; when it stops, reopen it from the repo and the script runs again (same address). The static tree stays online regardless, with every text labelled as prepared.

## Sources used by the prototype

Specific pages: Nyon Contrôle des habitants; Saint-Cergue "Arrivée à St-Cergue"; Vaud change-of-address procedure (eDéménagement conditions by permit, list of communes); SEM permit B EU/EFTA; SEM permits for third-country nationals; ch.ch moving checklist; Statistique Vaud communal tax decrees; Vaud directive on communal voting rights. Site roots, flagged as such in the interface: Gland, DGEO, ACI, Mobilis, opentransportdata.swiss, Saint-Cergue éducation and taxes. Content is illustrative and hedged; each step says where to verify.

## Next steps

- Extract the existing Nyon, Saint-Cergue and Gland content into versioned commune packs, preserving the same step identifiers and provenance display; add a small review workflow before any commune is named as reviewer.
- Add one visible, dated public-data integration: an NStCM journey from the Swiss Open Journey Planner, subject to its API access, alongside the official link and the prepared fallback.
- Add another case beyond moving, such as owner versus tenant home repairs, to demonstrate the engine is reusable across life events.
- Finish the mobile layout (vertical tree, one branch at a time), run a screen-reader pass, and let visitors give feedback on where a step or link is unclear.

The solo demo run, timings and fallbacks are in `DEMO.md`.
