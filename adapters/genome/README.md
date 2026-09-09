# Genome Observatory adapter

This package connects a small, explicitly selected human SNV query to the real AlphaGenome Atlas Python interface. It also pairs two independently downloaded assay tables. The shipped fixture contains **invented software-test values**. No live prediction or experimental biological result is included.

## Offline use

Python 3.10 or later; no dependencies:

```sh
python atlas_adapter.py plan
python atlas_adapter.py fixture
python -m unittest discover -v
```

`plan` is the default, even if an API key exists in the environment. It validates the request and produces zero predictions. `fixture` demonstrates the JSON interface and is clearly labelled synthetic. Tests use artificial values solely to test validation and transport.

## Optional real Atlas reads

Install the exact inspected SDK in an isolated environment:

```sh
python -m venv .venv
# Activate .venv using your shell's standard activation command.
python -m pip install -r requirements-live.txt
```

Configure `ALPHAGENOME_API_KEY` through your local environment or secret manager. There is no command-line key argument, key file, frontend key, or embedded credential. Review the provider terms linked in `RESEARCH.md`, then inspect available metadata:

```sh
python atlas_adapter.py list-scorers --terms-reviewed
```

Copy `request-template.json` to a local request. Select one or two **exact names returned by the server** in `requestedScorers`. Select compatible ontology identifiers from that scorer's metadata; unavailable contexts cause an error. The template deliberately supplies no invented live scorer or tissue identifier. Its example literature variant is a query candidate, not a scored record.

Obtain a small, independent GRCh38 reference FASTA window from a documented source. Each header must have the form `>GRCh38|chr5:1294989-1295247`, with 1-based inclusive bounds. The adapter checks its length and alleles, and records the file hash and supplied source URL. It does not perform liftover or certify the reference provider.

```sh
python atlas_adapter.py query --manifest local-request.json --reference-fasta reference-window.fa --reference-source https://example.org/exact-reference-record --terms-reviewed --out private-results/atlas-read.json
```

Create `private-results/` first. Replace the example URL with the actual reference source. Output files cannot overwrite an existing record. Live outputs remain subject to provider restrictions; do not add them to GitHub or the public station automatically.

The read is limited to eight SNVs, two scorers, two ontology filters and four gene filters. Requests run sequentially. Response exports are capped at 20,000 score cells. These are application limits, not a promise about the SDK's internal retries or server timing. The 20-second connection timeout controls channel readiness, not a universal per-request deadline.

## Assay preflight

Download the separate GRCh38 TERT HEK293T and SF7996 tables from the [Kircher data portal](https://kircherlab.bihealth.org/satMutMPRA/), retaining their original context labels and provenance. The parser accepts the documented CSV/TSV headers and will reject an incompatible export rather than guess its meaning.

```sh
python assay_preflight.py --hek293t TERT-HEK.csv --sf7996 TERT-GBM.csv --assembly GRCh38 --source-url https://kircherlab.bihealth.org/satMutMPRA/ --out assay-pairs.json
```

Pairs match chromosome, position, reference and alternate alleles. Both contexts require at least ten tags. Missing rows stay missing; deletions are excluded from this SNV pilot. The report records hashes, unmatched variants and quality exclusions. It does not train a model, test superiority, or infer cellular history.

## Owner integration

Copy the files listed in `PACKAGE_FILES.json` into `adapters/genome/`. Do not copy `.venv`, `__pycache__`, upstream files or private results. Keep this Python adapter outside the browser bundle. Publish the package and protocol; expose only the clearly labelled fixture in any preview until real artifact reuse terms and the relevant context mapping are established.

On 9 September 2026, all **16 tests passed**, including the installed AlphaGenome 0.9.0 SDK with a local protobuf transport stub. No service request used credentials. See `VERIFICATION.json` for exact scope.
