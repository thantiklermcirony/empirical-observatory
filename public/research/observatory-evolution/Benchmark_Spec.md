# Adaptive fault diagnosis: a small decision benchmark

This is an authored synthetic task with known competing hypotheses. Its useful claim is narrow: **does changing the next measurement after seeing evidence improve the final diagnosis at the same measurement budget?** It demonstrates belief-driven action selection, not discovery of a new physical law or a policy that learns across runs.

## Hidden system and tests

One of four equally likely faults, A0/A1/B0/B1, is hidden. There are two fault families, A and B, with two subtypes each. The gate indicates the family; a local probe distinguishes subtypes reliably only inside its own family. A full diagnostic is available as a strong, expensive alternative. All likelihoods are public to every method; only the actual fault and unrequested measurements are hidden.

| Test | Cost | P(outcome=1), ordered A0/A1/B0/B1 |
|---|---:|---|
| gate | 1 | .1, .1, .9, .9 |
| local_a | 1 | .1, .9, .5, .5 |
| local_b | 1 | .5, .5, .1, .9 |
| full | 2 | Four outcomes: correct fault with .7 probability, each other fault with .1 |

Each episode has budget2. Repeats are allowed with conditionally independent measurement noise. Costs are abstract measurement units. Every method exhausts the same budget and updates its belief from actual observations using the same likelihoods. Final diagnosis is the largest posterior probability, with fixed hypothesis-order ties. Planning CPU time is separate from the measurement budget.

For belief b and test a, compute predictive probability `p(y)=sum_h b[h]*L[a,h,y]`, then posterior `b'[h]=b[h]*L[a,h,y]/p(y)`. Candidate action maximizes `(H(b)-sum_y p(y)*H(b'))/cost(a)` over affordable tests. Use base2 entropy, skip zero-probability outcomes, and fixed action-order ties. Impossible manually supplied evidence is an explicit error, never a silent uniform-posterior reset.

## Why it is adaptive, and fair comparisons

The first action is gate. After gate=0, posterior is [.45,.45,.05,.05] and the next action is local_a; after gate=1 it is [.05,.05,.45,.45] and the next action is local_b. The action—not merely an animated confidence bar—changes with evidence.

Compare against the **strongest fixed schedule**, selected exhaustively from all10 feasible precommitted schedules using exact final accuracy: full once. Also run uniform-random affordable actions, and a diagnostic ablation that keeps planning from the original prior while still updating the final belief. An exact finite-horizon dynamic program supplies the optimal decision bound. It is an oracle, not a trained competitor with matched compute.

| Policy | Exact expected accuracy | Expected final entropy, bits | Cost |
|---|---:|---:|---:|
| Adaptive EIG/cost | .81 | .9910916278 | 2 |
| Strongest fixed: full | .70 | 1.3567796494 | 2 |
| Random affordable | .5858333333 | 1.3473809680 | 2 |
| Original-prior planner | .45 | 1.2579141415 | 2 |
| Optimal decision oracle | .81 | .9910916278 | 2 |

The fixed gate+local schedule achieves .63 accuracy but lower entropy than full, showing that information and decision objectives can disagree. The candidate happens to reach the decision oracle in this construction; do not generalize greedy information gain into an optimal policy theorem.

## Frozen evaluation and evidence

Use development seeds0–127; lock evaluation seeds10000–19999 and source/protocol hashes before evaluating. The reviewer ran only the exact oracle and edge checks, **not the evaluation seeds**. Seeds generate paired hidden faults and potential measurements keyed by action and repetition, independently of which policy requests them. Random-action draws have their own keys. The exact SHA256 key/float contract and test vectors are supplied in `protocol.json` and `reference-results.json`; neither policy receives the seed or hidden state.

Primary outcome is final diagnosis accuracy. Report all methods, equal cost, final log loss, action counts and the paired accuracy difference. The frozen advantage gate is at least5 percentage points over strongest fixed with an approximate paired95% interval above zero. A missed gate is a failed decision-advantage claim. Exact expected metrics also provide a stronger implementation oracle; unexplained disagreement with them is a bug or simulator-contract failure, not evidence against probability theory. The seed evaluation checks the implementation under the declared simulator; it is not an independent real-world validation.

Save per-episode policy/seed/cost/action/outcome/belief/decision/correctness logs, source hashes and aggregate metrics. Every policy must receive the same information and budget. Once evaluation is inspected, subsequent changes are a labeled revision; the same seed set cannot be called fresh holdout again. Do not cherry-pick a visually successful episode as the benchmark result.

Numerical tests: initial EIG/cost is [.5310044064,.2655022032,.2655022032,.3216101753]; both gate outcomes must select the corresponding local test; posterior probabilities must sum to1; identical likelihood rows yield zero information and unchanged prior; a certain prior stays certain; impossible evidence fails; no action exceeds remaining budget; zero/negative action costs are rejected; all exact policy costs equal2; no method exceeds the exact .81 decision optimum. Port the provided keyed-random test vectors exactly.

Keep a separate, explicit failure fixture: uniform four hypotheses, budget1, two cost1 actions. A perfect binary test of whether the fault is A0 yields .811278bits of information but only .50 final accuracy. A four-way diagnostic with .60 correct and .40/3 per wrong outcome yields less information but .60 accuracy. EIG selects the worse decision test. The oracle verifies this counterexample too; it makes the limitation observable rather than hiding it in a disclaimer. It is a separate objective-mismatch case, not a replacement score or a new strategy chosen after evaluation.

Run the dependency-free reference with `python reference_oracle.py` for exact checks. Run `python reference_oracle.py --evaluate` only after freezing the implementation to produce the locked Monte Carlo comparison. The reference is an independently written oracle, not a second independently collected dataset.

## Observatory presentation and claim boundary

A short demonstration can show a hidden fault, four posterior bars, the proposed next test and its expected information per cost, the observed result, the visibly changed next action, and the final decision beside same-budget baseline results. Allow the user to inspect both possible first outcomes and the full likelihood table. Keep the benchmark summary visible next to the single episode.

The posterior changes within an episode. The selection rule and code remain fixed, and the prior resets for the next fault. **Belief updating is implemented; learning a better policy and rewriting its own code are not.** Those would require separate mechanisms, frozen comparisons and evaluation data. This benchmark gives the Observatory an honest, testable instance of adaptive exploration without claiming the broader framework is validated.
