# Independent-check layout compatibility

The same three Python scripts support both layouts:

| Evidence/check location | Ledger package location |
|---|---|
| `work/recovery-lab/independent-review/ledger_checks` | `work/observatory-automation/observatory_ledger` |
| `research/recovery-lab/independent-review/ledger_checks` | `automation/ledger/observatory_ledger` |

The raw audit remains at `recovery-lab/experiment/preflight/PREFLIGHT.json` relative to the evidence root (`work` or `research`). Its exact pinned digest, hand-derived counts, test assertions and ledger semantics are unchanged. The tests require the selected local source file; they do not silently fall back to an installed ledger package.

From the public repository root:

```text
python research/recovery-lab/independent-review/ledger_checks/validate_admission.py --output-dir work/independent-admission-validation
```

In the original workspace:

```text
python work/recovery-lab/independent-review/ledger_checks/validate_admission.py --output-dir work/recovery-lab/independent-review/portability/workspace-validation
```

Without `--output-dir`, new logs and hash records go under `validation-current/` beside the scripts. The original `ADMISSION_VALIDATION.json`, `admission-tests.log`, captured audit/database receipts and original review remain historical evidence and are not rewritten by the compatibility validation. Choose a new output directory to preserve each later validation run. The new hashes naturally differ for the three path-aware scripts; this does not change the earlier tested source record.
