"""Pinned input contract. Importing this module never opens data files."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path

import numpy as np

SOURCE_FILES = ("pipeline.py", "dataio.py", "run.py", "protocol.json")


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_freeze(path):
    """A release owner supplies this after review; this program never creates it."""
    freeze = json.loads(Path(path).read_text(encoding="utf-8"))
    if freeze.get("status") != "frozen" or not freeze.get("frozen_at_utc"):
        raise ValueError("A reviewed, timestamped frozen execution manifest is required")
    folder = Path(__file__).resolve().parent
    expected = freeze.get("source_sha256", {})
    for name in SOURCE_FILES:
        if expected.get(name) != sha256(folder / name):
            raise ValueError(f"Unreviewed or changed execution source: {name}")
    return freeze


@dataclass
class Panel:
    contexts: np.ndarray
    treatments: np.ndarray
    genes: np.ndarray
    y: np.ndarray
    observed: np.ndarray
    controls: np.ndarray
    control_features: np.ndarray
    folds: np.ndarray
    provenance: dict


def assigned_folds(contexts, cell_folds, expected_folds=5, expected_size=10):
    """Preserve exact integer fold labels, including noncontiguous/one-based ones."""
    mapping = {c: int(fold) for fold, names in cell_folds.items() for c in names}
    listed = [c for names in cell_folds.values() for c in names]
    if len(listed) != len(set(listed)) or set(contexts) != set(mapping):
        raise ValueError("Frozen context assignment differs")
    folds = np.asarray([mapping[c] for c in contexts], dtype=int)
    _, counts = np.unique(folds, return_counts=True)
    if len(counts) != expected_folds or not np.all(counts == expected_size):
        raise ValueError("Expected five ten-line folds")
    return folds


def load_panel(response, controls, selection, preflight, freeze):
    """Decodes real outcome values ONLY after verifying reviewed source/input hashes."""
    # Keep optional file libraries out of the pure-array test runtime.
    import pandas as pd
    import pyarrow.parquet as pq

    manifest = verify_freeze(freeze)
    config = json.loads((Path(__file__).with_name("protocol.json")).read_text())
    expected = config["inputs"]
    paths = {"response": Path(response), "controls": Path(controls),
             "selection": Path(selection), "preflight": Path(preflight)}
    for key, path in paths.items():
        if sha256(path) != expected[key + "_sha256"]:
            raise ValueError(f"Pinned {key} input hash mismatch")
    selected = json.loads(paths["selection"].read_text())
    schema_record = json.loads(paths["preflight"].read_text())
    if not schema_record["schema_and_identity_gates_pass"]:
        raise ValueError("Schema/identity gate was not passed")
    pq_file = pq.ParquetFile(paths["response"])
    columns = [{"name": field.name, "type": str(field.type)} for field in pq_file.schema_arrow]
    if columns != schema_record["schema"] or pq_file.metadata.num_rows != 4443:
        raise ValueError("Response schema/row count changed")
    # Metadata already established all labels, but verify again before decoding outcomes.
    ids = pq_file.read(columns=["cell_line", "treatment"]).to_pandas()
    if ids.isna().any().any() or ids.duplicated(["cell_line", "treatment"]).any():
        raise ValueError("Missing or duplicate response identity")
    contexts = np.asarray(sorted(ids.cell_line.unique()))
    treatments = np.asarray(sorted(ids.treatment.unique()))
    genes = np.asarray(sorted(schema_record["features"]))
    if (len(contexts), len(treatments), len(genes)) != (50, 92, 2000):
        raise ValueError("Publisher design dimensions differ")
    folds = assigned_folds(contexts, selected["cell_folds"])
    with np.load(paths["controls"], allow_pickle=False) as covariates:
        control_ids = covariates["cell_lines"].astype(str)
        features = covariates["features"].astype(str)
        if len(set(control_ids)) != len(control_ids) or len(set(features)) != len(features):
            raise ValueError("Duplicate control identities")
        if set(contexts) != set(control_ids) or not set(genes).issubset(features):
            raise ValueError("Control identities do not cover response design")
        source_order = [int(np.flatnonzero(control_ids == c)[0]) for c in contexts]
        feature_order = np.argsort(features, kind="stable")
        x = np.asarray(covariates["ref_mean"], dtype=np.float64)[source_order][:, feature_order]
        features = features[feature_order]
    if not np.isfinite(x).all() or (x < 0).any():
        raise ValueError("Control numeric validity failure")
    # This is the only real-response numeric decode in the project.
    frame = pq_file.read(columns=["cell_line", "treatment"] + genes.tolist()).to_pandas()
    values = frame.loc[:, genes].to_numpy(dtype=np.float64)
    if not np.isfinite(values).all():
        raise ValueError(f"Nonfinite response values: {int((~np.isfinite(values)).sum())}; no imputation")
    context_pos = {c: i for i, c in enumerate(contexts)}
    treatment_pos = {t: i for i, t in enumerate(treatments)}
    y = np.full((50, 92, 2000), np.nan, dtype=np.float64)
    observed = np.zeros((50, 92), dtype=bool)
    for i, (cell, treatment) in enumerate(frame[["cell_line", "treatment"]].itertuples(index=False, name=None)):
        c, d = context_pos[cell], treatment_pos[treatment]
        y[c, d] = values[i]
        observed[c, d] = True
    if observed.sum() != 4443 or (~observed).sum() != 157:
        raise ValueError("Observed-pair coverage differs")
    return Panel(contexts, treatments, genes, y, observed, x, features, folds,
                 {"input_hashes": {key: sha256(path) for key, path in paths.items()},
                  "freeze": manifest, "publisher_revision": expected["publisher_revision"],
                  "pandas": pd.__version__, "outcome_scale": config["outcome_scale"]})
