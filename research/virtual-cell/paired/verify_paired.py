"""Independent reduction and algebra checks on the actual paired result artifacts."""
import json
import math
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd
from paired_paths import resolve_paths

HERE = Path(__file__).resolve().parent


def main(argv=None):
    args = resolve_paths(argv, description=__doc__, verification=True)
    results = args.results_dir
    scores = pd.read_csv(results / "scores.csv")
    summaries = json.loads((results / "summary.json").read_text())["rows"]
    selectors = json.loads((results / "selectors.json").read_text())
    checks = []
    gene_means = scores.groupby(["direction", "feature_view", "model", "target_gene"], sort=True).response_mse.mean()
    macro = gene_means.groupby(level=[0, 1, 2]).mean()
    for row in summaries:
        independently_reduced = float(macro.loc[row["direction"], row["feature_view"], row["model"]])
        checks.append({"check": "independent_pandas_gene_macro", "direction": row["direction"],
                       "view": row["feature_view"], "model": row["model"],
                       "passed": math.isclose(independently_reduced, row["macro_gene_mse"], rel_tol=1e-12, abs_tol=1e-12)})
    primary = scores[(scores.feature_view == "primary_all_shared") & (scores.model == "same_construct_transfer")]
    wide = primary.pivot(index="construct", columns="direction", values="response_mse")
    checks.append({"check": "absolute_transfer_squared_error_is_symmetric_per_construct",
                   "passed": bool(np.array_equal(wide.K562_to_RPE1, wide.RPE1_to_K562))})
    controls = scores[scores.model == "control"]
    checks.append({"check": "all_no_change_correlations_undefined",
                   "passed": bool(controls.response_pearson.isna().all() and (controls.pearson_status == "undefined_constant").all())})
    genes = selectors["shared_feature_ids"]
    labels = selectors["constructs"]
    perturbation_genes = [label.rsplit("_", 1)[-1] for label in labels]
    permutation = selectors["permutation"]
    checks.append({"check": "negative_control_is_bijection_with_no_same_gene_match",
                   "passed": sorted(permutation) == list(range(len(labels))) and all(g != perturbation_genes[permutation[i]] for i, g in enumerate(perturbation_genes))})
    expected_sizes = {label: len(genes) - int(gene in genes) for label, gene in zip(labels, perturbation_genes)}
    checks.append({"check": "target_gene_excluded_from_primary_scores",
                   "passed": all(int(row.n_features) == expected_sizes[row.construct] for row in primary.itertuples())})
    for context, filename in (("K562", "K562_essential_raw_bulk_01.h5ad"), ("RPE1", "rpe1_raw_bulk_01.h5ad")):
        data = ad.read_h5ad(args.data_dir / filename)
        mask = np.asarray(data.obs.core_control, dtype=bool)
        weight = list(map(float, data.obs.loc[mask, "num_cells_filtered"]))
        columns = data.var_names.get_indexer(genes)
        # Sparse feature sampling is fixed lexically, independent of results.
        checked_columns = [0, 1, 2, len(genes) // 2, len(genes) - 1]
        # Sum across all genes independently to preserve the declared denominator.
        matrix = np.asarray(data.X[mask][:, columns], dtype=float)
        denominator = math.fsum(math.fsum(float(v) * w for v, w in zip(matrix[:, j], weight)) for j in range(len(genes)))
        expected = [math.log1p(10000 * math.fsum(float(v) * w for v, w in zip(matrix[:, j], weight)) / denominator) for j in checked_columns]
        saved = json.loads((results / "control-vectors.json").read_text())["directions"][f"{context}_to_{'RPE1' if context == 'K562' else 'K562'}"]["source_control"]
        checks.append({"check": "stdlib_weighted_control_and_normalization", "context": context,
                       "passed": all(math.isclose(value, saved[j], rel_tol=1e-12, abs_tol=1e-12) for j, value in zip(checked_columns, expected))})
    result = {"passed": all(c["passed"] for c in checks), "checks": checks}
    verification_output = args.verification_output or results / "independent-verification.json"
    verification_output.parent.mkdir(parents=True, exist_ok=True)
    verification_output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
