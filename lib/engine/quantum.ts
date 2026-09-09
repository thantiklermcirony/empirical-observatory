import { Circuit } from 'quantum-tensors';
import { clamp, finite, random } from './random.ts';
export const STATES = ['0', '1', '+', '-', '+i', '-i'] as const;
export type StateName = (typeof STATES)[number];
export type Basis = 'X' | 'Y' | 'Z';
export type Gate = 'H' | 'S' | 'X' | 'Z';
export interface Measurement {
  basis: Basis;
  shots: number;
  plus: number;
  noise: number;
}
export function prepare(state: StateName) {
  let c = Circuit.qubits(1);
  switch (state) {
    case '0':
      break;
    case '1':
      c = c.X(0);
      break;
    case '+':
      c = c.H(0);
      break;
    case '-':
      c = c.X(0).H(0);
      break;
    case '+i':
      c = c.H(0).S(0);
      break;
    case '-i':
      c = c.H(0).S(0).S(0).S(0);
      break;
    default:
      throw new Error('Unknown state.');
  }
  return c;
}
export function probability(
  state: StateName,
  basis: Basis,
  gates: Gate[] = [],
  noise = 0.12,
) {
  finite(noise, 'Depolarising noise', 0, 1);
  let c = prepare(state);
  for (const g of gates) {
    if (!['H', 'S', 'X', 'Z'].includes(g)) throw new Error('Unknown gate.');
    c = c[g](0);
  }
  if (basis === 'X') c = c.H(0);
  else if (basis === 'Y') c = c.S(0).S(0).S(0).H(0);
  else if (basis !== 'Z') throw new Error('Unknown basis.');
  const p = c
    .measureQubit(0)
    .filter((m) => m.measured === '0')
    .reduce((s, m) => s + m.probability, 0);
  return clamp((1 - noise) * p + noise * 0.5);
}
export function measure(
  state: StateName,
  basis: Basis,
  shots: number,
  seed: number,
  noise = 0.12,
): Measurement {
  finite(shots, 'Shots', 1, 4096);
  if (!Number.isInteger(shots)) throw new Error('Shots must be an integer.');
  const r = random(seed),
    p = probability(state, basis, [], noise);
  let plus = 0;
  for (let i = 0; i < shots; i++) if (r() < p) plus++;
  return { basis, shots, plus, noise };
}
export const entropy = (p: number[]) =>
  -p.reduce((s, x) => s + (x > 0 ? x * Math.log2(x) : 0), 0);
export function updatePrior(prior: number[], m: Measurement) {
  if (
    prior.length !== 6 ||
    prior.some((p) => !Number.isFinite(p) || p < 0) ||
    Math.abs(prior.reduce((a, b) => a + b, 0) - 1) > 1e-8
  )
    throw new Error('Six prior probabilities must sum to one.');
  finite(m.shots, 'Shots', 1, 4096);
  finite(m.plus, 'Plus count', 0, m.shots);
  if (!Number.isInteger(m.plus) || !Number.isInteger(m.shots))
    throw new Error('Counts must be integers.');
  const logs = STATES.map((s, i) => {
      const p = probability(s, m.basis, [], m.noise);
      return (
        Math.log(prior[i]) +
        (m.plus === 0 ? 0 : m.plus * Math.log(p)) +
        (m.shots === m.plus ? 0 : (m.shots - m.plus) * Math.log1p(-p))
      );
    }),
    max = Math.max(...logs);
  if (!Number.isFinite(max))
    throw new Error('Observation is impossible under every candidate.');
  const w = logs.map((x) => Math.exp(x - max)),
    sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}
function binomial(n: number, k: number, p: number) {
  let choose = 1;
  for (let j = 1; j <= k; j++) choose *= (n - j + 1) / j;
  return choose * p ** k * (1 - p) ** (n - k);
}
export function suggestBasis(prior: number[], noise = 0.12, shots = 8) {
  finite(shots, 'Planning shots', 1, 32);
  if (!Number.isInteger(shots)) throw new Error('Shots must be an integer.');
  return (['X', 'Y', 'Z'] as Basis[])
    .map((basis) => {
      let after = 0;
      for (let plus = 0; plus <= shots; plus++) {
        const mass = STATES.reduce(
          (a, s, i) =>
            a +
            prior[i] * binomial(shots, plus, probability(s, basis, [], noise)),
          0,
        );
        if (mass > 1e-14)
          after +=
            mass * entropy(updatePrior(prior, { basis, shots, plus, noise }));
      }
      return { basis, informationBits: Math.max(0, entropy(prior) - after) };
    })
    .sort((a, b) => b.informationBits - a.informationBits);
}
export function mysteryState(seed: number, version = '0.2.0'): StateName {
  finite(seed, 'Seed', 0, 0xffffffff);
  if (!Number.isInteger(seed)) throw new Error('Seed must be an integer.');
  // Separate state selection from the measurement RNG. v0.1 reused shot one's draw.
  let stateSeed = seed;
  if (version !== '0.1.0') {
    stateSeed = (seed ^ 0x53544154) >>> 0;
    stateSeed = Math.imul(stateSeed ^ (stateSeed >>> 16), 0x21f0aaad);
    stateSeed = Math.imul(stateSeed ^ (stateSeed >>> 15), 0x735a2d97);
    stateSeed = (stateSeed ^ (stateSeed >>> 15)) >>> 0;
  }
  return STATES[Math.floor(random(stateSeed)() * STATES.length)];
}
export function quantumReplay(
  seed: number,
  measurements: Measurement[],
  version = '0.2.0',
) {
  const state = mysteryState(seed, version);
  let prior = STATES.map(() => 1 / 6);
  measurements.forEach((m, i) => {
    const expected = measure(
      state,
      m.basis,
      m.shots,
      (seed + i * 104729) >>> 0,
      m.noise,
    );
    if (expected.plus !== m.plus)
      throw new Error('Measurement does not match the simulator seed.');
    prior = updatePrior(prior, m);
  });
  return {
    state,
    prior,
    sampling:
      version === '0.1.0'
        ? 'Legacy biased sampling; replay only, exclude from statistical evidence.'
        : 'Domain-separated state and shot seeds.',
  };
}
