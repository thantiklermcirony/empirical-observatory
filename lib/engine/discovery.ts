import { finite } from './random.ts';
export type Action = {
  id: string;
  label: string;
  cost: number;
  likelihood: number[][];
};
export type Belief = number[];
export type Policy =
  | 'adaptive_eig'
  | 'best_fixed'
  | 'random_feasible'
  | 'prior_only_planner';
export type Observation = { action: string; outcome: number };
export const hypotheses = ['A0', 'A1', 'B0', 'B1'] as const;
export const prior: Belief = [0.25, 0.25, 0.25, 0.25];
export const discoveryVersion = 'adaptive-tests-v1';
export const discoveryBudget = 2;
export const actions: Action[] = [
  {
    id: 'gate',
    label: 'Family probe',
    cost: 1,
    likelihood: [
      [0.9, 0.1],
      [0.9, 0.1],
      [0.1, 0.9],
      [0.1, 0.9],
    ],
  },
  {
    id: 'local_a',
    label: 'A-specific challenge',
    cost: 1,
    likelihood: [
      [0.9, 0.1],
      [0.1, 0.9],
      [0.5, 0.5],
      [0.5, 0.5],
    ],
  },
  {
    id: 'local_b',
    label: 'B-specific challenge',
    cost: 1,
    likelihood: [
      [0.5, 0.5],
      [0.5, 0.5],
      [0.9, 0.1],
      [0.1, 0.9],
    ],
  },
  {
    id: 'full',
    label: 'Broad diagnostic',
    cost: 2,
    likelihood: [
      [0.7, 0.1, 0.1, 0.1],
      [0.1, 0.7, 0.1, 0.1],
      [0.1, 0.1, 0.7, 0.1],
      [0.1, 0.1, 0.1, 0.7],
    ],
  },
];
function distribution(values: number[], size?: number): void {
  if (
    !Array.isArray(values) ||
    !values.length ||
    (size !== undefined && values.length !== size) ||
    values.some((x) => !Number.isFinite(x) || x < 0 || x > 1) ||
    Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 1e-10
  )
    throw new Error('Expected a normalized probability distribution.');
}
function checkAction(action: Action): void {
  if (
    !action ||
    !Number.isSafeInteger(action.cost) ||
    action.cost < 1 ||
    action.likelihood.length !== 4 ||
    !action.likelihood[0]?.length
  )
    throw new Error('Invalid measurement contract.');
  action.likelihood.forEach((row) =>
    distribution(row, action.likelihood[0].length),
  );
}
export function entropy(belief: Belief): number {
  distribution(belief);
  return -belief.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
}
export function predictive(belief: Belief, action: Action): number[] {
  distribution(belief, 4);
  checkAction(action);
  return action.likelihood[0].map((_, y) =>
    belief.reduce((s, p, h) => s + p * action.likelihood[h][y], 0),
  );
}
export function updateBelief(
  belief: Belief,
  action: Action,
  outcome: number,
): Belief {
  distribution(belief, 4);
  checkAction(action);
  if (
    !Number.isInteger(outcome) ||
    outcome < 0 ||
    outcome >= action.likelihood[0].length
  )
    throw new Error('Unknown measurement outcome.');
  const values = belief.map((p, h) => p * action.likelihood[h][outcome]);
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0)
    throw new Error(
      'This observation is impossible under the declared model. Revise the model; do not manufacture a posterior.',
    );
  return values.map((p) => p / total);
}
export function informationGain(belief: Belief, action: Action): number {
  return Math.max(
    0,
    entropy(belief) -
      predictive(belief, action).reduce(
        (s, p, y) =>
          s + (p > 0 ? p * entropy(updateBelief(belief, action, y)) : 0),
        0,
      ),
  );
}
export function available(remaining: number): Action[] {
  finite(remaining, 'Remaining budget', 0, discoveryBudget);
  if (!Number.isInteger(remaining))
    throw new Error('Budget units must be whole.');
  return actions.filter((a) => a.cost <= remaining);
}
export function recommend(belief: Belief, remaining: number): Action | null {
  distribution(belief, 4);
  return available(remaining).reduce<Action | null>(
    (best, a) =>
      !best ||
      informationGain(belief, a) / a.cost >
        informationGain(belief, best) / best.cost + 1e-12
        ? a
        : best,
    null,
  );
}
export function categorical(probabilities: number[], u: number): number {
  distribution(probabilities);
  finite(u, 'Uniform draw', 0, 1);
  if (u === 1) throw new Error('Uniform draw must be below one.');
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (u < cumulative) return i;
  }
  return probabilities.length - 1;
}
export async function keyedUniform(key: string): Promise<number> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)),
  );
  const value = new DataView(bytes.buffer).getUint32(0, false);
  return (value + 0.5) / 4294967296;
}
export function validateSeed(seed: number): void {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Seed must be a nonnegative 32-bit integer.');
}
export async function hiddenState(seed: number): Promise<number> {
  validateSeed(seed);
  return categorical(
    prior,
    await keyedUniform('adaptive-v1|' + seed + '|hidden'),
  );
}
export async function measure(
  seed: number,
  action: Action,
  occurrence: number,
): Promise<number> {
  validateSeed(seed);
  checkAction(action);
  if (!Number.isSafeInteger(occurrence) || occurrence < 0 || occurrence > 1)
    throw new Error('Invalid measurement repetition.');
  const hidden = await hiddenState(seed);
  return categorical(
    action.likelihood[hidden],
    await keyedUniform(
      'adaptive-v1|' + seed + '|measurement|' + action.id + '|' + occurrence,
    ),
  );
}
export function chooseAction(
  policy: Policy,
  belief: Belief,
  remaining: number,
  randomChoice = 0.5,
): Action | null {
  const options = available(remaining);
  if (!options.length) return null;
  if (policy === 'adaptive_eig') return recommend(belief, remaining);
  if (policy === 'prior_only_planner') return recommend(prior, remaining);
  if (policy === 'best_fixed') {
    const full = options.find((a) => a.id === 'full');
    if (!full)
      throw new Error(
        'The fixed plan begins with the complete two-unit budget.',
      );
    return full;
  }
  if (policy === 'random_feasible') {
    const u = finite(randomChoice, 'Random policy draw', 0, 1);
    if (u === 1) throw new Error('Random policy draw must be below one.');
    return options[
      Math.min(options.length - 1, Math.floor(u * options.length))
    ];
  }
  throw new Error('Unknown exploration policy.');
}
export function replay(history: Observation[]): {
  belief: Belief;
  remaining: number;
} {
  if (!Array.isArray(history) || history.length > 2)
    throw new Error('Invalid observation log.');
  let belief = [...prior],
    remaining = discoveryBudget;
  for (const event of history) {
    if (
      !event ||
      Object.keys(event).some((k) => !['action', 'outcome'].includes(k))
    )
      throw new Error('Invalid observation fields.');
    const a = available(remaining).find((a) => a.id === event.action);
    if (!a) throw new Error('Measurement unavailable or over budget.');
    belief = updateBelief(belief, a, event.outcome);
    remaining -= a.cost;
  }
  return { belief, remaining };
}
export function conclusion(belief: Belief): number {
  distribution(belief, 4);
  return belief.indexOf(Math.max(...belief));
}
export async function runEpisode(policy: Policy, seed: number) {
  let history: Observation[] = [];
  let state = replay(history);
  while (state.remaining) {
    const policyDraw = await keyedUniform(
      'adaptive-v1|' + seed + '|policy|' + policy + '|' + history.length,
    );
    const action = chooseAction(
      policy,
      state.belief,
      state.remaining,
      policyDraw,
    );
    if (!action) throw new Error('No affordable measurement.');
    const occurrence = history.filter((e) => e.action === action.id).length;
    const outcome = await measure(seed, action, occurrence);
    history = [...history, { action: action.id, outcome }];
    state = replay(history);
  }
  const hidden = await hiddenState(seed),
    decision = conclusion(state.belief);
  return {
    seed,
    policy,
    hidden,
    decision,
    correct: Number(hidden === decision),
    log_loss_bits: -Math.log2(state.belief[hidden]),
    cost: discoveryBudget - state.remaining,
    history,
    belief: state.belief,
  };
}
export type NotebookEntry = {
  schema: 'observatory-discovery/1';
  source: 'synthetic';
  version: typeof discoveryVersion;
  seed: number;
  policy: Policy | 'manual';
  history: Observation[];
  createdAt: string;
};
export function validateNotebookEntry(value: unknown): NotebookEntry {
  if (!value || typeof value !== 'object')
    throw new Error('Expected a local experiment record.');
  const r = value as NotebookEntry;
  if (
    Object.keys(r).some(
      (k) =>
        ![
          'schema',
          'source',
          'version',
          'seed',
          'policy',
          'history',
          'createdAt',
        ].includes(k),
    ) ||
    r.schema !== 'observatory-discovery/1' ||
    r.source !== 'synthetic' ||
    r.version !== discoveryVersion ||
    ![
      'adaptive_eig',
      'best_fixed',
      'random_feasible',
      'prior_only_planner',
      'manual',
    ].includes(r.policy) ||
    typeof r.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(r.createdAt))
  )
    throw new Error('Unsupported local record.');
  validateSeed(r.seed);
  const state = replay(r.history);
  if (state.remaining !== 0)
    throw new Error('Only completed experiments enter the notebook.');
  return r;
}
