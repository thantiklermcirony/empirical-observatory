# Independent generic-ledger review

Reviewed the current `work/observatory-automation/observatory_ledger/ledger.py`, adapters, public interface, documentation and relevant tests. No core production edits were made. Six independent synthetic public-API checks pass on the approved Python 3.12 runtime; no network, mouse outcomes, fitting, scoring of real models, or live collector mutation was involved.

Command: `python work/recovery-lab/independent-review/ledger_checks/test_independent_ledger.py`.

No new blocker was found in the stated local bookkeeping contract. Input receipt **and recorder ingestion** are checked before cutoff; waiting cannot make an early outcome vintage mature. The denominator includes expected slots. A failed or missing frozen prerequisite blocks a mathematically perfect candidate. The failed prerequisite cannot be overwritten, approved away by an unrelated reviewer, or bypassed with the promotion token. State transitions do not themselves deploy anything.

Two checks deliberately demonstrate important documented boundaries, and are not a claim that the misuse is acceptable in a domain adapter:

1. An audit snapshot whose raw JSON says `fraction=0.8409` can be paired with a caller-supplied `observed_value=1.0`; the generic ledger records a passed threshold. It proves source linkage and threshold arithmetic, not faithful statistic extraction.
2. An outcome snapshot whose raw JSON says `value=0` can be resolved with caller-supplied `value=999`; the ledger accepts this declared value. Scoring then consistently uses that value. Arbitrary raw-source parsing is explicitly the adapter's responsibility.

The existing README and INTERFACE correctly disclose both limitations. Before connecting real Recovery Lab admission or predictions, its adapter must independently bind the recorded eligibility fraction/outcome to the frozen audit output and raw-derived label with exact IDs and a tested extraction rule. The failed 84.09% resolution gate must remain failed. A hand-entered favorable value would defeat the domain claim even though the local chain verifies. Written `eligibility_rule` and `gate_rule` text is retained; only the implemented numeric checks execute.

The package also correctly limits its claims: it does not authenticate operator/reviewer identity, prove a model used only declared inputs, attest public prediction time, detect an entirely rewritten coherent database without an independently preserved checkpoint, establish statistical significance, or implement Recovery Lab's irregular-visit/censoring/animal-macro evaluation. Its synthetic example should remain separate from real experimental results. No additional core change is required for shipping that explicitly limited bookkeeping capability.

For the grid qualification collector, the independent `verify --store` now re-extracts selected interval values from raw provider bytes. That domain-specific verification is stronger than the generic ledger's arbitrary-byte seam, but still cannot authenticate an entirely rewritten local history. The grid receipt-dependent interval contract remains separate from the ledger's fixed-cutoff schedule.
