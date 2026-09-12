# Programme-paper claims for the Question Desk

## Scope and source rule

This note extracts six concrete claims from the programme corpus. It is a test set for a Question Desk that must preserve conditions, distinguish deductions from evidence, and refuse to manufacture an answer when required inputs are absent.

Source: locally supplied programme manuscript body extracts. Filenames below identify the reviewed versions.

The status labels below mean:

- **Mathematical/architectural:** follows from stated assumptions; it is not empirical evidence that the assumptions describe a target system.
- **Manuscript-reported computation:** the source reports a finite synthetic or software check. I did not independently rerun that code for this extraction.
- **Prospective empirical claim:** the manuscript specifies a result that real or held-out data could support or kill.
- **Published-paper claim:** the local catalogue records a journal development, but publication does not by itself validate a prospective prediction. The cited hormesis source file itself is an SSRN preprint.

## 1. TAO: boundary safety must survive strong, equally tuned controllers

**Question Desk prompt.** On the same held-out boundary-perturbation trajectories and with the same tuning budget, does the TAO state-contract controller reduce endpoint overshoot relative to clipped linear control while remaining no worse than a sigmoid-output controller, and what does it cost in recovery time and semantic work?

**Source.** *Thresholded Adaptive Orchestration: Typed Bounded-State Interfaces and Boundary-Stress Testing for Generative Interactive Worlds*, `legacy-6779487.txt`, PDF pp. 21–22, “Synthetic Oracle Benchmark”; pp. 28–29, benchmark definitions and Hypotheses 1–3.

**Claim and present status.** Hypothesis 1 predicts lower overshoot than clipped linear control and matched or improved performance relative to sigmoid-output control, with explicit state semantics. The source's one illustrative synthetic parameterisation reports recovery/overshoot of 1.65 s/0.000 for TAO, 2.85 s/0.080 for clipped linear, 10.65 s/0.060 for anti-windup PI, and 5.90 s/0.000 for sigmoid output. This is a **manuscript-reported synthetic controller signature**, not evidence about humans, physiology, XR, or global controller dominance. The theorem on pp. 8–9 only supplies an additive chart for a continuous, strictly monotone, associative interval composition; it does not select TAO's five primitives or establish controller superiority.

**Assumptions that must remain attached.** The bounded variable and semantic endpoints are valid; the composition chart and its domain are declared correctly; estimators satisfy preregistered confidence/calibration limits; target and safety bands, perturbations, gains, sweep ranges, dwell rules, and tuning objective are frozen; every controller receives identical state replay; baseline controllers receive an equal optimisation budget; boundary costs are not hidden inside a composite score; and live tests separately include estimator error. Projective admissibility and the five-primitives basis are engineering restrictions, not consequences of boundedness alone.

**Conditional expectation.** For paired replay episode (i), let (O_{i,c}) be maximum safety-band overshoot, (R_{i,c}) recovery time, (W_{i,c}) semantic work, and (P_{i,c}) boundary pinning for controller (c). The narrow prediction is

\[
E[O_{\mathrm{TAO}}-O_{\mathrm{clip}}] < 0,
\qquad
E[O_{\mathrm{TAO}}-O_{\mathrm{sigmoid}}] \le 0,
\]

with (R,W,P) reported rather than concealed. A stronger claim requires TAO to improve the held-out Pareto frontier of boundary cost versus recovery, not merely one hand-picked gain.

**Data required.** A frozen library of centre, near-boundary, threshold-crossing, and perturbation/recovery trajectories; identical targets and disturbances; controller outputs at every time step; attempted limit violations; estimator confidence and calibration error; and full hyperparameter search logs. A live layer additionally needs sensor ground truth or a defensible calibration protocol.

**No-data and negative controls.** With only the four default traces, answer “illustrative only”; do not infer superiority. Use state-label permutation where appropriate, impossible/out-of-contract trajectories, constant-state trajectories, and held-out perturbation families. The claim fails for the preregistered instance if a strong, equally tuned sigmoid/anti-windup/black-box baseline weakly dominates TAO on boundary cost and recovery, or if the advantage disappears under admissible estimator noise.

**Minimum visual.** A Pareto scatter of overshoot/boundary risk versus recovery for every tried gain, plus aligned state traces for the same held-out perturbation. Mark calibration limits and safety bands directly on the axes; keep the single illustrative table visibly separate from held-out results.

## 2. IDA: return geometry must add held-out information before any actuation claim

**Question Desk prompt.** Do preregistered return features add subject-wise or session-wise held-out predictive information beyond equally sized static EEG/physiology feature sets, without future leakage into the baseline?

**Source.** *IDA and the Boundedness Engine: A Typed-Residue Research Programme for Bounded Domains, Return Geometry, and Awareness-Gated Control*, `legacy-6987278.txt`, PDF pp. 8–10, §§6–6.3; pp. 13–15, §§9.4–10.1.

**Claim and present status.** Gate 0 requires (d(t)), the leaky recovery residue (R_\beta(t)), and multiscale return scores (S_\Delta(t)) to beat static features on held-out prediction. This is a **prospective empirical claim**. The source reports that a runnable implementation produces intended behaviour on synthetic clean and lingering perturbations; that only checks implementation/signature behaviour. The exact identity (N_\beta=R_\beta) in §6.4 is exact only because unresolved-order density is operationally defined as the same integrand; it is not independent thermodynamic evidence.

**Assumptions that must remain attached.** The embedding/metric, context class, frozen healthy baseline, dead band (\delta), decay (\beta), windows (\Delta), outcomes, folds, and missing-data handling are fixed before evaluation. The baseline used to judge a session cannot be updated from that session's judged future. Fast state, residue, slow baseline drift, and capacity adaptation must be separable enough to identify. Perturbation onset and recovery windows must exist, and static and dynamic models must get comparable capacity/tuning. Clinical benefit is outside Gate 0.

**Conditional expectation.** Define

\[
d(t)=\|\psi(z(t))-\psi(z_0^*(c,\tau))\|,
\quad e(t)=\max(0,d(t)-\delta),
\quad \dot R_\beta=e-\beta R_\beta,
\quad S_\Delta(t)=\frac{d(t-\Delta)-d(t)}{\Delta}.
\]

For a frozen outcome metric (M), the primary contrast is

\[
\Delta_M=M(\text{static}+\text{return})-M(\text{static})>0
\]

on subject-wise or leave-session-out folds, with a confidence interval or permutation distribution fixed to the chosen metric's direction. This does not imply Gate 1 directed coupling or Gate 2 closed-loop advantage.

**Data required.** Timestamped repeated perturbation/recovery episodes; raw or minimally processed EEG and/or physiology; context labels; independent well-state baseline windows; artefact/confidence channels; subject/session identifiers; and a future outcome such as recovery time, future drift, an independent marker, or a locked state proxy.

**No-data and negative controls.** A cross-sectional snapshot, data without perturbation timing, or a baseline contaminated by the target window cannot answer Gate 0. Required controls are permutation labels, matched feature count/capacity, future-window leakage checks, random temporal summaries, and distance/residue computed in a deliberately wrong or shuffled baseline. Gate 0 dies if return features add no held-out information beyond the static and capacity-matched controls.

**Minimum visual.** Three aligned panels: raw state and frozen baseline; (d,R_\beta,S_\Delta) with causal windows; held-out improvement with subject-level points and uncertainty. Show fold boundaries and the forbidden future region used for leakage checks.

## 3. Hormesis: the peak-location law is conditional and presently under-specified for reproduction

**Question Desk prompt.** In a same-system dose series, does the viability peak occur at approximately two times the independently measured repair-activation EC50 once the toxicity threshold, sigmoid steepnesses, baseline rapidity, and repair/damage amplitudes have been frozen without seeing the viability peak?

**Source.** *Hormesis as a Geometric Necessity of Bounded Adaptive Systems: Quantitative Predictions from First Principles*, `legacy-6858819.txt`, PDF pp. 4–5, §§3.1–3.4; p. 8, §5.1; p. 14, Appendix A.1–A.2.

**Claim and present status.** The manuscript predicts (d^*/D_a\approx1.7\)–(2.4) over a stated numerical grid and approximately (2.0\)–(2.4D_a) when (D_t/D_a=10\)–20. It reports retrospective agreement and a numerical sweep of 36 parameter combinations. The source file labels itself a non-peer-reviewed SSRN preprint; the local programme catalogue records a later published journal development. Treat the peak law as a **prospective empirical prediction plus a manuscript-reported finite calculation**, not as established by the database-level amplitude comparison.

**Assumptions that must remain attached.** Viability is the single bounded observable; repair and damage act as independent sequential increments on it; repair activation precedes toxicity ((D_a<D_t)); high-dose damage exceeds bounded repair; the chosen dose coordinate is appropriate; the logistic activation forms are correct; repair/damage steepnesses (s_a,s_t), amplitudes (A_\rho,B_\rho), and baseline (\rho_{base}) are independently fixed; the product form is only a moderate-perturbation approximation; and endpoint, exposure time, cell state, and assay are common across molecular and functional measurements. Boundedness plus adaptation alone does not fix these functions or parameters.

**Conditional expectation.** For the stated model,

\[
\rho_{net}(d)=\rho_{base}+A_\rho\sigma(d;D_a,s_a)-B_\rho\sigma(d;D_t,s_t),
\qquad
Y(d)=\frac{\tanh\rho_{net}(d)}{\tanh\rho_{base}}.
\]

After fitting or measuring all parameters without using (d^*), the peak prediction is (d^*_{pred}=\arg\max_dY(d)), and the preregistered test compares it with the held-out observed peak and its uncertainty. The simpler ratio band is justified only for the exact parameter grid used by the calculation. The extracted Appendix lists (D_a,D_t/D_a,A_{max}) but does not list the full (s_a,s_t,\rho_{base},B_\rho) grid; therefore the Desk must report that the quoted 1.69–2.43 range is not exactly reproducible from this text alone.

**Data required.** In one biological system and one exposure schedule: a dense dose grid; repair activation measured independently to estimate (D_a,s_a,A_\rho); toxicity/damage measured independently to estimate (D_t,s_t,B_\rho); baseline viability/rapidity; functional viability with biological replicates; assay saturation and uncertainty; and enough doses near the peak to locate (d^*) without interpolation dominance.

**No-data and negative controls.** If activation and viability are taken from different systems, exposure times, or endpoints, return “structural comparison only.” Include monotone-toxic and monotone-protective model comparisons, a flexible biphasic null, blinded parameter estimation, and repair-deficient/knockout conditions where mechanistically justified. The peak law is weakened if independently frozen parameters systematically miss peak location beyond declared error, even when a flexible biphasic curve fits well.

**Minimum visual.** Overlay molecular repair, independent damage/toxicity, and held-out viability on the same log-dose axis. Draw (D_a,D_t,d^*_{pred}), uncertainty bands, and the observed peak. A second residual panel must compare the UHL/hyperbolic model with monotone and flexible biphasic alternatives.

## 4. Hormetic amplitude: a known first-order identity becomes a new claim only at the phenotype link

**Question Desk prompt.** In one system, does the independently measured summed response coefficient (\sum_iC_i\epsilon_i) predict adaptive peak amplitude better than target count, pathway label, or fitted dose-curve parameters?

**Source.** *Response-Coefficient Attenuation Predicts Hormetic Peak Amplitude: A Metabolic-Control Extension of Bounded Adaptive Systems*, `legacy-6858760.txt`, extracted PDF p. 6 (manuscript p. 4), §§3.3–4.1; extracted PDF p. 11 (manuscript p. 9), §§10.2–10.4.

**Claim and present status.** In first-order metabolic control analysis (MCA), (\Delta Y/Y\approx a\sum_iC_i\epsilon_i) and (\eta=(\sum_iC_i\epsilon_i)^{-1}). The paper correctly calls this a **definitional linkage inherited from MCA**, not a free-standing discovery. The empirical content is the **prospective claim** that the independently estimated sum predicts hormetic adaptive-arm amplitude. The manuscript offers genome-scale supporting premises/proxies, not the decisive same-system assay.

**Assumptions that must remain attached.** Measurements are near the same stable operating point and in the first-order, near-steady-state regime; (a=\Delta\ln m), (C_i=\partial\ln Y/\partial\ln v_i), and (\epsilon_i=\partial\ln v_i/\partial\ln m) use compatible fractional definitions; all materially affected sites are enumerated at fixed granularity; pathway interactions are represented rather than double-counted; signs are retained, because opposing contributions may cancel; input, target perturbations, phenotype, baseline, and timescale are matched; and the bounded-observable compression factor is kept separate from network attenuation.

**Conditional expectation.** The local prediction is

\[
\widehat{\Delta Y/Y}=a\sum_i\widehat C_i\widehat\epsilon_i,
\qquad
\eta_{pred}=\left(\sum_i\widehat C_i\widehat\epsilon_i\right)^{-1}.
\]

Across preregistered systems, the source proposes (A_{peak}=\alpha+b_1\widehat{\sum C\epsilon}+\) baseline/timescale/mechanism covariates, with (b_1>0). Predictive comparison must be out of sample and amplitude-blind during architecture classification.

**Data required.** Controlled fractional changes in the effector; local target responses for (\epsilon_i); independent small perturbations of each target for (C_i); phenotype and peak amplitude; uncertainty/covariance of coefficients; baseline bounded state; timing; and an explicit record of missing/unknown targets. Deletion fitness and transcript fold-change are only large-perturbation and expression proxies, respectively.

**No-data and negative controls.** Target count alone, transcript induction alone, or deletion fitness alone cannot test the identity's empirical link. Compare against target count, pathway label, molecular fold-change, and flexible curve parameters; shuffle (C_i\)-to-(\epsilon_i) pairings within matched pathways; include induced targets with near-zero control and control-bearing targets with low elasticity. The empirical claim fails if the summed coefficient gives no out-of-sample gain or has the wrong signed association after frozen covariates.

**Minimum visual.** A path diagram (a\rightarrow\epsilon_i\rightarrow C_i\rightarrow Y) with signs, beside an observed-versus-predicted amplitude plot. Show uncertainty propagated from both coefficient families and place proxy-only results in a visibly weaker evidence tier.

## 5. Ecology: an abundance histogram cannot identify a stationary current

**Question Desk prompt.** Can a neutral-looking species-abundance distribution coexist with statistically supported time-irreversible cyclic current in the same community, after reversible autocorrelation, habitat, dispersal, nonstationarity, and spatial pseudoreplication are controlled?

**Source.** *Projection Geometry of the Niche–Neutral Debate: Hidden Probability Currents in Community Dynamics*, `legacy-6963360.txt`, PDF pp. 6–8, §6 and Theorem 2; pp. 17–19, §§11–12.

**Claim and present status.** For a stationary drift–diffusion with fixed density (\rho) and diffusion (D), the compatible drifts are (b=b_{DB}+u) with (\nabla\cdot(u\rho)=0); static unordered abundance statistics depend on (\rho), not the current. This is a **conditional mathematical non-identifiability result**. The manuscript reports an OU synthetic construction in which identical stationary abundance distributions conceal reversible versus cyclic dynamics and a bootstrap detects the planted cycle. The Barro Colorado/repeated-census result remains **prospective**.

**Assumptions that must remain attached.** The analysis concerns a stationary or defensibly windowed persistent core, with a valid compositional/log-ratio representation and sufficiently characterized diffusion/noise. Static-histogram blindness does not apply to time-ordered abundance analyses. A positive probability current establishes irreversibility under the model, not a unique ecological cause. Pooling quadrats requires exchangeability within environmental strata; spatial blocks, not raw quadrats, define replication. Extinction boundaries, observation error, transient forcing, dispersal advection, and habitat gradients require separate treatment.

**Conditional expectation.** With

\[
J=b\rho-D\nabla\rho,
\qquad \nabla\cdot J=0,
\]

there exist (J=0) and (J\ne0) dynamics sharing the same (\rho), so no statistic (O(\rho)) can distinguish them. Empirically, a declared irreversibility statistic (\Phi) or entropy-production estimator should exceed a fitted reversible-bootstrap null while the static abundance fit remains neutral-like. Species-labelled cycle structure should then survive label permutation and environmental/dispersal adjustment if the interpretation is cyclic niche dynamics.

**Data required.** Repeated, time-ordered, taxonomically consistent censuses; mapped spatial blocks or dense temporal replicates; counts and census effort; habitat/topography/neighbourhood/trait covariates; observation and demographic error estimates; persistent-core definition; zero-handling rule; and enough transitions after block/stratum filtering to estimate forward/backward asymmetry.

**No-data and negative controls.** A single abundance histogram can establish neither neutrality nor current and must trigger a non-identifiability answer. Use a fitted reversible parametric bootstrap preserving autocorrelation, time-order reversal, species-label permutation, spatial block resampling, simulated gradient drift, dispersal/advection, and nonstationary environmental forcing. A detected arrow without surviving these attribution controls supports hidden dynamics but does not license the phrase “intransitive competition.”

**Minimum visual.** First show two vector fields over the same density contours: (J=0) and circulating (J\ne0). Then show paired forward/backward transition maps, bootstrap null, and species-labelled cycle spectrum. Keep detection of irreversibility and causal attribution in separate panels.

## 6. AI: fail-closed safety must be measured together with useful coverage

**Question Desk prompt.** In a frozen, versioned numerical jurisdiction, can a proposer-plus-small-kernel system maintain zero unsupported *certified* assertions while retaining useful coverage competitive with realistic abstaining baselines at a declared trusted-computing-base cost?

**Source.** *Epistemic Type Safety for Generative AI: Witnessed Assertion, Fail-Closed Kernels, and Why the Model Need Not Be the World*, `current-01.txt`, PDF pp. 4–6, §§3–4.1; pp. 11–13, §§8–9.

**Claim and present status.** Channel invariant C1 is a **conditional architectural proof**: under K0–K6, every certified factual proposition is supported relative to declared evidence and rules. It does not prove the TCB correct or the evidence true. The revised finite prototype reportedly passes 34 named checks, 18 positive certificates, and a repeated restricted 10,000-mutation family; this is **manuscript-reported finite computation**, not formal verification or a universal adversarial result. H1—useful coverage with zero unsupported certified assertions at bounded TCB cost—is **untested**.

**Assumptions that must remain attached.** The certified channel begins supported; evidence admission and immutable binding are correct; every factual/partial write uses the only introduction rule; verifier, parser, binder, renderer, unit logic, version logic, and warrant policy are semantically sound; the proposer has no bypass or mutation path; failed obligations yield ASK/ABSTAIN or separately verified partial output; the evidence snapshot and jurisdiction are fixed; and process/code integrity protects the TCB. “Supported” is relative to admitted records and rules, not world truth.

**Conditional expectation.** On a preregistered workload, define unsupported assertion rate (UAR=U/C), certified coverage (CC=Q_{useful\ certified}/Q_{all}), binding-error rate, false external claim rate, ASK rate, and decomposed TCB cost. The candidate H1 instance requires

\[
U=0,\qquad CC\ge CC_{baseline}\ \text{at comparable declared TCB cost}.
\]

If (C=0), UAR is undefined and the system has only demonstrated silence; report the zero denominator and (CC=0). Finite zero observed errors does not establish population zero risk.

**Data required.** One immutable, versioned numerical store; independently labelled queries and expected bindings; provenance/digests; units and exact decimals; observation and expiry dates; conflicting versions; unsupported and missing-source cases; prompt-injection strings as inert evidence; and outputs from a base model, RAG, RAG+judge, tool agent, and proposer+kernel across more than one proposer size. An independent evaluator must inspect both certified claims and abstentions.

**No-data and negative controls.** A demo containing only accepted easy queries cannot test H1. Include wrong entity/year/version, mixed units, forged rule metadata/digests, future and stale evidence, fabricated citations, unsupported intensifiers, lossy summaries, malformed/nonfinite/Boolean values, unknown operators, renderer qualification loss, and attempts to bypass the certified channel. Add a certify-nothing kernel as a required negative control: it should have zero certified errors and zero useful coverage.

**Minimum visual.** A type-flow diagram from proposal/evidence through binding, warrant, meaning, and renderer to the certified channel, with every K0–K6 assumption shown at its boundary. Pair it with a coverage-versus-error plot; show certify-nothing at the origin and TCB cost as labels or a third axis.

## Cross-claim display contract for the Question Desk

Every answer should expose the same five blocks in the same order:

1. **Verdict:** established under assumptions, manuscript-reported computation, prospective, unsupported, or underdetermined.
2. **Scope:** the smallest exact claim, followed by what it does not establish.
3. **Assumption ledger:** each assumption marked observed, stipulated, estimated, or missing.
4. **Evidence gate:** required data, split unit, comparator, primary endpoint, and kill condition.
5. **Visual:** observed data and uncertainty; model prediction; null/control; and an explicit no-data state.

The Desk should never convert a theorem conditional on a model into evidence that nature uses the model, a successful synthetic recovery into a field result, a published claim into an independently replicated claim, or zero certified outputs into zero empirical error.
