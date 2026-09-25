# Demo script — Public AI for every commune

One presenter, about three minutes. Every visitor sees the same public page and can take a different path. The default family is illustrative; no visitor needs to enter personal details.

## Before showing it

1. Open the public Pages URL in a private browser window. The tree must appear without a login, a token or an API key.
2. In your Codespace, run `cat /tmp/public-ai-commune-proxy.log` and check `ready: yes`.
3. In **Ports**, confirm port 8787 is **Public**. Open its forwarded address with `/health` appended; check `ready: true` and remaining budget.
4. Verify `PUBLIC_PROXY_URL` in `index.html` matches that address. Reload the public page: the header should become "Apertus via Swisscom (…)" without entering settings.
5. Test once in a second browser without GitHub sign-in. If the proxy is down, the static journey tree remains available and says when text is prepared.

## The run

**The human case (30 s).** Read the situation: a parent in Nyon, an 8-year-old child, a B permit, considering Saint-Cergue. Point to the five branches. Open the arrival step: show the canton/commune link and its review status. The guide distinguishes an official page from its own prepared explanation.

**The visible alternative (45 s).** Touch "Saint-Cergue" in the sentence. The Gland branch appears in dashes. Point to a step that changes and one that rejoins. Open a dashed point to show both versions and their separate sources. Apertus explains the application's computed difference; choosing "Garder Saint-Cergue" preserves the original path.

**Ask before advising (40 s).** Open the B-permit step, then answer "UE/AELE ou État tiers ?". The step changes and links to the appropriate SEM page. This is a demonstration of a question that matters, not a fixed answer for everyone.

**Talk and return (35 s).** Add "Je travaille à Genève" to the story. Apertus extracts the commute answer; the app validates it and adds the transport path. Switch to Explorer, change propriétaire to locataire, then return. The saved path is still there.

**Invitation (20 s).** Ask someone else to open the public link in their own browser and change one underlined word. They should see a different branch without creating an account. Say: "For the next commune, publish a small reviewed content pack. The engine and the source/status rules stay the same." Be clear that commune packs, mobile layout and live transport data are the next build step.

## If the AI is unavailable

Keep presenting the tree and source links. Prepared explanations say that they are prepared; a failed model call cannot silently become an Apertus answer. Check `/health`, the Codespace status and whether GitHub reset port 8787 to **Private** after a restart. Reconnect the public port before retesting.

## Accuracy and privacy

- Treat the example as a fictional scenario. Do not enter a visitor's real permit, address or child's details during the demo.
- No commune has reviewed this prototype. Do not imply endorsement.
- Do not say transport schedules are live: their public-data integration is still planned.
- Keep the API key out of the page and repository. Only the Codespaces secret supplies it to the proxy.
