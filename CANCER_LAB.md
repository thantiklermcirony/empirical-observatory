# Cancer Lab · The Recovery Boundary

**Daniel Murray · Empirical Architecture Observatory**

[Open the working model](https://empirical-observatory.madmanmuzza.chatgpt.site/cancer)

## The research question

When does a redox-stressed cancer cell lose the ability to recover after a specified rescue, and can a calibrated state model predict that boundary better than cumulative exposure alone?

This is a visitor-facing, reproducible hypothesis exhibit. It does not claim to solve cancer, establish a treatment, calculate patient doses or demonstrate clinical efficacy.

## What works

Three sliders change stress depth, rescue delay and restored support. The model recomputes a deterministic trajectory and the exact finite-passage boundary. Earlier/later examples and a downloadable scenario make the assumptions inspectable. A separate chart shows published measurements; it does not reuse model output as evidence.

The static application has no external packages, trackers, AI calls, accounts or backend. Serve this directory over local HTTP and open index.html. To run the numerical checks: `node --test model.test.mjs`. The Observatory's /cancer entry routes to this same application.

## Model and limits

During a constant pulse: `dx/dt = -M(a + x²)`.
After rescue: `dx/dt = M(r - x²)`.
Initial state A = 1 and mobility M = 1 are illustrative choices. a > 0 is normalized depth beyond the local fold; r > 0 is the margin restored by rescue. All displayed times are model units. Drug concentration is not directly identified with a.

The rescue basin has boundary `x = -sqrt(r)`. Exact passage from A to that section is:

`T = [atan(A/sqrt(a)) + atan(sqrt(r/a))] / (M*sqrt(a))`.

The pulse is evaluated analytically. Post-rescue dynamics use fourth-order Runge–Kutta with step at most 1/180 model units. Numerical rendering stops below x = -2.25; this display cutoff is not a biological death threshold. Fate labels describe the deterministic rescue basin, not measured cell death. Equality at the unstable boundary is not robust recovery. A model exit must not be extrapolated as a whole-tumour trajectory.

The model retains the state through the switch to recovery; it does not add pulse durations while ignoring recovery. Coordinate rescaling leaves passage time unchanged, so observed times alone cannot identify all parameters. There is no fitted cancer-cell calibration, population survival function, tumour–normal selectivity or immune-response module in this exhibit.

## Programme sources

1. Murray, **A dynamical model of glutathione homeostasis in G6PD deficiency and NRF2-activated non-small cell lung cancer**, Redox Biochemistry and Chemistry (2026), [doi:10.1016/j.rbc.2026.100084](https://doi.org/10.1016/j.rbc.2026.100084). Finite pools and regeneration provide the context. Cancer predictions are distinct from independently calibrated erythrocyte results.
2. Murray, **Finite rescue windows and supply-limited redox commitment in NRF2-active cancer**, reviewed author manuscript, 7 September 2026. [Manuscript and figures in the downloadable lab](cancer-lab.zip), equations 1 and 4 and experimental specification, section 5. “Reviewed” denotes the programme's manuscript audit; it does not mean journal peer review or verified public SSRN release.
3. Murray, **Hormesis as a Geometric Necessity of Bounded Adaptive Systems**, Dose-Response (2026), [doi:10.1177/15593258261469171](https://doi.org/10.1177/15593258261469171). Conditional adaptive-response theory; not evidence of clinical benefit from stimulating cancer cells.

## Independent evidence

**Wiernicki et al. (2022), Nature Communications**, [doi:10.1038/s41467-022-31218-2](https://doi.org/10.1038/s41467-022-31218-2), Figure 2f. Inducible GPX4 knockdown in MCA205 cells; timed ferrostatin-1 re-addition and an eight-hour death endpoint. Three independent experiments are reported. The programme's corrected source extraction is included as wiernicki-components.csv, with SHA-256 provenance in evidence.json. Each bar adds death already present at rescue to subsequent death by eight hours. Those components are not independent treatment arms. Means are displayed; the original source rows remain downloadable. No new significance test is claimed.

The source study also reports adverse effects on anti-tumour immune responses in its systems. That is a material constraint on treatment translation and is displayed prominently. Earlier rescue of acute viability does not establish durable clonogenic recovery.

**Samarin et al. (2026), Nature Communications**, [doi:10.1038/s41467-026-71608-4](https://doi.org/10.1038/s41467-026-71608-4). Differential KEAP1/NRF2 responses enabled normal-tissue protection in SCLC models. It motivates a selectivity test, not generalization to every NRF2-active tumour. SCLC with low inducibility and constitutively NRF2-active NSCLC remain separate contexts.

## The proposed experiment

Pilot-calibrate a defined system, starting state, target engagement, effective forcing and rescue operation. A five-depth by seven-duration matrix is a starting design, not a validated clinical schedule. Include matched non-cancerous cells, biological batch identities, vehicle/rescue-only/washout/continuous-exposure controls. Measure acute injury and plating-efficiency-corrected colony formation over a predeclared follow-up interval; seven to fourteen days is the paper's starting range. Retain the originally assigned population denominator.

Freeze the observation model and parameters, then compare fold, cumulative-exposure, free-power and smooth-hazard alternatives on held-out forcing depths and independent batches. Durable fate is a separate measurement from mathematical passage. A calibrated failed prediction or stronger conventional model weakens this hypothesis. Poor calibration or an unbracketed boundary makes a study inconclusive. Normal-tissue selectivity and immune effects are additional requirements for treatment relevance.

## Files and attribution

index.html / style.css / app.mjs: exhibit. model.mjs: calculation. model.test.mjs: numerical validation. evidence.json / wiernicki-components.csv: measured data and provenance. Finite_Rescue_Windows.md / assets: author manuscript and figures.

Software follows the parent repository's MIT licence. Author manuscript and programme figures remain attributed to Daniel Murray. Wiernicki source-derived values are attributed to the original authors and their CC BY 4.0 article. No external study is presented as the programme's discovery. September 2026 edition.
