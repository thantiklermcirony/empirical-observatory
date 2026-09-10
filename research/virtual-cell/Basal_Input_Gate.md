# HepG2/Jurkat basal-control inputs: bounded access audit

10 September 2026. **No separate, small HepG2/Jurkat basal-control file was verified in the checked primary archives.** The original single-cell files are known, but their exact current byte sizes, checksum metadata and remote layout could not be obtained through the available verified connection. This does not establish that no such extract exists elsewhere. It is an input gate for the next context-conditioned study, not a reason to change the completed four-context LFC result.

## What was actually checked

- The author's [Nadig Figshare version1 record](https://doi.org/10.6084/m9.figshare.29498366.v1), including its actual saved API payload, lists 15 matrices: five screens each with LFC, LFC standard error and p-value. It contains no basal expression/count or control-only matrix. These files cannot reconstruct an absolute control mean: a ratio/difference is compatible with multiple underlying baselines.
- The authors' [Replogle Figshare version1 record](https://doi.org/10.25452/figshare.plus.20029387.v1), including the actual saved API payload, has pseudobulk and single-cell files for K562 and RPE1. It contains neither HepG2 nor Jurkat. The already acquired K562/RPE1 core-control vectors remain useful, but do not fill the missing contexts.
- The first author's [TRADEtools example directory](https://github.com/ajaynadig/TRADEtools/tree/main/example) contains a K562 annotation example. Its [current vignette](https://github.com/ajaynadig/TRADEtools/blob/main/vignettes/TRADEtools-intro.Rmd) links GATA1/MED12 K562 DESeq2 summaries and K562 annotations. These are not HepG2/Jurkat basal matrices. The vignette and checked wiki pages do not expose a small matched controls-only route.
- The [original Nadig publication](https://doi.org/10.1038/s41588-025-02169-3) identifies GEO **GSE264667** as the archive for aligned/processed single-cell populations. [PRESAGE's actual preparation script](https://github.com/Genentech/PRESAGE/blob/main/src/prep_dataset_utils/download_datasets.sh) downloads the two exact original files below. Its cache is approximately 3.4 GB and was not retrieved; it is not a verified small controls-only substitute.

## Exact original inputs and metadata routes

HepG2:

`https://ftp.ncbi.nlm.nih.gov/geo/series/GSE264nnn/GSE264667/suppl/GSE264667_hepg2_raw_singlecell_01.h5ad`

Jurkat:

`https://ftp.ncbi.nlm.nih.gov/geo/series/GSE264nnn/GSE264667/suppl/GSE264667_jurkat_raw_singlecell_01.h5ad`

The preparation script uses equivalent percent-encoded underscores (`%5F`). A previously retrieved GEO page described these as approximately **5.2 GB** and **8.7 GB**, respectively. Those are rounded catalogue sizes, **not currently verified exact byte counts or proposed download amounts**. No checksum for either full file was obtained here, and neither was downloaded.

The two small metadata requests attempted by the parent were:

1. `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE264nnn/GSE264667/suppl/filelist.txt`
2. `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE264667&targ=self&form=text&view=brief`

Both failed default TLS certificate validation with **self-signed certificate in certificate chain**. Evidence is saved in `geo-filelist.txt.fetch.json` and `geo-series-brief.txt.fetch.json`. No certificate verification was disabled. The agent's web tool separately returned safe-fetch errors for the metadata URLs and a browser-check page for the normal GEO accession view. These are access/tool limitations, not evidence that the archive is private, paid or absent.

The earlier TxPert Zenodo metadata route remains unresolved after HTTP504. Its archive filenames, sizes and file-specific data terms remain unverified. Its documented preprocessing also does not by itself establish a full-feature, training-only basal input.

## Concrete next route, with an explicit feasibility gate

First restore an ordinary verified connection to the public GEO metadata endpoint, or inspect the official file list through the user's already available browser. Record exact bytes, checksums and file terms. A GitHub model repository's code license must not stand in for the original data's terms.

Then test whether the original HDF5 objects support HTTP byte-range access and whether their metadata plus selected control rows can be read within a strict small transfer budget. This is a **proposed selective-access route**, not a working adapter or verified sub-250-MB result. A server can ignore Range requests, and HDF5 chunking or compressed blocks can make a seemingly small selection expensive. The reader must require a valid partial response, track bytes actually transferred and stop at its cap; it must not silently fall back to downloading the whole file.

If feasible, read only cell/guide/batch metadata and the full gene annotation first. Freeze a deterministic, batch-aware sample of non-targeting control cells before accessing expression, then retrieve those control rows across the full supplied feature universe. For scale only, 256 control rows × 20,000 genes × four-byte values would be about 20.5 MB of raw matrix payload per context; actual shapes, metadata overhead and chunk transfer costs remain unverified. Save observation identities, source ranges/ETag/checksums, guide/batch criteria, raw counts and their normalization. Do not read perturbed expression or tune against the already examined LFC outcomes as part of this controls-only acquisition.

If range access/layout fails the cap, the bounded route is blocked until a verified controls-only author extract, another eligible mirror, or explicit authorization for larger original downloads is available. No author contact, registration, payment or bulk download was performed in this audit. Merely downloading a transcriptomic profile from a different HepG2/Jurkat experiment would change the context and introduce an additional assay/study mismatch; it cannot silently replace the matched controls.

With only K562/RPE1 pseudobulk control summaries, the original four-context individual-control-cell representation experiment is still not executable. The completed LFC benchmark remains valid under its own declared scope and negative broad-advantage result; neither its outcome selection nor its hyperparameters were changed here.
