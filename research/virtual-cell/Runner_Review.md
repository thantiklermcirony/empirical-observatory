# Independent runner and final core review

10 September 2026. Reviewed protocol v0.4 and the implementation without loading any experimental effects or result scores. Ran the actual runner on four synthetic 4-by-3 matrices under `review/runner-synthetic/` only.

Reviewed SHA256 values:

- Protocol: `d039550f4c31b4825a3361a710c859265f8ad1ca054e3c386d11032905020716` (coordinator's frozen identifier).
- Core: `4d84361d480a7e31e8eadef1af711b99f82e4f659d2d771462ec29ec8b90435a`.
- Runner: `c0cd82d3b4a7aadd4b6f3d6f9350768329a484bb5b809c150a6d694ed1dea143`.

## Verified

Both initial core findings are fixed: penalty zero is exactly the target mean even in the sparse M=0 case, and the global template averages finite target means within contexts then contexts equally. All six independent synthetic core check groups pass; the template discriminator returns the expected 4.5 instead of the earlier pooled 3.

The actual runner writes the prediction NPZ, computes its SHA256, and saves the prediction/configuration manifest before invoking outer `score`. A wrapper verified this ordering and matching file hash for all 24 outer scoring calls in the synthetic run. All matrices are opened and file-hashed at startup, but the held-out numerical matrix is not passed to prediction/tuning. Inner validation remains inside the training-context set.

Risk rankings use training statistics. For each deterministic ranking/fraction the same retained indices score all six models, including zero and global shrinkage. Independently reconstructed 720 retained-set/model losses agree. For random retention, the same 50 orders are reused for every model and fraction, preserving matched comparisons; all 240 synthetic curve/model losses agree. The runner uses ceil(target_count*fraction), and deterministic ranking ties resolve by target label.

Target losses average finite truth genes equally. Overall model loss averages context macro-losses equally. The gate compares the adaptive candidate with the strongest declared conventional comparator within each context, requires the 10% threshold in at least three contexts, and separately requires no overall degradation against the best overall conventional comparator. It does not retune on outer scores. The per-context best comparator is an oracle descriptive reference, as previously specified.

## Narrow remaining issues

1. **Undefined baseline ratio:** the final gate divides by the best conventional loss without checking for zero. An all-zero synthetic dataset crashes with `ZeroDivisionError`. A perfect baseline has no meaningful percentage improvement denominator: record an undefined ratio and no positive-percentage win, rather than adding an arbitrary epsilon or counting equality as 10% improvement. This is a general robustness issue; the reviewer did not inspect whether an experimental fold reaches it.
2. **Wholly unscorable target:** the scalar arithmetic check divides by `len(pairs)` without checking zero. A sampled target with entirely missing truth crashes, despite the core scorer correctly retaining its undefined loss and zero count. A retained subset containing no scorable targets would likewise make `macro` raise. Record an explicitly unscorable arithmetic/curve entry rather than a false failed arithmetic assertion. The prior mask audit establishes that no target in the present real common panel is wholly unscorable, so this does not invalidate its completed scores.
3. **Seed and random-order provenance:** code uses `20260910+fold` for shuffled targets and `20260911+fold` for random risk orders, while the protocol records the base values without the derivation. Preserve the executed deterministic seed rule in run provenance; do not silently change the protocol or seeds after seeing scores. Deterministic risk curves save exact target identities, but random curves save only the average. Save or reconstruct the 50 exact random orders from the frozen code and actual per-fold seeds, with hashes, to satisfy the exact-retained-identities contract. This requires no refit or strategy change.

Prediction artifacts are hashed snapshots, not externally timestamped or storage-enforced immutable commitments. Provenance currently hashes source files at run end; source bytes should remain unchanged throughout execution, and future runs can additionally record start hashes and assert they stayed unchanged. Neither point warrants claiming independent empirical replication.

Evidence: `runner-review.json`, `implementation-review.json`, `check_runner.py`, and `check_transfer.py`. The isolated runner fixtures and their logs contain synthetic results only. No shared model source or experimental result was edited by this reviewer.

## Portable release resolution

The maintained runner now records actual per-fold seeds and all 50 random retained orders, guards a zero best-baseline denominator, and records unscorable arithmetic samples explicitly. A complete portable run reproduced all 8,208 saved target-level rows exactly; see `flight01-reproduction.json`. These robustness/provenance edits do not alter the fitted methods or primary results. The preceding review describes the original runner at review time.
