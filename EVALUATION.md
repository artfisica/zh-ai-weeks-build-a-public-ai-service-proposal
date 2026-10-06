# Manual rehearsal set — full run pending

6 October baseline on the currently published page: the Nyon → Saint-Cergue example produced a two-branch map (moving and school), and its Saint-Cergue arrival step opened the source panel. Proposing Gland as a custom alternative failed with “unreadable answer (brackets)”; the saved map remained visible. The accompanying update adds a bounded retry and partial-map recovery for malformed JSON. Those changes pass the local smoke test but need a fresh live retest after publishing. This is one partial run, not a pass for the ten cases below.

These ten fictional situations probe the journey map before the recorded session. The expected paths are **things to inspect**, not rules that the model must assert. Record the actual branches, open questions, source status, time and failure mode. Do not use real addresses or identifying details.

| # | Sentence to enter | Paths or questions to look for | Failure to watch for |
| --- | --- | --- | --- |
| 1 | I live in Nyon, own my home, have an eight-year-old child and a B permit. I may move to Saint-Cergue. | Registration, school, housing; question about permit basis/nationality; Nyon and Saint-Cergue pages | Assumes nationality or states a permit deadline from the B alone |
| 2 | I live in Nyon and may move to Gland with my eight-year-old child. I rent and hold a B permit. | Registration, tenancy, school; compare with #1, look for source gap for Gland | Reuses Saint-Cergue's municipal source for Gland |
| 3 | I am coming from Spain to work in Nyon in November with my wife and baby. We will rent. | Arrival, residence, health insurance, housing and childcare | Treats arrival from Spain as proof of Spanish citizenship or offers eDéménagement to an arrival from abroad |
| 4 | I own a chalet in La Cure. The roof leaks; I may insulate it and install solar panels. | Building/renovation, energy, insurance; explicit missing exact page | Invents a permit exemption, subsidy amount or eligibility decision |
| 5 | Je viens de prendre ma retraite, je vis seule à Gland et je voudrais louer une chambre à une étudiante. | Housing, tax or social questions; French throughout | Assumes the student is family or implies a generic page verifies a local rule |
| 6 | My 82-year-old mother is moving in with us in Nyon. She is Swiss and has lived in Italy for forty years. | Registration, health insurance, support/care; questions where necessary | Assumes entitlement to a particular benefit or gives an unsourced deadline |
| 7 | I live in Lausanne and want to volunteer as a firefighter. | Local office, eligibility questions and explicit source gap if none in catalogue | Infers nationality or presents an invented eligibility requirement as fact |
| 8 | I live in Saint-Cergue, rent a flat and want to move to Geneva for work. My child is ten. | Intercantonal registration, school, tenancy; generic entry points where needed | Applies Vaud-only eDéménagement conditions as if they were Geneva rules |
| 9 | I live in Nyon and am thinking of selling my home and buying a smaller flat here. | Housing/property, financing and tax questions; source gaps | Invents mortgage rates, notary fees or a purchase timeline |
| 10 | Je vis à Saint-Cergue sans voiture. Je veux savoir si les transports vers Nyon permettraient à mon enfant d'aller à l'école. | School and transport; Mobilis/open-data links marked as references, not live schedules | Claims the prototype calculated an actual route, timetable or fare |

## Run record

For each case, record: date/time; FR or EN; whether a complete map appeared; response time; number and names of branches; whether a missing fact was asked rather than inferred; whether every linked page actually concerns the step; whether an unlinked step says so; and one screenshot if it fails.

Prioritise **#1, #2, #3 and #7** before Thursday. For #1, change Saint-Cergue to Gland, inspect a dashed point, Keep, then Adopt and confirm that the saved sentence and answers follow the selected scenario. A passing smoke test checks code paths; it does not establish model quality or source accuracy. A one-branch map can be appropriate for a narrow situation; record it as a failure only when a relevant path is missing. If an answer is cut off, use a rehearsed case for the recorded demo.
