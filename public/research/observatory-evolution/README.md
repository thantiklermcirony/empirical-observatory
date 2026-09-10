# Research Atlas / Adaptive Exploration 01

[Enter the live Atlas](https://empirical-observatory.madmanmuzza.chatgpt.site/atlas) · [Download the complete experiment](../Observatory_Evolution_01.zip) · [Programme architecture](Architecture.md)

The Observatory now has a rotatable programme map and a working experiment that changes its next measurement after an observation. It updates probabilities within a declared model. Its exploration policy does not learn across runs, and the public knowledge map does not rewrite itself.

## What was built

- A perspective graph of the programme's central question and 14 related research lines, with keyboard alternatives, filtering, source links and evidence dossiers.
- A two-step simulation: observe, revise competing explanations, choose the next test, reveal the hidden state and retain the conclusion or failure.
- Four comparison policies, a manual mode and a local notebook of up to 30 completed runs with JSON export. Records are unsigned synthetic evidence, stored in the visitor's browser.
- A programme audit that distinguishes conditional mathematical results, working implementations, measured results, hypotheses and future obligations.

The graph is a curated navigation arrangement. Its distance, glow and colour are not measured scientific geometry. Node connections carry a stated relationship; sharing a question does not establish a shared physical mechanism.

## Test and result

We constructed a finite four-state world: A0, A1, B0 and B1, initially equally likely. A family probe is 90% reliable about A versus B. A family-specific challenge is 90% reliable within its family and uninformative outside it. A broad diagnostic costs two units and identifies the full state with 70% accuracy. Every policy has a total budget of two units and the same observations. Repeat measurements are conditionally independent given the hidden state.

The adaptive rule maximizes expected entropy reduction per cost using the current posterior. This is established Bayesian experimental design, not a new learning algorithm. A first family observation changes which local challenge it selects. The action selector never receives the hidden state or seed. The separate world sampler generates observations. The browser is an inspectable educational simulator, not a blinded experiment platform.

| Policy | Exact expected accuracy | Accuracy on 10,000 paired simulated systems | Cost |
|---|---:|---:|---:|
| Adaptive information gain | 81.00% | 81.69% | 2 |
| Strongest fixed schedule | 70.00% | 69.51% | 2 |
| Random feasible action | 58.58% | 57.76% | 2 |
| Planner that retains the prior for test choice | 45.00% | 45.06% | 2 |

The independent Python oracle enumerates all ten affordable fixed schedules, rather than comparing against an arbitrarily weak one. It also solves the finite optimal-decision problem; this particular adaptive policy reaches that model's 81% optimum. The unchanging planner still updates its final decision posterior; only its test choice ignores acquired information.

Development used seeds 0–127. The implementation and protocol were hashed before running evaluation seeds 10,000–19,999. Each policy receives the same latent system and action-specific potential observations through keyed SHA256 noise. The observed paired advantage over the best fixed schedule is **12.18 percentage points**, approximate paired 95% interval **11.01–13.35 points**. This interval describes Monte Carlo variation within the supplied model; it does not measure uncertainty about transfer to real science. The model itself was designed for a known adaptive contrast, so this is a successful implementation demonstration, not an unexpected discovery.

Independently authored Python and TypeScript implementations agree on all decision accuracies, costs and the paired interval; log-loss differences are below 1e-10. [Verification](cross-language-verification.json) · [Exact oracle results](reference-results.json) · [TypeScript evaluation](javascript-evaluation.json) · [Python evaluation](evaluation-results.json).

The implementation includes a counterexample: with another one-step measurement model, the information-maximizing test achieves 50% decision accuracy while an alternative achieves 60%. **Reducing uncertainty is not automatically the same objective as making the best decision.** The counterexample remains visible in the interface and tests.

## Reproduce and inspect

From the Observatory repository root, use the existing Node runtime and lockfile:

```sh
pnpm install --frozen-lockfile
pnpm test
node --experimental-strip-types public/research/observatory-evolution/benchmark.ts
python public/research/observatory-evolution/reference_oracle.py --evaluate
```

The Python oracle needs only the standard library. The benchmark regenerates reports beside itself and records current hashes before evaluation. Keep the published results separately if you want to compare them. [Protocol](protocol.json) · [Independent specification](Benchmark_Spec.md) · [Original pre-evaluation hashes](pre-evaluation.json) · [Original benchmark](benchmark-original.ts.txt).

The published portable benchmark changes only import/root path handling to run from this repository, including directories with spaces. The original evaluation hash refers to the retained original benchmark; it must not be misrepresented as the portable copy's hash. The numerical engine is unchanged from its frozen evaluated source. The ZIP includes that engine and its utility dependency, all 40,000 episode records and both implementations. Run the same benchmark path from the extracted package; a full repository checkout is needed for `pnpm test`.

## What follows in real biology

The previous Virtual Cell candidate failed its frozen success threshold against conventional comparisons. We have now independently audited a licensed control table for a **separate Tahoe chemical-perturbation pilot**: 50 cell lines, 14 plates and 62,710 gene identifiers. The compact plate-1 controls are included in the [next-input package](../Virtual_Cell_Next_Inputs.zip). These are DMSO controls, not the matched non-targeting CRISPRi controls missing from the original assay.

No response values were inspected or models fitted in that audit. The input panel and whole-cell-line splits are frozen. The proposed uncertainty equation, search grids, response scale and acceptance rule still need final specification before opening outcomes. Existing basal-expression and subspace methods must receive credit and be meaningful comparators. [Data route and checks](Biology_Data_Route.md) · [Next experiment draft](Biology_Next_Experiment.md).

## What would earn “self-improving”

A future policy must learn from completed experiments, propose a test under a fixed cost budget and outperform a frozen policy on untouched problems. It must preserve failed runs and training/test separation. A candidate policy may propose a new model; an independently evaluated result and reviewed release decide whether it becomes the default. Automatic self-rewriting is neither implemented nor required for a useful adaptive observatory.

The programme-wide [independent audit](Programme_Audit.md) specifies stronger evidence obligations for mathematical, physical, biological, cognitive and AI claims. “41 manuscripts” is a catalogue size, not a count of independently verified discoveries. The contribution repairs are concrete engineering results; they do not establish a universal theory.

The information-gain criterion is classical; see [Lindley's original paper record](https://www.mathnet.ru/php/archive.phtml?jrnid=mat&option_lang=eng&paperid=101&wshow=paper). Contemporary information-based acquisition methods are documented by [BoTorch](https://botorch.org/docs/v0.17.0/acquisition). Original Observatory implementation and benchmark code are MIT; third-party research and Tahoe CC0 data retain their stated terms.
