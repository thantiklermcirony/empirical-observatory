# IDA → Muse EEG: equation specification and source audit

12 September 2026 • Research design, with numerical checks • No human EEG data analyzed

## Decision

Build the first instrument around **task-conditioned recovery geometry**. Estimate whether a person can maintain a demonstrated working state, acquire a different task state, and recover after demand ends. Use EEG to predict independent performance, not to manufacture a psychological label from a waveform.

The IDA synthesis supplies the useful mathematical core: fixed reference, chart distance, excess displacement, leaky residue, return speed and baseline drift. The missing bridge is an empirically calibrated observation model from Muse signals to task-relevant coordinates. The equations below make that bridge testable; they do not establish that it is already valid.

The strongest current conclusion is a design hypothesis, not a uniquely proven account of mind: **a person's response to controlled demands may reveal regulatory ability more usefully than a resting snapshot; return geometry must demonstrate incremental prediction over ordinary EEG and behavioral baselines.**

## 1. What I inspected

* Your supplied 35-page *IDA and the Boundedness Engine*, v1.0, June 2026, including its complete Python appendix. Text was read throughout; the central equation, estimator, baseline, integrator, controller and driver pages were also inspected visually. [SSRN record](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6987278).
* The seven public Madmanmuzza GitHub repositories were inventoried; default-branch text and PDFs were downloaded. The EEG-related MRE, alternation, decoherence, NOE and implementation files were examined in detail. This is not a proof audit of every physics paper.
* The IDA companion-paper map was reviewed. Relevant public abstracts/records were located for the composition, coordinate, biological architecture, belief, attractor reversal and adaptive-orchestration papers. Several SSRN full-text downloads returned HTTP 403; I do not claim to have read every companion in full.
* The published hormesis paper's full-text mathematical framework was inspected. Its July 2026 publication supersedes the IDA appendix's June statement that all companions were working papers. It explicitly distinguishes an adopted Möbius law from what Aczél's theorem itself guarantees. [Published paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC13392316/).

**How the programme fits together:** bounded-composition work informs coordinate choice; IDA defines recovery measurements; addressed-residual work motivates tests of retained updating; TAO concerns eventual interactive task orchestration. MRE concerns a separate proposed quantum-detector coupling. Evidence for any one component does not establish the others. This is also the central typing discipline of the IDA manuscript.

## 2. What must change in the existing reference engine

These findings concern the code printed in your supplied PDF. They were checked against the rendered pages and, where indicated, executed after extracting the Python without changing its algorithms.

| Finding | Evidence | Required correction |
|---|---|---|
| Artificial bounding followed by its inverse | The estimator computes x=tanh(4(r−0.5)); artanh(x)=4(r−0.5). After baseline standardization, its distance is just a standardized alpha-ratio distance | Treat this as an illustrative alpha estimator. It is not evidence that EEG obeys Möbius composition |
| DC offset changes the supposed state | At 256 Hz, a 10 Hz sine gives x≈+0.9640; the identical sine plus a constant 800 gives x≈−0.9640, both confidence 1 | Remove DC/trend before spectral estimation; use a declared physiological frequency denominator |
| Flatline receives full confidence | An all-zero input gives confidence=1 | Reject flatlines, clipping, missing data and bad contact before feature estimation; validate artifact handling |
| Main text and code have differently scaled residues | Main text has dR/dt=e−βR. Code updates R←exp(−βdt)R+(1−exp(−βdt))e | Name the code's quantity r=βR. It obeys dr/dt=β(e−r). Convert all thresholds and units consistently |
| Falling distance is substituted for falling residue | `residue_rising_on_safety = S_safety < 0` tests distance trend, not residue trend | Store and directly test r(t)−r(t−Δ), as well as distance return |
| An advance can occur while residue rises | In a warm-history synthetic test with β=0.001, all distance-return windows were positive; r rose from 0.080296 to 0.080716 and the controller advanced | Require actual non-rising/falling residue as declared; do not equate the signs |
| Unavailable slow history becomes zero | Early return scores are zero. A two-frame example with debounce=1 advanced before a 120-second history existed | Represent warm-up as unavailable; require all selected windows to be mature before adaptive decisions |
| Artifact windows update residue before the confidence gate | `update(e)` and return history execute before the invalid-data branch | Mark the state/residue uncertain; do not contaminate history or treat a gap as recovery |
| Feature timestamps imply earlier availability | Driver labels a window by its start while using the entire window | Store start, end and availability time; live predictions use only available past data |
| Reference construction automatically uses the first 20 seconds | CLI has no independent task/performance check | Require declared calibration epochs with acceptable signal and demonstrated task performance |
| CSV interface is not a Mind Monitor parser | `np.loadtxt(..., delimiter=',')` expects a numeric single-column signal | Add timestamp-aware multichannel parsing, headers, quality flags, event logs and cadence checks |

The supplied demo runs: clean-episode mean r≈1.212 versus lingering-episode mean r≈2.710; intended output is lower during the lingering episode. That verifies a synthetic illustration, not human state validity or closed-loop benefit. The synthetic signal never receives feedback from the logged actuator. Both injected bumps are also truncated after 12 seconds despite their different exponential decay constants.

Additional mathematical clarifications:

* For the exact equation ψ(x⊕y)=ψ(x)+ψ(y), a second generator aψ+b preserves it only if b=0. Uniqueness here is up to scaling with an orientation convention, not an arbitrary additive offset. The published hormesis text uses the multiplicative formulation.
* Additive coordinates do not themselves select a unique biological distance or noise metric. Estimate the measurement metric independently and keep it frozen.
* Section 6.4's operational identity Nβ=Rβ is true because the integrals are defined identically. It is not independent physiological confirmation or a measurement of thermodynamic entropy export. Replacing linear excess by squared distance does not generally give a monotone function of the integrated linear residue: a history with weighted values 2 for 40% and 0 for 60% has linear average 0.8 and quadratic average 1.6, while constant 1 has both averages 1. Their order reverses.
* A fixed leak β is a design parameter. Observing that its computed residue decays cannot by itself reveal a biological export conductance. Estimate biological recovery from independent trajectories/outcomes.

## 3. An explicit EEG coordinate system

### 3.1 Input and quality

For each valid causal window, estimate channel power spectral density S_c(f,t). For the raw-data route use disjoint bands [1,4), [4,8), [8,13), [13,30] Hz as an initial locked feature set. Demean/detrend and filter appropriately before spectral estimation. A candidate initial setting is four-second windows updated each second; it requires validation, and constrains temporal resolution.

Standard Muse electrode positions differ from the F3/Fz/F4 montage in MRE and the Fz/Cz/Pz illustration in IDA. Name the actual available channels rather than relabeling them. Record hardware/firmware, sampling configuration, filter settings and calibration version.

Require adequate sampling, finite samples, stable contact, no clipping/flatlining and acceptable ocular/motion/muscle contamination. Confidence is a validated reliability estimate or an explicitly named quality score; an absence-of-outliers fraction is not confidence in a mental-state interpretation.

### 3.2 Exact feature definition

For each channel and band:

\[
P_{cb}(t)=\int_{B_b}\widehat S_c(f,t)df,\quad
T_c(t)=\sum_bP_{cb}(t),\quad
p_{cb}(t)=P_{cb}(t)/T_c(t).
\]

Reject negligible total power. Handle individual tiny powers with a predeclared calibrated floor and sensitivity analysis. Define

\[
y_c(t)=\begin{bmatrix}\log[T_c(t)/P_{\rm unit}]\\H\log p_c(t)\end{bmatrix},\qquad
H=\begin{bmatrix}
1/\sqrt2&-1/\sqrt2&0&0\\
1/\sqrt6&1/\sqrt6&-2/\sqrt6&0\\
1/\sqrt{12}&1/\sqrt{12}&1/\sqrt{12}&-3/\sqrt{12}
\end{bmatrix}.
\]

Here P_unit is a fixed power unit, and H gives three independent log-ratio coordinates for four spectral proportions. Concatenate the channel vectors. This preserves total power as well as spectral composition; it avoids four redundant proportions.

This is an **engineering candidate**, not a theorem about cognition. It has a clear composition interpretation: componentwise multiplication followed by renormalization becomes addition in H log p. Whether this operation models the effects of cognitive demands is a separate empirical question. Compare it with simpler log-power features and with the paper's alpha-only reference. Do not apply artanh to every bounded number merely because it is bounded.

For an already-logarithmic Mind Monitor band export, use its documented log-power coordinates directly after unit conversion as necessary. Do not claim that the exported bands form a disjoint spectral partition: standard theta and alpha definitions can overlap. Full raw data are preferred for the explicitly defined partition above. Spectral peaks and aperiodic background should be separated in a later candidate model if that improves validation. [Donoghue et al.](https://www.nature.com/articles/s41593-020-00744-x).

## 4. The final read-side equations to implement

These equations are fully specified mathematical operations once calibration/configuration is fixed. Their psychological interpretation remains to be tested.

### A. Frozen task reference and distance

For each reference context k—rest, task A at difficulty d, task B at difficulty d—estimate μ_k and a regularized calibration covariance Σ_k from independent successful-performance windows. Freeze them before the scored session. Use the same feature transform and channel set throughout.

\[
\boxed{d_k(t)=\sqrt{[y(t)-\mu_k]^T\Sigma_k^{-1}[y(t)-\mu_k]}}
\]

This is Euclidean distance after a fixed whitening transform **inside the chosen chart**, not distance on raw bounded proportions. Calibration regularization, feature selection and thresholds must not use the evaluated session's outcomes.

Let δ_k be a predeclared upper quantile of held-out calibration distances for that context; 95% is a candidate convention, not a biological boundary. Then

\[
\boxed{e_k(t)=\max(0,d_k(t)-\delta_k)}.
\]

An EEG state far from rest during successful work is not automatically bad. Use the active task reference for maintenance; use the original rest/reference-task condition when measuring recovery. Retain distances to all references for interpretation.

### B. Unresolved-displacement memory

Preserve the manuscript variable R and name the normalized implementation variable r:

\[
\boxed{R_{k,\beta}(t)=\int_{t_0}^{t}e^{-\beta(t-s)}e_k(s)ds},\qquad
\boxed{r_{k,\beta}=\beta R_{k,\beta}}.
\]

R has units of standardized-distance × seconds; r has standardized-distance units. With excess held constant over an observed interval Δt, the exact update is

\[
\boxed{r_i=e^{-\beta\Delta t_i}r_{i-1}+(1-e^{-\beta\Delta t_i})e_i}.
\]

Use actual elapsed time. The continuous-time identity is

\[
\boxed{\dot r=\beta(e-r)}.
\]

This is the essential correction: **falling instantaneous distance does not imply falling unresolved-displacement memory.** If e remains above r, r is still growing.

Choose and freeze β by a declared memory half-life h: β=ln(2)/h. Initial candidates might be h=30 and 120 seconds; do not select a favorable value on the final test set. These are analyst-selected memory scales, not measured brain constants.

For independent challenge episodes, initialize an episode-specific residue at the declared start and label it as such. A separate session-continuous residue may be retained with a fixed reference schedule. Do not silently reset accumulated state and call that recovery. An invalid-data interval makes the full residue uncertain: missing excess is unknown, not zero.

### C. Return and residue trends

\[
\boxed{S_{k,\Delta}(t)=\frac{d_k(t-\Delta)-d_k(t)}{\Delta}},\qquad
\boxed{G_{k,\Delta}(t)=\frac{r_k(t)-r_k(t-\Delta)}{\Delta}}.
\]

Positive S means approaching the specified reference; positive G means residue is growing. Compute both directly. The paper's 1/5/30/120-second windows can be retained as candidates, but a four-second spectral estimator cannot resolve a genuine one-second physiological return independently of its own smoothing.

All compared points must use the same reference and phase interpretation. A task/reference change must not create a fictitious recovery slope. Mark missing or immature windows unavailable, not zero.

### D. Episode recovery

\[
\boxed{T_{\rm settle}=\inf\{t-t_0:d_{\rm return}(v)\leq\delta_{\rm return}\ \forall v\in[t,t+L]\}},
\]
\[
\boxed{AUC_e=\int_{t_0}^{t_1}e_{\rm return}(t)dt}.
\]

L is a predeclared continuous valid-data dwell period; t1 is a fixed observation horizon. At live time t+L, settling at t can be confirmed retrospectively. If no settling occurs, report “not observed within X seconds,” not a fabricated time. Compare AUC at matched challenge intensity and horizon. Report overshoot and recurrence separately when present.

Residue decreases automatically under its leak after displacement disappears; AUC and observed settling provide complementary episode information.

### E. Drift / ANDY

Let b_j be a later reference estimate from separately scheduled, matched-condition probe windows, expressed in the same chart. It does not overwrite μ_0:

\[
\boxed{ANDY_j=\sqrt{(b_j-\mu_0)^T\Sigma_0^{-1}(b_j-\mu_0)}}.
\]

This is displacement of a measured reference, not proof that a biological attractor moved or that health deteriorated. Contact changes, sleep, task learning and context can also shift it. Compare uncertainty across repeated sessions and independent performance.

The actual error from using a moving ruler is

\[
E_{\rm ruler}(t)=\|y(t)-\mu_0\|_W-\|y(t)-b(t)\|_W,
\qquad |E_{\rm ruler}(t)|\leq\|b(t)-\mu_0\|_W.
\]

Thus ANDY bounds this distance error; it is not generally equal to the amount subtracted, except in special geometries. Both quantities must use the same chart and metric.

### F. Meaningful functional endpoints

Maintain separate behavioral endpoints: omissions, false alarms, correct-response variability, and

\[
\boxed{\Delta RT=\mathrm{median}(RT_{correct,switch})-\mathrm{median}(RT_{correct,repeat})},
\quad
\boxed{\Delta E=P(error\mid switch)-P(error\mid repeat)}.
\]

Compare matched rule/difficulty/cue conditions; retain speed–accuracy tradeoffs. Estimate EEG time-to-new-task reference separately and require correct use of the new rule. Returning toward rest while failing the task is not successful task acquisition.

The product should initially report **maintenance, switching, recovery, drift and measurement confidence** as a profile. It should not convert them into a single universal “mental stability” score before independent calibration.

## 5. How to infer the most likely state

A practical first prediction is the probability of a future lapse over a fixed horizon H, not an unrestricted state-of-mind label. Fit a regularized, calibrated model such as

\[
\boxed{\widehat p(lapse_{t:t+H})=\operatorname{sigmoid}\left[
a_{person}+a_{task}+w_y^Ty_t+w_d d_t+w_r r_t+
\sum_\Delta(w_{S,\Delta}S_\Delta+w_{G,\Delta}G_\Delta)+v^Tc_t\right]}.
\]

c contains past behavior, time on task, difficulty and measured nuisance variables available at prediction time. Coefficients are estimated from labeled training sessions; neither their values nor their signs can be honestly deduced from the manuscripts. Infer an unknown state only relative to explicit candidate outcomes, and abstain outside the calibration domain.

An example of a defensible output is “Switching is slower than your own matched reference, with increased error rate and prolonged EEG displacement; moderate confidence.” This example describes the format, not a result obtained here.

Useful distinctions the programme can test:

| Observations | Candidate interpretation to test |
|---|---|
| Stable task-reference distance and maintained performance | Task maintenance |
| EEG approaches rest, but omissions increase | Possible disengagement; not successful recovery within the task |
| New-task reference acquired and new-rule responses become correct | Successful switching |
| Displacement decreases but residue still grows | Instantaneous improvement while accumulated excess is still increasing |
| Repeat recovery probes settle at a shifted reference | Measured drift requiring performance/context checks |
| Contact, motion or flatline failures | Insufficient signal; no state conclusion |

For addressed writeability, add a separate rule-reversal/feedback task with delayed retention and context-specific retrieval. Immediate EEG recovery does not measure whether an update was retained. A trial-level learning model can estimate outcome-dependent update rates, but the latent “awareness gate” is not identifiable merely by renaming a fitted learning rate.

## 6. MRE and UHL: what transfers

MRE's bounded-response form suggests a link-function candidate, and its emphasis on independent behavioral calibration is useful. Its δ is alternation of a quantum-detector stream. A Mind Monitor file does not measure that stream, α0 or κ; an EEG-only program cannot test that coupling.

The earlier MRE has a general-chain inconsistency. With q0=P(1|0) and q1=P(0|1), the stationary p=q0/(q0+q1), and

\[
\delta=2[(1-p)q_0+pq_1]-1=\frac{4q_0q_1}{q_0+q_1}-1.
\]

The paper's q0+q1−1 agrees in the balanced symmetric case, not generally. A two-million-sample counterexample matched the corrected formula. The detailed audit is retained in the supplementary measurement-design file.

The latest IDA manuscript explicitly narrows the earlier UHL-style universal-transform claim: boundedness alone does not select artanh. Follow that corrected scope. Cross-domain recurrence and the identity N=R do not supply independent evidence that a Muse signal measures awareness.

## 7. The first experiment and the encyclopedia

Use fixed experimental schedules before adaptive scheduling:

1. **Calibration and signal checks:** matched eyes-open baseline; eyes-closed check as a separate physiological condition; marked blinks/jaw/movement to characterize confounds.
2. **Maintenance:** simple target detection with matched stimuli and objective omissions/false alarms/response times.
3. **Switching:** mixed blocks with repeat and switch trials using the same stimulus set and motor mapping where possible; counterbalance rules/cues.
4. **Recovery:** return to the same baseline task after a controlled challenge. Observe a fixed period, including unsuccessful returns.
5. **Retention extension:** delayed re-test of a learned/reversed rule to test retained updating separately from immediate performance.

Repeat across sessions/days. Separate calibration, model development and held-out evaluation. The manuscript's approximately 40 participants and 5/3/10-minute phases are illustrative research targets, not sample-size proof or a necessary personal-pilot configuration. Determine the definitive study size by effect-size/reliability estimates and a preregistered power analysis.

For each encyclopedia entry store task/version, demands, timing, reference context, input requirements, confounds, outcome definitions, feature and calibration versions, reliable effect range, uncertainty, null/failed results and generalization evidence. A task is useful when it reliably reduces uncertainty about an independent ability or outcome, not when it produces a large EEG change.

Later, select the next permitted task using expected information gain about the uncertain ability parameters, minus time/fatigue cost. Keep randomized reference trials and log selection probabilities. A residue gate is a hypothesis to compare against fixed/yoked schedules, not a rule whose benefit follows from its formula.

For any future adaptive progression, require valid signal, complete relevant history, acceptable performance, low residue, positive return at declared scales, and directly verified non-rising/falling residue at declared slower scales. Use hysteresis and dwell time. At present these are prospective decision rules; no stimulation or live adaptive controller was built or activated.

## 8. Mind Monitor implementation contract

One engine should support CSV replay and live event-aligned input. It needs a parser/acquisition adapter, quality layer, feature transform, frozen reference store, recovery engine, behavioral event store, predictor and auditable report.

The Mind Monitor developer documents Constant mode as 256 Hz raw and 10 Hz absolute powers for the setup discussed; inspect the actual recording before applying those rates. [Developer explanation](https://mind-monitor.com/forums0/viewtopic.php?t=1528). Full raw EEG enables the primary feature route. Sparse raw snapshots cannot reconstruct full-rate EEG; band-only files support a restricted slower analysis. A file without task markers or an event log can describe changes but cannot reliably identify which challenge was maintained or switched.

Possible live routes are phone Bluetooth acquisition with Mind Monitor OSC forwarding, or a supported direct Muse-to-computer Bluetooth library. Confirm Muse model and transport support first. Synchronize sample and experiment clocks and measure latency/jitter. Published Muse work supports particular ERP research paradigms, not general mental-state decoding. [Krigolson et al.](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00109/full).

## 9. The decisive test

Predict an independent future behavioral/recovery endpoint with:

1. task, time, past behavior and quality/motion;
2. the same plus static EEG features;
3. the same plus d, r, S, G, settling and drift features where available;
4. a matched-complexity temporal baseline using ordinary lags/moving averages of EEG.

The fourth comparison matters: residue is a deterministic function of the feature history. It adds no new information to that complete history mathematically; its claim is to be a useful, reliable summary/inductive bias. Compare it against other equally capable summaries.

Split by whole session/day, and by subject when claiming generalization. Use no future windows, no self-updating evaluation baseline, and no calibration/test overlap. Estimate uncertainty by session-aware resampling. Predeclare the minimum useful predictive gain and judge calibration as well as discrimination. EEG metrics that derive from the same spectrum are not independent votes for the theory.

Transfer entropy in IDA Gate 1 can assess conditional directional prediction but does not by itself prove causal influence; shared input and hidden drivers remain alternatives. Randomized perturbation and appropriate conditional controls are needed for a causal claim.

If recovery features fail the held-out comparisons, the measurement claim has failed for that implementation/domain. Do not rescue it by renaming the outcome, moving the reference, or choosing a new leak after seeing results.

## 10. Source coverage still outstanding

The core IDA paper and reference code are now available and audited; a representative Mind Monitor file and task-event log are not. Exact source mapping for all companion papers is also incomplete because full text was unavailable for several SSRN records. The following records were inspected at abstract/metadata level, not presented as full-text proof audits:

* [Lawful Coordinates in Bounded Science](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6963978): directly relevant coordinate-selection criteria.
* [Bounded Composition Forces Interior Existence](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6773218), [Bounded Reflection and Möbius Composition](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6767896), [Five Möbius Composition Laws](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6754362), [Bounded Compositional Geometry](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6800400): analytic background, no direct EEG observation model established by the records.
* [Universal Composition Law for Bounded Pharmacological Observables](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6739201), [Architectural Classification](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6761570), [Plant–Sensor–Controller–Surveillance](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6754360): domain-specific composition/control context.
* [Rapidity Coordinates for Bounded Belief](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6774878), [Precision-Gated Attractor Reversal](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6858922): cognitive hypotheses requiring independent identification.
* [Thresholded Adaptive Orchestration](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6779487): the closest companion to the interactive experiment programme.
* [Measurement Gap in Coercive Psychiatry](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6858838): motivation for measurement, not validation of a replacement EEG instrument.

Other Appendix C entries remain catalogue-level only. The remaining full texts would extend the source audit; they are not needed to expose the verified code discrepancies or implement the explicit read-side equations above.

**Ready now:** a concrete measurement specification and an audited set of corrections. **Not yet established:** EEG-to-ability validity, coefficient values, a unique true mental-state decoder, clinical interpretation, or adaptive-controller advantage.

## 11. Verification performed

The PDF's reference code was extracted and executed without algorithm changes. Numerical checks covered flatline confidence, constant-offset sensitivity, residue scaling, advance-during-residue-growth, warm-up behavior and the supplied demo. Separate checks passed for the proposed log-ratio chart's orthonormality and additivity under normalized multiplication, the exact constant-input residue solution, normalized/unnormalized residue equivalence, and 10,000 randomized checks of the ANDY distance-error bound. These establish mathematical/software properties only.

The accompanying `ida-distance-and-residue.png` is a synthetic illustration: a distance that falls exponentially after a perturbation can still produce rising normalized residue because current excess remains greater than its leaky historical average. It contains no participant data.
