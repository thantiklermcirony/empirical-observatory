# Biology integration decision — 9 September 2026

**Ship the adapter and an assay reproduction protocol. Do not describe this as a demonstrated improvement to AlphaGenome.** The executable integration is ready for a locally configured key; biological validation remains open.

## What the real interface permits

The inspected Atlas client exposes `scorer_metadata()` and filtered `query_variant()` calls returning AnnData objects. Scorer metadata carries names, signedness and track metadata. The adapter uses those names and validates ontology matches before requesting scores. It preserves raw predicted scores separately from the provider's quantile layer. The SDK was installed from commit `aa6fc8f6faadcb8c910fa2b85b57386fbd5c7b5d`, reporting version 0.9.0. [Pinned Atlas source](https://github.com/google-deepmind/alphagenome/blob/aa6fc8f6faadcb8c910fa2b85b57386fbd5c7b5d/src/alphagenome/atlas/atlas.py).

Variant positions are 1-based; intervals use a different coordinate convention. This release only accepts GRCh38 SNVs and verifies the reference allele against a supplied reference window. [Variant documentation](https://www.alphagenomedocs.com/api/generated/alphagenome.data.genome.Variant.html).

The client code is Apache-2.0. The official README separately says most model/Atlas outputs are restricted to non-commercial use and must not train other ML models, with specific downloadable-artifact exceptions. It also excludes clinical use. The full terms route required sign-in during this audit, so no artifact exception, commercial permission or redistribution right has been cleared here. The package includes no provider output and no training code. Operator review of the actual current terms remains necessary for live use. [Official terms summary](https://github.com/google-deepmind/alphagenome#terms), [full provider terms](https://deepmind.google.com/science/alphagenome/terms).

## A usable measured assay, with an important limitation

Use the Kircher 2019 TERT saturation MPRA as the first **reproduction and measurement-context demonstration**. The authors' data portal offers GRCh38 exports, describes effect and quality columns, and permits use with attribution after publication. It reports HEK293T and SF7996 contexts for the TERT promoter. [Data portal and reuse statement](https://kircherlab.bihealth.org/satMutMPRA/).

The corresponding published study is available under CC BY 4.0. Reporter activity is an experimentally measured endpoint, distinct from AlphaGenome predictions. For reusable publication files, retain the article's attribution and inspect any item-specific credit or terms; do not infer dataset licensing from the portal's separate software license. [Kircher et al., 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6687891/).

The MPRAflow authors provide a concrete workflow for the same TERT library in HEK293T and SF7996, with separately labelled replicates. This is a practical route to auditing the original measurement processing if the portal's aggregated exports are insufficient. [MPRAflow TERT workflow](https://mpraflow.readthedocs.io/en/master/saturation_mutagenesis_example1.html).

**This is not a new unseen AlphaGenome benchmark.** AlphaGenome's paper already evaluates the Kircher/CAGI5 MPRA collection and discusses the TERT contexts. It also compares cell-matched and cell-agnostic feature strategies. The assay is independent experimental evidence rather than model output, but it is not independent of the provider's prior benchmark work. Reproduce that comparison before proposing an extension. [AlphaGenome paper, Fig. 5 and Extended Data Fig. 8](https://pmc.ncbi.nlm.nih.gov/articles/PMC12851941/).

## The experiment worth adding

Our proposed addition is an auditable measurement-selection problem, not the already established statement that cell context matters. Begin with a fixed context-matched scoring rule and no fitting to restricted predictions. Keep identical variant pairs together; publish assay provenance, reference checks, context compatibility and failures to match a track. A cell-line name resembling a tissue name is insufficient evidence of equivalence.

The first display can show measured reporter effects in two contexts, a frozen prediction made before reveal, and which missing measurement would separate specified explanations. A genuine decision experiment needs a prespecified loss and observation cost, with random and fixed measurement schedules as baselines. If fitting to provider outputs is prohibited, run the selection model on independently licensed measurements alone or obtain an explicit eligible artifact; do not evade the restriction by renaming fitting as calibration.

TERT alone cannot supply held-out loci, and its two cell contexts do not establish state trajectories, developmental history or organism-level effects. A subsequent advantage claim needs independent loci/experiments, experimental context available at prediction time, and an overlap audit against model training, tuning and existing benchmarks. Batch-only, shuffled-context and ordinary context-conditioned baselines should be included. Reporter assays and endogenous expression are different measurement operators; residual differences may be assay mismatch rather than a deficiency of the model.

## Programme and paper updates

These are recommendations from this integration audit, not a line-by-line review of the 41-paper corpus.

| Target | Required update | Evidence needed before stronger claims |
|---|---|---|
| Programme README and biology roadmap | Mark Atlas as a tested SDK adapter with live data pending. Separate source-code license from output terms. | A small permitted, recorded live retrieval and an audited assay join. |
| AI-positioning papers | Replace any blanket claim that existing models ignore context with precise comparisons against their actual conditioning and published baselines. | Matched information and compute budgets on independent tests. |
| IDA / StateAtlas methods | Specify the measurement operator, available context, candidate observations, loss, costs and leakage controls for each biological task. | A reproducible decision improvement over fixed/random/standard adaptive schedules. |
| UHL / geometry papers | Identify whether a result concerns coordinates, identifiability, dynamics or experimentally measured invariance. Link every biological consequence to assumptions and observables. | A result surviving assay changes and appropriate conventional baselines. |
| TAO cross-domain claims | Keep control-law tests separate from a claim about cellular mechanisms. | A validated biological state estimate, intervention model and safety/recovery measurements. |
| New Genome Observatory paper | Start with a reproduction and protocol report. State prior CAGI5 overlap explicitly. | Later upgrade to a new empirical paper only after independent held-out evidence. |

## Completion and remaining work

Completed: metadata-driven read adapter, no-key plan mode, labelled fixture, allele/reference validation, bounded requests, result provenance, assay preflight, and 16 passing tests including the real SDK with a fake transport. No secret, live score, source assay table or fitted model is included.

Remaining: provider account/key and exact chosen-artifact terms; original assay exports and context mapping; independent reference-window provenance; a real service smoke test; then a prespecified scientific evaluation. These dependencies do not prevent publishing the adapter and protocol now.
