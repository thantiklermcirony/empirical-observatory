# The Empirical Observatory

**[RESEARCH ATLAS: EXPLORE THE WHOLE PROGRAMME](https://empirical-observatory.madmanmuzza.chatgpt.site/atlas)**

Rotate the programme in perspective, inspect the evidence attached to each research line, and run a simulation that chooses its next test from the latest observation. [Architecture and current capabilities](public/research/observatory-evolution/Architecture.md) · [Protocol, independent checks and reproduction](public/research/observatory-evolution/README.md).

The adaptive test loop achieves 81% exact expected accuracy versus 70% for the strongest fixed schedule in its constructed four-state model, at equal cost. This is a working demonstration of established Bayesian experimental design. Its policy is fixed: cross-project self-improvement remains to be tested. The Atlas and shared conclusions change through reviewed releases; local notebooks preserve replayable simulation records.

**[VIRTUAL CELL: PREDICT → REVEAL → CHALLENGE](https://empirical-observatory.madmanmuzza.chatgpt.site/cell)**

**[CURRENT PROJECTS →](https://empirical-observatory.madmanmuzza.chatgpt.site/projects)** · **[ENTER THE LIVE STATION →](https://empirical-observatory.madmanmuzza.chatgpt.site)**

The projects page features our [submitted Ray recovery contribution — PR #66039](https://github.com/ray-project/ray/pull/66039), its [measured Linux evidence](https://github.com/thantiklermcirony/empirical-architecture/blob/main/research/ray-campaign/Ray_Contribution_Report.md), and our [submitted NeuroGym decision-cue repair](https://github.com/neurogym/neurogym/pull/295), its [recorded before/after evidence](public/research/NeuroGym_Contribution_Report.md), the submitted Pertpy evaluator and Graphiti repairs, and the [next three investigations](public/research/Next_Big_Three.md). It links runnable experiments, source and reproducible evidence. Direct laboratory links work without an API key.


A playable research station for testing what measurements reveal—and what they miss. Part of [The Empirical Architecture](https://github.com/thantiklermcirony/empirical-architecture).

**Release 0.2: First Contact** contains three working experiments, a local instrument dock, a replayable logbook and an Earth / AI / Genome expedition workspace. The orbital scene uses Three.js; numerical results come from the experiment engines, not the visual effects.

| Laboratory | What you do | What is measured |
|---|---|---|
| TAO Chamber | Recover a bounded reactor, explore five exact flows and compare controllers | Synthetic tracking, recovery, boundary exposure and actuator effort |
| Signal Bay | Respond to 24 timed signals under fixed/adaptive windows | Your actual local keypress/tap timing and correctness |
| Quantum Lab | Spend shots to identify a hidden state; compare gate order | Quantum Tensors probabilities and seeded simulated outcomes |
| Instrument Dock | Connect the local BrainFlow bridge | Explicitly labelled synthetic, recorded or hardware signals |
| Earth expedition | Capture real Oslo station observations and replay comparisons | Available-bike counts, reported capacity, clocks, missingness and provenance |
| AI expedition | Explore executed POPGym results | Held-out recall accuracy and negative controls |
| Genome expedition | Export a validated request plan and run the local Atlas adapter | Metadata-driven query contracts; no live model score included |
| Logbook | Export/import records and rerun their analysis | Versioned configurations, actions and evidence |

This release is a research prototype. It does not establish biological universality, quantum advantage, consciousness measurement or AI cost savings. It makes concrete experiments possible and preserves their limitations.

## Flagship: Virtual Cell / two completed flights

Can a gene-response prediction survive a change of cell context? [Open the explorer](https://empirical-observatory.madmanmuzza.chatgpt.site/cell), reveal real measurements and move a slider to distinguish prediction size from direction. The recorded benchmark spans **4 held-out contexts, 2,052 target genes and 6,642 measured genes**.

The first disagreement adjustment failed its frozen success threshold. Its aggregate error was about 0.11% below global shrinkage, and it lost to the strongest conventional method in every context. Keeping that failure visible is part of the experiment. [Code, all results and CPU reproduction](research/virtual-cell/README.md) · [Report](public/research/Cell_Flight01_Report.md) · [Download](public/research/Virtual_Cell_Flight01.zip).

Flight 02 used a separate Tahoe chemical plate: 50 cell lines, 92 exact drug/dose identities, 4,443 observed pairs and 2,000 released genes. We froze and published the code before decoding its numeric responses, then held out whole cell lines in five nested folds. Adding control-profile information reduced retained prediction error by only **0.13%** versus the best conventional ranker at 75% retention. It missed the declared **10%** gate and beat each fold's best comparison in only **one of five** folds. [Interactive comparison](https://empirical-observatory.madmanmuzza.chatgpt.site/cell#flight02) · [Frozen code and results](research/virtual-cell-flight02) · [Report](public/research/Cell_Flight02_Report.md) · [Reproduction package](public/research/Virtual_Cell_Flight02.zip).

The earlier [input audit](public/research/Virtual_Cell_Next_Inputs.zip) remains a historical record. Plate 1 has now been evaluated; the other plates were not evaluated in this test. Released control means and response deltas were kept on their supplied scales and never added together. Normalization provenance, shared measurement noise and publisher-selected genes limit interpretation. Both added candidates failed their declared success gates; a general biological prediction advantage remains unproven. Contributions that reproduce a result, expose an assumption or test an independent measurement under a frozen comparison are welcome.

## Run

Use Node 24 LTS and pnpm. The lockfile is included.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the Local URL printed by the server. No scientific API key is needed for the three game laboratories. Hardware and cloud access are optional local adapters; see [adapters/README.md](adapters/README.md).

```sh
pnpm test
pnpm typecheck
pnpm research
pnpm build
```

`pnpm research` regenerates the published controller comparison and quantum reference probabilities. Python verification uses the separate adapter requirements and `python -m unittest discover -s adapters -v`.

## Scientific starting point

The controller fixture is derived from the [TAO manuscript](https://ssrn.com/abstract=6779487), with a newly specified plant. It is not a reproduction of the manuscript's original benchmark. The first held-out comparison finds the PI controller has the lowest mean absolute error; TAO does not dominate all metrics. All four automatic controllers share observations, quality fallback, action limits and tuning budget. [Methods and results](research/Methods.md).

The quantum game uses established quantum mechanics and Bayesian experimental design. The response task is a real local behaviour exercise with illustrative forecasts, not a trained AI benchmark. The [current release and acceptance gates](research/Release_0.2.md) document what shipped and what still needs evidence. The [original integration audit](research/Next_Big_Job.md) specifies how to extend this release through AlphaGenome, God's Eye View, biological analysis tools and established AI environments.

## Records and privacy

The hosted site counts daily page views, project views, lab opens and GitHub link clicks with broad referral categories. These are activity counts, not unique people. No visitor identifiers, cookies, IP addresses, raw URLs or experiment records are stored by this counter. It respects Do Not Track, Global Privacy Control and the opt-out on `/privacy`. Aggregate rows expire after 90 days when the next event arrives; deployment checks have a separate counter. Counts are available only through the owner's Sites database viewer.

No experiment records are uploaded by the app. The browser retains the latest 30 records; export important results because browser storage can be cleared or become full. Imports are untrusted and validated. A valid file is not an attested human or hardware measurement. Simulation replay recomputes evidence; behaviour is reanalysed rather than physically replayed. Seeded runs are repeatable under the declared engine version.

The optional WebMCP tools expose a station summary and navigation only. They cannot start a human experiment, read raw response/signal records, connect hardware or execute cloud jobs.

## Current contribution campaign

The [42-repository research scan](research/contribution-scan/Research_Report.md) collected 2,058 open-issue leads and selected 12 priorities, with 21 detailed opportunity records. Start with a current-code reproduction, identify existing fixes, and test a concrete state, measurement or timing contract.

- **Submitted / AI infrastructure:** [Ray PR #66039](https://github.com/ray-project/ray/pull/66039) repairs replacement-controller discovery; reviewed recovery and shutdown tests and Linux HTTP evidence are public.
- **Submitted / biology:** [Pertpy PR #1098](https://github.com/scverse/pertpy/pull/1098) adds a baseline-aware evaluator. 71 maintained evaluator tests pass on Python 3.12 and 3.14 with 99.11% measured line coverage; the real-cell demonstration exposes a high-correlation failure. [Results, limits and reproduction](public/research/Pertpy_Evaluation_Report.md). This tests conventional baselines; IDA has not yet been scored.
- **Submitted / AI memory:** Graphiti temporal-history and timestamp repairs, with [public evidence](public/research/Graphiti.md).
- **Submitted / AI environments:** [NeuroGym PR #295](https://github.com/neurogym/neurogym/pull/295) makes the intended decision window observable. All 132 candidate-suite tests pass on the tested Windows/Python runtime; 240 noisy trials preserve every other input channel, target and timing. [Recorded traces, patch and evidence](public/research/NeuroGym_Contribution_Report.md). No learned-model improvement is claimed.
- **Next / infrastructure and simulation:** [three focused investigations](public/research/Next_Big_Three.md), with current competing work, resource gates and proposed independent tests.
- **Later / numerical systems:** python-control's filter/predictor distinction and independent event/held-input tests.

The [reusable scanner](research/contribution-scan/scanner/github_scan.py) has 20 offline tests. [Run or refresh the scan](research/contribution-scan/README.md), [inspect the ranked records](research/contribution-scan/Opportunities.json), or [download the complete research package](research/contribution-scan/Research_and_Scanner.zip). The inventory is bounded and partly incomplete; these are contribution opportunities, not 2,058 validated bugs or proof of framework superiority.

## Contribute

Start with a reproducible counterexample, stronger baseline, dataset adapter or accessible learning improvement. Read [CONTRIBUTING.md](CONTRIBUTING.md). Keep papers, assumptions, code and measured results distinct. An impressive result should survive another person's implementation.

Original project code is MIT. Dependency code, provider data and manuscript materials retain their own licenses; see [THIRD_PARTY.md](THIRD_PARTY.md).

## Integration entry points

- **Earth / God's Eye:** `node integrations/earth/collect-oslo.mjs ./oslo-capture`; [module wiring and data terms](integrations/earth/README.md). Live capture is also available in the station, with a fixed station subset and one-minute request spacing.
- **AlphaGenome Atlas:** `python adapters/genome/atlas_adapter.py plan`; [live setup and assay preflight](adapters/genome/README.md). The default is offline. Provider access and applicable output terms are separate from the SDK license.
- **AI memory:** [POPGym protocol and rerun command](integrations/memory/Memory_Protocol.md). Full executed results include per-episode data; this is a standard-task diagnostic.

**Compatibility notice:** new records use engine 0.2.0. Old quantum records replay with a bias warning because v0.1 coupled state selection to its first random shot. Exclude those records from statistical evidence. Details and numerical corrections are in [the release audit](research/Release_0.2.md).

The [hosted Observatory](https://empirical-observatory.madmanmuzza.chatgpt.site) is public. Experiment history stays in each visitor's own browser. Optional hardware and provider adapters still need local setup; they are not advertised as cloud services.
