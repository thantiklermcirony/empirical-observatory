# GitHub Contribution Scan

Start with Research_Report.md. It contains the 12-priority map, three contribution campaigns, capability limits and cited sources. Opportunities.json provides 21 detailed records. Issue_Inventory.json contains 2,058 returned open-issue leads across 41 repositories within a 42-repository scope; it is not 2,058 independently validated bugs.

The recommended first AI campaign is Graphiti's temporal-state reproduction. Pertpy's evaluator is the larger biological project. python-control's filter-form enhancement is the clearest small maintainer-supported contribution.

## Refresh the scan

Python 3.10+ is sufficient; no third-party packages are needed for the scanner. From the scanner directory:

```sh
python github_scan.py --out scan-2026-09-10 --max-pages 1 --max-requests 6
```

Use a fresh dated output directory for a fresh scan. A request-budget or rate-limit stop preserves results and exits with code 2. Read the stop record; after the reported reset, resume the same dated scan:

```sh
python github_scan.py --out scan-2026-09-10 --max-pages 2 --max-requests 6 --resume
```

No background schedule is installed. The scanner never creates issues, comments or PRs. It uses public-only searches and does not download repositories. Keywords only assist triage; an issue's openness does not establish a current bug or framework fit.

The grouped configuration targets 42 repositories in 9 groups. For more balanced coverage, use one query per repository:

```sh
python github_scan.py --config repositories.json --out per-repo-2026-09-10 --max-pages 1 --max-requests 6
```

Resume that configuration after the relevant reset until all requested groups are reached. Inspect coverage even on exit 0: page caps and GitHub incomplete_results may leave missing issues. Searches exceeding GitHub's 1,000-result ceiling need narrower repository/date partitions. Updated-time pagination is not an atomic snapshot. Refresh discussions, linked PRs, contribution guidance and pinned code before implementation.

Authentication is optional. The --use-token flag reads GITHUB_TOKEN from the environment, sends it only in an API header and never stores it. Do not put tokens in configuration or command arguments. The delivered research used unauthenticated public access.

## Verification and historical evidence

Run offline scanner checks with:

```sh
python -m unittest -v test_github_scan.py
```

Twenty tests passed for scanner 0.1.1/schema 2. They cover request limits, partial responses, duplicate coverage, scope, resume, malformed responses and credential handling. Historical schema 1 coverage files preserve the initial scan exactly; they cannot be resumed by schema 2. Later canonical-repository queries also exercised schema 2 against the live API. Coverage.json reports the deduplicated union of all returned issue leads.

## Executed reproduction

The reproduction directory contains a local Qiskit 2.1.2 diagnostic and separate pinned-current-source inspection. In a dedicated environment install reproduction/requirements.txt, then run qiskit_reproduce.py. It expects the reported historical behavior and writes its measured JSON beside the script. Do not treat a changed result on another release as a scanner failure or a new scientific discovery. No quantum hardware was used.

## Contribution discipline

Use the framework to propose a precise test. Reproduce it on current code, check existing work, compare a conventional baseline and record what would falsify the proposed advantage. Keep the result useful even if the framework-specific method loses. No upstream messages, patches or proposals were submitted in this research mission.
