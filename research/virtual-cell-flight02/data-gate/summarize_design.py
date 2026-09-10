"""Summarize the identifier-only preflight; this script never opens a data table."""
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def main():
    directory = Path(__file__).resolve().parent
    source = directory / "SCHEMA_PREFLIGHT.json"
    report = json.loads(source.read_text())
    definitions = report["treatments"]
    coverage = report["treatment_coverage"]
    cells = report["contexts"]
    components = [component for item in definitions.values() for component in item["components"]]
    fold_support = {}
    for fold, treatments in report["fold_treatment_support"].items():
        fold_support[fold] = {
            "source_contexts_min": min(t["source_contexts"] for t in treatments.values()),
            "source_contexts_max": max(t["source_contexts"] for t in treatments.values()),
            "test_contexts_min": min(t["test_contexts"] for t in treatments.values()),
            "test_contexts_max": max(t["test_contexts"] for t in treatments.values()),
            "test_pairs": sum(t["test_contexts"] for t in treatments.values()),
            "unsupported_test_treatments": [t for t, counts in treatments.items()
                                            if counts["test_contexts"] and not counts["source_contexts"]],
        }
    output = {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_preflight_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "response_values_decoded_by_preflight": False,
        "contexts": report["context_count"],
        "treatments": report["treatment_label_count"],
        "unique_compound_strings": len({c["compound"] for c in components}),
        "compound_dose_units": sorted({c["unit"] for c in components}),
        "compound_doses_as_released": sorted({c["dose"] for c in components}),
        "mixtures": [t for t, d in definitions.items() if d["is_mixture"]],
        "declared_dmso_response_labels": [t for t, d in definitions.items() if d["is_declared_dmso_control"]],
        "compound_strings_with_edge_whitespace": sorted({c["compound"] for c in components
                                                        if c["compound"] != c["compound"].strip()}),
        "observed_pairs": report["file_rows"],
        "missing_pairs": len(cells) * len(coverage) - report["file_rows"],
        "treatment_context_coverage_histogram": dict(sorted(Counter(map(len, coverage.values())).items())),
        "per_context_observed_treatments": {c: sum(c in observed for observed in coverage.values()) for c in cells},
        "incomplete_treatments": [{"label": t, "observed_contexts": len(observed),
                                   "missing_contexts": sorted(set(cells) - set(observed))}
                                  for t, observed in coverage.items() if len(observed) != len(cells)],
        "fold_support": fold_support,
        "all_identity_and_schema_gates_pass": report["schema_and_identity_gates_pass"],
        "all_outcome_features_available_as_control_covariates": not report["outcome_features_missing_from_control_panel"],
        "intended_estimand": "Predict released plate-1 response deltas for observed cell-line/compound-dose pairs in whole held-out cell lines, using released matched controls as covariates in their own units.",
        "scope_limits": ["one plate", "one dose", "fixed publisher 2000-gene response panel",
                         "existing observed pairs only", "known treatments in new cell-line response contexts",
                         "not a causal identification or absolute endpoint experiment"],
        "remaining_gate": "Freeze model, source-only fitting/tuning, scoring and missingness rules before reading the frozen response numeric columns. Later numeric validity checks must fail explicitly instead of selecting favorable outcomes.",
    }
    (directory / "DESIGN_SUMMARY.json").write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({k: v for k, v in output.items()
                      if k not in ("per_context_observed_treatments", "incomplete_treatments")}, indent=2))


if __name__ == "__main__":
    main()
