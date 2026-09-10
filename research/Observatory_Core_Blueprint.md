# Observatory core: conclusions that can be challenged

Design direction, 10 September 2026. This joins the user's scientific-system brief to the completed Recovery release and proposed Active Context tool. It is a build plan, not evidence that the proposed general reasoning engine exists.

**Build a system that tells a researcher or AI what a conclusion depends on, what could change it, and which feasible check would help the next decision.**

The useful output is a decision packet: the claim, its domain of applicability, the original evidence, competing explanations, unresolved dependencies, and a proposed next check with its cost and limitations. When observations arrive, update the affected conclusions and preserve the earlier record. An unsupported conclusion remains unsupported even when it sounds plausible.

## One core, two first users

**Active Context serves an AI agent continuing work.** A test passed on an earlier code and environment version. Something changes. The tool identifies which earlier conclusions need reassessment, suggests relevant checks, and supplies a compact continuation packet. Its value must come from fewer mistaken actions or less total checking work at equal correctness. Static dependency invalidation is a strong existing baseline. Automatically recovering the relevant dependencies is an unsolved part of this product, not a property of storing a graph.

**The Live State Microscope serves an investigator.** Two stations have the same available-bike count but different recent histories. Does that history improve a forecast 15 minutes later? If so, which observations carry the useful information, and does their benefit survive new stations and future days? Improvement over a current-count baseline alone is insufficient: conventional history models must receive equivalent information.

Both use the same evidence and experiment contracts. Neither requires the other to succeed. The existing GB collector exercises receipt times and delayed outcomes while these two proposed evaluations are developed; it currently records the provider's forecasts and makes no improvement claim.

## What is implemented, and what remains

| Capability | Current status | Next concrete increment |
|---|---|---|
| Evidence record | Implemented local hash-chained ledger, source snapshots, contracts and review records | Claim identities, applicability dependencies, source-family relationships and reassessment propagation |
| Prospective observations | GB collector and delayed settlement code published; original first capture preserved | Verify sustained collection and mature outcomes before fitting a competing predictor |
| State microscope | Oslo captures/replay and a completed retrospective Recovery experiment | Frozen, prospective 15-minute Oslo forecast comparison |
| Missing-state discovery | Not implemented as a general learned method | One bounded proposal policy, development-only diagnostics and untouched future evaluation |
| Useful test selection | Small declared simulations and deterministic planning | Compare a replaceable selection policy with cheap conventional checks under the same budget |
| AI interface | Product plan and independent critique published | Narrow local tool for evidence-linked coding-task continuation, then an actual fixed-agent evaluation |
| Self-improvement | Collection and queue updates automated; model promotion is not autonomous | Demonstrate successive reviewed revisions improving fresh outcomes, counting failed attempts and costs |

The completed Recovery comparison failed every advancement gate. Its small primary score gain reversed in both fixed sensitivity analyses. This is evidence that the current candidate did not qualify, and a reason to improve the observation design. It is not evidence that every application of the programme fails, or that more searching on those same outcomes would establish success.

## The first shared contract

Represent a claim with a stable identifier and a versioned statement. Record its scope, target decision, units where relevant, assumptions, allowed observations, supporting and contradicting records, alternative explanations, and a defeat condition. Distinguish measured tool output from model-generated interpretation. Link supporting publications to their underlying datasets: ten analyses of the same cohort do not create ten independent cohorts. Store uncertainty about shared sources rather than inventing independence.

Represent a dependency separately from a claim of causal influence. A code version may be required for a test result to apply without causing every observed failure. Preserve time, entity, environment and audience boundaries. Unknown dependencies must stay visible. A changed dependency normally means **needs reassessment**, not **the earlier result was false**.

Keep applicability and evidential support as separate fields. Useful applicability states are current-within-declared-scope, needs-recheck, and unknown. Support should point to the actual test, estimate and limitations rather than a universal confidence number. A formal proof under axioms and an empirical forecast comparison have different warrants; neither silently validates a physical model's assumptions.

Represent each proposed check with explicit required access, allowed inputs, expected outputs, cost, timeout, scoring rule and the decision it might change. Expected value of information requires an estimated model and decision loss; a graph edge or an LLM's confidence is not that estimate. Start with transparent fixed policies. Permit the answer: **No available test distinguishes these alternatives within the current access and budget.**

The interactive interface should let the user select a conclusion, inspect its exact sources, change a declared assumption, and see which records require reassessment. Any simulated counterfactual must be labelled as such. A replay slider should reconstruct what was available then, rather than display later corrections as if they were known earlier. Visual geometry explains recorded relationships; it does not establish physical causation.

## The next two acceptance tests

**AI first diagnostic.** Use the proposed 30 continuation episodes across at least five public repositories. Compare rerun-all, dependency/content invalidation, fixed freshness and fixed-budget refresh with the candidate. Hold repositories out, hide executable outcome checks, retain timeouts and count ingestion plus checking costs. Do not hand the candidate the hidden dependency map. The independent review proposes equal completion, no false still-verified claims in the sample, and 20% lower checking cost than the strongest equally correct comparator. Freeze the final protocol before execution. This is an engineering diagnostic; success would still require a real agent benchmark.

**Oslo first scientific pilot.** Reuse the existing fixed station panel and audited adapter. First establish continuous capture quality, timestamp semantics and permitted collection cadence. Then freeze the target, horizon tolerance, missing-outcome rule, score, baselines, model-selection allowance and future test periods. Compare persistence, seasonal and strong history-based models against a precisely specified candidate refinement. Use development periods for feature proposals and threshold choices; score a single frozen selection on reserved future periods. Stations and times are dependent, so report uncertainty with a justified grouped/time-block analysis, not independent-row intervals. Keep delayed reports, closures, metadata changes and outages visible. No deployment date or data sufficiency is promised before the pilot establishes usable coverage.

The Oslo feed returns multiple stations together. A restricted station budget is initially a restriction on information supplied to the model. Only measured reductions in actual requests or bytes justify a network-cost claim. Forecasting availability also does not establish the causal effect of relocating a bicycle.

## How the system may evolve

Keep the integrity rules stable within an evaluation: preserve evidence, respect chronology and access, retain failures, compare equivalent information, and separate development from assessment. Methods and candidate state descriptions can change through versioned proposals. Revisions to the integrity rules themselves require an explicit new contract and a review of comparability with earlier results.

Repeated residual patterns can motivate a new measurement or history feature, but also arise from instrument changes, bad alignment, selection bias or an inadequate baseline. Audit those possibilities before announcing a new scientific state variable. Record all proposals and searches; use an appropriate multiple-testing or sequential evaluation plan before testing many refinements. A candidate earns admission through fresh evidence and review, not because it was generated by the engine.

After an improvement survives these tests, carry the unchanged contract into one different setting. River or space-weather forecasting would test transfer of the measurement method. A randomized recovery procedure in an owned service would test interventions. Laboratory orchestration, formal proof tools and causal-analysis tools can become adapters when a specific experiment requires them; they should not be installed merely to enlarge the project diagram.

This is the route from a broad programme to an independently useful tool: make one important conclusion inspectable, one missing distinction testable, and one next action measurably better. The AI product and scientific instrument should remain useful to people who have not read or endorsed the wider theory.

## Published starting points

- [Completed Observatory release](https://github.com/thantiklermcirony/empirical-observatory/pull/5)
- [Live Recovery Lab](https://empirical-observatory.madmanmuzza.chatgpt.site/recovery)
- [Active Context product plan](https://github.com/thantiklermcirony/empirical-observatory/blob/main/public/research/AI_Active_Context_Plan.md)
- [Independent AI product review](https://github.com/thantiklermcirony/empirical-observatory/blob/main/public/research/AI_Product_Review.md)
- [Existing integration and Oslo boundaries](https://github.com/thantiklermcirony/empirical-observatory/blob/main/research/Release_0.2.md)
- [Programme operating plan](https://github.com/thantiklermcirony/empirical-observatory/blob/main/public/research/Observatory_Operating_Plan.md)
