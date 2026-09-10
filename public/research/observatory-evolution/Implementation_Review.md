# Independent discovery implementation review

Reviewed `lib/engine/discovery.ts`, `tests/discovery.test.ts`, and `components/observatory/DiscoveryLoop.tsx` read-only on 10 September 2026. Engine SHA256 matches the frozen identifier `9c658b7f976ea314891e43a09bb29cd2616e493a613af5c7edf332cc881f20d4`. The independent probe uses development seed7 only; no held-out evaluation, Site calls or shared-source edits were performed.

## Actionable findings

**[P2] Manual override leaves the fixed-plan automatic button unable to continue.** `DiscoveryLoop.tsx:115` still calls `chooseAction(policy, ...)` after a manual choice. Select Best fixed plan, manually run Family probe, then click Run next test: one unit remains and three tests are affordable, but the fixed policy throws “The fixed plan begins with the complete two-unit budget.” The UI offers an enabled continuation it cannot execute. Either explicitly continue manually overridden runs with a clearly labelled adaptive/manual rule, or disable automatic continuation and direct the user to a remaining manual test. Preserve the record's manual attribution.

**[P2] Notebook admission checks structure and budget, but accepts contradictory seed/policy provenance.** `discovery.ts:321` only replays supplied observations and verifies budget exhaustion; it never checks that outcomes agree with the deterministic seed or that a non-manual policy would have chosen those actions. For seed7, full produces outcome2, yet a record containing outcome3 is accepted. A full-only history labelled adaptive_eig is also accepted, although its actual history is gate1 then local_b0. `DiscoveryLoop.tsx:73` admits such local-storage rows into the notebook and exports them with those source/seed/policy fields. Either verify deterministic outcomes and non-manual action paths asynchronously before admission, or label imported/local-storage histories explicitly as unverified supplied records rather than suggesting seed/policy replay was validated. The existing unsigned/device-local label correctly limits authenticity; this finding concerns internal replay consistency, not a security signature or upstream scientific evidence.

Both cases are reproduced by `check_ui_integrity.mjs`, which imports the production engine read-only. Run with the prepared Node runtime and `--experimental-strip-types`.

No blocker found in the benchmark core: the planner receives belief and budget, never seed or hidden state; outcome draws and hidden truth remain in the simulator; budget replay rejects overspend; policy ties/noise keys agree with the declared model; and the UI separates exact synthetic accuracy, the greedy-objective counterexample, and fixed-policy belief updating from learning across runs. The findings above do not invalidate the frozen benchmark results.

## Resolution and current status

Both findings are resolved in the reviewed follow-up. The frozen `discovery.ts` hash remains exactly `9c658b7f976ea314891e43a09bb29cd2616e493a613af5c7edf332cc881f20d4`; the benchmark policy and measurement model were not changed.

After a manual override, `DiscoveryLoop` explicitly routes automatic continuation through `adaptive_eig`, labels the button “Continue adaptively,” and retains `policy: manual` for the entire saved run. The independent development-seed7 probe confirms manual gate followed by local_b completes within budget and yields a valid manual record. This check covers the engine calls mirrored by the UI branch; no browser interaction was performed by the reviewer.

The new `lib/engine/discovery-record.ts` verifier first applies structural/budget validation, then regenerates every deterministic outcome from the recorded seed and action repetition. For non-manual records it also regenerates each policy choice from the evolving belief, remaining budget and exact random-policy key. Manual records may choose different actions but must still match their seed outcomes. Restoration verifies entries asynchronously and excludes failed rows with a notice; Save invokes the same verifier, waits for notebook restoration, and reports verification errors. The verifier correctly describes this as simulation consistency rather than authenticity or real-world truth.

The targeted new notebook test passes. An additional independent probe accepts the correct seed7 record, rejects the wrong-outcome and wrong-policy records from the initial review, and accepts the completed manual/adaptive continuation. Evidence: `check_ui_resolution.mjs` and `ui-resolution-results.json`.

**Current review status: no outstanding actionable blocker in the reviewed engine, record handling or UI paths.** The original findings remain above as history. No Site source was edited by this reviewer, no held-out seeds were rerun, and no benchmark result changed as part of this verification.
