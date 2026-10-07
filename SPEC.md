# Public AI for every commune — current prototype contract

This describes `index.html` and `proxy/` as shipped in the October 2026 review package. It supersedes the older deterministic-tree sketch.

## What happens today

The visitor writes one or two sentences. Apertus returns JSON with variables found in the sentence, missing-information questions, parallel branches, steps, dependencies, suggested catalogue source ids and a short note. The application validates the shape, discards source and note ids outside its catalogue, draws the map, and stores it in the visitor's browser. It does not independently prove that a model-selected source supports a generated step.

The fixed `CATALOG` in `index.html` holds publisher levels, URLs and **draft** notes. No municipality has reviewed those notes or the model's mapping from a step to a note. A linked page is a route to verification, not a certified answer. The panel labels these states explicitly; the model's prose has its own provenance label. The badge identifies the catalogue page publisher; the node ring is the model's proposed authority level.

## State and change

`state.story` is the current accepted sentence; `state.vars` contains accepted underlined values. `state.tree` is the current model-generated map. `state.pending` holds a proposed alternative map until Keep or Adopt. The comparison uses stable branch and step ids and checks title, explanation, publisher level, office and references. Changing a value updates the accepted sentence when adopted. An unchanged id alone never proves that a step is unchanged.

Question answers are saved by the full set of current variable values. An answer from Saint-Cergue is set aside in a Gland scenario and restored if the visitor switches back. Done marks use the step’s declared dependencies, relevant values/answers, and action contents. Unknown dependencies fall back to the full scenario. Existing current-scenario marks are migrated on load. This is completion tracking, not a verified applicability rule. Explore draws a hypothetical map without changing the accepted sentence, answers or done marks; hypothetical questions have separate answers and conversation, and steps cannot be marked done there. Rewriting an existing story first creates a proposed map; it never clears the accepted map while generation is pending.

The follow-up box routes an alternative to a variable, an answered question or a rewritten situation. It draws the proposal before adoption, including an answer change returned in either `target` or `changes[]`. On questions, the model selects existing steps; the application displays literal draft catalogue notes attached to those steps or an explicit gap. Unrestricted model answer prose is not presented as civic guidance. Model-authored map steps and explanations remain unverified. This is an exploratory interface, not a reviewed advisory service.

The plan panel lists next unmarked steps, open questions and linked pages. Print/PDF includes the displayed map, all step titles/explanations, competent-office suggestions, per-step source URLs and draft notes, date/model/map key, a separately labelled alternative and correction space. It identifies unreviewed content explicitly. It does not claim municipal review or legal authority.

## Data shapes

```text
Tree     { variables: Variable[], questions: Question[], branches: Branch[], note, prov, key, incomplete }
Variable { id, label, value, span, alternatives[] }
Question { id, text, why, type: yesno|choice|text, options[] }
Branch   { id, name, steps: Step[] }
Step     { id, short, title, why, depends_on[], sources: [{id,claim}], sourceGaps[], authority, confirm_with }
Source   { id, level, url, title, covers, claims: [{id,text,fr}] }
```

The catalogue's `claim` field is an identifier for a **draft note**, not an approved legal or administrative claim. Unknown ids are removed by `validate`. A truncated response may show the last complete step and an “incomplete” warning; Redraw requests a complete map. The saved `v5` browser state is normalized on load, including legacy single-source fields and current-scenario completion marks. Five accepted snapshots support Undo. Twenty cached maps are retained in memory. A changed catalogue/model prompt version uses a new cache prefix. Start over clears both persistent state and in-memory maps; late cancelled results are ignored.

## Map layout and scope guards

The desktop keeps the existing curved tree and sentence design. The detail region opens on demand, with fit/zoom controls; on small screens one vertical path is expanded at a time. Questions are laid out below the map rather than expanding its SVG width. Text wrapping measures font width where available, including unusually wide words. A merged comparison can contain more than four points and must never render `NaN` coordinates.

Stable branch/step ids are requested with the complete previous step fields. Exact names/titles/references can reconcile renamed ids; the app does not use speculative semantic matching to claim two steps are equivalent. Difference labels compare text, declared dependencies, authority, office, references and withheld-reference state. A changed label therefore means a changed model proposal, not a verified change in law.

Municipal/cantonal scope checks use a small explicit place list and catalogue-id scopes. Known mismatches are withheld and described; broad or unknown jurisdictions still require review. Exact returned catalogue note text can resolve to its known note id; paraphrases are not accepted as new catalogue evidence. No claim is independently certified by these checks.

A broad move/arrival/retirement with a narrow first map receives one relevance review. It may remain focused. No minimum branch count is imposed. Parse retries and relevance reviews are bounded. Network errors, cancellation and reset preserve the accepted state, and unsuccessful first draws preserve the typed draft. Browser requests time out rather than leaving a permanent loading mask.

## Model and proxy boundary

GitHub Pages hosts a static page. A Node proxy in a GitHub Codespace reads `APERTUS_API_KEY` from a Codespaces secret and forwards chat-completion calls to the configured provider and model. `/health` reports readiness, requested model, token cap and remaining budget; `/chat` reports provider/model provenance. The proxy stores a request counter on its local disk. The prompt and map context go to the provider; provider retention is governed by its own terms. No provider processing location is inferred from a name. If independently established, the operator may set `UPSTREAM_PROCESSING` explicitly.

The public proxy uses an allowed browser origin, a per-address limit and a daily budget. Origin and IP checks are best-effort limits, not authentication. A presenter must start the Codespace and check that port 8787 is public. The page has no offline model fallback; existing maps remain in a visitor's browser when the proxy stops, but a new map cannot be drawn.

## What a reviewed service still needs

A versioned pack for each participating authority: exact source page, a narrow claim, applicability conditions, review identity and date, expiry/recheck rule, and competent office. A deterministic evaluator should apply approved conditions to consequential steps. Apertus can interpret the sentence, ask useful questions and explain a visible diff; it should not author the governing conditions. See `PILOT.md` for a narrow six-week path to test that division with residents and content owners.

## Comparison continuity check (8 October)

For an explicit variable or answered-question change, the application checks that existing step ids do not relocate to different branches. It also checks that steps with known declared dependencies excluding the changed input remain present. One repair is requested when either check fails. A second failure preserves the accepted map and offers no adoptable proposal. Empty or unknown dependencies are not treated as evidence that an action is unaffected. These are structural checks on model-declared dependencies, not a legal or semantic proof of applicability.
