# Public AI for every commune — journey tree

Interaction and data-model spec for `index.html` (v4) and the `proxy/` folder. The page is one self-contained file in plain JavaScript; `build()`, `diffLane()`, `resolveAnswers()`, `isDone()` and `derive()` are the whole model. No model is called until the person connects one.

## 1. Where the key lives

GitHub Pages cannot hold a secret at runtime, and a build step that writes a key into HTML or JavaScript publishes it. For this live demo: **GitHub Codespaces secret → Node proxy in one Codespace → public forwarded port → GitHub Pages UI**. The key never enters the repository, build output or page. The Node proxy (`proxy/server.js`) pins one provider and one requested model; lets visitors use `/chat` without a token; limits requests within that Codespace to a daily budget and a best-effort per-address hourly limit using a locally persisted counter; and caps output tokens. The total budget bounds usage even if callers spoof a browser origin or address. Another Codespace has a separate budget. `/health` returns `{ ready, missing, provider, model, budget }`, never the key; the page refuses to call itself connected while `ready` is false. GitHub resets a public port to private if the Codespace restarts, so the presenter must recheck the port before the demo.

The page connects in one of two ways:

- **Proxy (default, recommended)** — the Codespace's forwarded URL; no token is required for public visitors. Test: `GET /health` must return `ready: true`.
- **Direct (local development only)** — provider is chosen explicitly (Swisscom fields are empty on purpose, so a Swisscom key cannot be sent to a prefilled Public AI URL), base URL, model id and key are typed. Test: a one-token chat completion, which every chat-completions provider supports. The key sits in the tab's `sessionStorage`; the panel says any script on the page can read it and that a demo must use the proxy.

## 2. Provenance belongs to each text

Every guide text on the page carries its own label:

- *Texte préparé, Apertus non connecté* — fixed strings shipped with the prototype (default).
- *Texte préparé — Apertus (Swisscom) n'a pas écrit celui-ci* — connected, but this particular text is still prepared (step explanations always are).
- *Apertus via Swisscom (model)* / *Apertus via Public AI (model)* — live output, labelled from the provenance the proxy or provider returned.

A connection never relabels prepared text. Step "why" lines are always prepared. Only two texts can be generated: the explanation of a proposal and the note after reading a story sentence (§7).

The explanation cache is keyed by a hash of: the changed answer and its new value, the current params, the resolved answers, and the id-based diff. An explanation written for one scenario cannot reappear in another.

## 3. State and derivation

```
mode      'situation' | 'explore'
saved     { dest, tenure, permit }              recorded path (persisted)
explore   { dest, tenure, permit }              hypothesis (persisted)
answers   [{ id, value, scope }]                answers with the scenario they were given in (persisted)
done      [{ id, scope }]                       steps the person marked as done, with scope (persisted)
pending   null | { key, from, to }              proposed change to saved
applied   null | { prev }                       previous saved, to show "before" (persisted)
sel       null | { li, id, alt }
ai        { note: {text, prov} | null, explain: { diffKey: {text, prov} }, busy, error }   never persisted
```

`resolveAnswers(params)` and `isDone(card, params)` apply only entries whose `scope` matches the current params. Owner-scoped answers go dormant when the person becomes a tenant and return when they switch back; Explore follows the same rule against the hypothesis. The story lists dormant items as "mis de côté".

**Nothing is pre-marked as done.** Each step's detail has "Je l'ai faite"; the mark is scoped like an answer (marking "Arrivée · St-Cergue" done does not mark Gland's arrival). The first undone step of each branch is ringed as "prochaine étape".

## 4. Interaction rules (acceptance criteria)

1. Undone steps hollow, done steps filled (only by the person), open questions dashed with "?", visible in every scenario.
2. Touching an answer sets `pending`; the banner counts changes, additions and removals.
3. Touching a dashed point shows proposed and recorded versions side by side, each with badge, link, review status, and the explanation with its provenance.
4. Adopt is whole-path and says so: "Adopter Gland partout (n étapes)".
5. After adopting, changed steps read "modifiée", new ones "ajoutée"; untouched steps, questions and done-marks in scope do not move.
6. Questions are answered in the detail (yes/no, choice, or text) and scoped; the story shows the answer as a sentence.
7. Explore never writes `saved`.
8. The arrival step does not claim that registration grants communal voting rights (for foreign residents this depends on further residence and permit conditions; the cantonal directive is linked). The date announced is the effective arrival date, not the lease signature. With a B permit, the Inscription branch asks "UE/AELE ou État tiers ?". The permit step's validity claim cites the SEM: the EU/EFTA page (five years) or the third-country permits page (one year, renewable); the Vaud change-of-address page is linked as "Voir aussi" for the moving conditions, not for validity.

## 5. Two zones on every step

**Source zone**: *Ce que la source établit* when the link is a specific page, *Où vérifier — site officiel, page précise encore à relier* (dashed) when it is a site root. Authority badge, link, optional "Voir aussi", one review status (*Relu par…* shown nowhere yet; *Page officielle reliée ; relecture communale en attente*; *Source officielle (fédérale ou cantonale)*), and *À confirmer : [autorité]* where relevant.

**Model zone**: title, then a provenance line (§2), then the text. Statements about unfetched data say so.

## 6. Data shapes

```
Lane     { id, name, cards: (Step | Question)[] }
Step     { id, deps, short, title, why, src: Source, also?: { title, url }, confirm? }
Question { id, deps, ghost: true, short, title, ghostWhy, answer: { type: 'yesno' } | { type: 'choice', options } | { type: 'text', placeholder } }
Source   { lv: 'conf' | 'vd' | 'com', domain, url, title, reviewed: string | false | null, exact: boolean }
Answer   { id, value, scope }      Done { id, scope }      Provenance { provider, model }
```

## 7. What Apertus does when connected

Two calls, both constrained, both returning provenance:

1. **Explain a proposal** from the id-based diff and the current params: two sentences, no invented rule/delay/amount, ends with "À vérifier auprès de …". Cached per §2; failure falls back to prepared text and says so.
2. **Read a story sentence** into strict JSON; the app validates every value against allowed sets and currently open questions, stores valid answers with scope, turns at most one differing answer into a `pending` proposal. Invalid JSON is reported, nothing applied.

Apertus never edits the tree or writes a source.

## 8. Official pages currently linked

Nyon Contrôle des habitants; Saint-Cergue "Arrivée à St-Cergue" (st-cergue.ch); Vaud change-of-address page with eDéménagement conditions and commune list; SEM Permis B UE/AELE; SEM permits for third-country nationals; ch.ch checklist; Statistique Vaud arrêtés d'imposition. Site roots, flagged: Gland pages, DGEO, ACI, Mobilis, opentransportdata.swiss, Saint-Cergue éducation/taxes.

## 9. Still open

- Swisscom endpoint details (base URL, model id, auth header, token exchange if any) go into `proxy/proxy.config.json` / the server, not the page.
- Transport timetables from opentransportdata.swiss.
- Mobile layout.
- Commune pack file format and the review workflow that sets `reviewed`.
- Copy is illustrative; replace with the commune's own wording.

## 10. Proposed commune pack contract (not implemented in this prototype)

An installable pack should identify the commune by its official identifier and contain a version, language, last-checked date, maintainer, and a list of step overrides or additions. Each claim should have a stable step ID, applicability conditions, exact source URL, authority level, source-check date, and an optional reviewer identity and review date. A commune can add local steps and sources, but may not silently change a federal or cantonal claim. The shared engine merges confederation → canton → commune material, computes changed step IDs, and marks unsupported source or stale review as requiring verification. The first concrete proof should load the three existing communes from packs and show the same Nyon → Saint-Cergue → Gland comparison without changing the UI model.
