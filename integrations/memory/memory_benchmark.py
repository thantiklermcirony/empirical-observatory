"""CPU-only POPGym diagnostic: learn a lag, freeze it, and test fresh episodes.

This integrates the real POPGym environment. It is not deep-RL training or a
reproduction of POPGym's neural baseline results. No hidden state API is used.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import inspect
import json
import platform
import random
import statistics
import time
from collections import deque
from pathlib import Path

from popgym.envs.repeat_previous import RepeatPrevious

PROTOCOL = "observatory-popgym-diagnostic/1"
LAGS = (0, 1, 3, 7, 15)
METHODS = ("observation_table", "learned_delay_register", "independent_register_control")


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def episode(seed, k, policy=None):
    """Score via actual step rewards; retain only public observations as input.

    In v1.0.7, step scores against history[-k] BEFORE returning a new card:
    k=1 therefore tests the currently visible card; k=4 uses lag 3.
    The assertion deliberately catches an upstream timing/semantic change.
    """
    env = RepeatPrevious(num_decks=1, k=k)
    observation, _ = env.reset(seed=seed)
    history, rows, rewards, actions = [], [], [], []
    try:
        while True:
            history.append(int(observation))
            action = int(observation) if policy is None else int(policy(tuple(history)))
            observation, reward, terminated, truncated, _ = env.step(action)
            actions.append(action)
            rewards.append(float(reward))
            if len(history) >= k:
                target = history[-k]
                expected_reward = (1 if action == target else -1) / (52-k)
                if abs(float(reward)-expected_reward) > 1e-12:
                    raise AssertionError("POPGym reward semantics differ from this protocol.")
                rows.append({"history": tuple(history), "observation": history[-1], "target": target})
            elif abs(float(reward)) > 1e-12:
                raise AssertionError("Expected unscored warmup.")
            if terminated or truncated:
                break
    finally:
        env.close()
    if len(rows) != 52-k or len(actions) != 51:
        raise AssertionError("Unexpected episode length.")
    return {"rows": rows, "return": sum(rewards), "actions": actions}


def fit(training_seeds, k):
    counts = [[1]*4 for _ in range(4)]  # Laplace-smoothed observation lookup.
    scored = {lag: [0, 0] for lag in LAGS}
    for seed in training_seeds:
        for row in episode(seed, k)["rows"]:
            counts[row["observation"]][row["target"]] += 1
            history = row["history"]
            for lag in LAGS:
                prediction = history[-lag-1] if len(history) > lag else history[-1]
                scored[lag][0] += prediction == row["target"]
                scored[lag][1] += 1
    table = [max(range(4), key=lambda target: counts[obs][target]) for obs in range(4)]
    # Ties deterministically prefer the smallest retained history.
    selected_lag = max(LAGS, key=lambda lag: (scored[lag][0]/scored[lag][1], -lag))
    return {"observationTable": table, "trainingCounts": counts,
            "selectedLag": selected_lag,
            "lagCandidates": [{"lag": lag, "accuracy": scored[lag][0]/scored[lag][1]}
                              for lag in LAGS]}


def evaluate(seed, k, model, method):
    control_rng = random.Random((seed << 32) ^ 0x4f425343)
    register = deque(maxlen=model["selectedLag"]+1)

    def policy(history):
        if method == "observation_table":
            return model["observationTable"][history[-1]]
        lag = model["selectedLag"]
        if method == "learned_delay_register":
            register.append(history[-1])
            return register[0] if len(register) > lag else register[-1]
        if method == "independent_register_control":
            # Same delay register shape, fed independent synthetic symbols.
            register.append(control_rng.randrange(4))
            return register[-lag-1] if len(register) > lag else register[-1]
        raise ValueError(method)

    result = episode(seed, k, policy)
    # Upstream per-correct/per-error reward has total absolute mass 1.
    accuracy = (result["return"]+1)/2
    return {"seed": seed, "method": method, "accuracy": accuracy,
            "return": result["return"], "scoredDecisions": len(result["rows"])}


def bootstrap(values, seed=78219, repetitions=2000):
    """Episode-cluster bootstrap of the mean, never independent time steps."""
    rng = random.Random(seed)
    means = sorted(statistics.fmean(rng.choices(values, k=len(values)))
                   for _ in range(repetitions))
    return [means[int(.025*(repetitions-1))], means[int(.975*(repetitions-1))]]


def run(development_count=100, test_count=200):
    if not 4 <= development_count <= 1000 or not 4 <= test_count <= 2000:
        raise ValueError("Use 4-1000 development and 4-2000 test episodes.")
    development_seeds = list(range(1000, 1000+development_count))
    test_seeds = list(range(100000, 100000+test_count))
    if set(development_seeds) & set(test_seeds):
        raise AssertionError("Development/test overlap.")
    cases = []
    start = time.perf_counter()
    for k in (1, 4, 16):
        model = fit(development_seeds, k)
        rows = [evaluate(seed, k, model, method) for seed in test_seeds for method in METHODS]
        summaries = []
        for method in METHODS:
            selected = [r for r in rows if r["method"] == method]
            accuracy = [r["accuracy"] for r in selected]
            summaries.append({"method": method, "meanAccuracy": statistics.fmean(accuracy),
                              "episodeBootstrap95": bootstrap(accuracy),
                              "meanOriginalReturn": statistics.fmean(r["return"] for r in selected)})
        differences = [next(r["accuracy"] for r in rows if r["seed"] == seed and r["method"] == METHODS[1]) -
                       next(r["accuracy"] for r in rows if r["seed"] == seed and r["method"] == METHODS[0])
                       for seed in test_seeds]
        cases.append({"name": "current-cue negative control" if k == 1 else f"repeat previous, visible lag {k-1}",
                      "upstreamClass": "popgym.envs.repeat_previous.RepeatPrevious", "upstreamK": k,
                      "visibleLag": k-1, "model": model, "summaries": summaries,
                      "pairedHistoryMinusObservation": {"mean": statistics.fmean(differences),
                                                       "episodeBootstrap95": bootstrap(differences)},
                      "episodes": rows})
    elapsed = time.perf_counter()-start
    evidence = {"protocol": PROTOCOL, "developmentSeeds": development_seeds,
                "testSeeds": test_seeds, "cases": cases}
    source = Path(inspect.getfile(RepeatPrevious))
    return {**evidence, "evidenceSha256": hashlib.sha256(canonical(evidence).encode()).hexdigest(),
            "runtimeSeconds": elapsed, "runtimeScope": "Local diagnostic including bootstrap; not an AI training or inference cost estimate.",
            "versions": {name: importlib.metadata.version(name) for name in ("popgym", "gymnasium", "numpy")},
            "python": platform.python_version(), "upstreamSourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "implementationSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "classification": "Real POPGym integration and standard-task diagnostic; no neural baseline reproduction or new architecture evaluation.",
            "claim": "History can resolve deliberately hidden task information; it gives no gain in the current-cue control. This result is expected from existing POMDP/memory theory.",
            "notEstablished": ["Novel learned representation", "LLM superiority", "General biological or consciousness claims",
                               "AI-market cost reduction", "Broad out-of-distribution generalization"],
            "sources": ["https://github.com/proroklab/popgym/tree/v1.0.7",
                        "https://github.com/proroklab/popgym/blob/v1.0.7/popgym/envs/repeat_previous.py",
                        "https://openreview.net/forum?id=chDrutUTs0K"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("memory-results.json"))
    parser.add_argument("--development-episodes", type=int, default=100)
    parser.add_argument("--test-episodes", type=int, default=200)
    args = parser.parse_args()
    results = run(args.development_episodes, args.test_episodes)
    args.output.write_text(json.dumps(results, indent=2, allow_nan=False)+"\n", encoding="utf-8")
    for case in results["cases"]:
        print(case["name"])
        for row in case["summaries"]:
            print(f"  {row['method']}: {row['meanAccuracy']:.6f}")
    print(f"Evidence SHA256: {results['evidenceSha256']}")
    print(f"Diagnostic runtime: {results['runtimeSeconds']:.3f} seconds")


if __name__ == "__main__":
    main()
