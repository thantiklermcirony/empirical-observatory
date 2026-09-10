# The Observatory's automated evidence loop

`ledger/` is the shared Python contract and record library. `grid/` collects official national carbon-intensity forecasts and later mature estimated actuals. `operations/` turns recorded feasibility and collection results into an explicit research queue. None of these modules fits a new AI model, silently changes a threshold, contacts maintainers or deploys a promoted candidate.

The scheduled `collect-grid.yml` workflow runs at nominal UTC minute 05 and 35. GitHub may delay or omit scheduled runs. Each actual receipt chooses its own first target half-hour at least 24 hours later; exact lead is retained. Expected nominal slots that were not observed remain visible. The latest original evidence is on the `observatory-data` branch; Git commits provide a separate publication trail. They do not prove a forecast was published at the local receipt timestamp.

Each cycle checks the stored original bytes and derived records before collection, captures at most one forecast request and one mature-actual day batch, rechecks integrity, updates the research queue and commits only verified evidence. Source errors are retained and reported. No reconstruction of old forecast vintages from the historical forecast field is permitted. The first mature estimated actual resolves at least 48 hours after the target interval ends; later revisions remain separate.

The public Recovery Lab page reads a bounded summary from this data branch, with an explicitly labelled archived fallback if the live publication is unavailable. Source files and reports retain their own licences and timestamps. The source checkout contains only the release snapshot; it is not presented as continuously current.

The research queue's first Recovery prerequisite uses the closed, pre-design window-availability audit. Its failed coverage condition cannot be overridden by a favourable descriptive model score. More conservative final label adjudication is reported separately. The queue recommends better observations and a new frozen protocol instead of broadening an unsuccessful window.

Use Python 3.12 or newer for these commands. The ledger, collector and planner use the standard library. The Recovery descriptive comparison has its own pinned requirements. Tests run automatically on source changes; the fitted real-data experiment is not repeatedly rerun by CI.

```sh
python automation/grid/collector.py verify --store /path/to/evidence/grid
python automation/grid/collector.py collect --store /path/to/evidence/grid --schedule-offset-minute 5
python automation/operations/assess.py --recovery research/recovery-lab/data-audit/WINDOW_FEASIBILITY.json --grid /path/to/evidence/grid/summary.json --output /path/to/evidence/mission-plan.json
```

A quiet scheduled supervisor may inspect failures and record next work. Model or shared-conclusion changes require review and a new version. Current automation is collection, verification, resolution and deterministic triage; autonomous scientific discovery and improved general AI performance remain unproven.
