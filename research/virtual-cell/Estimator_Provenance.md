# Nadig author matrices: estimator and interpretation

Checked 10 September 2026; no matrix values inspected in this literature task.

The [author Figshare record, version 1](https://doi.org/10.6084/m9.figshare.29498366.v1) identifies the four Essential `Log2FoldChange.csv.gz` files as compiled differential-expression summary statistics and directs users to the paper for their estimation. Columns are perturbed genes and rows measured genes. Companion `lfcSE` and unadjusted-p-value files are listed. Metadata was inspected from the parent's saved public API response; those companion matrices were not downloaded here.

The [Nadig et al. 2025 paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC13063516/), Methods section “Genome-wide Perturb Seq”, specifies counts summed within gem-groups separately for perturbed and control cells, then DESeq2 with batch fixed effects. It produces log2 fold-change estimates and standard errors; p-values use a likelihood-ratio test. Only K562-GenomeWide uses four mega-batches followed by inverse-variance meta-analysis. The paper distinguishes these noisy estimates from TRADE's inferred true-effect distributions and demonstrates the importance of sampling error when comparing responses.

Thus “author-published DESeq2 pseudobulk log2-fold-change estimates” is supported by the archive-to-methods chain. Retaining the simpler “author-published log2FoldChange” scale label is also accurate. Do not call the values raw counts, normalized single cells, direct cell trajectories, or noise-free TRADE latent effects. This review did not independently reconstruct DESeq2 outputs or establish every original option from executable code.

Our implication for the frozen study: between-context disagreement mixes biological differences, protocol differences and estimation noise. Risk ranking can still be useful, but a successful ranker would not identify their individual causes. Companion standard errors could support a later measurement-error sensitivity analysis; they must not be retrofitted into the frozen primary model after seeing its results.

Access note: direct PMC opening returned a browser check; the primary paper's indexed methods were retrieved using exact-section web searches. The publisher DOI is [10.1038/s41588-025-02169-3](https://doi.org/10.1038/s41588-025-02169-3).
