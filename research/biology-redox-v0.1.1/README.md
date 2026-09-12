# Biology redox inquiry v0.1.1

[Download the complete source and results](Biology_Redox_Inquiry_v0.1.1.zip) · [Archive checksum](SHA256SUMS.txt) · [Packaged-file manifest](manifest.json) · [Reuse notices](NOTICES.md)

An executable GPx/GR redox model asks whether a cell can look recovered while its remaining peroxide-handling capacity differs. It joins finite glutathione/NADPH reserves, an explicit bath, repeated challenges and observer-dependent necessary resource bounds. Adding a stipulated absolute NADPH observation can tighten a bound enough to exclude a target that the initial readout could not exclude. A non-excluded target is not thereby feasible.

**Status:** corrected v0.1.1 has passed independent local AI integration checks and portable-package verification. Predictions and uncertainty examples are synthetic. The included published-data audit does not validate biological recovery. This is known chemistry and modelling in a reproducible inquiry, not a new biological law, external peer review, safety guidance or a deployed interactive lab.

## What the download contains

The ZIP contains all 79 distribution files under one `biology-redox-v0.1.1/` folder: **the complete Python source code**, physical parameters, example protocol, supplied numerical results and fits, figures, inquiry records, review/portability receipts, attributed source-table extraction and two licensed supplements. No installed runtime is bundled. The linked manifest describes the files **inside the ZIP**; its own `manifest.json` is the remaining file. `SHA256SUMS.txt` identifies this exact source archive.

## Reproduce locally

Use Python 3.12 in an activated virtual environment. The package was tested with Python 3.12.14 on Windows; other operating systems and a fresh dependency installation were not independently replayed. After downloading the ZIP, run:

```text
python -m zipfile -e Biology_Redox_Inquiry_v0.1.1.zip .
cd biology-redox-v0.1.1
python -m pip install -r requirements.txt
python -B verify_package.py --self-test
python -B validate.py
python -B test_scenario.py
python -B continuation.py
python -B assemble.py
python -B accounting_validation.py
python -B validate_provenance.py
```

Check integrity **before** regenerating outputs. Regeneration intentionally changes envelope timestamps and related hashes; keep an untouched extraction if you need to compare the frozen manifest. The six execution checks above reproduce the portable verification without refitting the supplied campaigns. The README inside the archive also gives the complete fitting, sensitivity, plotting and optional source-table audit commands. Supplied-data checks need no network after dependencies are installed.

Newly authored project code and documentation use the [MIT License](LICENSE), copyright (c) 2026 Daniel John Murray. Source supplements and extracted source data retain their separately stated terms; dependencies and manuscript materials are not relicensed. See [NOTICES.md](NOTICES.md).
