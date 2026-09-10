# Observatory prediction ledger

A dependency-free local Python library and CLI for frozen experiments, source snapshots, expected prediction slots, delayed outcomes, scores and reviewed candidate changes. Python 3.10+; standard-library SQLite, JSON, hashing and unittest. No network requests, live feed collection, model fitting, scheduled task installation, external posting or automatic promotion.

The local database is an evidence bookkeeping tool. It is not proof that a prediction existed publicly before an outcome. Local clocks, replay clocks, reviewer labels and source metadata are supplied by the operator. The synthetic example uses an explicit invented clock and invented values.

An additional `kind="evidence_admission"` contract records already completed audits without any schedule, model artifacts or fictitious forecasts. A current-time proposal can reference those audits and become `blocked`, `pending` or `eligible_for_review` according to its frozen prerequisites. This path cannot claim a predictive test or promote a model. `observatory_ledger.recovery` provides a strict adapter for the final Recovery feasibility audit; see the check-only example in `INTERFACE.md`.

## Run

From this directory, on Windows or Linux with Python available:

```text
python -m unittest discover -s tests -v
python tools/validate.py
python -m observatory_ledger --db scratch/example.sqlite demo
python -m observatory_ledger --db scratch/example.sqlite verify
python -m observatory_ledger --db scratch/example.sqlite export --output scratch/example.json
```

`demo` requires a new database path. It creates four expected slots for two invented models, seven scored predictions and one explicit failure. The invented candidate reaches `tested`; it is never reviewed or promoted by the demo. `examples/synthetic-export.json` is the same clearly labeled record shape, suitable for a website to render after review.

`python tools/validate.py` runs the unit suite, syntax checks and an actual CLI demo/verify/export/error smoke test in a temporary directory. It writes `evidence/test-report.json`, `evidence/unittest.log`, a code manifest and the synthetic export. It neither calls the network nor modifies external environments.

## Guarantees implemented

- A contract freezes allowed sources, model code/artifact hashes, target, metric, delay, an entire issue schedule and optional numeric admission checks. The schedule derives all expected slot/model pairs, including pairs the worker never attempted.
- Snapshot bytes and source/event/receipt/publication/ingestion metadata are preserved. Input receipt **and recorder ingestion** must precede cutoff. An already-issued forecast may describe a future event; a future observation cannot be smuggled in as history.
- Issuance binds experiment/entity, model version and hashes, cutoff, horizon, target and feature hash. It must fall between cutoff and the frozen deadline, which must precede the target. The same slot/model cannot have both a prediction and a failure.
- Outcome resolution requires the exact entity and target time, a declared outcome source, and receipt no earlier than target plus the declared delay. The first eligible captured vintage is scored; later revisions remain separate snapshots. The adapter must label invalid or preliminary releases appropriately rather than calling them eligible outcomes.
- Scores are recalculated from stored predictions and outcomes using the frozen metric: MAE, MSE, binary Brier, multiclass Brier (sum across labels), or natural-log categorical loss. Log-loss probabilities must be strictly positive; the library does not silently clip them. Survival/censoring scores and calibrated interval claims are not implemented.
- Stable operation identities make identical retries idempotent; changed retries conflict. A transaction lock protects validation and append from concurrent writers. Invalid writes roll back.
- Verification checks canonical event bytes, sequence, predecessor hashes, raw snapshot hashes, chronology and semantic replay. A caller-supplied trusted head detects a different tail. **A complete database rewrite or valid-prefix truncation cannot be detected from its own hashes alone.** Preserve checkpoints independently if that matters. No public time attestation is created here.

## Candidate review and promotion

The transition sequence is `proposed -> tested -> reviewed -> promoted`. Tests compute a declared descriptive improvement gate from paired scores on a frozen future period, with all expected slots included in the unpaired denominator. Minimum paired count, improvement, unpaired fraction and all frozen prerequisites must pass. This is deterministic gate accounting, not a statistical significance test or independent scientific review.

The frozen optional `required_checks` allow, for example, `resolved_label_fraction >= 0.90`. `record_check` calculates its verdict from the observed number and stores evidence snapshot IDs. A failed or absent prerequisite blocks promotion even if a later descriptive model comparison improves. A check cannot be edited, and an unrelated favorable review cannot override a failed gate. New scientific questions need new versioned contracts; keep the old failure visible.

`test_candidate` does not run arbitrary code or fit a model; it evaluates already recorded ledger scores. `review_candidate` records a named approve/reject decision and reason. Reviewer identity is a declared label, not authenticated human attestation. `promote_candidate` additionally requires the exact operator token `PROMOTE <candidate_id>`. A promotion is only a registry event: it does not alter existing contracts, change an active model, execute code, collect data or deploy anything. A caller must explicitly create any subsequent experiment.

## Integration boundaries

See `INTERFACE.md` and `observatory_ledger/adapters.py`. Source, predictor and outcome adapters are separate protocols. The core validates their declared records; it does not prove the predictor used only those inputs or that an adapter faithfully extracted a numerical outcome or feasibility statistic from arbitrary raw bytes. Domain adapters need independent extraction, future-data poisoning and missingness tests. Written eligibility and gate descriptions are retained; only the enumerated numeric checks are executable.

For **Recovery Lab**, categorical next-state outcomes fit the categorical metric interface. A failed feasibility audit must remain an admission failure. Irregular visits, censoring and varying next-assessment horizons require a separately frozen domain contract; do not coerce them into this version's regular fixed-horizon schedule. Retrospective/replay records remain labeled accordingly, even when their local write order is correct.

For **GB carbon**, preserve each official forecast vintage and later actual separately. The current feed-qualification collector's receipt-based interval selection is its own rule. A future prediction contract must explicitly align its regular cutoff, target interval endpoint and maturity delay with that rule; this library does not invent that mapping or claim a qualification capture was a prospective model prediction. Average-intensity scores are not evidence of marginal carbon saved.

The JSON export omits raw payload bytes but includes metadata and the full event history. Before public rendering, review the metadata, entity IDs and free-text reasons for any confidential or personal data. Exporting creates a local file only.
