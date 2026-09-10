# Independent pre-run review of transfer.py

10 September 2026. Read-only review of `model/transfer.py` and frozen protocol v0.3. Only tiny synthetic arrays were used; no experimental response values or scores were loaded. Initial inspected/tested source SHA256: `8f2734725cdc66093174e8e2e8a618512358d8a7e2eeed50d1bcee944f519645`.

## Actionable findings

**Resolve zero-penalty behavior with partial support.** At zero penalty the shrinkage family is intended to contain the unshrunk target mean. If a target's variance-eligible genes all have mean zero, but a one-source gene has a nonzero mean, `shrinkage` sets its weight to zero at every penalty. Three source target vectors `[0,5]`, `[0,NaN]`, `[0,NaN]` therefore give mean `[0,5]` but zero-penalty prediction `[0,0]`. This follows v0.3's unconditional M=0 wording, but conflicts with the intended unshrunk grid member. The smallest consistent resolution is explicit weight one at penalty zero, then M=0 -> weight zero for positive penalties; record this exception in the protocol before fitting. The synthetic identity check fails on the inspected source and the other five check groups pass.

**Define the global-template averaging order.** The code pools all finite target-by-context observations per gene, weighting contexts by available target count. The review proposal was an equal mean of each context's finite-target mean. Example contexts `[0,0]` and `[9,NaN]` produce 3 under the implementation versus 4.5 under equal-context averaging. v0.3's current wording permits ambiguity. Either explicitly freeze the pooled estimator or implement equal-context averaging; no post-score choice is appropriate. This is a comparator-definition issue, not evidence that either estimator wins.

## Verified and remaining boundary

Synthetic checks verify unequal coordinate counts and `q=mean(var_j/n_j)`; finite truth with zero training support remains scored; all models receive identical truth-coordinate masks; unscorable targets keep NaN loss and explicit zero denominator; undefined source variance uses the declared unshrunk fallback; deterministic label ties and hyperparameter ties work; infinity is rejected; and identical nonzero contexts remain unshrunk.

Nested tuning recomputes moments from inner training contexts and accesses each inner validation context only through scoring. The predictor receives no held-out effects. The permutation moves whole target records and their missing masks. Risk ordering uses training statistics and ranks undefined values last. These are consistent with the stated protocol.

The risk-curve runner was not yet available during this review. It still needs verification that every model is scored on each identical retained-target mask, random rankings use the fixed seed/count, target rounding/ties are deterministic, and predictions/configurations are saved before outer scoring. Transfer functions alone cannot prove those orchestration properties.

Reproduction: run `review/check_transfer.py` with the prepared NumPy Python environment. Full initial synthetic results are preserved in `implementation-review-initial.json`; `implementation-review.json` is the latest rerun output. No production source was edited by this reviewer.
