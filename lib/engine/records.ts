import type { RunConfig } from './tao.ts';
import type { Trial } from './behaviour.ts';
import { makeTrial, trialPlan } from './behaviour.ts';
import type { Measurement } from './quantum.ts';
export type RecordSource =
  | 'simulation'
  | 'human-behaviour'
  | 'synthetic-signal'
  | 'recorded-signal'
  | 'eeg-hardware';
export interface ExperimentRecord {
  schema: 'empirical-observatory/1';
  id: string;
  createdAt: string;
  engineVersion: '0.1.0' | '0.2.0';
  room: 'tao' | 'behaviour' | 'quantum' | 'instrument';
  source: RecordSource;
  seed: number;
  completed: boolean;
  config: Record<string, unknown>;
  data: unknown;
  summary: Record<string, unknown>;
}
export function record(
  room: ExperimentRecord['room'],
  source: RecordSource,
  seed: number,
  config: Record<string, unknown>,
  data: unknown,
  summary: Record<string, unknown>,
  completed = true,
): ExperimentRecord {
  return {
    schema: 'empirical-observatory/1',
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    engineVersion: '0.2.0',
    room,
    source,
    seed,
    completed,
    config,
    data,
    summary,
  };
}
function finiteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}
/** Imported records are untrusted data, never executable code. Replay recomputes simulation evidence. */
export function validateRecord(value: unknown): ExperimentRecord {
  if (!value || typeof value !== 'object')
    throw new Error('Expected an experiment record.');
  const r = value as ExperimentRecord;
  if (
    r.schema !== 'empirical-observatory/1' ||
    !['0.1.0', '0.2.0'].includes(r.engineVersion)
  )
    throw new Error('This record uses an unsupported version.');
  if (
    typeof r.id !== 'string' ||
    r.id.length > 100 ||
    typeof r.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(r.createdAt)) ||
    !Number.isInteger(r.seed) ||
    r.seed < 0 ||
    r.seed > 0xffffffff ||
    typeof r.completed !== 'boolean'
  )
    throw new Error('Invalid record metadata.');
  if (
    !r.config ||
    typeof r.config !== 'object' ||
    !r.summary ||
    typeof r.summary !== 'object'
  )
    throw new Error('Missing experiment configuration.');
  if (r.room === 'tao') {
    if (r.source !== 'simulation')
      throw new Error('TAO fixture must be labelled simulation.');
    const c = r.config as unknown as RunConfig;
    if (
      !['manual', 'linear', 'pi', 'sigmoid', 'tao'].includes(c.controller) ||
      !['endpoint', 'repeated', 'stale', 'switching'].includes(c.stress) ||
      !finiteNumber(c.gain) ||
      c.gain < 0.1 ||
      c.gain > 30 ||
      c.dt !== 0.05 ||
      !finiteNumber(c.duration) ||
      c.duration < 1 ||
      c.duration > 60 ||
      c.seed !== r.seed
    )
      throw new Error('Invalid TAO configuration.');
    const d = r.data as { actions: number[] };
    if (
      !d ||
      !Array.isArray(d.actions) ||
      d.actions.length > 1200 ||
      d.actions.some((x) => !finiteNumber(x) || Math.abs(x) > 1) ||
      Math.abs(d.actions.length * c.dt - c.duration) > 1e-7
    )
      throw new Error('Invalid action history.');
  } else if (r.room === 'quantum') {
    if (r.source !== 'simulation')
      throw new Error('Quantum replay requires a simulated source.');
    const ms = r.data as Measurement[];
    if (
      r.config.noise !== 0.12 ||
      r.config.budget !== 96 ||
      typeof r.config.guess !== 'string' ||
      !['0', '1', '+', '-', '+i', '-i'].includes(r.config.guess)
    )
      throw new Error('Invalid quantum configuration.');
    if (
      !Array.isArray(ms) ||
      (r.completed && ms.length === 0) ||
      ms.length > 12 ||
      ms.some(
        (m) =>
          !m ||
          !['X', 'Y', 'Z'].includes(m.basis) ||
          !Number.isInteger(m.shots) ||
          m.shots !== 8 ||
          !Number.isInteger(m.plus) ||
          m.plus < 0 ||
          m.plus > m.shots ||
          !finiteNumber(m.noise) ||
          m.noise !== r.config.noise,
      ) ||
      ms.reduce((a, m) => a + m.shots, 0) > 96
    )
      throw new Error('Invalid quantum measurements.');
  } else if (r.room === 'behaviour') {
    if (r.source !== 'human-behaviour')
      throw new Error('Behaviour records need an explicit source.');
    const ts = r.data as Trial[];
    if (
      !Array.isArray(ts) ||
      ts.length > 120 ||
      ts.some(
        (t, i) =>
          !t ||
          t.index !== i ||
          !['fixed', 'adaptive'].includes(t.condition) ||
          !Number.isInteger(t.target) ||
          t.target < 0 ||
          t.target > 3 ||
          !finiteNumber(t.onsetMs) ||
          t.onsetMs < 0 ||
          !finiteNumber(t.windowMs) ||
          t.windowMs < 500 ||
          t.windowMs > 3000 ||
          !finiteNumber(t.forecastCurrent) ||
          t.forecastCurrent < 0 ||
          t.forecastCurrent > 1 ||
          !finiteNumber(t.forecastHistory) ||
          t.forecastHistory < 0 ||
          t.forecastHistory > 1 ||
          typeof t.correct !== 'boolean' ||
          (t.reactionMs !== null &&
            (!finiteNumber(t.reactionMs) || t.reactionMs < 0)),
      )
    )
      throw new Error('Invalid behaviour trials.');
    if (ts.length) {
      const plan = trialPlan(r.seed, 24);
      if (ts.length > 24) throw new Error('This engine uses 24 trials.');
      ts.forEach((t, i) => {
        if (
          !Number.isInteger(t.falseStarts) ||
          t.falseStarts < 0 ||
          t.falseStarts > 100000 ||
          (i > 0 &&
            t.onsetMs <
              (ts[i - 1].responseMs ?? ts[i - 1].onsetMs + ts[i - 1].windowMs))
        )
          throw new Error('Invalid event history.');
        const expected = makeTrial(
          plan[i],
          ts.slice(0, i),
          t.onsetMs,
          t.response,
          t.responseMs,
          t.falseStarts,
        );
        for (const key of Object.keys(expected) as (keyof Trial)[])
          if (expected[key] !== t[key])
            throw new Error('Trial does not match the recorded protocol.');
      });
    }
    if (r.completed && ts.length !== 24)
      throw new Error('Completed response runs require 24 trials.');
  } else if (r.room === 'instrument') {
    if (
      !['synthetic-signal', 'recorded-signal', 'eeg-hardware'].includes(
        r.source,
      )
    )
      throw new Error('Unknown instrument source.');
    if (!Array.isArray(r.data) || r.data.length > 10000)
      throw new Error('Invalid instrument record.');
    const channels = r.config.channels;
    if (
      !Array.isArray(channels) ||
      !channels.length ||
      channels.length > 128 ||
      channels.some(
        (c) => typeof c !== 'string' || !c.trim() || c.length > 128,
      ) ||
      new Set(channels).size !== channels.length ||
      typeof r.config.device !== 'string' ||
      !r.config.device.trim() ||
      typeof r.config.unit !== 'string' ||
      !r.config.unit.trim() ||
      !finiteNumber(r.config.sampleRate) ||
      r.config.sampleRate <= 0
    )
      throw new Error('Invalid instrument metadata.');
    let last = -Infinity;
    for (const f of r.data) {
      if (
        !f ||
        !finiteNumber(f.timestamp) ||
        f.timestamp <= last ||
        !Array.isArray(f.channels) ||
        f.channels.length !== channels.length ||
        f.channels.some((x: unknown) => !finiteNumber(x))
      )
        throw new Error('Invalid signal frames.');
      last = f.timestamp;
    }
  } else throw new Error('Unknown laboratory.');
  return r;
}
