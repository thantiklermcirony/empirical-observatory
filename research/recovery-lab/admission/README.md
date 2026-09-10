# Recovery feasibility admission

`summary.json` is the compact retrospective admission record; `admission.json` is the full event export and `ledger.sqlite` preserves exact captured bytes. All six frozen coverage checks fail. This evidence-only record contains no forecast or score rows and makes no public time-attestation claim. A later descriptive model result cannot change the feasibility verdict.

`create_admission.py` reads the reviewed final audit and protocol, checks their fixed hashes, and records admission with the actual current UTC clock. It accepts either local layout:

```text
work/observatory-automation/observatory_ledger/
work/recovery-lab/admission/create_admission.py
```

or public repository layout:

```text
automation/ledger/observatory_ledger/
research/recovery-lab/admission/create_admission.py
```

Run `python research/recovery-lab/admission/create_admission.py` from a repository checkout, or the corresponding workspace path. All referenced audit/review/source files must be present. Rerunning against unchanged evidence is idempotent and retains first receipts. A genuinely new audit needs a new versioned admission, rather than editing the existing contract or records.

The original `manifest.json` records artifacts and source hashes at admission creation. The launcher later gained only a workspace/repository path fallback; no evidence event or timestamp was rewritten. `launcher-compatibility.json` records that post-creation launcher change. The ledger core hashes remain the ones in the original manifest.
