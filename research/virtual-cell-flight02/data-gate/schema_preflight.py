"""Read only Parquet schema and intervention/context identifiers, never outcomes.

The SHA256 check reads bytes without interpreting expression values. No expression
column pages or statistics are decoded by this preflight. Requires NumPy/PyArrow.
"""
import argparse
import ast
import hashlib
import json
import math
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq


def treatment_definition(label):
    if not isinstance(label, str) or len(label) > 4096:
        return {"valid": False, "error": "Missing or oversized treatment string"}
    try:
        value = ast.literal_eval(label)
        if not isinstance(value, list) or not value:
            raise ValueError("Expected a nonempty list of (compound, dose, unit) tuples")
        components = []
        for item in value:
            if not isinstance(item, (list, tuple)) or len(item) != 3:
                raise ValueError("A component must have exactly three fields")
            compound, dose, unit = item
            if not isinstance(compound, str) or not compound or not isinstance(unit, str) or not unit:
                raise ValueError("Missing compound or unit")
            if isinstance(dose, bool) or not isinstance(dose, (int, float)) or not math.isfinite(dose) or dose < 0:
                raise ValueError("Dose must be finite and nonnegative")
            components.append({"compound": compound, "dose": str(Decimal(str(dose)).normalize()), "unit": unit})
        return {"valid": True, "components": components, "is_mixture": len(components) > 1,
                "canonical_key": json.dumps(components, sort_keys=True, separators=(",", ":")),
                "is_declared_dmso_control": value == [("DMSO_TF", 0.0, "uM")]}
    except (ValueError, TypeError, SyntaxError, MemoryError, RecursionError) as exc:
        return {"valid": False, "error": str(exc)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--response", type=Path, required=True)
    parser.add_argument("--frozen", type=Path, required=True)
    parser.add_argument("--controls", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    if args.out.resolve() != Path(__file__).resolve().parent:
        parser.error("This bounded preflight writes only its own data-gate directory")
    frozen_bytes = args.frozen.read_bytes()
    frozen = json.loads(frozen_bytes)
    contract = frozen["response_shard"]
    if args.response.stat().st_size != contract["bytes"]:
        raise ValueError("Response file byte size does not match frozen selection")
    with args.response.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != contract["sha256"]:
        raise ValueError("Response hash does not match frozen selection")
    controls = np.load(args.controls, allow_pickle=False)
    control_cells = controls["cell_lines"].tolist()
    control_features = controls["features"].tolist()
    # Do not load controls['ref_mean']; this is an identity/schema preflight.
    parquet = pq.ParquetFile(args.response)
    schema = parquet.schema_arrow
    names = schema.names
    if len(names) != len(set(names)):
        raise ValueError("Duplicate column names")
    allowed_context_fields = [x for x in ("cell_line", "cell_line_id") if x in names]
    allowed_treatment_fields = [x for x in ("treatment", "drugname_drugconc") if x in names]
    if len(allowed_context_fields) != 1 or len(allowed_treatment_fields) != 1:
        raise ValueError("Expected one unambiguous context and treatment field; inspect schema without reading values")
    context_field = allowed_context_fields[0]
    treatment_field = allowed_treatment_fields[0]
    metadata_fields = [context_field, treatment_field]
    # Critical boundary: only these string identifier columns are decoded.
    identifiers = parquet.read(columns=metadata_fields).to_pydict()
    rows = list(zip(identifiers[context_field], identifiers[treatment_field]))
    if any(not isinstance(c, str) or not isinstance(t, str) for c, t in rows):
        raise ValueError("Missing or non-string design identifiers")
    pair_counts = Counter(rows)
    cells = sorted({c for c, _ in rows})
    labels = sorted({t for _, t in rows})
    features = [x for x in names if x not in metadata_fields]
    nonnumeric = [x for x in features if not (pa.types.is_floating(schema.field(x).type) or pa.types.is_integer(schema.field(x).type))]
    definitions = {label: treatment_definition(label) for label in labels}
    canonical = {}
    for label, definition in definitions.items():
        if definition["valid"]:
            canonical.setdefault(definition["canonical_key"], []).append(label)
    aliases = [x for x in canonical.values() if len(x) > 1]
    coverage = {label: sorted(c for c, t in pair_counts if t == label) for label in labels}
    folded = [c for group in frozen["cell_folds"].values() for c in group]
    fold_support = {}
    for fold, heldout in frozen["cell_folds"].items():
        heldout = set(heldout)
        fold_support[fold] = {
            label: {"source_contexts": sum(c not in heldout for c in covered),
                    "test_contexts": sum(c in heldout for c in covered)}
            for label, covered in coverage.items()}
    report = {"created_at_utc": datetime.now(timezone.utc).isoformat(),
              "frozen_selection_sha256": hashlib.sha256(frozen_bytes).hexdigest(),
              "verified_response_bytes": args.response.stat().st_size,
              "verified_response_sha256": digest,
              "response_values_decoded": False, "response_statistics_inspected": False,
              "decoded_columns": metadata_fields, "file_rows": parquet.metadata.num_rows,
              "row_groups": parquet.num_row_groups, "schema_field_count": len(schema),
              "schema": [{"name": f.name, "type": str(f.type)} for f in schema],
              "context_count": len(cells), "contexts": cells,
              "treatment_label_count": len(labels), "treatments": definitions,
              "feature_count": len(features), "features": features,
              "nonnumeric_outcome_columns": nonnumeric,
              "outcome_features_missing_from_control_panel": sorted(set(features) - set(control_features)),
              "response_contexts_missing_controls": sorted(set(cells)-set(control_cells)),
              "frozen_contexts_absent_from_response": sorted(set(folded)-set(cells)),
              "response_contexts_outside_frozen_folds": sorted(set(cells)-set(folded)),
              "duplicate_context_treatment_pairs": [{"context": c, "treatment": t, "count": n} for (c,t),n in pair_counts.items() if n > 1],
              "treatment_aliases": aliases, "treatment_coverage": coverage,
              "fold_treatment_support": fold_support,
              "complete_context_treatment_grid": len(rows) == len(cells)*len(labels) and max(pair_counts.values()) == 1,
              "publisher_feature_selection_independent_of_test_outcomes": "not established; use a fixed publisher outcome panel",
              "source_scale_identification": "released expression delta; exact upload preprocessing not certified"}
    report["schema_and_identity_gates_pass"] = not (
        nonnumeric or report["response_contexts_missing_controls"] or report["response_contexts_outside_frozen_folds"]
        or report["frozen_contexts_absent_from_response"] or report["duplicate_context_treatment_pairs"]
        or aliases or any(not x["valid"] for x in definitions.values()))
    (args.out / "SCHEMA_PREFLIGHT.json").write_text(json.dumps(report, indent=2) + "\n")
    compact = {k:v for k,v in report.items() if k not in ("schema", "features", "treatments", "treatment_coverage", "fold_treatment_support")}
    print(json.dumps(compact, indent=2))


if __name__ == "__main__":
    main()
