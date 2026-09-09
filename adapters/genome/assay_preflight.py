"""Read two downloaded Kircher portal tables and pair SNVs across measured contexts.

No download, API access, model training, or fabricated assay rows. Standard library only.
"""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path

from atlas_adapter import validate_manifest


def read_assay(path: Path, min_tags: int = 10) -> tuple[dict, dict]:
    if path.stat().st_size > 10_000_000:
        raise ValueError("Assay table exceeds 10 MB")
    raw = path.read_bytes()
    content = raw.decode("utf-8-sig")
    delimiter = "\t" if "\t" in content.partition("\n")[0] else ","
    table = csv.DictReader(io.StringIO(content), delimiter=delimiter)
    required = {"Chromosome", "Position", "Ref", "Alt", "Tags", "Value", "P-Value"}
    if not required.issubset(table.fieldnames or []):
        raise ValueError("Expected documented Kircher portal headers: " + ", ".join(sorted(required)))
    rows, excluded = {}, {"nonSnv": 0, "lowTags": 0}
    for row in table:
        chrom = row["Chromosome"]
        chrom = chrom if chrom.startswith("chr") else "chr" + chrom
        position, tags = int(row["Position"]), int(row["Tags"])
        value, p_value = float(row["Value"]), float(row["P-Value"])
        if tags < 0 or not math.isfinite(value) or not math.isfinite(p_value) or not 0 <= p_value <= 1:
            raise ValueError("Invalid count, effect or P-value; missing values cannot become zero")
        if row["Alt"] == "-":
            excluded["nonSnv"] += 1
            continue
        definition = dict(chromosome=chrom, position=position, reference_bases=row["Ref"], alternate_bases=row["Alt"])
        validate_manifest(dict(schema="observatory-atlas-request/1", assembly="GRCh38",
                               coordinateSystem="1-based", organism="Homo sapiens", variants=[definition]))
        key = (chrom, position, row["Ref"], row["Alt"])
        if key in rows:
            raise ValueError("Duplicate variant rows: choose a single specified context/summary, never average silently")
        rows[key] = {"variant": definition, "tags": tags, "log2ReporterEffect": value,
                     "pValue": p_value, "eligible": tags >= min_tags}
        if tags < min_tags:
            excluded["lowTags"] += 1
    return rows, {"sha256": hashlib.sha256(raw).hexdigest(), "fileName": path.name,
                  "parsedSnvs": len(rows), "excluded": excluded}


def paired_audit(first: Path, second: Path, source_url: str, assembly: str) -> dict:
    if assembly != "GRCh38":
        raise ValueError("Export both tables in GRCh38 first; no automatic liftover is performed")
    if not source_url.startswith("https://"):
        raise ValueError("Provide an exact HTTPS source URL for the assay")
    a, meta_a = read_assay(first)
    b, meta_b = read_assay(second)
    common = sorted(set(a) & set(b))
    pairs = []
    for key in common:
        if not (a[key]["eligible"] and b[key]["eligible"]):
            continue
        pairs.append({"variant": a[key]["variant"], "HEK293T": a[key], "SF7996": b[key],
                      "differenceLog2ReporterEffect": b[key]["log2ReporterEffect"] - a[key]["log2ReporterEffect"]})
    return {"schema": "observatory-assay-pairs/1", "source": "user-supplied-assay-tables",
            "sourceUrl": source_url, "assembly": assembly, "coordinateSystem": "1-based",
            "contexts": ["HEK293T", "SF7996"], "inputs": [meta_a, meta_b],
            "minimumTagsPerContext": 10, "matchedBeforeQualityFilter": len(common),
            "onlyInHEK293T": len(set(a) - set(b)), "onlyInSF7996": len(set(b) - set(a)),
            "pairs": pairs, "networkCalls": 0,
            "interpretation": "Paired reporter measurements, not endogenous cell trajectories. Input provenance is recorded, not independently attested. No significance or framework-advantage claim is computed."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hek293t", required=True, type=Path)
    parser.add_argument("--sf7996", required=True, type=Path)
    parser.add_argument("--assembly", required=True, choices=["GRCh38"])
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    try:
        result = paired_audit(args.hek293t, args.sf7996, args.source_url, args.assembly)
        with args.out.open("x", encoding="utf-8") as output:
            json.dump(result, output, indent=2, allow_nan=False)
            output.write("\n")
    except (ValueError, OSError) as error:
        parser.exit(2, f"Assay preflight failed: {error}\n")
    print(f"Paired {len(result['pairs'])} eligible SNVs; no predictions were requested.")


if __name__ == "__main__":
    main()
