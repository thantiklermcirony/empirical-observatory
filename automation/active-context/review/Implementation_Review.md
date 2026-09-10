# Active Context 0.1: independent implementation review

Result on 10 September 2026: **26 independent tests passed**, with no skipped tests on Windows / Python 3.12.14. The tests executed disposable local commands; no production code, Site files or external systems were modified by this reviewer. Source hashes were identical before and after the final run. `VALIDATION.json` and `unittest.log` contain the exact command, environment and evidence.

Reviewed core SHA-256: `d0de7fa87bf8b538148e5773a40026d21ba8e7e0912e54f4fb5ed437986a9552`.

Reviewed CLI SHA-256: `13c266829104aad96254a0dffce6354a6fc6aec2df6a475727a64c2a64440bfd`.

No remaining blocker was found for the declared first release: an explicit local command recorder, applicability inspector and finite declared-cost recheck planner. This conclusion is from a separate AI reviewer within the same project; it is not external human validation, a Linux execution result or an independent real-world performance benchmark.

## What the tests establish

- Directory membership, added/deleted/renamed files and the later creation of a formerly missing declared input invalidate a prior success. A real Windows junction cannot escape the declared scope.
- Exit-zero commands that change their own declared inputs are unstable. The latest nonzero exit or timeout blocks a positive reuse claim even when an earlier command passed.
- Identical files in another checkout do not inherit the earlier receipt. Changed argv, claimed obligations and declared environment invalidate reuse. An absent environment value differs from an empty value.
- A successful prerequisite recorded after a child ran cannot certify that earlier child. A fresh prerequisite receipt requires the child to run again, and the planner charges for missing prerequisites.
- Inspection and planning do not execute a configured command. Unknown claims stay uncovered. The exact planner matches independently enumerated minimum complete-cover costs on 12 small catalogues, including budgets just below feasibility. Nonfinite, negative and boolean costs are rejected.
- Corrupted records, missing output evidence and malformed receipt times fail validation. A 1.1 MB subprocess output has the independently expected full SHA-256, accurate byte count and bounded display prefix.
- An unrelated change outside the declared input set does not unnecessarily invalidate the check; the returned boundary explicitly warns about undeclared inputs.

## Findings corrected before this clearance

The initial implementation loaded an entire subprocess log into memory despite a bounded display prefix. The author changed this to streaming hashing and prefix retention. Recursive input traversal now rejects Windows junctions and checks resolved containment at every visited entry.

Two independently reproduced receipt-validation failures were also corrected: a properly rehashed envelope could omit stdout entirely or contain `started_at="not-a-time"` while still being accepted. The reader now requires output metadata and a raw byte prefix, validates its shape and consistency, checks complete-output hashes when available, and validates aware timestamp order and definition consistency. This is semantic validation; it does not authenticate who executed a command.

Two early test-fixture errors used empty claim lists, which the declared implementation deliberately rejects. Those fixtures were corrected to contain irrelevant/setup claims; they were not counted as production defects.

## Limits that remain part of the contract

“Reusable” means a previously successful command has matching **declared** dependencies, check definition, selected environment, executable/runtime identity and prerequisite receipts. It does not establish global truth, complete tests, unchanged remote state or a correct application. The caller assigns claim coverage; the tool does not establish that a cheap check is scientifically or operationally equivalent to a stronger one.

The planner's optimum is over at most 20 configured checks and their caller-declared costs, maximizing requested coverage within budget before minimizing cost. It excludes inspection overhead and makes no measured savings or information-value claim. `complete` describes planned claim coverage, including work still to be executed; it does not mean those checks have passed.

Commands are explicitly authorized local execution, not a sandbox. Timeout handling controls the direct process and does not guarantee termination of an arbitrary descendant tree. Preflight errors before launch can raise without appending a command receipt. Fingerprints omit undeclared inputs and configured exclusions; before/after equality cannot detect a transient change followed by a revert. Concurrent external file changes are not a filesystem snapshot.

For long outputs, the archive retains a full-stream digest and bounded raw prefix, not the complete original output. The omitted suffix cannot be independently reconstructed or rehashed from the receipt. Stored text may contain secrets or instructions and remains untrusted. A coherent rewrite or valid-prefix truncation of a local history cannot be authenticated without a separate trusted commitment.

The realistic contribution is a small, inspectable interface around established dependency invalidation, negative results and explicit recheck obligations. The review does not show superiority over Bazel-style invalidation, an LLM memory system, learned policy improvement or autonomous scientific discovery. The planned comparison must preserve a tie or loss against ordinary dependency invalidation.

## Reproduce

From the Active Context package root:

```sh
python review/run_review.py
```

This uses only the standard library. The Windows-specific junction case skips on other operating systems; all other tests are portable. The runner fails if source bytes change during the test run. It writes only within `review/`; temporary local projects are removed after each check.
