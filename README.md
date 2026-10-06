# Public AI for every commune

Swiss {ai} Weeks, Zurich · **["Build a public AI service"](https://zh.ai-weeks.ch/challenges/build-a-public-ai-service)** challenge

![One sentence in, a proposed journey map out](demo.gif)

## See the complete Demo
[![Silent demo, 3 minutes: one sentence in, a proposed journey map out](https://img.youtube.com/vi/FTBebfGJwR4/maxresdefault.jpg)](https://www.youtube.com/watch?v=FTBebfGJwR4)

Three-minute silent demo: six situations typed in, the maps Apertus draws, a source followed to vd.ch, French and English.

Live page: https://artfisica.github.io/zh-ai-weeks-build-a-public-ai-service-proposal/

For a bounded next step with Public AI and local content owners, see [the six-week pilot proposal](PILOT.md).

## The idea

Public services are organised by department. People's lives are not. Someone who moves, retires, renovates a roof or arrives from abroad does not have a department; they have a situation, and the situation touches the commune, the canton and the Confederation at once.

This prototype starts from the situation. A person writes it in their own words, one or two sentences. Apertus, the Swiss open model, reads it and draws a map: parallel paths (registration, housing, money, school, work, transport…), each made of concrete steps with the office that handles them. The facts in the sentence that would change the map become underlined words; touching one proposes another value and shows, before anything is applied, which steps would change, appear or disappear. The facts the sentence does not give become questions under the map, asked only because their answer would grow a branch.

Each step can point to a catalogue page, or says plainly that none is linked yet and who to ask. Apertus writes the steps and explanations and is named as their author on every one. It cannot invent a link: it can only choose from a limited catalogue of public pages kept in the code. The catalogue also includes an independent benefits estimator, clearly marked as such.

## What a visitor can do

- Write a situation and draw the map. Two examples are offered on the empty page.
- Open a point: the step, its suggested catalogue pages and draft notes, the level of the linked publisher, whether a commune has reviewed it, what Apertus explains, and who to confirm with. Mark it "I have done this"; the mark is kept in the browser for this situation.
- Touch an underlined word: Apertus's alternatives or a free value; the branches that would change grow dashed; a dashed point shows both versions side by side; then keep or adopt everywhere.
- Answer a "?" under the map: the new branch appears, marked added or modified.
- Explore: change words freely without touching the saved map, then come back to it.
- Correct or complete the sentence at any time; the map is redrawn.
- Add a fact or ask a follow-up. Apertus can propose an answer from the existing map and draft catalogue notes; the visitor must review any proposed rewrite of their situation before redrawing.
- See the next suggested step on each path and copy a plan with linked pages.
- FR / EN in the header; the map is redrawn in the chosen language.

The saved map and sentence live in that browser's local storage. To draw or discuss a map, the sentence and relevant map context are sent through the Codespaces proxy to the configured model provider. The proxy writes a request counter to its local disk and does not deliberately retain the message text; the provider's processing and retention follow its own terms. Avoid entering sensitive personal identifiers in this public prototype.

## What it is, and what it is not

It is a working prototype: a person can enter a situation, receive a map from the connected model, and compare a proposed alternative. Generation time varies. Sources come from a controlled catalogue, and model-written text is labelled. It is bilingual and needs no login while the demo proxy is running.

It is not reviewed content. No commune has read any step or signed a catalogue note. The catalogue currently has fourteen entries, mostly Vaud, Nyon, Saint-Cergue and federal (ch.ch, SEM), plus the independent jestime.ch estimator. A situation in another canton gets generic entry points until relevant pages are added. The model picks a source id, but the app does not establish that its page actually supports the generated step. Visitors must check the page before acting.

## How the honesty rules are enforced

- Links come only from `CATALOG` in `index.html`: id, publisher level, URL, and a draft description of what the page covers. The model is given the ids and descriptions and must choose or return `null`. Any other value is discarded before rendering. A catalogue match is a suggestion, not a verified citation.
- A step without a catalogue page is shown as "No catalogue page linked for this step. Check with: [office]", never with a guessed link.
- Pages that are a site root rather than an exact page are labelled "entry site, exact page still to be linked".
- Every explanation shows its model provider and model name when returned by the proxy; draft catalogue notes carry their own pending-review label.
- The prompt forbids stating deadlines, amounts or validity periods unless the chosen catalogue entry covers them.
- Changing a value is a proposal first; nothing is applied until the person decides.

## Repository

```
index.html                         the whole page: interface, catalogue, prompts, tree drawing (no build, no dependencies)
proxy/server.js                    the proxy (Node 20, no dependencies): holds the key, forwards to the model, keeps a budget
proxy/proxy.config.json            allowed origins, budget, token cap; no secrets
proxy/start.sh                     runs at Codespace start: starts the proxy, makes the port public, publishes proxy-url.json
.devcontainer/devcontainer.json    Codespace definition; lists the secrets the proxy needs
SPEC.md                            interaction and data model
DEMO.md                            demo run and fallbacks
PILOT.md                           six-week discovery pilot proposal
LICENSE / NOTICE                   Apache 2.0 code license and attribution note
```

## Where the key lives

GitHub Pages is static and cannot hold a secret. The proxy runs in a GitHub Codespace, and the Swisscom key is a Codespaces secret injected as an environment variable. It never enters the repository or the page. The page finds the proxy through `proxy-url.json`, which the Codespace writes and pushes itself.

The proxy pins one provider and one model, checks the page's origin for browser requests, caps each answer at 3500 tokens, holds a daily budget of 120 requests and a per-caller hourly limit, and returns the provider and model with every answer so the page can display them. The origin check is not authentication; the budget bounds use of a public demo key. Processing location appears only if the operator has independently verified and explicitly configured it with `UPSTREAM_PROCESSING`.

## Deploy: three secrets, one Codespace

1. Pages: Settings → Pages → Deploy from a branch → `main` / `(root)`.
2. Secrets: profile picture → Settings → Codespaces → Secrets → New secret, three times, with this repository ticked under "Repository access":
   - `APERTUS_API_KEY`: the key from the Swiss {ai} Weeks Keymaker (Swisscom)
   - `UPSTREAM_BASE`: `https://api.swisscom.com/products/swiss-ai-weeks/apertus-1.5-70b/v1`
   - `UPSTREAM_MODEL`: `swiss-ai/Apertus-v1.5-70B`
3. Codespace: repo → Code → Codespaces → Create codespace on main. `proxy/start.sh` runs, prints `ready: yes`, `port 8787: public` and the proxy URL, and pushes `proxy-url.json`. Two minutes later the page connects on its own.

Set Settings → Codespaces → Default idle timeout to 240 minutes.

## Each time, before someone uses it

Open the existing Codespace (Code → Codespaces → its name), run `bash proxy/start.sh` in its terminal, check `ready: yes` and `port 8787: public` (if the port could not be set automatically: Ports tab → 8787 → right-click → Port Visibility → Public), then open the page: the header must say "Apertus via Swisscom". Leave the Codespace tab open. While the Codespace is stopped, the page loads and says the map cannot be drawn; maps already drawn stay in the visitor's browser.

After changing files: `git pull`, `pkill node`, `bash proxy/start.sh`. A running server keeps the files it started with.

## Run locally

```
python3 -m http.server 8000
```

Open http://localhost:8000 and paste a proxy address in the connection panel (the Codespace one, or a local `node proxy/server.js` with the three variables set in the environment). Without a proxy the page draws nothing; it says so.

## Catalogue of sources

ch.ch: moving between communes; moving checklist; site root. State of Vaud: change of address (eDéménagement, conditions by permit); communal finances (Statistique Vaud); directive on communal voting rights; site root. SEM: permit B EU/EFTA; permits for third-country nationals. Ville de Nyon: Contrôle des habitants. Commune de Saint-Cergue: arrival. Mobilis (fare zones, site root). opentransportdata.swiss (timetables as open data, not loaded by this page). jestime.ch: independent benefits estimate, not an official decision.

Adding a page is one catalogue entry; the model can use it on the next map. Before a source note earns a reviewer and date, a person must open the exact page, check its wording and scope, and record that review.

## Next steps

- Let communes own their entries: a catalogue file per commune, versioned, with a reviewer field, so "commune review pending" can become a name and a date.
- Grow the catalogue beyond Vaud with the cantonal and communal pages the maps keep asking for; the "no linked page" panel is the backlog.
- One live public-data integration: an NStCM journey from the Swiss Open Journey Planner next to the official link.
- Mobile layout: one branch at a time under the sentence.
- German and Italian: the interface strings and prompts are already switchable by language.
