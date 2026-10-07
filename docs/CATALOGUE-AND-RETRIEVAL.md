# Catalogue, packs and retrieval — technical specification

Status: proposal, October 2026. Today the catalogue is a constant `CATALOG` in `index.html` with 14 entries sent whole in every prompt. This document specifies how it grows to all cantons without growing the prompt, and how it becomes the first version of the retriever named in [ARCHITECTURE-TARGET.md](ARCHITECTURE-TARGET.md).

## 1. Entry schema

One entry per official page or tool. JSON, stored in pack files (section 4).

```json
{
  "id": "vd-address",
  "jurisdiction": { "level": "canton", "canton": "VD", "commune": null },
  "topics": ["moving", "registration", "permit"],
  "url": "https://www.vd.ch/prestation/annoncer-son-changement-dadresse-au-controle-des-habitants",
  "title": {
    "fr": "État de Vaud — Annoncer son changement d’adresse",
    "en": "Canton of Vaud — Announcing a change of address"
  },
  "covers": "Vaud: online change of address (eDéménagement); conditions by nationality and permit; list of participating communes",
  "exact": true,
  "claims": [
    {
      "id": "c1",
      "kind": "regulation",
      "text": {
        "fr": "Dans le canton de Vaud, le changement d’adresse peut être annoncé en ligne pour les communes raccordées à eDéménagement.",
        "en": "In Vaud the change of address can be announced online for communes connected to eDéménagement."
      },
      "applies_from": "2026-01-01",
      "source_checked": "2026-10-06",
      "status": "draft",
      "reviewer": null,
      "reviewed_on": null,
      "office": "Contrôle des habitants de la commune"
    }
  ],
  "version": 3,
  "updated": "2026-10-06"
}
```

Field rules:

- `id`: stable, lowercase, prefixed by jurisdiction (`ch-`, `vd-`, `vd-nyon-`, `ti-`). Never reused after deletion.
- `jurisdiction.level`: `federal | canton | commune | other`. `canton` is the two-letter code. `commune` is the BFS commune number, not the name: names repeat across cantons and change spelling by language.
- `topics`: controlled list, used for the second filter and for ordering: `moving, registration, permit, housing, building, school, childcare, tax, benefits, health, work, transport, energy, civic, family, retirement`.
- `exact`: `true` only for a page that establishes something; `false` for a site root or an index page. The interface shows the dashed "exact page still to be linked" state when `false`.
- `claims[].kind`: `regulation | practice | community`, the three kinds of knowledge. A `community` claim carries an `attribution` field and is never rendered as a rule.
- `claims[].status`: `draft | reviewed | disputed | retired`. `reviewed` requires `reviewer` and `reviewed_on`. `disputed` keeps the claim visible with the conflicting text in a `dispute` field. `retired` keeps the entry readable for old maps but stops it from being sent to the model.
- A claim's `text` is one or two sentences stating only what the page establishes. No deadlines, amounts or validity periods unless the page states them, in which case `applies_from` is mandatory.

## 2. Place detection

Input: the person's sentence, the current variable values, the answered questions and, for a proposal, the proposed value. Output: a set of cantons and a set of communes.

- A gazetteer `packs/_places.json` lists every Swiss commune: BFS number, canton code, official name and aliases (names in other languages, common abbreviations such as `Saint-Cergue`, `St-Cergue`, `St. Cergue`). About 2,100 rows, around 120 KB, loaded once and cached by the browser.
- Normalisation before matching: lowercase, strip accents, collapse `st.`, `saint`, `san`, `sankt`, hyphens and spaces to one form.
- Matching: longest alias first, whole word, over the normalised text. Each hit yields the commune and its canton. Canton names and codes ("Vaud", "VD", "Genève", "Ticino") match directly.
- Ambiguity: an alias that resolves to more than one commune (there are several Buchs) is kept as a question, not a guess: the page adds an open question "Which Buchs?" with the candidates as options. This follows the existing rule that nothing is inferred that the person did not say.
- No place found: the sentence is still accepted; only federal entries are sent, and the map's first open question is "Which commune?".

Detection runs in the browser. Nothing is sent to the model to find places.

## 3. Selection — the first retriever

Given the detected cantons `C` and communes `M`, build the subset `S` sent in the prompt:

1. All `federal` entries whose `topics` intersect the situation's topic hints (3.1); if no hints, all federal entries.
2. All `canton` entries for each canton in `C`.
3. All `commune` entries for each commune in `M`, and for the commune of any proposed alternative value, so the Gland pages are available when "Gland instead" is proposed.
4. `other` entries whose `topics` intersect the topic hints; jestime.ch appears only when money or benefits are in play.
5. Exclude `status: retired`.
6. Order: commune, canton, federal, other. Within a group: exact pages before site roots, reviewed claims before drafts.
7. Cap at 30 entries. If more match, drop from the end of the order, federal roots and `other` first, never a commune entry for a named commune.

### 3.1 Topic hints

Before the first call there is no map, so topics come from a keyword table in the browser in French, English, German and Italian. Examples: `déménag | moving | umzug | trasloc` → moving, registration; `permis | permit | bewilligung | permesso` → permit; `école | school | schule | scuola` → school; `toit | roof | dach | tetto | rénov | renov` → building; `retraite | retire | pension` → retirement, benefits; `impôt | tax | steuer | imposta` → tax. Once a map exists, its branch families replace the keyword hints.

### 3.2 What the model receives

For each entry in `S`: `id`, `level`, `covers`, and for each claim not retired: claim `id`, `kind`, `text` in the interface language. Nothing else. Thirty entries with two claims each is about 6,000 characters, independent of how many cantons the catalogue holds.

### 3.3 Validation of the answer

- A step's `sources[].id` must be in `S`, not merely in the catalogue. An id outside `S` is dropped; it means the model remembered an id from training or from a previous call.
- `sources[].claim` must exist on that entry and not be `retired`. A `community` claim can be cited only as `kind: community`, which the interface renders as an attributed perspective.
- The map cache key includes a hash of the ids in `S`, so a pack update invalidates cached maps that used it.

## 4. Pack files and loading

```text
packs/
  _places.json          gazetteer
  _index.json           list of packs with version, date, reviewed ratio
  ch.json               federal entries
  VD.json               canton of Vaud
  VD-5724.json          Nyon (BFS 5724)
  VD-5726.json          Saint-Cergue
  GE.json, TI.json …    other cantons, added one at a time
```

- The page loads `_index.json` and `ch.json` at start, then only the pack files for detected places, with `cache: no-store` and an ETag. A pack is a few KB; a cold load for a new canton is one request.
- `_index.json` carries each pack's `version`, `updated` and `reviewed_ratio` (reviewed claims over all claims), which the interface shows on the commune's badge: "Nyon pack v3, 2 of 9 claims reviewed".
- Packs are plain JSON in the repository under `packs/`, licensed CC BY 4.0. A commune maintains its file through pull requests or through the onboarding pipeline of the target architecture, never through code.

## 5. Checks in CI, on every push

- Schema validation of every pack: ids unique across packs, prefixes matching the jurisdiction, required fields per status.
- Every `exact: true` page answers HTTP 200 to a HEAD request; a 404 or a redirect marks the entry `needs_check` in `_index.json` and fails the build until someone looks.
- A reviewed claim cannot change text without `reviewed_on` moving forward (a diff check), so silent edits to signed claims are impossible.
- The place detector is tested against sentences in four languages with expected cantons and communes.
- The smoke test gains a case: a step citing an id outside `S` is dropped.

## 6. Interaction effects

- Proposal ("Gland instead"): `S` is recomputed with Gland's commune added and Saint-Cergue's kept, so the diff can show a Saint-Cergue step replaced by a Gland step with its own reference. Step ids remain stable because they are the model's, not the pack's.
- Language switch: same `S`, claims sent in the new language, map refetched without the previous map (existing rule).
- Follow-up questions: answered from the current map and the claims of `S` only.
- Explore: same selection on the hypothetical values; nothing written.
- The printable plan lists every entry of `S` the map cites, with version, claim status and review date, so a reader sees which parts rest on reviewed claims.

## 7. Growth plan

- Per canton, four or five cantonal entries cover most moves: change of address and residents' registry, population office for permits, school enrolment, cantonal tax office, fare community. Communes are added where there is a pilot or a contributor.
- Order: Vaud (exists), Geneva (the eDéménagement fork already points there), Ticino (a French speaker exploring a Ticino commune sees the Italian terms the office will use), then by request.
- Every new entry starts `draft`. Nothing in the interface changes when a canton is added; only files under `packs/` and a line in `_index.json`.

## 8. Later: the second retriever

When packs exceed what a jurisdiction filter can rank, add an evidence store of dated page snapshots and a passage retriever (keyword first, embeddings later) that selects passages, not entries, for the detected places and open questions. The entry schema above already carries what that needs: versioned URLs, claims with dates. The model's input keeps the same shape: a bounded list of ids and texts it may cite.

## 9. What does not change

The model never adds a URL. Every text on screen says who wrote it. Nothing is applied before the person decides. A map step without a reference says so. Personal text never enters the repository.

## 10. Effort

Sections 1 to 3 and 6: one evening in `index.html` plus the gazetteer file, covered by the existing harness. Section 4: a second evening to move the catalogue out of the page into files. Section 5: one CI workflow. Sections 7 and 8: the pilot's work.
