# Chlamydomonas Observatory v0.1

Open `Chlamydomonas_Observatory.html` in a modern desktop browser. It is self-contained,
works offline, and sends no experiment data to a server. Select a quick-play pair,
press Play or drag the timeline, switch observables, inspect equation nodes, or
change controls and press Run. Export/import saves configurations and recalculates
them locally. The 27 advanced parameters are source-model rates, not calibrated
nutrient, gene or physical-constant interventions.

This is a published eight-state cell-cycle model plus a separate real-data
prediction test. It is NOT a complete digital organism. Read FINDINGS.md and
EVIDENCE_LEDGER.json, including the negative results and numerical false lead.

## Reproduce

Node 22+ for the simulator and sweep. Python 3.12+ with NumPy, SciPy and
scikit-learn for the independent solver and observational analysis. No network
is required after downloading this bundle. Commands below intentionally regenerate
the named result files in this project directory; copy the project first if you
want to preserve the current run. Full sweeps take a few minutes on a typical CPU.

```sh
python empirical.py
node campaign.js prepare
python reference.py
node campaign.js compare
node campaign.js sweep
node refine.js
node connector_tests.js
python confirm_findings.py
python build.py
```

`tests.js` runs fast input, source-parameter, equation and numerical regression
checks. `browser_test.js` runs actual browser interactions when Playwright and
Chromium are installed; those tools are not required to open the lab.
The present build passes the 18 regression checks and 11 interaction-logic
checks, but full browser/visual QA is unverified because the Chromium download
timed out. `UI_LOGIC_TESTS.json` and `BROWSER_TESTS.json` preserve that distinction.

## Files that matter

- engine.js: published dynamics, exact total-pool updates, numerical solver,
  event handling and explicit schedule segments. Same engine in browser and tests.
- connectors.js / MODEL_CONTRACT.json: typed, evidence-labelled proposed adapter.
- upstream/: pinned original equations, experimental data, readmes and GPL licence.
- empirical.py / HELD_OUT_PREDICTIONS.json: auditable, leakage-controlled data test.
- campaign.js / refine.js: enumerated parameter grid and stability audit.
- reference.py / confirm_findings.py: independently integrated original eight ODEs.
- EVIDENCE_LEDGER.json / FINDINGS.md: computed outcomes, uses, limits and failures.
- THEOREM_PORTS.md: mathematical identities, conditions and failed connections.
- AUDIT.md: earlier claims that must not be inherited as scientific evidence.

The source data's pixel area is not calibrated to model volume. Light is binary.
Drawn cells use a common volume-to-radius display scale and illustrative organelles.
Synchronous identical daughters are a model assumption. Motility, water, nutrients,
energy, ageing, death, sex and evolution are unsupported, not secretly approximated.

## Licence

Original model and data: Heldt, Tyson, Cross and Novak, repository commit
ab87e1314e27239d763e9cab188291e01b153574. The repository supplies GPL-3.0.
Modified implementation is provided under GPL-3.0-or-later, without warranty.
See upstream/LICENSE. No originality claim is made for the published model.
