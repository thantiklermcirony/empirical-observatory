# Virtual Cell / Flight 01

**What survives when a perturbation response moves to another cell context?**

This CPU laboratory tests response transfer on real author-published data. It belongs to the Empirical Architecture programme and the [Empirical Observatory](https://empirical-observatory.madmanmuzza.chatgpt.site/cell). It is a first measurement of a specific question, with every comparison and failed hypothesis retained.

## Actual result

The first four-context experiment covers **2,052 target genes and 6,642 measured genes**. Entire cell contexts are held out; tuning uses only inner training-context folds. Positive-part disagreement shrinkage does **not** meet the frozen superiority threshold. Its overall MSE is 0.191518 versus 0.191728 for tuned global shrinkage—about 0.11% lower—and it loses to the best conventional method in every context. This is no demonstrated biological-model breakthrough.

| Held-out context | No change | Shared template | Mean transfer | Global shrinkage | Disagreement shrinkage |
|---|---:|---:|---:|---:|---:|
| K562 |0.093918|0.116175|0.164247|**0.089983**|0.097091|
| RPE1 |0.342593|**0.305206**|0.311487|0.322190|0.312956|
| HepG2 |0.235112|**0.211724**|0.223184|0.216921|0.212912|
| Jurkat |0.144101|0.157189|0.198440|**0.137818**|0.143115|

MSE is on the authors' log2-fold-change scale, conditional on available estimates. Lower is better. These are four selected contexts, not a representative sample of all biology. Cell identity, assay and protocol differences are confounded. Source disagreement contains measurement noise as well as biological heterogeneity. The separate [paired study](Paired_Study.md) also shows why copying a response unchanged is an unreliable default.

## Reproduce

Use Python 3.12 or newer in an isolated environment, then from the repository root:

```sh
python -m pip install -r research/virtual-cell/requirements.txt
python research/virtual-cell/run_all.py --download
```

This fetches four public, CC BY 4.0 author files totaling 696,580,762 bytes, verifies publisher MD5 and records SHA256, prepares aligned matrices, runs 12 behavioral tests, selects parameters within training contexts, saves predictions before outer scoring, and emits all results. Allow about 3 GB working disk. It uses no GPU, paid API or challenge account. The tested Windows CPU model run took about 105 seconds after preparation; download/preparation time is additional. Runtime depends on hardware.

Without `--download`, existing files are required. `VIRTUAL_CELL_WORKSPACE` can point to an existing data/prepared/results directory, and `VIRTUAL_CELL_OUTPUT` can select a separate result directory. For tests alone, run `python research/virtual-cell/test_transfer.py`; this needs no data download. Large inputs and predictions are ignored by Git.

## Inspect and challenge

- `protocol.json`: exact frozen model grids, missingness, held-out splits, failure criterion and interpretation limits. Historical v0.2/v0.3 files preserve pre-fit corrections; they are not additional attempts chosen using outer scores.
- `flight01-summary.json`, `flight01-per-target.csv`: every context, model and target; undefined values remain explicit.
- `flight01-independent-arithmetic.json`: 36 independent scalar score checks.
- `transfer.py`: conventional models and scoring; `test_transfer.py`: leakage, missingness, identity, variance and tie tests.
- `Challenge_Contract.md`: why this endpoint-response pilot is not an official VCC submission. The service requires raw-count predictions with a different input contract.
- `Literature.md`: close prior art, competing explanations and falsifiable next experiments.

The randomized control derives its source-target permutation seed as 20260910+outer-fold-index. Risk-curve random rankings use 20260911+outer-fold-index, with the context order stored in the data manifest; maintained runs save the actual orders. Risk curves score all models on identical retained target sets, including no-change and global shrinkage. They are uncalibrated diagnostics.

Missing estimates are not zero-filled truth. Per-coordinate source means use available effects; unsupported predictions use a flagged no-change fallback and remain scored when truth exists. All models use the same finite-truth mask. Missingness can itself depend on the experiment, so these results concern the authors' estimable effects. Complete-target filtering would discard most targets and is not the primary result.

## A geometric trap in average scores

For any positive scalar, `cos(alpha * prediction, truth) = cos(prediction, truth)`. Shrinking a vector can change squared error but cannot improve its direction. In this run the adjustment zeroed 16, 30, 70 and 23 targets across the four contexts. Their cosine became undefined and left the average. On identical defined target sets, direction scores agreed to within 7e-9. A higher average therefore did not establish better directions. This is standard geometry, illustrated on real data, not a new theorem.

The explorer uses eight targets and 96 display genes selected by fixed label hashes, never by outcome. Its reported errors use the full finite-truth panel. The replay reveal is a learning interaction, not a blinded scientific test.

## Next scientific test

The next model needs destination-context measurements and a justified treatment of effect-estimation noise. A stronger result must beat frozen conventional comparators on independent contexts, with appropriate controls for assay and sampling differences. New rules explored using Flight 01 are development work; they will require fresh validation. We do not claim a new IDA gene engine, cellular causality, therapeutic guidance, competition rank or guaranteed GitHub popularity.

Useful contributions: independently reproduce the table, challenge a measurement assumption, supply a correctly licensed basal-data adapter, or implement a stronger comparator under the same information budget. Include code/data versions and retain all outcomes. Follow the repository's contribution guide.

## Sources and attribution

LFC data: Nadig, Replogle, Pogson, Murthy, McCarroll, Weissman, Robinson and O'Connor, *Transcriptome-wide analysis of differential expression in perturbation atlases* (2025), [author archive](https://doi.org/10.6084/m9.figshare.29498366), CC BY 4.0. This project aligns a shared label panel and evaluates/transforms those estimates; it does not imply author endorsement. Exact source metadata and checksums are included in `nadig-figshare-record.json`.

Paired data: Replogle et al., *Mapping information-rich genotype-phenotype landscapes with genome-scale Perturb-seq* (2022), [author archive](https://doi.org/10.25452/figshare.plus.20029387), CC BY 4.0. Source metadata is included in `replogle-figshare-record.json`. Original project code follows the repository MIT license; source data retains its own license.
