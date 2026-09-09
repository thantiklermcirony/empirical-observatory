import { clamp, finite, mean, random } from './random.ts';
export type Primitive =
  | 'growth'
  | 'suppression'
  | 'alignment'
  | 'threat'
  | 'gate';
export type Controller = 'manual' | 'linear' | 'pi' | 'sigmoid' | 'tao';
export type Stress = 'endpoint' | 'repeated' | 'stale' | 'switching';
export const CONTROLLERS: Controller[] = ['linear', 'pi', 'sigmoid', 'tao'];
export const STRESSES: Stress[] = [
  'endpoint',
  'repeated',
  'stale',
  'switching',
];
export const CONTROLLER_LABELS: Record<Controller, string> = {
  manual: 'Manual',
  linear: 'Clipped linear',
  pi: 'Anti-windup PI',
  sigmoid: 'Sigmoid drive',
  tao: 'TAO contract',
};
export const TAO_CONTRACT = {
  version: 'tao-chamber-0.1',
  observable: 'Normalised simulated reactor reserve',
  unit: 'dimensionless',
  chart: 'logit',
  safeInterval: [0.05, 0.95],
  target: 0.62,
  driveLimit: 1,
  stepSeconds: 0.05,
  minimumConfidence: 0.6,
  maximumAgeSeconds: 0.4,
  dwellSeconds: 0.5,
  dwellScope:
    'Mode labels only; the bounded feedback actuator may reverse during a dwell interval.',
  barrier:
    'Bounded chart-space drive plus outward-action suppression at declared margins; the plant update separately preserves [0,1].',
  scope:
    'Implementation study derived from TAO; new synthetic fixture, not a reproduction of the manuscript benchmark.',
};
export const logit = (x: number) =>
  Math.log(clamp(x, 1e-9, 1 - 1e-9) / (1 - clamp(x, 1e-9, 1 - 1e-9)));
export const logistic = (r: number) =>
  r >= 0 ? 1 / (1 + Math.exp(-r)) : Math.exp(r) / (1 + Math.exp(r));
/** Closed-form flows; duration >= 0. Alignment accepts signed drive. */
export function flow(kind: Primitive, e: number, duration: number, drive = 1) {
  finite(e, 'State', 0, 1);
  finite(duration, 'Duration', 0, 100);
  finite(drive, 'Drive', kind === 'alignment' ? -20 : 0, 20);
  const t = duration * drive;
  switch (kind) {
    case 'growth':
      return (e + t * (1 - e)) / (1 + t * (1 - e));
    case 'suppression':
      return e / (1 + t * e);
    case 'alignment':
      return e === 0 || e === 1 || t === 0
        ? e
        : logistic(Math.log(e) - Math.log1p(-e) + t);
    case 'threat':
      return e + (1 - e) * -Math.expm1(-t);
    case 'gate':
      return e * Math.exp(-t);
    default:
      throw new Error('Unknown flow.');
  }
}
export interface Plant {
  x: number;
  memory: number;
  t: number;
}
export interface Observation {
  x: number;
  confidence: number;
  age: number;
}
export interface ControlMemory {
  integral: number;
  mode: 'recover' | 'hold' | 'release';
  lastSwitch: number;
}
export interface Sample {
  t: number;
  x: number;
  observed: number;
  memory: number;
  u: number;
  target: number;
  confidence: number;
  age: number;
  fallback: boolean;
  boundary: boolean;
}
export interface RunConfig {
  seed: number;
  stress: Stress;
  controller: Controller;
  gain: number;
  duration: number;
  dt: number;
}
export const initialPlant = (): Plant => ({ x: 0.62, memory: 0.16, t: 0 });
export const initialControl = (): ControlMemory => ({
  integral: 0,
  mode: 'hold',
  lastSwitch: -1,
});
export function targetAt(t: number, stress: Stress) {
  return stress === 'switching' && t >= 12 && t < 21 ? 0.36 : 0.62;
}
export function observe(
  p: Plant,
  stress: Stress,
  noise: number,
  last?: Observation,
  dt = 0.05,
): Observation {
  const stale = stress === 'stale' && p.t >= 8 && p.t < 11;
  return stale && last
    ? { ...last, confidence: 0.35, age: last.age + dt }
    : { x: clamp(p.x + noise), confidence: 0.95, age: 0 };
}
export function controllerAction(
  kind: Controller,
  o: Observation,
  target: number,
  gain: number,
  dt: number,
  t: number,
  m: ControlMemory,
  manual = 0,
): { u: number; memory: ControlMemory; fallback: boolean } {
  finite(gain, 'Gain', 0.1, 30);
  finite(dt, 'Time step', 0.001, 0.25);
  finite(target, 'Target', 0, 1);
  if (
    !Number.isFinite(o.x) ||
    o.x < 0 ||
    o.x > 1 ||
    !Number.isFinite(o.confidence) ||
    o.confidence < TAO_CONTRACT.minimumConfidence ||
    o.confidence > 1 ||
    !Number.isFinite(o.age) ||
    o.age < 0 ||
    o.age > TAO_CONTRACT.maximumAgeSeconds
  )
    return {
      u: 0,
      memory: { ...m, integral: m.integral * Math.exp(-dt) },
      fallback: true,
    };
  const error = target - o.x;
  let u = 0;
  const next = { ...m };
  if (kind === 'manual') u = manual;
  else if (kind === 'linear') u = gain * error;
  else if (kind === 'pi') {
    const candidate = clamp(m.integral + error * dt, -4, 4);
    const raw = gain * error + gain * 0.35 * candidate;
    if (Math.abs(raw) < 1 || Math.sign(error) !== Math.sign(raw))
      next.integral = candidate;
    u = gain * error + gain * 0.35 * next.integral;
  } else if (kind === 'sigmoid') u = Math.tanh(gain * error);
  else if (kind === 'tao') {
    const rError = logit(target) - logit(o.x);
    const desired =
      rError > 0.2
        ? 'recover'
        : rError < -0.2
          ? 'release'
          : Math.abs(rError) < 0.08
            ? 'hold'
            : m.mode;
    if (desired !== m.mode && t - m.lastSwitch >= TAO_CONTRACT.dwellSeconds) {
      next.mode = desired;
      next.lastSwitch = t;
    }
    u = Math.tanh((gain * rError) / 4) * (next.mode === 'hold' ? 0.7 : 1);
    if ((o.x <= 0.05 && u < 0) || (o.x >= 0.95 && u > 0)) u = 0;
  } else throw new Error('Unknown controller.');
  return { u: clamp(u, -1, 1), memory: next, fallback: false };
}
/** Exact frozen-rate update. Convex combination with an interior equilibrium for every positive dt. */
export function stepPlant(
  p: Plant,
  u: number,
  dt: number,
  stress: Stress,
  seed: number,
): Plant {
  finite(u, 'Actuation', -1, 1);
  finite(dt, 'Time step', 0.001, 0.25);
  finite(p.x, 'State', 0, 1);
  finite(p.memory, 'Memory', 0, 1);
  const nextT = p.t + dt;
  const crosses = (t: number) => p.t < t - 1e-9 && nextT >= t - 1e-9;
  const memory =
    p.memory * Math.exp(-dt / 6) + Math.abs(u) * 0.65 * (1 - Math.exp(-dt / 6));
  const up = 0.2 + 1.3 * Math.max(u, 0),
    down = 0.12 + 0.24 * memory + 1.3 * Math.max(-u, 0),
    equilibrium = up / (up + down);
  let x = equilibrium + (p.x - equilibrium) * Math.exp(-(up + down) * dt);
  if (crosses(5)) x *= 0.06 + 0.015 * (seed % 5);
  if (stress === 'repeated' && (crosses(13) || crosses(21))) x *= 0.18;
  if (stress === 'switching' && crosses(18)) x = 0.98;
  return { x, memory, t: nextT };
}
export function metrics(samples: Sample[], dt: number) {
  if (!samples.length) throw new Error('No samples.');
  let recovery: number | null = null,
    consecutive = 0;
  const start = samples.findIndex((s) => s.t >= 5 - 1e-8);
  for (let i = Math.max(0, start); start >= 0 && i < samples.length; i++) {
    if (Math.abs(samples[i].x - samples[i].target) <= 0.04) consecutive++;
    else consecutive = 0;
    if (consecutive * dt >= 1 - 1e-9) {
      recovery = Math.max(0, samples[i - consecutive + 1].t - 5);
      break;
    }
  }
  return {
    mae: mean(samples.map((s) => Math.abs(s.x - s.target))),
    boundaryFraction: mean(samples.map((s) => (s.boundary ? 1 : 0))),
    boundaryRisk: samples.reduce(
      (a, s) => a + (Math.max(0.05 - s.x, 0) + Math.max(s.x - 0.95, 0)) * dt,
      0,
    ),
    actuatorEffort: samples.reduce((a, s) => a + Math.abs(s.u) * dt, 0),
    chartTravel: samples
      .slice(1)
      .reduce((a, s, i) => a + Math.abs(logit(s.x) - logit(samples[i].x)), 0),
    recoverySeconds: recovery,
    fallbackFraction: mean(samples.map((s) => (s.fallback ? 1 : 0))),
    corridorFraction: mean(
      samples
        .filter((s) => s.t >= 5)
        .map((s) => (Math.abs(s.x - s.target) <= 0.08 ? 1 : 0)),
    ),
  };
}
export function simulate(config: RunConfig, actions?: number[]) {
  finite(config.seed, 'Seed', 0, 0xffffffff);
  if (!Number.isInteger(config.seed))
    throw new Error('Seed must be an integer.');
  if (
    !STRESSES.includes(config.stress) ||
    !['manual', ...CONTROLLERS].includes(config.controller)
  )
    throw new Error('Unknown experiment setting.');
  finite(config.dt, 'Step', 0.001, 0.25);
  finite(config.duration, 'Duration', 1, 60);
  const n = Math.round(config.duration / config.dt);
  if (n > 60000) throw new Error('Too many steps.');
  const r = random(config.seed);
  let p = initialPlant(),
    m = initialControl(),
    last: Observation | undefined;
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const o = observe(p, config.stress, (r() - 0.5) * 0.008, last, config.dt);
    last = o;
    const target = targetAt(p.t, config.stress),
      c = controllerAction(
        config.controller,
        o,
        target,
        config.gain,
        config.dt,
        p.t,
        m,
        actions?.[i] ?? 0,
      );
    m = c.memory;
    p = stepPlant(p, c.u, config.dt, config.stress, config.seed);
    samples.push({
      t: p.t,
      x: p.x,
      memory: p.memory,
      u: c.u,
      observed: o.x,
      confidence: o.confidence,
      age: o.age,
      target,
      fallback: c.fallback,
      boundary: p.x < 0.05 || p.x > 0.95,
    });
  }
  return { config, samples, metrics: metrics(samples, config.dt) };
}
export function compareControllers() {
  const trainingSeeds = [11, 12, 13, 14],
    testSeeds = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],
    gains = [1, 2, 4, 8, 12, 18];
  const run = (
    controller: Controller,
    gain: number,
    seed: number,
    index: number,
  ) =>
    simulate({
      controller,
      gain,
      seed,
      stress: STRESSES[index % 4],
      duration: 30,
      dt: 0.05,
    });
  const rows = CONTROLLERS.map((controller) => {
    const tuning = gains
      .map((gain) => ({
        gain,
        score: mean(
          trainingSeeds.map((seed, i) => {
            const m = run(controller, gain, seed, i).metrics;
            return m.mae + (2 * m.boundaryRisk) / 30 + 0.002 * m.actuatorEffort;
          }),
        ),
      }))
      .sort((a, b) => a.score - b.score);
    const gain = tuning[0].gain,
      runs = testSeeds.map((seed, i) => {
        const r = run(controller, gain, seed, i);
        return { seed, stress: r.config.stress, ...r.metrics };
      });
    return {
      controller,
      gain,
      tuning,
      runs,
      mae: mean(runs.map((x) => x.mae)),
      boundaryFraction: mean(runs.map((x) => x.boundaryFraction)),
      actuatorEffort: mean(runs.map((x) => x.actuatorEffort)),
      recoverySeconds: mean(
        runs
          .filter((x) => x.recoverySeconds !== null)
          .map((x) => x.recoverySeconds!),
      ),
      unrecovered: runs.filter((x) => x.recoverySeconds === null).length,
    };
  });
  return {
    protocol: 'bast-fixture-0.1',
    trainingSeeds,
    testSeeds,
    gains,
    score: 'MAE + 2*BRI/30 + 0.002*actuator effort',
    notes:
      'Same observations, action limits, quality fallback and tuning budget. Four classical controllers; no learned baseline. Synthetic held-out seeds do not establish real-world superiority. Recovery is the first one-second dwell after the initial perturbation.',
    rows,
  };
}
