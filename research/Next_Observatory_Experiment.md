# Next experiment: can calibration distinguish apparent recovery from resource recovery?

Protocol v0.1 · frozen 12 September 2026 · proposed, not executed.

The first next experiment should test observation sufficiency before adding another mechanism. The question is whether a restored reduced fraction can coexist with a lower necessary peroxide-handling ceiling, and which additional calibrated measurement resolves that ambiguity. This connects the observation framework, temporal identity, resource mathematics and adaptation without assuming a universal biological law.

## Stage A: a reproducible synthetic observation challenge

Use the existing fixed-volume GPx/GR resource ledger. Its necessary ceiling is `C = q*T/2 + N + J`, with q dimensionless, T and N in mM, and J the declared integrated replenishment allowance in mM. This is an upper resource allowance, not an attainable reaction extent or a survival prediction. Keep every current premise, including fixed volume, stoichiometry, nonnegative pools and the declared source ledger. The existing example stipulates J=0.06 mM; do not silently fit it.

Generate paired states at the same declared observation time with identical q but different T and N. For an exact starting witness, q=0.99, T=1 mM and J=0.06 mM give C=0.565 mM at N=0.010 mM and C=0.625 mM at N=0.070 mM. A target of 0.600 mM is excluded in the first state and not excluded in the second. The second state does not establish attainability. Temporal grammar must keep the preparation and clock identical for a correction and different for a later observation.

Observation model: each absolute assay reports y=b+g*x+epsilon. In a declared calibration batch, g>0 and b are shared between blanks, standards and specimens. Use a blank and two standards bracketing the specimen range; keep one standard for a calibration residual check. Unknown or changed gain/background must produce a calibration gap. Do not infer x from y when g and b are unidentified.

Freeze 100 development and 400 held-out paired cases with separate seed lists before evaluating. Cross q in [0.90,0.999], T in [0.5,2] mM and N in [0,0.12] mM. Use identical observations and assay budgets for competing methods. Predeclare noise levels of 0%, 1% and 5% of assay range, independent Gaussian noise for this synthetic experiment only. Use 1,000 repeated measurement draws per case to check nominal interval coverage; reuse draws across methods. Do not tune on held-out cases.

Baselines:

1. Reduced fraction only: return the full compatible ceiling range under the declared pool ranges; abstain when the target classification is ambiguous. This is the honest information-limited baseline.
2. Conventional calibrated ledger: fit the declared affine calibration, propagate measurement uncertainty, then apply C directly. This is the strongest intended baseline.
3. Existing Observatory geometry/measurement selector: choose an additional observation at the same assay cost, retaining all calibration and ledger premises. Freeze its selection rule before held-out execution. Do not call ordinary ledger propagation a new algorithm.

Primary metrics are false exclusions, interval coverage, unresolved fraction and interval width at equal assay cost. Report every noise stratum and the no-information baseline. A successful engineering connection must reproduce the exact witness above, keep all missing-premise cases unresolved, preserve revision identity and use one receipt across the report and encyclopedia. An experimental improvement requires at least 10% lower mean interval width than the conventional baseline, no higher assay cost, at least 94% coverage for nominal 95% intervals in every noise stratum, and a paired bootstrap 95% confidence interval for the mean width improvement entirely above zero. The 10% threshold is a prospective decision criterion, not a known result.

Failure means missing any primary criterion, making an exclusion from an unidentified observation, or changing the rule after looking at held-out results. Report a tie or a failure openly; the observation-sufficiency result can remain useful without an algorithmic advantage.

Negative controls: withhold the standards; change specimen gain relative to standards; alter preparation identity; replace a same-time correction with a later-time reading; remove a resource source term; supply incompatible units. These must invalidate only the affected inference. Do not score an abstention as a correct positive discovery.

## Stage B: empirical readiness gate

Do not begin a biological outcome claim from Stage A. Acquire matched, same-preparation measurements of absolute GSH/GSSG pools, NADPH, compartment/volume context, sampling time, calibration/recovery controls and the integrated source ledger. Predefine the biological reaction endpoint independently. The current published-data bridge does not provide all these observations: extract-spike standards do not establish endogenous extraction survival, and time-zero records do not substitute for a matched 30-minute NADPH observation.

Before collecting or decoding outcome data, choose the assay, intervention, sample-size calculation and exclusion rules with the relevant domain specialist. Preregister the endpoint and conventional baseline. Until that gate is met, the result is conditional mathematics and a synthetic benchmark. No biological recovery, GPX4 clearance, quantum mechanism or survival discovery is established.

## Scope across the programme

UHL supplies a conditional bounded composition model; boundedness alone does not select its coordinate. Temporal grammar owns order, preparation and revision. Biology owns stoichiometry and measurement meaning. Geometry describes observational ambiguity. Dynamics supplies conventional recovery baselines. Quantum mechanisms remain separate unless a reviewed measurement/transfer model connects their observables to this experiment. The encyclopedia records the premise-bound result and the unresolved transfer; it does not turn a source publication into empirical evidence.

Source basis: preserved Theory Atlas v0.1.1 source findings and proofs; Biology Observation Bridge v0.1.0 theorem-use review; Quantum Branch Growth observation/calibration critique; the reviewed temporal resource capability and current controller comparison. Specialist development remains paused. This protocol authorizes no new specialist work or physical experiment by itself.
