# Geometry Discovery Lab v0.2.1

[Download complete source, results and the local explorer](Geometry_Discovery_Lab_v0.2.1.zip) · [SHA256](SHA256SUMS.txt) · [Archive file manifest](manifest.json) · [Independent integration review](INTEGRATION_REVIEW.md)

Find states compatible with the same observation but different target values, then compare which additional measurement reduces that ambiguity. The package supplies affine ball-fibre geometry, exact rational resource-ceiling fixtures, a declared measurement menu, witnesses and a standalone interactive `explorer.html` inside the download.

**Status:** independently accepted for local conditional geometry integration on 12 September 2026. All three reported v0.2.0 correction blockers are resolved within the tested v0.2.1 scope. This is a synthetic scientific tool, not external peer review, empirical validation or a claim that a hosted Observatory lab has been deployed. Standard geometry is not claimed as a new mathematical discovery.

Ball endpoints/witnesses are float64 evaluations of an analytic theorem, **not outward-rounded interval certificates**. Retain supplied finite-coordinate coefficients for exact additional readouts; conditioning/range errors leave the input unresolved. Resource ranges concern compatible budget ceilings, not guaranteed achieved clearance. Physical measurement access, noise and biological calibration remain separate premises.

## Run locally

The complete source code and all 35 frozen distribution files are in the ZIP. Python 3.10+ and NumPy are required. The producer used Python 3.12.14 / NumPy 2.3.5; the independent replay used Python 3.12.14 / NumPy 2.5.3. In an activated Python environment:

```text
python -m zipfile -e Geometry_Discovery_Lab_v0.2.1.zip .
cd geometry-discovery-v0.2.1
python -m pip install -r requirements.txt
python -B verify_release.py
python -B run_all.py
```

Then open `explorer.html` locally. No service, account or external assets are needed. Check the frozen manifest before regeneration; run regeneration in an editable extraction because it updates artifacts and recorded runtime metadata. Preserve an untouched extraction for later integrity checks. The optional review of the separate biology package is not part of the main campaign and requires its own source/dependencies.

The linked manifest describes archive contents other than itself. This download adds a single `geometry-discovery-v0.2.1/` folder around the accepted flat archive; **every scientific/source file and the original manifest are byte-identical**. The accepted original archive SHA256 is `27a58a5afb4a0caf5be8f0f936a79ee8003ae62898c445fd86ed4be2a5dfd6c8`; `SHA256SUMS.txt` identifies this safely wrapped download. Frozen documents retain their original authoring-time publication notes.

Original code/prose are [MIT licensed](LICENSE), with the supplied copyright notice retained. Third-party papers are linked, not bundled; NumPy is installed separately. See [NOTICES.md](NOTICES.md).
