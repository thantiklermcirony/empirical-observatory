# Controlled affect assessment and adaptive return training

Design extension, not yet a runnable protocol. The existing runner supports target tasks and manually selected videos.

## Two different questions

Assessment: how does this person's signal, experience and task performance change following a known input? Use a fixed, versioned protocol with randomized/counterbalanced stimulus order inside a participant-approved intensity envelope. Training: which permitted input improves this person's reported calm while preserving alertness and ability to respond? Use an adaptive policy, evaluated separately from assessment.

A monotonic pleasant-to-threatening sequence confounds valence with time, fatigue, anticipation, surprise and habituation. Use a gentle familiarization, then controlled blocks with neutral comparison blocks and recovery intervals. Do not treat bigger reactions as worse stability or little reaction as calm. Subjective distress, arousal, pleasantness and sleepiness are separate ratings.

## Stimulus contract

Every item needs ID/version, media hash/license, modality, language, duration, word length/frequency where relevant, luminance/contrast, audio level, expected valence/arousal, participant category permissions, presentation timestamp and missing-data flag. Normative ratings are hypotheses for an individual, not ground truth.

Emotionally weighted words can include mortality, sexuality, profanity and threat categories, with participant-selected exclusions. A reaction to “death”, for example, can reflect familiarity, surprise, personal relevance or reading difficulty. It cannot identify beliefs, sexual preferences, intent or dangerousness. Compare categories across multiple matched items and repetitions; never infer a trait from one word.

Initial implementation should use neutral/pleasant words, mild imagery and ordinary music. Graphic violence and extreme fear induction are outside the initial public prototype. A separate reviewed research protocol would be needed before adding such exposures. Participant control, previewable categories, a persistent stop action and discomfort reporting are part of the experiment design. No controller may override a stop or escalate beyond the chosen ceiling to obtain a stronger signal.

## Trial-level equations

Keep the IDA core d/e/r/S/G fixed within each run. For trial j and chart m, define a pre-stimulus window B_j and a non-overlapping post-stimulus window P_j. Four-second feature windows must lie wholly inside their declared epoch; do not label mixed pre/post windows as instantaneous responses.

`reactivity[j,m] = mean(d_m over P_j) − mean(d_m over B_j)`

`burden[j,m] = integral over P_j of max(0, d_m(t) − delta_m) dt`

`recovery_time[j,m] = first post-stimulus time at which d_m <= delta_m continuously for a preregistered dwell interval`

If recovery never occurs before the trial ends, store right-censoring, not a fabricated duration. A threshold crossing alone is not return of psychological well-being. Store valid-data coverage; omit trials below the predefined coverage threshold.

`category_effect[m] = mean(reactivity[m] | category) − mean(reactivity[m] | matched neutral)`

Estimate uncertainty at participant/session/trial level, not by treating overlapping windows as independent people. Fit models on training sessions, lock dials, and evaluate on held-out sessions and unseen stimuli. Compare against native coordinates, behavior-only baselines, time/motion covariates and label-shuffled controls that preserve block structure. Several algebraically equivalent charts do not constitute convergent independent evidence.

Keep an outcome vector: [EEG reactivity, integrated excess, recovery time, accuracy, reaction time, subjective arousal, pleasantness, calm, sleepiness, discomfort]. This is more informative than one supposedly universal stability score.

## Adaptive training

Use neutral or personally preferred scenes, music, text and pacing as actions. First collect randomized permitted action blocks with ratings. A proposed objective is:

`reward = wC * change_in_reported_calm − wD * discomfort − wL * loss_of_alertness`

Weights, scales and observation horizons are declared before evaluation. EEG d/r/S/G initially provide context and exploratory predictors, not the reward truth. Fit a model predicting the outcome of each permitted action, then select a conservative action from that set. If quality is poor or uncertainty is high, hold a neutral scene or ask for a rating; do not amplify stimulation. Switch actions only after a declared observation interval, because delayed and overlapping responses make frame-by-frame optimization uninterpretable.

Test the adaptive policy against fixed preferred content, neutral rest and replayed/yoked action sequences. Evaluate transfer to later sessions and simple tasks without feedback. Improvement confined to the feedback score may be measurement exploitation rather than useful learning.

## Encyclopedia growth

Each protocol record accumulates completed, stopped and null-result sessions; data quality; test/retest reliability; held-out predictive accuracy; uncertainty; population/language scope; and evidence status. The next experiment should reduce uncertainty between competing models while respecting the participant's permitted inputs. This is a future selection policy, not something established by the current prototype.

The NIMH RDoC framework separately represents physiology, behavior and self-report, including distinct arousal and threat constructs: https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc/constructs/rdoc-matrix . This supports collecting multiple measurement types; it does not validate these proposed IDA equations or protocols.
