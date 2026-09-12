# Question Desk — runner contract

The desk translates a question into a **reviewed mathematical interpretation**, computes under that interpretation and records each answer and next question. The browser and `/api/question` use the same versioned runner (`question-desk-2`).

## What runs now

| Adapter | Existing implementation | Question transformation | Stop |
|---|---|---|---|
| UHL / alignment | `lib/engine/tao.ts: flow` | constant slope → bounded trajectory → log-odds coordinate → composition check | Three checks; conditional identity |
| TAO | `lib/engine/tao.ts: simulate` | controller claim → four-controller comparison → repeated, stale, switching stress | Four checks; equal-gain fixture comparison |
| Quantum | `lib/engine/quantum.ts` | state guess → expected information gain → simulated measurement → posterior → next measurement | Posterior ≥99%, zero useful information, or six passes |
| Time / repair | `lib/engine/temporal-state.ts: simulatePiecewiseRateSnt` | equal totals → different histories → retained burden → repair-time sensitivity | Three checks; conditional model result |

These are numerical demonstrations and known mathematical methods. The four adapters do not establish a universal scientific law or a general problem-solving AI. The free-text recogniser uses a small vocabulary. It does not parse arbitrary grammar, import numeric statements, retrieve scientific literature or establish that a model applies to a real organism. The selected model and example parameters must be reviewed before execution. Unrecognised questions receive a gap rather than an invented answer.

The room is a generated 1980s illustration. Camera movement, instrument indicators and printing are presentation. Every printed answer and exported chart uses a completed computation. A short WebM export replays result graphics; it is not generated footage of a real experiment. Exported SVGs and JSON preserve model identity and scope. WebM requires browser MediaRecorder support.

## Agent interface

GET `/api/question` returns available models, assumptions, ranges and request schema. POST JSON:

```json
{"prompt":"Why does a bounded state respond differently to repeated pushes?","model":"uhl","parameter":0.25,"confirmed":true,"maxPasses":6}
```

The endpoint returns the full original question, selected mathematical interpretation, example parameter, matched entities/actions, passes, numerical values, chart data, evidence descriptions, next questions and stop reason. It never executes submitted code or URLs. Requests are limited to 8 KB, questions to 2,000 characters and runs to six passes. Bounds are validated before any numerical adapter runs. There is no external API key or connected language model. An external AI agent can call this HTTP contract as a tool; natural-language model selection remains its proposal and must preserve the reviewed assumptions.

`confirmed: true` means the caller has accepted this *simulation contract*, not that a user has established the physical premises. A keyword hit cannot provide confirmation. A prompt with no recognised connection to the selected adapter stops without running. A vocabulary match still does not parse its grammar: `effectiveQuestion` states exactly what will be computed; `originalQuestionStatus: not-established` and `originalQuestionGap` preserve the unanswered original wording. This explicit distinction applies before execution, in the result, and in exports.

The public endpoint is stateless and intentionally inexpensive. It has no per-user metering, background worker or unbounded recursion. Platform protection may apply; large-scale unattended agent use needs explicit rate limits and quotas before deployment at that scale. Questions are processed by the site server, not saved to an application database. Infrastructure request logs are outside this application-level guarantee.

## How a new model joins

1. Define entities, allowed operations, units, observations, uncertainty and a measurable question.
2. State the mathematical class and premises. A shared noun or curve shape is insufficient.
3. Supply a bounded, validated adapter, a conventional baseline and an independent reference check.
4. Return typed chart data and a conditional result, plus a next question whose action is actually available.
5. Stop on missing data, non-identifiability, no information gain or exhausted budget. Never promote repeated reformulations into independent evidence.
6. Register provenance and limits. Human review admits a new adapter or changes the runner; it does not rewrite itself during an investigation.

The existing Atlas, Human, Recovery, Virtual Cell, Active Context and expedition rooms remain specialist handoffs. Their sources and archived records are linked; this release does not execute every model in those rooms or merge their incompatible units into a universal simulator.

## Archive radio

The optional radio plays the audio of NASA Kennedy's STS-1 launch recording: the first shuttle launch on 12 April 1981. The source video was published in 2011 and is hosted by Wikimedia; it is a historical recording, not a live or continuous 1981 broadcast. Playback is user-initiated with native pause/volume controls. No recording is bundled in the Site.

- [NASA mission record](https://www.nasa.gov/mission/sts-1/)
- [Recording, authorship and public-domain notice](https://commons.wikimedia.org/wiki/File:STS-1_Launch_6qMPLydUbuM.webm)

The archival audio is educational atmosphere and implies no NASA endorsement. The illustrative E.T. poster is a period reference, not a project affiliation.

## Reproduction

Run `pnpm test`, including the question and paper-check suites. The checks cover stop conditions, validation, exact-flow composition, temporal solver agreement, controller comparisons, noisy-instrument failure, manual/automatic replay equivalence and escaped SVG output. Run the standard type, lint and build checks before publishing a change.

## Paper challenge bench — 11 September 2026

Open [/question/papers](/question/papers) or **Test the programme’s papers** in the room. Ten selected questions have manuscript-level source locations, assumptions, expected answers, decisive visuals and failure conditions. Six compute finite witnesses: UHL selector non-uniqueness, predictive quotient, state-law descent, jurisdiction refinement, deterministic action-code cover and factual storage counting. Four display documented input gaps: hormesis peak reproduction, IDA held-out prediction, fairly tuned TAO comparison and response-coefficient phenotype prediction.

The finite solvers receive declared numerical inputs, not the expected-answer prose. A separate test oracle exhausts all 512 Boolean 3-state/3-action instances by enumerating code assignments, independently of the solver’s action-cover enumeration. The source extracts and detailed audit are available under `/research/question-papers/`. This is a bounded corpus audit, not a proof or priority review of all programme papers. Classical identities and prospective empirical claims remain distinguished. The input-gap cards are authored evidence requirements, not automated literature retrieval or data ingestion.

TAO now accepts structured `objective: "tracking"` (minimum MAE) or `"effort"` (minimum integrated absolute actuation subject to MAE < 0.05). Each disturbance is judged separately. The initial plot includes the shared target; later plots show the accuracy–effort trade-off. This remains an equal-gain synthetic comparison. The fixed threshold is not extracted from prompt text.

Charts and exported graphics share their scale calculation. Quantum probabilities use [0,1], repair burden uses [0,100] across both time constants, and each repair sensitivity frame prints its actual time constant. The SVG and clip label the computed question, preserving the original wording as unverified provenance.

Current acceptance: 87 automated tests pass; this includes the 512-instance action-cover oracle. Independent follow-up covers additional exhaustive finite fixtures and adversarial questions. These checks establish implementation behaviour and selected conditional witnesses, not new empirical discoveries or a general question-answering engine.
