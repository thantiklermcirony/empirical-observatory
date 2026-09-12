# IDA Lab — browser research foundation

A static, local-processing instrument for direct Muse EEG, model comparison, response tasks and WebXR. This is a working prototype, not a validated mental-state decoder.

## Run

Install Node.js 22 or later, then run `node tools/serve.mjs` from this directory. Open http://localhost:8770. Run checks with `node --test tests/*.test.mjs`.

Start **Synthetic sandbox**, wait for the signal window, collect the reference, then select an experiment. Synthetic EEG deliberately changes with task demand; this tests plumbing, not the biological hypothesis. For real acquisition select **Muse · direct Bluetooth**. Bluetooth requires a supported browser and a device chooser. Upstream muse-js supports Muse 1/2/S; hardware support in this build is unverified. Newer models need their own verification.

## GitHub Pages

Commit this directory as a new repository. Under Settings → Pages select GitHub Actions. The included workflow tests the core and publishes `web/` on pushes to `main` or manual dispatch. This deliverable has not been pushed or published.

Pages serves JavaScript and media; the user's browser runs analysis, storage and VR. No Python server, paid API or build step is required. Dependencies are pinned and vendored with licenses and hashes.

| Setup | Route |
|---|---|
| Computer with Bluetooth and supported PC VR browser/runtime | Direct Muse + WebXR in one page |
| Computer captures EEG; standalone headset renders VR | Experimental manual WebRTC pairing under Devices & VR link |
| Browser without Bluetooth | Use a compatible capture computer |
| Browser without immersive WebXR | Desktop preview; native headset adapter is future work |

The manual link has no STUN/TURN or signaling service. It is an experimental same-network route, not universal connectivity. It carries metrics and task messages, not raw EEG. Local video files must be loaded separately on the device playing them; the link does not stream video or synchronize two video players.

The video player supports flat and monoscopic equirectangular 360° files/URLs. The catalogue starts with the [7:13 real-footage journey](web/media/ida-real-world-journey-v2.mp4): surf, Niagara Falls, street traffic, the Hindenburg disaster, Ground Zero, Martin Luther King Jr. and the March on Washington, then surf. It uses original source audio and one-second audiovisual dissolves, with no added reading tasks. The King speech audio remains redacted in this archive edition. This is flat footage on a virtual cinema screen, not an immersive 360° recording. Read the [source credits and edit record](journey-credits.md), including the content description, before playback. The two earlier word/pattern pilots remain available for comparison but are superseded for this journey design. Large libraries should use a media host/CDN with CORS support. GitHub Pages has a 1 GB published-site limit and a soft 100 GB/month bandwidth limit. Stereo formats, DRM and adaptive bitrate streaming are future adapters.

## Measurement contract

Four channels → 4-second detrended Hann windows every 0.5 seconds → delta/theta/alpha/beta power → five candidate charts. Native alpha, rapidity, log odds, log-ratio composition and Poincaré distance are compared. Log odds and rapidity are equivalent up to scaling, not independent evidence.

For a frozen reference b and fitted distance D:

`d(t) = D(z(t), b)`; `e(t) = max(0, d(t) − delta)`.

`beta = ln(2)/half_life`; `r(t+dt) = exp(−beta*dt) r(t) + [1−exp(−beta*dt)] e(t+dt)`.

This normalized residue is r=beta*R for the manuscript's unnormalized R. The update assumes excess is constant over each step. `S_tau = [d(t−tau)−d(t)]/tau` measures return; `G_tau = [r(t)−r(t−tau)]/tau` measures residue trend. Positive S is return, positive G is accumulation. 5/15/30-second histories must exist; missing history is null. Gaps reset a labelled segment and warm-up; the reset is not evidence of recovery.

The prototype covariance uses shrinkage and within-calibration tolerance. Calibration windows overlap. Neither the quantile nor threshold is a validated population cut-off. The Poincaré reference is an interior arithmetic mean, not a fitted Fréchet mean. Its geometry and scaling are hypotheses.

Current artifact checks detect flatline, large amplitude and packet/timing discontinuity. They do not reliably separate eye, jaw, muscle, movement or VR contact artifacts from brain activity. No inference of fear, tranquillity, illness or personal psychological stability is made.

## Experiments and records

Two target-response prototypes cover maintenance, rule switching and recovery. The fixed policy supports comparisons; the optional residue-gated policy is an unvalidated difficulty controller. Seeds, parameters, reference, raw samples, features, phase changes, trials, response times and presentation callbacks are stored in IndexedDB. Export runs from Session archive; browser storage can be cleared or exhausted.

Reaction time uses the presenting browser's clock. Frame callbacks are not photon measurements; Bluetooth timestamps are reconstructed upstream. Exact event-related potentials need separately measured timing. Historic raw CSV retains gaps and explicitly reconstructs equal-timestamp groups; new live challenges are disabled during replay.

Passive observation video playback is implemented, with media-clock scene logging when launched from the catalogue during acquisition. The real-footage journey contains no in-film rating prompts; collect subjective ratings afterwards. The earlier pilots use keyboard ratings. Fifteen core/streaming/cue tests pass, including overlapping scene transitions. See [journey-verification.json](journey-verification.json) for the real-footage media checks. Browser/hardware integration and emotional effects remain unverified. The earlier [stimulus protocol](stimulus-protocol.md) concerns the superseded word/pattern pilots. [affect-protocols.md](affect-protocols.md) describes the broader future design. Automatic selection of the best next experiment, adaptive calming, cross-session learning, clinical validation and a correlation explorer remain future work.

## Code map

`web/core.js`: equations/QC/packets. `engine.worker.js`: streaming features and reference. `app.js`: run orchestration and task timing. `vr.js`: Three.js/WebXR and video. `archive.js`: local recording. `bridge.js`: manual WebRTC. `experiments.json`: supported task templates. `tests/`: numerical and ingestion regression checks.

## Sources

- [IDA paper supplied by the author](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6987278)
- [muse-js source and supported devices](https://github.com/urish/muse-js)
- [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [WebXR](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
