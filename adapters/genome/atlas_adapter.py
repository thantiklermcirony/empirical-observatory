"""Small read-only AlphaGenome Atlas integration. No key: no network, no predictions.

Own adapter code, MIT. Upstream interface inspected at the commit in SDK_COMMIT.
The SDK license does not license its prediction outputs. See RESEARCH.md.
"""
from __future__ import annotations

import argparse
from collections.abc import Mapping
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
from typing import Any

SDK_COMMIT = "aa6fc8f6faadcb8c910fa2b85b57386fbd5c7b5d"
SCHEMA = "observatory-atlas/1"
MAX_VARIANTS = 8
MAX_CELLS = 20_000
ROOT = Path(__file__).resolve().parent


def read_json(path: Path) -> Any:
    if path.stat().st_size > 2_000_000:
        raise ValueError("Input JSON exceeds the 2 MB limit")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def validate_manifest(value: Any) -> dict:
    if not isinstance(value, dict) or value.get("schema") != "observatory-atlas-request/1":
        raise ValueError("Unsupported request schema")
    allowed = {"schema", "assembly", "coordinateSystem", "organism", "variants", "requestedScorers",
               "ontologyTerms", "geneIds", "purpose", "variantSource", "fixtureOnly"}
    if set(value) - allowed:
        raise ValueError("Unknown request fields; credentials belong only in the environment")
    if value.get("assembly") != "GRCh38" or value.get("coordinateSystem") != "1-based":
        raise ValueError("Only explicitly declared GRCh38, 1-based SNVs are supported")
    if value.get("organism") != "Homo sapiens":
        raise ValueError("This Atlas interface is human-only")
    variants = value.get("variants")
    if not isinstance(variants, list) or not 1 <= len(variants) <= MAX_VARIANTS:
        raise ValueError(f"Supply 1 to {MAX_VARIANTS} variants")
    keys = set()
    for variant in variants:
        if not isinstance(variant, dict):
            raise ValueError("Invalid variant record")
        if set(variant) != {"chromosome", "position", "reference_bases", "alternate_bases"}:
            raise ValueError("Variant records must contain exactly chromosome, position and both alleles")
        chrom, pos = variant.get("chromosome"), variant.get("position")
        ref, alt = variant.get("reference_bases"), variant.get("alternate_bases")
        if not isinstance(chrom, str) or not re.fullmatch(r"chr(?:[1-9]|1[0-9]|2[0-2]|X|Y)", chrom):
            raise ValueError("Use canonical human chromosome names chr1..chr22, chrX or chrY")
        if type(pos) is not int or not 1 <= pos <= 248_956_422:
            raise ValueError("Variant position must be a positive integer within GRCh38 range")
        if ref not in ("A", "C", "G", "T") or alt not in ("A", "C", "G", "T") or ref == alt:
            raise ValueError("Only distinct, single, uppercase A/C/G/T alleles are supported")
        key = (chrom, pos, ref, alt)
        if key in keys:
            raise ValueError("Duplicate variants are not allowed")
        keys.add(key)
    for field, maximum in (("requestedScorers", 2), ("ontologyTerms", 2), ("geneIds", 4)):
        items = value.get(field, [])
        if not isinstance(items, list) or len(items) > maximum or any(not isinstance(x, str) or not 1 <= len(x) <= 128 for x in items):
            raise ValueError(f"Invalid {field}")
        if len(set(items)) != len(items):
            raise ValueError(f"Duplicate {field}")
    for term in value.get("ontologyTerms", []):
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*:[A-Za-z0-9_]+", term):
            raise ValueError("Ontology terms must be exact CURIE identifiers")
    if any(not re.fullmatch(r"ENSG[0-9]{11}(?:\.[0-9]+)?", gene) for gene in value.get("geneIds", [])):
        raise ValueError("Gene filters must be human Ensembl gene identifiers")
    return value


def reference_check(manifest: dict, path: Path) -> dict:
    """Verify supplied alleles against a small, independently obtained GRCh38 window.

    Header: >GRCh38|chr5:1294989-1295247 (both ends 1-based inclusive).
    This validates the supplied file, not its provenance: record its actual source.
    """
    if path.stat().st_size > 2_000_000:
        raise ValueError("Use reference windows smaller than 2 MB")
    raw = path.read_bytes()
    records = []
    header, sequence = None, []
    for line in raw.decode("utf-8-sig").splitlines():
        if not line.strip():
            continue
        if line.startswith(">"):
            if header is not None:
                records.append((header, "".join(sequence)))
            header, sequence = line[1:].strip(), []
        elif header is None:
            raise ValueError("Reference FASTA needs a header")
        else:
            sequence.append(line.strip().upper())
    if header is not None:
        records.append((header, "".join(sequence)))
    windows = []
    for header, sequence in records:
        match = re.fullmatch(r"GRCh38\|(chr(?:[1-9]|1[0-9]|2[0-2]|X|Y)):(\d+)-(\d+)", header)
        if not match:
            raise ValueError("Reference header must be GRCh38|chrN:start-end, 1-based inclusive")
        chrom, start, end = match[1], int(match[2]), int(match[3])
        if start < 1 or end < start or len(sequence) != end - start + 1 or re.search("[^ACGTN]", sequence):
            raise ValueError("Reference window length, coordinates or sequence are invalid")
        windows.append((chrom, start, end, sequence))
    for variant in manifest["variants"]:
        hits = [seq[variant["position"] - start] for chrom, start, end, seq in windows
                if chrom == variant["chromosome"] and start <= variant["position"] <= end]
        if len(hits) != 1 or hits[0] != variant["reference_bases"]:
            raise ValueError("Reference mismatch, missing coverage, or ambiguous overlapping windows")
    return {"assembly": "GRCh38", "sha256": hashlib.sha256(raw).hexdigest(),
            "checkedVariants": len(manifest["variants"]), "status": "alleles-match-supplied-reference"}


def json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, Mapping):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    if hasattr(value, "to_dict"):
        return json_safe(value.to_dict())
    if hasattr(value, "tolist"):
        return json_safe(value.tolist())
    if hasattr(value, "item"):
        return json_safe(value.item())
    # Do not silently turn a new upstream type into an opaque string.
    raise ValueError(f"Unsupported result type: {type(value).__name__}")


def frame_records(frame: Any) -> list:
    return json_safe(frame.to_dict(orient="records"))


def describe_metadata(metadata: Mapping) -> list[dict]:
    result = []
    for key, meta in sorted(metadata.items()):
        if not isinstance(key, str) or meta.name != key or type(meta.is_signed) is not bool:
            raise ValueError("Unexpected scorer metadata interface")
        tracks = frame_records(meta.track_metadata)
        ontologies = sorted({str(row["ontology_curie"]) for row in tracks if row.get("ontology_curie")})
        result.append({"name": key, "isSigned": meta.is_signed, "trackCount": len(tracks),
                       "ontologyTerms": ontologies, "trackColumns": list(map(str, meta.track_metadata.columns))})
    return result


def select_scorers(manifest: dict, metadata: Mapping) -> list[str]:
    requested = manifest.get("requestedScorers", [])
    if not requested:
        raise ValueError("Select 1 or 2 exact scorer names from list-scorers; none are assumed")
    descriptions = {row["name"]: row for row in describe_metadata(metadata)}
    for name in requested:
        if name not in descriptions:
            raise ValueError("Requested scorer is absent from current server metadata")
        known_terms = descriptions[name]["ontologyTerms"]
        if manifest.get("ontologyTerms") and any(t not in known_terms for t in manifest["ontologyTerms"]):
            raise ValueError("Requested ontology is not listed for this scorer; do not substitute a cell type silently")
    return requested


def serialize_score(name: str, data: Any, signed: bool, remaining_cells: int) -> dict:
    rows, columns = map(int, data.shape)
    if rows < 0 or columns < 0 or rows * columns > remaining_cells:
        raise ValueError("Response exceeds the total 20,000-cell export limit; narrow the filters")
    values = data.X.toarray() if hasattr(data.X, "toarray") else data.X
    result = {"scorer": name, "isSigned": signed, "shape": [rows, columns],
              "observations": frame_records(data.obs), "tracks": frame_records(data.var),
              "predictedScores": json_safe(values), "source": "model-prediction"}
    if "quantiles" in data.layers:
        layer = data.layers["quantiles"]
        result["providerQuantiles"] = json_safe(layer.toarray() if hasattr(layer, "toarray") else layer)
    # Provider quantiles are not confidence intervals or probabilities of biological effect.
    return result


def query(manifest: dict, client: Any, variant_factory: Any, checked_reference: dict) -> dict:
    """Injected client/variant factory make transport tests possible without a key."""
    validate_manifest(manifest)
    if manifest.get("fixtureOnly"):
        raise ValueError("A synthetic fixture manifest cannot be queried against Atlas")
    if checked_reference.get("status") != "alleles-match-supplied-reference" or checked_reference.get("checkedVariants") != len(manifest["variants"]):
        raise ValueError("Reference verification is required before querying")
    try:
        metadata = client.scorer_metadata()
    except Exception:
        raise RuntimeError("Provider metadata access failed") from None
    selected = select_scorers(manifest, metadata)
    variants = []
    total_cells = 0
    for definition in manifest["variants"]:
        # One sequential request per variant: no bulk interval download or concurrency.
        variant = variant_factory(**{k: definition[k] for k in ("chromosome", "position", "reference_bases", "alternate_bases")})
        try:
            result = client.query_variant(variant, requested_scorers=selected,
                                          ontology_terms=manifest.get("ontologyTerms") or None,
                                          gene_ids=manifest.get("geneIds") or None)
        except Exception:
            raise RuntimeError("Provider variant access failed") from None
        if not isinstance(result, Mapping) or any(name not in selected for name in result):
            raise ValueError("Response returned an unrequested scorer")
        scores = []
        for name, data in result.items():
            entry = serialize_score(name, data, metadata[name].is_signed, MAX_CELLS - total_cells)
            total_cells += entry["shape"][0] * entry["shape"][1]
            scores.append(entry)
        variants.append({"variant": definition, "status": "returned" if scores else "no-scores-returned",
                         "scores": scores, "missingScorers": [name for name in selected if name not in result]})
    return {"schema": SCHEMA, "mode": "live-atlas-read", "source": "model-prediction",
            "queriedAt": datetime.now(timezone.utc).isoformat(), "sdkCommit": SDK_COMMIT,
            "assembly": "GRCh38", "coordinateSystem": "1-based", "request": manifest,
            "referenceCheck": checked_reference, "scorerMetadata": describe_metadata(metadata),
            "logicalCalls": {"metadata": 1, "variantQueries": len(variants)},
            "variants": variants, "missingNumericValues": "encoded as null; never replaced with zero",
            "useConstraints": "Provider terms apply. No training, clinical interpretation, or automatic public redistribution."}


def plan(manifest: dict) -> dict:
    validate_manifest(manifest)
    return {"schema": SCHEMA, "mode": "plan-only", "source": "request-metadata",
            "networkCalls": 0, "predictions": [], "request": manifest,
            "readyForLiveQuery": False,
            "next": "Review provider terms; inspect live scorer metadata; select exact scorers/context; verify a GRCh38 reference window; configure ALPHAGENOME_API_KEY locally."}


def make_client() -> tuple[Any, Any]:
    key = os.environ.get("ALPHAGENOME_API_KEY", "").strip()
    if not key:
        raise ValueError("ALPHAGENOME_API_KEY is absent; no network request was made. Use plan or fixture mode.")
    try:
        from alphagenome.atlas import atlas
        from alphagenome.data import genome
    except ImportError as error:
        raise ValueError("Install the pinned optional SDK with requirements-live.txt") from error
    try:
        return atlas.create(key, timeout=20), genome.Variant
    except Exception:
        raise RuntimeError("Provider client connection failed") from None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", nargs="?", choices=("plan", "fixture", "list-scorers", "query"), default="plan")
    parser.add_argument("--manifest", type=Path, default=ROOT / "request-template.json")
    parser.add_argument("--reference-fasta", type=Path)
    parser.add_argument("--reference-source", help="Exact URL identifying the supplied reference window source")
    parser.add_argument("--terms-reviewed", action="store_true", help="The local operator has reviewed the applicable current provider terms")
    parser.add_argument("--out", type=Path, help="Local JSON output; live results are not suitable for automatic public upload")
    args = parser.parse_args(argv)
    try:
        if args.mode == "fixture":
            result = read_json(ROOT / "fixtures" / "synthetic-response.json")
        elif args.mode == "plan":
            result = plan(read_json(args.manifest))
        else:
            if not args.terms_reviewed:
                raise ValueError("Live metadata/score access requires --terms-reviewed after reading the current provider terms")
            if args.mode == "query":
                manifest = validate_manifest(read_json(args.manifest))
                if manifest.get("fixtureOnly"):
                    raise ValueError("Fixture requests cannot be used for live queries")
                if not manifest.get("requestedScorers"):
                    raise ValueError("Select exact scorer names from list-scorers before querying")
                if args.reference_fasta is None or not args.reference_source or not args.reference_source.startswith("https://"):
                    raise ValueError("Query requires --reference-fasta and its exact HTTPS --reference-source")
                checked = reference_check(manifest, args.reference_fasta)
                checked["sourceUrl"] = args.reference_source
            client, factory = make_client()
            if args.mode == "list-scorers":
                try:
                    metadata = client.scorer_metadata()
                except Exception:
                    raise RuntimeError("Provider metadata access failed") from None
                result = {"schema": SCHEMA, "mode": "live-metadata-read", "source": "provider-metadata",
                          "sdkCommit": SDK_COMMIT, "scorers": describe_metadata(metadata)}
            else:
                result = query(manifest, client, factory, checked)
        encoded = json.dumps(result, indent=2, allow_nan=False) + "\n"
        if args.out:
            # Refuse accidental replacement of an existing record.
            with args.out.open("x", encoding="utf-8") as output:
                output.write(encoded)
            print(f"Saved {args.mode} result locally.")
        else:
            print(encoded, end="")
        return 0
    except (ValueError, OSError) as error:
        # Validation text is ours; external exception strings may contain credentials.
        if isinstance(error, ValueError):
            safe = str(error)
            key = os.environ.get("ALPHAGENOME_API_KEY", "")
            print(f"Error: {safe.replace(key, '[REDACTED]') if key else safe}", file=sys.stderr)
        else:
            print(f"Local I/O or access failed ({type(error).__name__}); no exception details exported.", file=sys.stderr)
        return 2
    except Exception as error:
        print(f"SDK request failed ({type(error).__name__}); credentials and response details were not logged.", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
