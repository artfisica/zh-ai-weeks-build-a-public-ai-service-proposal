# Public AI for every commune — current prototype contract

This describes `index.html` and `proxy/` as shipped in the October 2026 review package. It supersedes the older deterministic-tree sketch.

## What happens today

The visitor writes one or two sentences. Apertus returns JSON with variables found in the sentence, missing-information questions, parallel branches, steps, dependencies, suggested catalogue source ids and a short note. The application validates the shape, discards source and note ids outside its catalogue, draws the map, and stores it in the visitor's browser. It does not independently prove that a model-selected source supports a generated step.

The fixed `CATALOG` in `index.html` holds publisher levels, URLs and **draft** notes. No municipality has reviewed those notes or the model's mapping from a step to a note. A linked page is a route to verification, not a certified answer. The panel labels these states explicitly; the model's prose has its own provenance label. The badge identifies the catalogue page publisher; the node ring is the model's proposed authority level.

## State and change

`state.story` is the current accepted sentence; `state.vars` contains accepted underlined values. `state.tree` is the current model-generated map. `state.pending` holds a proposed alternative map until Keep or Adopt. The comparison uses stable branch and step ids and checks title, explanation, publisher level, office and references. Changing a value updates the accepted sentence when adopted. An unchanged id alone never proves that a step is unchanged.

Question answers are saved by the full set of current variable values. An answer from Saint-Cergue is set aside in a Gland scenario and restored if the visitor switches back. Done marks are scoped by values and answers. Explore draws a hypothetical map without changing the accepted sentence, answers or done marks; questions cannot be answered and steps cannot be marked done there. A new story resets these scopes.

The follow-up box lets Apertus answer from the current generated map and draft catalogue notes, with a clear suggestion label. It can also **propose** a rewritten situation. The visitor sees and can edit the proposed sentence before adopting and redrawing. The model's answer is not fact checked by the application. This is an exploratory feature, not a reviewed advisory service.

The plan panel lists the next unmarked step on each branch, open questions and linked catalogue pages. Copy includes the sentence and a warning that the map is unreviewed.

## Data shapes

```text
Tree     { variables: Variable[], questions: Question[], branches: Branch[], note, prov, key, incomplete }
Variable { id, label, value, span, alternatives[] }
Question { id, text, why, type: yesno|choice|text, options[] }
Branch   { id, name, steps: Step[] }
Step     { id, short, title, why, depends_on[], sources: [{id,claim}], authority, confirm_with }
Source   { id, level, url, title, covers, claims: [{id,text,fr}] }
```

The catalogue's `claim` field is an identifier for a **draft note**, not an approved legal or administrative claim. Unknown ids are removed by `validate`. A truncated response may show the last complete step and an “incomplete” warning; Redraw requests a complete map. The saved `v5` browser state is normalized when loaded so older cached steps with a single `source` field still render.

## Model and proxy boundary

GitHub Pages hosts a static page. A Node proxy in a GitHub Codespace reads `APERTUS_API_KEY` from a Codespaces secret and forwards chat-completion calls to the configured provider and model. `/health` reports readiness, requested model, token cap and remaining budget; `/chat` reports provider/model provenance. The proxy stores a request counter on its local disk. The prompt and map context go to the provider; provider retention is governed by its own terms. No provider processing location is inferred from a name. If independently established, the operator may set `UPSTREAM_PROCESSING` explicitly.

The public proxy uses an allowed browser origin, a per-address limit and a daily budget. Origin and IP checks are best-effort limits, not authentication. A presenter must start the Codespace and check that port 8787 is public. The page has no offline model fallback; existing maps remain in a visitor's browser when the proxy stops, but a new map cannot be drawn.

## What a reviewed service still needs

A versioned pack for each participating authority: exact source page, a narrow claim, applicability conditions, review identity and date, expiry/recheck rule, and competent office. A deterministic evaluator should apply approved conditions to consequential steps. Apertus can interpret the sentence, ask useful questions and explain a visible diff; it should not author the governing conditions. See `PILOT.md` for a narrow six-week path to test that division with residents and content owners.
