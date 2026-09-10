"""Independent, dependency-free oracle for a small adaptive-test benchmark.

Default: exact design calculations and edge tests; no held-out seed evaluation.
--evaluate: additionally run the locked Monte Carlo seeds after implementation freeze.
"""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import argparse
import hashlib
import json
import math


@dataclass(frozen=True)
class Action:
    name: str
    cost: int
    likelihood: tuple[tuple[float, ...], ...]  # [hypothesis][outcome]


def binary(name, yes):
    return Action(name, 1, tuple((1 - p, p) for p in yes))


HYPOTHESES = ("A0", "A1", "B0", "B1")
PRIOR = (0.25,) * 4
BUDGET = 2
# This tuple order is also the deterministic action tie-break order.
ACTIONS = (
    binary("gate", (0.1, 0.1, 0.9, 0.9)),
    binary("local_a", (0.1, 0.9, 0.5, 0.5)),
    binary("local_b", (0.5, 0.5, 0.1, 0.9)),
    Action("full", 2, tuple(tuple(0.7 if h == y else 0.1 for y in range(4)) for h in range(4))),
)
BY_NAME = {a.name: a for a in ACTIONS}


def entropy(belief):
    return -sum(p * math.log2(p) for p in belief if p > 0)


def predictive(belief, action):
    return tuple(sum(belief[h] * action.likelihood[h][y] for h in range(4))
                 for y in range(len(action.likelihood[0])))


def update(belief, action, outcome):
    numerators = tuple(belief[h] * action.likelihood[h][outcome] for h in range(4))
    total = sum(numerators)
    if total <= 0:
        raise ValueError("Observation impossible under the declared hypothesis model")
    return tuple(p / total for p in numerators)


def eig(belief, action):
    return entropy(belief) - sum(p * entropy(update(belief, action, y))
                                for y, p in enumerate(predictive(belief, action)) if p > 0)


def affordable(remaining):
    return tuple(a for a in ACTIONS if a.cost <= remaining)


def best_eig(belief, remaining):
    options = affordable(remaining)
    return max(options, key=lambda a: eig(belief, a) / a.cost)


def oracle_value(belief, remaining):
    if remaining == 0:
        return max(belief)
    return max(sum(p * oracle_value(update(belief, a, y), remaining - a.cost)
                   for y, p in enumerate(predictive(belief, a)) if p > 0)
               for a in affordable(remaining))


def oracle_action(belief, remaining):
    return max(affordable(remaining), key=lambda a: sum(
        p * oracle_value(update(belief, a, y), remaining - a.cost)
        for y, p in enumerate(predictive(belief, a)) if p > 0))


def schedules(remaining):
    if remaining == 0:
        yield ()
    else:
        for action in affordable(remaining):
            for tail in schedules(remaining - action.cost):
                yield (action.name,) + tail


def fixed_policy(schedule):
    return lambda belief, remaining, history: ((1.0, BY_NAME[schedule[len(history)]]),)


def adaptive_policy(belief, remaining, history):
    return ((1.0, best_eig(belief, remaining)),)


def random_policy(belief, remaining, history):
    options = affordable(remaining)
    return tuple((1 / len(options), a) for a in options)


def prior_only_planner(belief, remaining, history):
    # Only planning ignores feedback; terminal belief still updates correctly.
    return ((1.0, best_eig(PRIOR, remaining)),)


def exact(policy, belief=PRIOR, remaining=BUDGET, history=()):
    if remaining == 0:
        return {"accuracy": max(belief), "entropy_bits": entropy(belief), "cost": 0.0}
    result = dict(accuracy=0.0, entropy_bits=0.0, cost=0.0)
    for choice_probability, action in policy(belief, remaining, history):
        for outcome, outcome_probability in enumerate(predictive(belief, action)):
            if outcome_probability == 0:
                continue
            child = exact(policy, update(belief, action, outcome), remaining - action.cost,
                          history + ((action.name, outcome),))
            probability = choice_probability * outcome_probability
            for key in ("accuracy", "entropy_bits"):
                result[key] += probability * child[key]
            result["cost"] += probability * (action.cost + child["cost"])
    return result


def keyed_uniform(key):
    """SHA256(UTF-8 key), first four bytes big-endian, open-interval uniform."""
    state = int.from_bytes(hashlib.sha256(key.encode("utf-8")).digest()[:4], "big")
    return (state + 0.5) / 4294967296


def categorical(probabilities, uniform):
    cumulative = 0.0
    for i, p in enumerate(probabilities):
        cumulative += p
        if uniform < cumulative:
            return i
    return len(probabilities) - 1


def episode(policy, policy_name, seed):
    hidden = categorical(PRIOR, keyed_uniform(f"adaptive-v1|{seed}|hidden"))
    belief, remaining, history, occurrences = PRIOR, BUDGET, (), {}
    while remaining:
        choices = policy(belief, remaining, history)
        index = categorical([p for p, _ in choices], keyed_uniform(
            f"adaptive-v1|{seed}|policy|{policy_name}|{len(history)}"))
        action = choices[index][1]
        occurrence = occurrences.get(action.name, 0)
        occurrences[action.name] = occurrence + 1
        outcome = categorical(action.likelihood[hidden], keyed_uniform(
            f"adaptive-v1|{seed}|measurement|{action.name}|{occurrence}"))
        belief = update(belief, action, outcome)
        remaining -= action.cost
        history += ((action.name, outcome),)
    decision = max(range(4), key=lambda h: belief[h])
    return {"correct": int(decision == hidden), "log_loss_bits": -math.log2(belief[hidden]),
            "cost": BUDGET - remaining, "history": history}


def evaluation(policies):
    # Do not call until implementation/specification hashes have been frozen.
    runs = {name: [episode(policy, name, seed) for seed in range(10000, 20000)]
            for name, policy in policies.items()}
    metrics = {name: {key: sum(row[key] for row in rows) / len(rows)
                      for key in ("correct", "log_loss_bits", "cost")} for name, rows in runs.items()}
    paired = [a["correct"] - b["correct"] for a, b in zip(runs["adaptive_eig"], runs["best_fixed"])]
    mean = sum(paired) / len(paired)
    variance = sum((d - mean) ** 2 for d in paired) / (len(paired) - 1)
    se = math.sqrt(variance / len(paired))
    interval = [mean - 1.96 * se, mean + 1.96 * se]
    return {"seed_range_inclusive": [10000, 19999], "metrics": metrics,
            "paired_accuracy_advantage": mean, "approximate_95pct_paired_interval": interval,
            "decision_advantage_gate": mean >= 0.05 and interval[0] > 0}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evaluate", action="store_true")
    args = parser.parse_args()
    for action in ACTIONS:
        assert isinstance(action.cost, int) and action.cost > 0
        assert all(all(0 <= p <= 1 for p in row) and math.isclose(sum(row), 1) for row in action.likelihood)
    fixed = {",".join(schedule): exact(fixed_policy(schedule)) for schedule in schedules(BUDGET)}
    best_schedule = max(fixed, key=lambda name: fixed[name]["accuracy"])
    policies = {"adaptive_eig": adaptive_policy, "best_fixed": fixed_policy(tuple(best_schedule.split(","))),
                "random_feasible": random_policy, "prior_only_planner": prior_only_planner,
                "optimal_decision_oracle": lambda b, r, h: ((1.0, oracle_action(b, r)),)}
    metrics = {name: exact(policy) for name, policy in policies.items()}
    assert math.isclose(metrics["adaptive_eig"]["accuracy"], 0.81, abs_tol=1e-12)
    assert math.isclose(metrics["best_fixed"]["accuracy"], 0.7, abs_tol=1e-12)
    assert math.isclose(oracle_value(PRIOR, BUDGET), 0.81, abs_tol=1e-12)
    assert all(math.isclose(row["cost"], 2, abs_tol=1e-12) for row in metrics.values())
    assert best_eig(PRIOR, 2).name == "gate"
    assert best_eig(update(PRIOR, ACTIONS[0], 0), 1).name == "local_a"
    assert best_eig(update(PRIOR, ACTIONS[0], 1), 1).name == "local_b"
    identical = binary("uninformative", (0.5,) * 4)
    assert abs(eig(PRIOR, identical)) < 1e-12
    assert update(PRIOR, identical, 0) == PRIOR
    assert abs(eig((1.0, 0.0, 0.0, 0.0), ACTIONS[0])) < 1e-12
    impossible = binary("always_zero", (0.0,) * 4)
    try:
        update(PRIOR, impossible, 1)
    except ValueError:
        pass
    else:
        raise AssertionError("Impossible evidence must not reset to a uniform belief")
    # Separate one-step counterexample: EIG is not generally decision-optimal.
    needle = binary("isolate_A0", (1.0, 0.0, 0.0, 0.0))
    noisy_full = Action("noisy_full", 1, tuple(tuple(0.6 if h == y else 0.4 / 3 for y in range(4)) for h in range(4)))
    counterexample = {a.name: {"eig_bits": eig(PRIOR, a),
                              **exact(lambda b, r, history, a=a: ((1.0, a),), remaining=1)}
                      for a in (needle, noisy_full)}
    assert counterexample["isolate_A0"]["eig_bits"] > counterexample["noisy_full"]["eig_bits"]
    assert math.isclose(counterexample["isolate_A0"]["accuracy"], 0.5, abs_tol=1e-12)
    assert math.isclose(counterexample["noisy_full"]["accuracy"], 0.6, abs_tol=1e-12)
    report = {"scope": "Exact calculations in an authored synthetic model, not empirical discovery",
              "reference_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "initial_information_gain_per_cost": {a.name: eig(PRIOR, a) / a.cost for a in ACTIONS},
              "after_gate_zero": update(PRIOR, ACTIONS[0], 0),
              "after_gate_one": update(PRIOR, ACTIONS[0], 1),
              "all_fixed_schedules": fixed, "best_fixed_schedule": best_schedule,
              "exact_policy_metrics": metrics, "edge_cases_passed": True,
              "separate_one_step_eig_decision_counterexample": counterexample,
              "keyed_uniform_test_vectors": {key: keyed_uniform(key) for key in [
                  "adaptive-v1|0|hidden", "adaptive-v1|1|measurement|gate|0",
                  "adaptive-v1|127|policy|random_feasible|1"]},
              "held_out_seeds_executed": args.evaluate}
    if args.evaluate:
        report["evaluation"] = evaluation(policies)
    output = Path(__file__).with_name("evaluation-results.json" if args.evaluate else "reference-results.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
