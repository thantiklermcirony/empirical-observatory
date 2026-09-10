# Final independent evidence-admission review

**No remaining blocker found in the audited scope.** Fourteen independent checks pass: eight new evidence-admission/extractor tests and six earlier chronology/gate/boundary tests. The source hashes remained unchanged during the run. This review changed no ledger, adapter, Site or experiment implementation and made no network calls or model fits.

Run:

```text
python work/recovery-lab/independent-review/ledger_checks/validate_admission.py
```

The runner executes `python -m unittest discover -s work/recovery-lab/independent-review/ledger_checks -p test_*.py -v` and saves `ADMISSION_VALIDATION.json` plus `admission-tests.log`. Python 3.12.14; 14 tests, exit 0.

## Decisive regression found and fixed

The first draft allowed an admission proposal that cited only unrelated bytes to inherit `eligible_for_review` from passed checks on a different audit under the same experiment. The independent test failed on that draft: seven passed, one failed. The implementation author added a binding rule requiring every assessed check's evidence IDs to be contained in the proposal's declared evidence set. The same regression now passes by rejecting the mismatch. Pending assessments are explicitly documented as immutable; later evidence requires a new proposal identity rather than rewriting the earlier assessment.

## Actual pinned Recovery evidence

The extractor reads the exact final `PREFLIGHT.json` bytes with SHA-256 `bdec6c15eb5b60152b4dc041f6937f134f4a6ef6f5a5efb3d959ec8a08574eef`. Independent hand oracles confirm:

| Scope | Resolved / eligible | Fraction |
|---|---:|---:|
| Overall | 3,445 / 4,104 | 0.8394249512670565 |
| Fold 0 | 619 / 734 | 0.8433242506811989 |
| Fold 1 | 795 / 943 | 0.8430540827147401 |
| Fold 2 | 813 / 946 | 0.8594080338266384 |
| Fold 3 | 605 / 737 | 0.8208955223880597 |
| Fold 4 | 613 / 744 | 0.8239247311827957 |

All six checks fail the frozen 0.90 threshold. The real audit admission is `blocked`. The independently exercised actual-clock path captures these exact raw bytes, records their digest, and creates **zero expected prediction slots, predictions, outcomes or scores**. It cannot be relabeled prospective, predictively tested, reviewed through the model-promotion path, or promoted. An unrelated favorable engineering review cannot change this result.

The earlier 3,451 / 4,104 predesign count remains historical. The final audit excludes six additional unresolved cases lacking established survival through day 9, giving 3,445. This distinction is also retained in `Scientific_Contract.md`; the earlier number must not populate the current admission result.

## Extraction and failure checks

Tests confirm exact raw pin matching, unchanged bytes after capture, idempotent repeat ingestion, independently calculated fractions, all five folds, no caller-provided coverage override, and rejection of incorrect fractions, missing folds, inconsistent animal/reason counts, duplicate JSON keys and nonfinite JSON constants. A one-byte change to the audit fails its expected hash before any new capture or check is written. A deliberately synthetic passing audit only reaches `eligible_for_review`; even that state cannot promote a predictor.

The extractor checks arithmetic and partitions of the reviewed audit. It does not independently rerun raw-mouse eligibility, prove individual animal split membership from aggregate counts, authenticate human identity, or create public time attestation. Those are separate source/protocol review responsibilities. Generic `record_check` and `resolve_outcome` remain caller-parsed interfaces, as documented; real Recovery integration must use the strict extractor with the independently reviewed final audit hash. A local coherent archive can still be rewritten without an externally preserved checkpoint.

Audited production hashes:

- `ledger.py`: `a5da88af28080417432c16b2c8eed5d3ec539b935d56a8eb0553279901a55525`
- `recovery.py`: `6356e69a1981a922483b61a4d0632bee286cce2bf49398ec22a7f89e61df9364`

These results support shipping the explicitly retrospective, check-only admission capability. They establish no successful Recovery prediction, no predictive superiority and no completed confirmatory experiment.
