# Two-family world 0.1

11 September 2026. An executable prototype for Daniel J. Murray's proposal: two families, bounded adaptive state, an invented operational language, a world encyclopedia, and experience that changes the learners themselves.

**The software works; the proposed intelligence advantage has not been established.** The frozen 12-seed comparison found useful nonlinear transition prediction, but neither learned controller beat random action on mean physical deficit. Complexity-dependent relationship attention did not show a consistent benefit. These failures are retained.

## Run the world

Extract `Two_Family_World_0.1.zip` and open `Open_world.html` in a modern browser. The browser view contains its dependencies and makes no AI/API requests. Click **Run world** or **10 steps**, select an agent, inspect its word rings and codebook, and use **Ask … about its world**. The report comes from recorded observations rather than free-form generated assertions.

Worlds save on the current device at pauses and periodic checkpoints. **Export world** makes a resumable JSON file, including random streams, learned weights, vocabulary, relationship records, and recent journals. **Resume an exported world** loads it. Browser storage can be cleared or unavailable; exported checkpoints are the portable record. Closing the browser stops computation. This version does not run continually in the background.

The Observatory integration is the `/families` route. A saved source version is distinct from a public deployment. The downloadable standalone version runs without publishing the Observatory change.

For the numerical experiments, use Node 24 (or Node 22.13+ with TypeScript stripping) in the extracted project root:

```sh
node --experimental-strip-types --test tests/family-world.test.ts tests/family-language.test.ts
node --experimental-strip-types scripts/family-world-research.ts
```

No npm packages are needed for these two commands. The source UI uses the Observatory's existing React/Base UI dependencies; rebuilding the offline view uses `node scripts/package-family-world.mjs` in the full Observatory checkout. The standalone HTML already includes that build. Third-party browser dependencies retain their own licenses; see `THIRD_PARTY.md` and `LICENSE` in the package.

## What is actually implemented

| Component | Operational meaning |
|---|---|
| Two families | Aster and Birch begin with two founders and one novice each. They share household materials and structures. Roles have no innate cognitive privilege. |
| Learning | Separate trainable networks predict immediate effects and utility. The default is 34 inputs and four sigmoid outputs: **140 parameters per agent**. The comparison stack is 34→20→12→4: **1,004 parameters**. Neither is pretrained. |
| Bounded world | Nutrition, hydration, energy, materials and resource availability are normalized. Agents can forage, drink, rest, gather, build, plant, study, help, teach, and welcome. |
| Construction and growth | Agents choose among authored actions. Each household can build up to five shelters and five gardens, then welcome one additional learner when provisioned. The novice starts with a fresh network. This is not invention of new physical laws. |
| Care | Helping has a real nutrition cost to the donor. The transfer conserves the pair's nutrition sum. Care, construction, learning and growth incentives are explicitly supplied. Learned attachment is not assumed. |
| Experience | Each agent retains 256 transition examples, 256 observed journal records, 32 sequence entries, slow state filters, per-verb codes and relationship records. Old detail is discarded; cumulative counts are not a complete historical transcript. |
| Reading | Ten authored noun–verb packets form a miniature encyclopedia. Import accepts at most 200 packets in the finite action grammar. Text stays a hypothesis; it cannot execute or acquire factual authority by declaring itself verified. This is not an imported full encyclopedia or general text comprehension. |
| Language | Agents coin labels when they encounter given world referents/affordances. Each selects from six supplied subject/verb/object orders using an empirical bigram coding score. Actual actions are encoded and decoded in the coined language. |
| Communication | Teaching can pass one observed neural training example, a reading packet, and a grounded language demonstration. Unknown foreign words are rejected until grounded. |
| World ownership | Identity, learned parameters, dialect, memories, construction and records persist together in an exactly resumable checkpoint. First-person reports state their observation time, retained evidence and unknowns. |

## The mathematics used

With a normalized need \(s\in(0,1)\), put \(x=2s-1\). A log-odds increment \(d\) has two equivalent representations:

\[
s'=\sigma(\operatorname{logit}s+d),\qquad
x'=\frac{x+u}{1+xu},\qquad u=\tanh(d/2).
\]

For \(|x|,|u|<1\), the exact Möbius map remains inside \((-1,1)\). Its additive coordinate is \(\operatorname{artanh}x\). Floating-point guards keep numerical states away from endpoints. Choosing boundary-fixing projective translations is an additional assumption; boundedness and associativity alone do not select this ruler. The programme's [UHL assumptions audit](https://empirical-observatory.madmanmuzza.chatgpt.site/research/question-papers/Foundations.md) states the selector explicitly.

For observed need-bin/action frequencies \(p_k\), the implemented repertoire proxy is

\[
C=\exp\!\left(-\sum_k p_k\ln p_k\right),\qquad
A(C)=\frac{1}{1+(C-1)/16},\qquad
w_{ij}=A(C)\frac{b_{ij}}{\sum_k b_{ik}}.
\]

The last expression is zero when no relationship is recorded. Here \(b_{ij}\) is an attribution record formed after observed help; it is not a measured emotion. At fixed records, \(A'(C)<0\), and allocated weights sum to \(A(C)\) when records exist. This implements the user's proposal that relationships take less immediate weight as experienced complexity increases. The records themselves remain stored. It is an **authored allocation rule**, not a proven conservation law, and it need not improve behaviour. The frequency-based repertoire can decrease when behaviour becomes repetitive; it is not a count of formally certified predictive states.

Each per-verb bounded code accumulates utility using

\[
q_v' = q_v\oplus\tanh(0.2r),\qquad a\oplus b=(a+b)/(1+ab).
\]

Scalar translations commute. Thus this scalar alone cannot retain the order of independent increments. The explicit ring holds a sequence, and the learner also receives a last-verb feature; no predictive-sufficiency theorem has been proved for this representation. The rings visualize coined words in recent event order, not a discovered semantic geometry.

The policy is a one-step planner, not a long-horizon reinforcement learner. It revalues predicted physical effects using the current deficit \(D(s)=\frac13\sum_i\max(0,0.8-s_i)^2\), plus 0.15 times the estimated designed utility. Online SGD fits soft normalized utility/effect targets. Four updates occur per experienced transition, including three replay samples. These outputs are not calibrated probabilities.

The world has exogenous resource replenishment and abstract state variables. It is not a mass/energy model of biology. Sustained drought can exceed the resources required for long-term maintenance; recovery and scarcity scheduling remain unresolved controller problems.

## Inventing a language: what passed and what did not get tested

Coined tokens acquire meaning through an explicit world-affordance demonstration. A receiving agent must learn a binding before understanding it. Every executable message has three roles, an agent-chosen order, and a dialect identifier; the world validates actor, verb and object before applying its authored dynamics. A reading packet cannot create that grounding witness.

The language check uses three demonstrations and three unseen subject/action compositions. An independent listener decoded all three correctly after grounding, and rejected an unknown message before grounding. The dictionary also passed a 512-word collision check. Grammar search passed a separate test showing that it can choose a lower-cost order from the supplied alternatives.

These are finite symbolic protocol checks. The three semantic roles, six grammar candidates, world referents, coinage mechanism, interpreter and learning rules are supplied by us. The compression score is an in-sample bigram surrogate, excluding a full learned-model transmission cost. This does not establish spontaneous human language, open-ended grammar induction, self-awareness or a new universal architecture.

## Frozen comparison

Development used seeds 101–103. Evaluation used 1001–1012 only after the implementation choices were fixed. The results contain source/protocol SHA-256 hashes, every seed, and 10,000-resample paired bootstrap intervals. This was a locally frozen protocol, not an external preregistration. See [PROTOCOL.md](PROTOCOL.md) and [evaluation.json](results/evaluation.json).

| Measure (lower is better) | Mean | 95% seed-bootstrap interval |
|---|---:|---:|
| Transition MSE — initial stack | 0.018594 | [0.017857, 0.019379] |
| Transition MSE — constant | 0.010263 | [0.010085, 0.010465] |
| Transition MSE — trained linear sigmoid | 0.011424 | [0.010725, 0.012225] |
| Transition MSE — trained stack | 0.005906 | [0.005652, 0.006157] |
| Physical deficit — random policy | 0.059634 | [0.052652, 0.065778] |
| Physical deficit — 140-parameter policy | 0.066649 | [0.044424, 0.091567] |
| Physical deficit — 1,004-parameter policy | 0.127379 | [0.101013, 0.151252] |
| Physical deficit — need-first heuristic | 0.230481 | [0.228196, 0.234050] |
| Physical deficit — fixed attention stack | 0.122004 | [0.095271, 0.148609] |

The trained stack reduced transition MSE by **42.5%** against the training-set constant. Nevertheless, the stack’s mean physical deficit was worse than random, with paired excess **0.067745**, interval [0.042480, 0.090574]. The smaller policy also failed to beat random on the mean. Its better control score than the stack does not establish greater general predictive capacity: its transition prediction was worse.

Adaptive minus fixed relationship attention had deficit difference **0.005375**, interval [-0.008333, 0.019867]. The interval includes zero: **no consistent benefit was demonstrated**.

In the separate partner test, Brier error was **0.126650** with identity and **0.248198** after pooling histories. For equally reliable partners, the paired difference was 0.000569, interval [-0.000181, 0.001443], compatible with no benefit.

The smaller network uses **86.1% fewer parameters** and 136 versus 968 matrix multiply-adds per prediction. These are operation counts, not measured latency, total memory, power, dollars, or equivalent performance on general AI tasks. Journals, replay and dictionaries consume additional memory.

The partner-memory task is **separate from the neural household world**. It uses a standard Beta predictor with 160 observations of differently reliable partners and 400 held-out outcomes. The equal-reliability condition is the negative control. Its result demonstrates the usefulness of partner identity under constructed history dependence, not emotional attachment in the households. Costly requests follow a supplied expected-utility threshold.

## Development failures and next scientific obligation

The initial direct utility predictor learned effects but chose actions that transferred badly. A verb-selection bug in the experimental design also gave social actions too many opportunities during random exploration; this was corrected by choosing a verb before its recipient. Nutrition sharing was made conservative, viable exploration costs were specified, and control transfer was evaluated from fresh physical worlds. The policy was then changed to revalue predicted physical effects under current needs. Logs from development revisions 1–4 are retained under `results/`; they describe different development variants and are not evaluation replicates.

The demonstration starts productively, constructs households and welcomes novices. Later it can neglect hydration and collapse into repetitive behaviour. The complete 1,000-step trace keeps this failure visible. No successful long-term autonomy is claimed.

The next substantive obligation is an agent that maintains its world under a matched resource budget and transfers to unseen conditions more reliably than random and strong resource-aware baselines. A larger vocabulary, extra geometry or a smaller parameter count will not count as that result. Memory sufficiency, recovery from near-boundary states, long-horizon planning, unsupervised word grounding, and economically relevant task performance remain open.

## Verification and intellectual context

The numerical/language checks include finite-difference verification of backpropagation, strict boundedness, real learning and parameter freezing, exact save/resume continuity, conservative help, teaching and newcomer learning, unknown-word rejection, conflicting-binding rejection, temporal-order loss in scalar Möbius accumulation, and packet/command separation. The full Observatory numerical suite passed 108 checks at this implementation stage. Type checking passed. Browser interaction/visual QA was not requested or performed; compilation and numerical tests do not substitute for it.

The build draws on established ideas: [homeostatic reinforcement learning](https://elifesciences.org/articles/04811), learned [world models](https://arxiv.org/abs/1803.10122), and the distinction between authored environments and genuinely open-ended environment generation illustrated by [POET](https://arxiv.org/abs/1901.01753). It also follows the proposal/evidence/control separation in Murray's reviewed *Epistemic Type Safety for Generative AI* paper. This implementation is a small working investigation of the user's synthesis, not a priority claim over these mechanisms.

No evidence here proves felt emotion, consciousness, universal minimality, general AI superiority, or disruption of the AI economy.
