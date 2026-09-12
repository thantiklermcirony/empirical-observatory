import {
  flow,
  simulate,
  CONTROLLERS,
  STRESSES,
  CONTROLLER_LABELS,
} from './tao.ts';
import {
  probability,
  measure,
  updatePrior,
  suggestBasis,
  entropy,
  STATES,
} from './quantum.ts';
import { simulatePiecewiseRateSnt } from './temporal-state.ts';

export type ModelId = 'uhl' | 'tao' | 'quantum' | 'time';
export type Term = {
  words: string;
  role: 'entity' | 'action';
  symbol: string;
  meaning: string;
};
export type Model = {
  id: ModelId;
  name: string;
  family: string;
  why: string;
  equation: string;
  question: string;
  premises: string[];
  limit: string;
  href: string;
  terms: Term[];
  parameter: {
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
    value: number;
  };
};
export const MODELS: Model[] = [
  {
    id: 'uhl',
    name: 'UHL · bounded composition',
    family: 'One-dimensional flow / change of coordinates',
    why: 'A bounded scalar and repeatable alignment operation admit a log-odds coordinate. Selecting this flow is an additional assumption.',
    equation: 'x(t) = logistic(logit(x₀) + t)',
    question:
      'Why does repeating the same push stop producing the same change in a bounded state?',
    premises: [
      'One scalar state lies strictly between 0 and 1.',
      'The admitted action is alignment: dx/dt = x(1−x).',
      'Drive is additive and dimensionless; it is not automatically physical time.',
    ],
    limit:
      'This checks a chosen flow and its coordinates. Boundedness alone does not select this equation or establish a law of nature.',
    href: '/atlas',
    parameter: {
      label: 'Starting state',
      unit: 'normalised fraction',
      min: 0.05,
      max: 0.95,
      step: 0.05,
      value: 0.25,
    },
    terms: [
      {
        words: 'state|bounded|capacity|reserve|limit',
        role: 'entity',
        symbol: 'x ∈ (0,1)',
        meaning: 'A normalised scalar, with declared upper and lower bounds.',
      },
      {
        words:
          'push|repeat|repeating|compose|composition|change|uhl|hyperbolic',
        role: 'action',
        symbol: 'Φₜ(x)',
        meaning:
          'Apply the chosen alignment flow; do not assume any verb has this law.',
      },
    ],
  },
  {
    id: 'tao',
    name: 'TAO · feedback control',
    family: 'Controlled dynamical system',
    why: 'A measured reserve, target and feedback action can be tested in the existing simulated plant, with common observations and action limits.',
    equation: 'observation → controller → bounded plant → observation',
    question:
      'Does TAO recover a shocked reactor more accurately than conventional feedback?',
    premises: [
      'Use the Observatory synthetic reactor, not a physical reactor.',
      'Compare four controllers at the same gain, seed and action limits.',
      'Judge tracking error and effort separately; this run does not tune either method.',
    ],
    limit:
      'An equal-gain fixture comparison is not an optimally tuned benchmark or evidence of superiority in biology or hardware.',
    href: '/#tao',
    parameter: {
      label: 'Feedback gain',
      unit: 'fixture gain',
      min: 1,
      max: 18,
      step: 1,
      value: 4,
    },
    terms: [
      {
        words:
          'reactor|reserve|system|target|feedback|tao|controller|actuator|effort',
        role: 'entity',
        symbol: 'x, x*, m',
        meaning: 'Plant reserve, desired reserve and retained plant memory.',
      },
      {
        words: 'recover|recovers|control|restore|shock|shocked|track|tracking',
        role: 'action',
        symbol: 'u(t) ∈ [−1,1]',
        meaning:
          'Apply feedback with the same actuation limits to each candidate.',
      },
    ],
  },
  {
    id: 'quantum',
    name: 'Quantum · choose a measurement',
    family: 'Bayesian experimental design',
    why: 'Candidate states can look identical under one measurement. Choose the next basis by expected information gain, then update using a simulated count.',
    equation: 'P(state | count, basis) ∝ P(count | state, basis) P(state)',
    question:
      'Which measurement distinguishes quantum states that look identical from one angle?',
    premises: [
      'The true simulated state is one of six named qubit states.',
      'The planner starts with a uniform prior and knows the depolarising-noise model.',
      'Each measurement contains eight simulated shots; no quantum hardware is connected.',
    ],
    limit:
      'Posterior concentration is conditional on this six-state model. It neither proves a unique arbitrary quantum state nor explains consciousness.',
    href: '/#quantum',
    parameter: {
      label: 'Measurement noise',
      unit: 'depolarising fraction',
      min: 0,
      max: 1,
      step: 0.05,
      value: 0.15,
    },
    terms: [
      {
        words: 'quantum|qubit|states|state|uncertainty',
        role: 'entity',
        symbol: 'P(s)',
        meaning:
          'Probabilities over six specified candidate states, not every possible state.',
      },
      {
        words: 'measure|measurement|distinguish|observe|angle|learn',
        role: 'action',
        symbol: 'b ∈ {X,Y,Z}',
        meaning:
          'Choose the measurement basis that maximises expected information gain.',
      },
    ],
  },
  {
    id: 'time',
    name: 'Time · exposure and repair',
    family: 'Stateful exposure / differential equation',
    why: 'A total dose discards its ordering in time. An explicit repair state can distinguish schedules with the same total input.',
    equation: 'dU/dt = r(t) − U/τ',
    question:
      'Can the same total exposure leave different residual damage when repair has time to act?',
    premises: [
      'Use model dose units and model days; these are illustrative schedules.',
      'Repair is exponential with a fixed time constant τ.',
      'Only residual undone damage is compared; no clinical risk or personal advice is computed.',
    ],
    limit:
      'The calculation shows the consequences of the assumed repair law. It does not estimate a person’s damage, hormetic benefit or lifespan.',
    href: '/human',
    parameter: {
      label: 'Repair time constant',
      unit: 'model days',
      min: 0.1,
      max: 5,
      step: 0.1,
      value: 0.5,
    },
    terms: [
      {
        words: 'exposure|dose|damage|repair|history|time',
        role: 'entity',
        symbol: 'r(t), U(t), τ',
        meaning:
          'Input rate, residual burden and repair time, with separate units.',
      },
      {
        words: 'repair|recovers|recover|accumulate|forget|act|leave',
        role: 'action',
        symbol: 'dU/dt',
        meaning: 'Accumulate new input while the retained burden decays.',
      },
    ],
  },
];
export type Point = { x: number; y: number };
export type Series = { label: string; points: Point[] };
export type Frame = {
  yDomain?: [number, number];
  kind?: 'line' | 'bars' | 'scatter';
  threshold?: number;
  title: string;
  xLabel: string;
  yLabel: string;
  series: Series[];
  explanation: string;
};
export type Pass = {
  question: string;
  operation: string;
  answer: string;
  evidence: string;
  next: string | null;
  frame: Frame;
  values: Record<string, number | string>;
  posterior?: number[];
};
export type Request = {
  objective?: 'tracking' | 'effort';
  prompt: string;
  model?: ModelId;
  parameter?: number;
  maxPasses?: number;
  confirmed?: boolean;
};
export type Investigation = {
  version: 'question-desk-2';
  effectiveQuestion: string;
  originalQuestionStatus: 'not-established';
  originalQuestionGap: string;
  objective: 'tracking' | 'effort';
  prompt: string;
  model: ModelId | null;
  parameter: number | null;
  maxPasses: number;
  confirmed: boolean;
  mapping: Term[];
  candidates: ModelId[];
  status: 'ready' | 'running' | 'conclusion' | 'gap' | 'budget';
  reason: string;
  passes: Pass[];
};
const modelFor = (id: ModelId) => MODELS.find((m) => m.id === id)!;
const fmt = (n: number) => Number(n.toPrecision(5)).toString();
const bar = (
  title: string,
  labels: string[],
  values: number[],
  yLabel: string,
  explanation: string,
): Frame => ({
  kind: 'bars',
  title,
  xLabel: labels.join(' / '),
  yLabel,
  series: labels.map((label, i) => ({
    label,
    points: [{ x: i, y: values[i] }],
  })),
  explanation,
});
export function parseRequest(raw: unknown): Request {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Send a question object.');
  const r = raw as Record<string, unknown>;
  if (
    r.objective !== undefined &&
    !['tracking', 'effort'].includes(r.objective as string)
  )
    throw new Error('Choose tracking or effort as the objective.');
  if (r.objective === 'effort' && r.model !== 'tao')
    throw new Error('The effort objective requires the TAO adapter.');
  if (
    typeof r.prompt !== 'string' ||
    !r.prompt.trim() ||
    r.prompt.length > 2000
  )
    throw new Error('Enter a question of 1–2,000 characters.');
  if (r.model !== undefined && !MODELS.some((m) => m.id === r.model))
    throw new Error('Choose a registered model.');
  if (r.confirmed !== undefined && typeof r.confirmed !== 'boolean')
    throw new Error('confirmed must be true or false.');
  if (
    r.maxPasses !== undefined &&
    (typeof r.maxPasses !== 'number' ||
      !Number.isInteger(r.maxPasses) ||
      r.maxPasses < 1 ||
      r.maxPasses > 6)
  )
    throw new Error('Pass budget must be an integer from 1 to 6.');
  if (
    r.parameter !== undefined &&
    (typeof r.parameter !== 'number' || !Number.isFinite(r.parameter))
  )
    throw new Error('The parameter must be a finite number.');
  if (r.parameter !== undefined && !r.model)
    throw new Error('A parameter requires an explicit model.');
  if (r.model && r.parameter !== undefined) {
    const p = modelFor(r.model as ModelId).parameter;
    if ((r.parameter as number) < p.min || (r.parameter as number) > p.max)
      throw new Error(`${p.label} must be between ${p.min} and ${p.max}.`);
  }
  return {
    objective: r.objective as 'tracking' | 'effort' | undefined,
    prompt: r.prompt.trim(),
    model: r.model as ModelId | undefined,
    parameter: r.parameter as number | undefined,
    maxPasses: r.maxPasses as number | undefined,
    confirmed: r.confirmed === true,
  };
}
export function beginInvestigation(input: unknown): Investigation {
  const req = parseRequest(input);
  const scored = MODELS.map((m) => ({
    m,
    score: m.terms.reduce(
      (n, t) =>
        n + (new RegExp(`\\b(${t.words})\\b`, 'i').test(req.prompt) ? 1 : 0),
      0,
    ),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  // Vocabulary proposes candidates. Only a reviewed contract authorises a numerical interpretation.
  const id =
    req.model ??
    (scored.length && (scored.length === 1 || scored[0].score > scored[1].score)
      ? scored[0].m.id
      : null);
  const m = id ? modelFor(id) : null;
  const approved = Boolean(req.confirmed && req.model);
  const objective = req.objective ?? 'tracking';
  const hasMatch = Boolean(m && scored.some((s) => s.m.id === m.id));
  const effectiveQuestion = m
    ? (m.id === 'tao'
        ? objective === 'effort'
          ? 'Which controller uses the least effort while mean absolute error stays below 0.05 in each fixed disturbance?'
          : 'Which controller has the lowest mean absolute tracking error in each fixed disturbance?'
        : m.question) +
      ` ${m.parameter.label}: ${req.parameter ?? m.parameter.value} ${m.parameter.unit}.`
    : 'No executable interpretation selected.';
  return {
    version: 'question-desk-2',
    effectiveQuestion,
    originalQuestionStatus: 'not-established',
    originalQuestionGap: hasMatch
      ? 'Only the explicit model question is computed. Any additional premise, number, inverse problem or real-world claim in your original wording remains unverified.'
      : 'The original wording has no recognised connection to this model. No answer to the original question has been established.',
    objective,
    prompt: req.prompt,
    model: id,
    parameter: m ? (req.parameter ?? m.parameter.value) : null,
    maxPasses: req.maxPasses ?? 6,
    confirmed: approved,
    candidates: scored.map((s) => s.m.id),
    mapping: m
      ? m.terms.map((t) => ({
          ...t,
          words:
            (
              req.prompt.match(new RegExp(`\\b(${t.words})\\b`, 'gi')) ?? []
            ).join(', ') || '(not named in prompt)',
        }))
      : [],
    status: approved && hasMatch ? 'ready' : 'gap',
    reason:
      approved && !hasMatch
        ? 'No vocabulary match for the selected model. Choose a relevant structured example or supply a new model; unrelated questions do not run a default fixture.'
        : approved
          ? 'Model and example parameters confirmed. Ready to compute.'
          : 'Review a mathematical interpretation and its example parameters. Vocabulary alone cannot establish the right model; quantities in the prompt are not automatically imported.',
    passes: [],
  };
}
function uhlPass(index: number, x0: number): Pass {
  const curve = (which: 'naive' | 'bounded' | 'chart'): Point[] =>
    Array.from({ length: 61 }, (_, i) => {
      const t = i / 10;
      const x = flow('alignment', x0, t);
      return {
        x: t,
        y:
          which === 'naive'
            ? x0 + t * x0 * (1 - x0)
            : which === 'bounded'
              ? x
              : Math.log(x / (1 - x)) - Math.log(x0 / (1 - x0)),
      };
    });
  const x = flow('alignment', x0, 6);
  const initial: Frame = {
    title: 'One push, two interpretations',
    xLabel: 'Cumulative drive (dimensionless)',
    yLabel: 'Normalised state',
    series: [
      { label: 'Constant initial slope', points: curve('naive') },
      { label: 'Bounded alignment flow', points: curve('bounded') },
    ],
    explanation:
      'The straight line extrapolates the initial slope. The curve is the chosen alignment flow. Both agree initially; only the flow retains its bounds.',
  };
  if (index === 0)
    return {
      question:
        'Does a constant initial slope stay adequate as the drive accumulates?',
      operation:
        'Run the existing alignment flow; compare a first-order extrapolation.',
      answer: `At drive 6, the bounded state is ${fmt(x)}; the linear extrapolation is ${fmt(x0 + 6 * x0 * (1 - x0))}.`,
      evidence:
        'Exact alignment solution sampled at 61 drive values. Example units.',
      next: 'Is the changing response simply linear motion in another coordinate?',
      frame: initial,
      values: { bounded: x, linear: x0 + 6 * x0 * (1 - x0) },
    };
  if (index === 1)
    return {
      question:
        'Is the changing response simply linear motion in another coordinate?',
      operation:
        'Transform the same states to log-odds; subtract the starting coordinate.',
      answer:
        'In the log-odds coordinate, displacement equals the accumulated drive.',
      evidence: 'Same trajectory, no new observations or fitted parameters.',
      next: 'Does the answer survive splitting the operation into repeated pushes?',
      frame: {
        title: 'A curved response becomes additive',
        xLabel: 'Cumulative drive',
        yLabel: 'Log-odds displacement',
        series: [
          { label: 'Transformed bounded state', points: curve('chart') },
        ],
        explanation:
          'A coordinate change clarifies this chosen flow. It does not erase the physical bounds or select the flow from boundedness alone.',
      },
      values: {
        maximumResidual: Math.max(
          ...curve('chart').map((p) => Math.abs(p.y - p.x)),
        ),
      },
    };
  const split = flow('alignment', flow('alignment', x0, 2), 4);
  return {
    question:
      'Does the answer survive splitting the operation into repeated pushes?',
    operation: 'Compose drives 2 and 4; compare with one drive of 6.',
    answer: `Composition residual: ${Math.abs(split - x).toExponential(2)}. The chosen flow composes additively.`,
    evidence:
      'Numerical check of the known identity Φ₄(Φ₂(x)) = Φ₆(x), not a new physical observation.',
    next: null,
    frame: {
      title: 'Repeated pushes share an additive coordinate',
      xLabel: 'Cumulative drive',
      yLabel: 'Log-odds displacement',
      series: [
        { label: 'Transformed bounded trajectory', points: curve('chart') },
      ],
      explanation:
        'The initial two-curve view becomes a straight line in log-odds. Drives 2 and 4 reach the same state as drive 6; exact values remain in the calculation details.',
    },
    values: { split, whole: x, residual: Math.abs(split - x) },
  };
}
function taoPass(
  index: number,
  gain: number,
  previous?: Pass,
  objective: 'tracking' | 'effort' = 'tracking',
): Pass {
  const stress = index === 0 ? 'endpoint' : STRESSES[index];
  const runs = CONTROLLERS.map((controller) =>
    simulate({ controller, gain, seed: 101, stress, duration: 30, dt: 0.05 }),
  );
  const eligible =
    objective === 'effort' ? runs.filter((r) => r.metrics.mae < 0.05) : runs;
  const best = [...eligible].sort((a, b) =>
    objective === 'effort'
      ? a.metrics.actuatorEffort - b.metrics.actuatorEffort
      : a.metrics.mae - b.metrics.mae,
  )[0];
  const choice = best
    ? CONTROLLER_LABELS[best.config.controller]
    : 'No controller';
  const frame: Frame = {
    title: `Recovery under ${stress} disturbance`,
    xLabel: 'Simulation seconds',
    yLabel: 'Normalised reserve',
    series: runs.map((r) => ({
      label: CONTROLLER_LABELS[r.config.controller],
      points: r.samples
        .filter((_, i) => i % 5 === 0)
        .map((s) => ({ x: s.t, y: s.x })),
    })),
    explanation:
      'Four controllers observe the same seeded fixture. Bound preservation comes from the plant update; it is not unique to TAO.',
  };
  frame.series.push({
    label: 'Target',
    points: runs[0].samples
      .filter((_, i) => i % 5 === 0)
      .map((s) => ({ x: s.t, y: s.target })),
  });
  if (index > 0) {
    frame.kind = 'scatter';
    frame.title = 'The accuracy–effort trade-off';
    frame.xLabel = 'Actuator effort (integrated |u|)';
    frame.yLabel = 'Mean absolute tracking error';
    frame.threshold = 0.05;
    frame.series = runs.map((r) => ({
      label: CONTROLLER_LABELS[r.config.controller],
      points: [{ x: r.metrics.actuatorEffort, y: r.metrics.mae }],
    }));
    frame.explanation =
      objective === 'effort'
        ? 'Only points below the error threshold qualify. Among those, farther left means less effort. The selected objective determines the result.'
        : 'Lower means less tracking error; farther left means less actuator effort. These are distinct objectives. The dashed line marks the alternative 0.05 error constraint.';
  }
  return {
    question:
      index === 0
        ? objective === 'effort'
          ? 'Which controller uses least effort with mean absolute error below 0.05?'
          : 'Which controller has the lowest tracking error at the declared gain?'
        : (previous?.next ??
          'Does the comparison survive a changed disturbance?'),
    operation: `Compare four actual controller implementations under ${stress} stress.`,
    answer: best
      ? objective === 'effort'
        ? `${choice} uses the least effort (${fmt(best.metrics.actuatorEffort)}) among controllers with mean absolute error below 0.05. Its error is ${fmt(best.metrics.mae)}.`
        : `${choice} has the lowest mean absolute error (${fmt(best.metrics.mae)}) in this fixture. TAO: ${fmt(runs.find((r) => r.config.controller === 'tao')!.metrics.mae)}.`
      : 'No controller meets the declared error constraint in this fixture. There is no qualifying least-effort answer.',
    evidence:
      'Seed 101, 30 seconds, step 0.05, equal gain and observation/action limits. Effort is retained separately.',
    next:
      index < 3
        ? `Does the ${objective === 'effort' ? 'least-effort feasible choice' : 'lowest-error choice'} survive ${STRESSES[index + 1]} stress?`
        : null,
    frame,
    values: {
      winner: best?.config.controller ?? 'none',
      objective,
      errorConstraint: 0.05,
      ...Object.fromEntries(
        runs.flatMap((r) => [
          [`${r.config.controller} MAE`, r.metrics.mae],
          [`${r.config.controller} effort`, r.metrics.actuatorEffort],
        ]),
      ),
    },
  };
}
function quantumPass(index: number, noise: number, previous?: Pass): Pass {
  const prior = previous?.posterior ?? STATES.map(() => 1 / 6);
  const plans = suggestBasis(prior, noise, 8);
  const choice = plans[0];
  const m = measure('+', choice.basis, 8, 20260911 + index * 104729, noise);
  const posterior = updatePrior(prior, m);
  const remaining = entropy(posterior);
  const max = Math.max(...posterior);
  const winner = STATES[posterior.indexOf(max)];
  const resolved = max >= 0.99;
  return {
    question:
      previous?.next ??
      'Which basis is expected to distinguish the six candidates best?',
    operation: `Score X, Y and Z by expected information gain; measure ${choice.basis} with eight simulated shots.`,
    answer: `${m.plus}/8 positive outcomes. Candidate |${winner}⟩ now has ${fmt(max * 100)}% posterior probability under the declared model.`,
    evidence: `Fixed hidden state |+⟩; the planner does not receive this identity. Seed ${20260911 + index * 104729}.`,
    next:
      resolved || choice.informationBits < 1e-10
        ? null
        : `With ${fmt(remaining)} bits of uncertainty left, which next basis separates the remaining candidates?`,
    frame: {
      ...bar(
        'Which states still fit?',
        STATES.map((s) => `|${s}⟩`),
        posterior,
        'Posterior probability',
        'The next basis is chosen from the updated posterior. This is Bayesian experimental design in a small simulator.',
      ),
      yDomain: [0, 1],
    },
    values: {
      basis: choice.basis,
      expectedInformationBits: choice.informationBits,
      remainingBits: remaining,
      leadingProbability: max,
      plus: m.plus,
      'P(+ | +, Z)': probability('+', 'Z', [], noise),
      'P(+ | −, Z)': probability('-', 'Z', [], noise),
    },
    posterior,
  };
}
function timePass(index: number, tau: number): Pass {
  const actualTau = index === 2 ? tau * 2 : tau;
  const early = simulatePiecewiseRateSnt(
    [100, 0],
    [1, 9],
    actualTau,
  ).undones.at(-1)!;
  const late = simulatePiecewiseRateSnt([0, 100], [9, 1], actualTau).undones.at(
    -1,
  )!;
  if (index === 0)
    return {
      question: 'Can total exposure alone distinguish the two schedules?',
      operation: 'Integrate each rate schedule over ten model days.',
      answer:
        'Both schedules deliver 100 model dose units. The total alone makes them indistinguishable.',
      evidence: 'Early: 100 × 1 + 0 × 9. Late: 0 × 9 + 100 × 1.',
      next: 'Does retaining a repair state distinguish them at the same observation time?',
      frame: {
        ...bar(
          'The original view loses timing',
          ['Early input', 'Late input'],
          [100, 100],
          'Total model dose',
          'Equal totals are a deliberately incomplete description of an exposure history.',
        ),
        yDomain: [0, 100],
      },
      values: { earlyDose: 100, lateDose: 100 },
    };
  return {
    question:
      index === 1
        ? 'Does retaining a repair state distinguish them at the same observation time?'
        : 'Does the distinction survive doubling the assumed repair time?',
    operation: `Run the existing piecewise repair solver with τ = ${fmt(actualTau)} model days.`,
    answer: `At day 10: early input leaves ${fmt(early)} undone units; late input leaves ${fmt(late)}.`,
    evidence:
      'Exact exponential interval updates; equal total dose and common observation time. No mortality or clinical estimate is returned.',
    next:
      index === 1
        ? 'Does the distinction survive doubling the assumed repair time?'
        : null,
    frame: {
      ...bar(
        `History retained · τ = ${fmt(actualTau)} days`,
        ['Early input', 'Late input'],
        [early, late],
        'Residual model dose at day 10',
        'Earlier input has more time to decay in this assumed model. A causal claim about real tissue would require measured repair kinetics.',
      ),
      yDomain: [0, 100],
    },
    values: { early, late, tau: actualTau },
  };
}
export function stepInvestigation(run: Investigation): Investigation {
  if (
    !['ready', 'running'].includes(run.status) ||
    !run.model ||
    run.parameter === null ||
    !run.confirmed
  )
    return run;
  if (run.passes.length >= run.maxPasses)
    return {
      ...run,
      status: 'budget',
      reason: 'Pass budget reached. Remaining uncertainty is retained.',
    };
  const i = run.passes.length;
  const previous = run.passes.at(-1);
  const p =
    run.model === 'uhl'
      ? uhlPass(i, run.parameter)
      : run.model === 'tao'
        ? taoPass(i, run.parameter, previous, run.objective)
        : run.model === 'quantum'
          ? quantumPass(i, run.parameter, previous)
          : timePass(i, run.parameter);
  const passes = [...run.passes, p];
  const unresolvedQuantum =
    run.model === 'quantum' && Number(p.values.leadingProbability) < 0.99;
  const finished = p.next === null;
  return {
    ...run,
    passes,
    status: finished
      ? unresolvedQuantum
        ? 'gap'
        : 'conclusion'
      : passes.length >= run.maxPasses
        ? 'budget'
        : 'running',
    reason: finished
      ? unresolvedQuantum
        ? 'The admitted measurements no longer provide information. A different noise model, instrument or candidate set is needed.'
        : `Conditional model conclusion. ${modelFor(run.model).limit}`
      : passes.length >= run.maxPasses
        ? 'Pass budget reached. The next question remains open; no final answer is inferred.'
        : 'The result generated the next admissible question.',
  };
}
export function investigate(raw: unknown): Investigation {
  let run = beginInvestigation(raw);
  while (run.status === 'ready' || run.status === 'running')
    run = stepInvestigation(run);
  return run;
}
