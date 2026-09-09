# A small, real memory benchmark

This release integrates the installed **POPGym 1.0.7** environment and runs its actual `reset`/`step` methods. It demonstrates when retained observations are useful. It is a standard-task diagnostic, not a reproduction of POPGym's neural baseline results and not evidence for a new AI architecture. POPGym already exists specifically to evaluate memory under partial observability. [Upstream project](https://github.com/proroklab/popgym), [paper](https://arxiv.org/abs/2303.01859).

## Run

```sh
python -m venv .venv
# Activate the environment using your operating system's normal command.
python -m pip install -r requirements-memory-lock.txt
python -m unittest -v test_memory_benchmark
python memory_benchmark.py --output memory-results.json
```

The default run took **1.198 seconds** on this session's CPU, including bootstrapping. This is a diagnostic runtime, not a training-cost or market-efficiency estimate. Four automated tests passed. `memory-results.json` includes every scored episode, package versions, source hashes, exact seeds, model choices, and an evidence checksum. Runtime is excluded from that checksum.

## Experiment

The environment presents card suits and rewards repetition of a specified earlier observation. We use one deck and upstream `k=1,4,16`. An explicit reward assertion checks the version's indexing: `step` scores the action against the public history's `[-k]` element before returning a new card. Those settings therefore mean visible lags **0, 3, and 15** at decision time. `k=1` is the current-cue negative control. We do not call `get_state`, inspect a private deck, use future observations as model inputs, or modify upstream dynamics. [Pinned upstream implementation](https://github.com/proroklab/popgym/blob/v1.0.7/popgym/envs/repeat_previous.py), [Gymnasium API](https://gymnasium.farama.org/api/env/).

One hundred development episodes fit two simple policies. The observation policy is a four-by-four Laplace-smoothed lookup table. The history policy selects among five fixed lag candidates, 0, 1, 3, 7, and 15, with deterministic tie-breaking toward the shorter history. It then freezes that choice and uses a bounded delay register. Training labels are reconstructed from already observed history under the known task rule. This is supervised structure selection, not reinforcement-learning training. The harness retains histories for validation; the policy register retains only the selected number of symbols. No process-memory or information-compression claim is inferred from this implementation.

Two hundred separate test seeds per task are shared across all policies. A third policy uses the same register shape but feeds it independent uniform symbols; this checks whether memory contains relevant information. The test scripts verify causal alignment, exact seeded reproducibility, disjoint seed ranges, and both controls. Reported 95% intervals use 2,000 episode-cluster bootstrap samples. They describe variation within this fixed environment; they do not cover model selection, task selection, or real-world generalization.

| Task | Observation lookup | History register | Independent register |
|---|---:|---:|---:|
| Current-cue control | 100.00% | 100.00% | 24.73% |
| Visible lag 3 | 25.92% | 100.00% | 24.69% |
| Visible lag 15 | 24.63% | 100.00% | 24.42% |

The comparison changes available information deliberately. It shows that a sufficient observation history solves a task whose answer was previously visible. It does not show a more efficient algorithm than a strong memory model. The result is expected: the lag family includes the correct rule and the environment has no observation noise. The current-cue result is essential—retaining history offers no benefit when the current cue already determines the answer. Because cards are sampled without replacement, the observation baseline need not equal exactly 25%.

## What this licenses us to say

“The Observatory runs a reproducible, established partial-observation benchmark. Our diagnostic distinguishes missing state information from a fully visible control.”

It does not license “AI is doing everything wrong,” an LLM replacement claim, a percent compute reduction, or a claim that this toy task validates biology or consciousness. Predictive and history-based state representations have a substantial prior literature. [Predictive Representations of State](https://proceedings.neurips.cc/paper/2001/hash/1e4d36177d71bbb3558e43af9577d70e-Abstract.html).

## Next comparison that could produce a programme result

Freeze a precisely specified programme model, train it alongside recurrent, frame-stack, and state-space baselines with matched observations, training data, parameter and compute budgets. Compare multiple unseen lags, nuisance dimensions, noisy cues, held-out task families, and an unchanged fully observed control. Report accuracy, calibration, wall time, peak memory, parameters, learning curves, and all failed tasks. Select test families before inspecting their outcomes. The existing POPGym repository warns that its old neural baseline dependencies require care; a new baseline harness needs explicit versioning and validation rather than silently treating this diagnostic as that reproduction.

Evidence SHA256: `8796d25ea711c23bee8582a8a41eb608672c83c8034857d8b3b561a6e0718320`.
