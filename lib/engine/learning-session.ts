/** Persistent finite system identification. The arithmetic family and probe catalogue
 * are supplied, adapted from discovery-campaign/recursive-toy/engine.mjs.
 * Outcomes are never available to the prediction they score. Replay, not a saved
 * status flag, determines which model is still justified. */
export type MotionProbe = { mass: number; force: number; dt: number; x: number; v: number };
export type MotionValue = { x: number; v: number };
export type MotionModel = { id: string; k: number; e: number; q: number };
export type LearningStatus = 'exploring' | 'pending' | 'admitted' | 'model-gap' | 'revoked';
export type FrozenPrediction = { model: string; value: MotionValue };
type Payload =
  | { kind: 'freeze'; probe: MotionProbe; predictions: FrozenPrediction[]; tolerance: number }
  | { kind: 'outcome'; prediction: number; value: MotionValue; source: string }
  | { kind: 'reuse'; probe: MotionProbe; model: string; value: MotionValue };
export type LearningEvent = Payload & { seq: number; previous: string; checksum: string };
export type LearningLedger = { schema: 'observatory-learning-1'; adapter: 'motion-family-1'; events: LearningEvent[] };
export type LearningCheck = { event: number; probe: MotionProbe; source: string; before: number; remaining: number; status: LearningStatus; validation: boolean; maximumError: number };
export type LearningState = { candidates: MotionModel[]; status: LearningStatus; validationEvents: number[]; pending: (LearningEvent & { kind: 'freeze' }) | null; checks: LearningCheck[]; reuses: number; retired: string[] };
export const LEARNING_TOLERANCE = 1e-8;
export const MAX_LEARNING_EVENTS = 512;
export const MAX_LEARNING_BYTES = 4000000;
export const LEARNING_STORAGE_KEY = 'observatory-learning-1';
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function motionFamily(): MotionModel[] {
  const out: MotionModel[] = [];
  for (const k of [-2, -1, -.5, 0, .5, 1, 2]) for (const e of [-2, -1, 0, 1, 2]) for (const q of [0, .5, 1]) out.push({ id: `motion:${k}:${e}:${q}`, k, e, q });
  return out;
}
export function createLearningLedger(): LearningLedger { return { schema: 'observatory-learning-1', adapter: 'motion-family-1', events: [] }; }
function finite(n: unknown): n is number { return typeof n === 'number' && Number.isFinite(n); }
function objectKeys(raw: unknown, keys: string[]): boolean {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).sort().join('|') === [...keys].sort().join('|');
}
function probe(raw: unknown): MotionProbe {
  const p = raw as MotionProbe;
  if (!objectKeys(p, ['mass', 'force', 'dt', 'x', 'v']) || !Object.values(p).every(finite) || p.mass < .25 || p.mass > 4 || Math.abs(p.force) > 8 || p.dt <= 0 || p.dt > 2 || Math.abs(p.x) > 10 || Math.abs(p.v) > 5) throw new Error('Probe outside the declared domain: mass 0.25–4, force ±8, duration above 0 up to 2, position ±10, velocity ±5.');
  return { mass: p.mass, force: p.force, dt: p.dt, x: p.x, v: p.v };
}
function value(raw: unknown): MotionValue {
  const y = raw as MotionValue;
  if (!objectKeys(y, ['x', 'v']) || !finite(y.x) || !finite(y.v) || Math.abs(y.x) > 10000 || Math.abs(y.v) > 10000) throw new Error('Outcome must contain finite position and velocity within ±10,000.');
  return { x: y.x, v: y.v };
}
export function predictMotion(model: MotionModel, raw: MotionProbe): MotionValue {
  const p = probe(raw);
  const a = model.k * p.force * p.mass ** model.e;
  return value({ x: p.x + p.v * p.dt + model.q * a * p.dt ** 2, v: p.v + a * p.dt });
}
function close(a: MotionValue, b: MotionValue): boolean {
  return (['x', 'v'] as const).every(k => Math.abs(a[k] - b[k]) <= LEARNING_TOLERANCE * Math.max(1, Math.abs(a[k]), Math.abs(b[k])));
}
function canonical(raw: unknown): string {
  if (Array.isArray(raw)) return `[${raw.map(canonical).join(',')}]`;
  if (raw && typeof raw === 'object') return `{${Object.keys(raw).sort().map(k => `${JSON.stringify(k)}:${canonical((raw as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(raw);
}
// Accidental-corruption checksum only. Replay also recomputes every prediction.
// This is not a signature or proof of measurement provenance.
function checksum(raw: unknown): string {
  let h = 2166136261;
  for (const c of canonical(raw)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function eventPayload(e: LearningEvent): Payload {
  if (e.kind === 'freeze') {
    if (!objectKeys(e, ['kind', 'probe', 'predictions', 'tolerance', 'seq', 'previous', 'checksum']) || e.tolerance !== LEARNING_TOLERANCE || !Array.isArray(e.predictions)) throw new Error('Invalid frozen prediction.');
    return { kind: 'freeze', probe: probe(e.probe), predictions: e.predictions, tolerance: e.tolerance };
  }
  if (e.kind === 'outcome') {
    if (!objectKeys(e, ['kind', 'prediction', 'value', 'source', 'seq', 'previous', 'checksum']) || !Number.isInteger(e.prediction) || typeof e.source !== 'string' || !e.source.trim() || e.source.length > 160) throw new Error('An outcome needs its prediction reference and source.');
    return { kind: 'outcome', prediction: e.prediction, value: value(e.value), source: e.source };
  }
  if (e.kind === 'reuse') {
    if (!objectKeys(e, ['kind', 'probe', 'model', 'value', 'seq', 'previous', 'checksum']) || typeof e.model !== 'string') throw new Error('Invalid reuse record.');
    return { kind: 'reuse', probe: probe(e.probe), model: e.model, value: value(e.value) };
  }
  throw new Error('Unknown event type.');
}

export function replayLearning(raw: unknown): LearningState {
  const ledger = raw as LearningLedger;
  if (!objectKeys(ledger, ['schema', 'adapter', 'events']) || ledger.schema !== 'observatory-learning-1' || ledger.adapter !== 'motion-family-1' || !Array.isArray(ledger.events) || ledger.events.length > MAX_LEARNING_EVENTS) throw new Error('Unsupported or oversized learning ledger.');
  const s: LearningState = { candidates: motionFamily(), status: 'exploring', validationEvents: [], pending: null, checks: [], reuses: 0, retired: [] };
  let previous = 'root';
  const measured = new Set<string>();
  for (let i = 0; i < ledger.events.length; i++) {
    const e = ledger.events[i];
    if (!e || e.seq !== i + 1 || e.previous !== previous) throw new Error('Broken event order or lineage.');
    const data = eventPayload(e);
    if (e.checksum !== checksum({ ...data, seq: e.seq, previous })) throw new Error('Event checksum mismatch.');
    previous = e.checksum;
    if (data.kind === 'freeze') {
      if (e.seq >= MAX_LEARNING_EVENTS) throw new Error('Frozen prediction leaves no room for its outcome.');
      if (s.pending || !s.candidates.length) throw new Error('Complete the pending observation, or start a new investigation after a model gap.');
      const expected = s.candidates.map(m => ({ model: m.id, value: predictMotion(m, data.probe) }));
      if (canonical(data.predictions) !== canonical(expected)) throw new Error('Frozen predictions do not match the surviving model family.');
      s.pending = e as LearningEvent & { kind: 'freeze' };
    } else if (data.kind === 'outcome') {
      const frozen = s.pending;
      if (!frozen || frozen.seq !== data.prediction) throw new Error('Record a matching frozen prediction before its outcome.');
      const before = s.candidates.length;
      const oldStatus = s.status;
      const oldModel = s.candidates.length === 1 ? s.candidates[0].id : null;
      const survivors = new Set(frozen.predictions.filter(p => close(p.value, data.value)).map(p => p.model));
      s.candidates = s.candidates.filter(m => survivors.has(m.id));
      const fresh = !measured.has(canonical(frozen.probe));
      const validation = before === 1 && oldStatus === 'pending' && fresh && s.candidates.length === 1;
      if (!s.candidates.length) {
        s.status = oldStatus === 'admitted' ? 'revoked' : 'model-gap';
        if (oldStatus === 'admitted' && oldModel) s.retired.push(oldModel);
        s.validationEvents = [];
      } else if (s.candidates.length === 1) {
        if (before > 1) { s.status = 'pending'; s.validationEvents = []; }
        else if (validation) { s.validationEvents.push(e.seq); if (s.validationEvents.length === 4) s.status = 'admitted'; }
      }
      s.checks.push({ event: e.seq, probe: frozen.probe, source: data.source, before, remaining: s.candidates.length, status: s.status, validation, maximumError: Math.max(...frozen.predictions.map(p => Math.max(Math.abs(p.value.x - data.value.x), Math.abs(p.value.v - data.value.v)))) });
      measured.add(canonical(frozen.probe));
      s.pending = null;
    } else {
      if (s.status !== 'admitted' || s.candidates.length !== 1 || s.pending) throw new Error('Only a currently admitted model can be reused.');
      if (data.model !== s.candidates[0].id || canonical(data.value) !== canonical(predictMotion(s.candidates[0], data.probe))) throw new Error('Reused prediction differs from the admitted model.');
      s.reuses++;
    }
  }
  return copy(s);
}
function append(ledger: LearningLedger, data: Payload): LearningLedger {
  replayLearning(ledger);
  const seq = ledger.events.length + 1;
  const previous = ledger.events.at(-1)?.checksum ?? 'root';
  const next: LearningLedger = { ...copy(ledger), events: [...copy(ledger.events), { ...copy(data), seq, previous, checksum: checksum({ ...data, seq, previous }) }] };
  replayLearning(next);
  return next;
}
export function freezeExperiment(ledger: LearningLedger, raw: MotionProbe): LearningLedger {
  if (ledger.events.length > MAX_LEARNING_EVENTS - 2) throw new Error('No room for a prediction and its outcome. Export this record and start another investigation.');
  const p = probe(raw), s = replayLearning(ledger);
  return append(ledger, { kind: 'freeze', probe: p, tolerance: LEARNING_TOLERANCE, predictions: s.candidates.map(m => ({ model: m.id, value: predictMotion(m, p) })) });
}
export function recordOutcome(ledger: LearningLedger, raw: MotionValue, source: string): LearningLedger {
  const s = replayLearning(ledger);
  if (!s.pending) throw new Error('Freeze a prediction before entering an outcome.');
  return append(ledger, { kind: 'outcome', prediction: s.pending.seq, value: value(raw), source: source.trim() });
}
export function reuseModel(ledger: LearningLedger, raw: MotionProbe): LearningLedger {
  const s = replayLearning(ledger), p = probe(raw);
  if (s.status !== 'admitted') throw new Error('The model is not admitted for reuse.');
  return append(ledger, { kind: 'reuse', model: s.candidates[0].id, probe: p, value: predictMotion(s.candidates[0], p) });
}
export function importLearning(text: string): LearningLedger {
  if (text.length > MAX_LEARNING_BYTES) throw new Error('Ledger exceeds the 4 MB import limit.');
  const ledger = JSON.parse(text) as LearningLedger;
  replayLearning(ledger);
  return ledger;
}
export type ExperimentProposal = { probe: MotionProbe; informationBits: number; reason: string };
export function proposeExperiment(ledger: LearningLedger): ExperimentProposal | null {
  const s = replayLearning(ledger);
  if (s.pending || !s.candidates.length) return null;
  const seen = new Set(s.checks.map(c => canonical(c.probe)));
  const options: ExperimentProposal[] = [];
  for (const mass of [.5, 1, 2, 3]) for (const force of [1, 2]) for (const dt of [.5, 1]) {
    const p = { mass, force, dt, x: 0, v: 0 };
    if (seen.has(canonical(p))) continue;
    const groups: { y: MotionValue; count: number }[] = [];
    for (const m of s.candidates) {
      const y = predictMotion(m, p), g = groups.find(g => close(g.y, y));
      if (g) g.count++; else groups.push({ y, count: 1 });
    }
    const bits = -groups.reduce((sum, g) => { const p = g.count / s.candidates.length; return sum + p * Math.log2(p); }, 0);
    if (s.candidates.length > 1 && bits <= 1e-12) continue;
    options.push({ probe: p, informationBits: bits, reason: s.candidates.length === 1 ? 'A new input to challenge the current candidate.' : 'Largest separation of the surviving candidates among the remaining registered probes.' });
  }
  return options.sort((a, b) => b.informationBits - a.informationBits || a.probe.mass - b.probe.mass || a.probe.force - b.probe.force || a.probe.dt - b.probe.dt)[0] ?? null;
}

/** Teaching source, deliberately separate from candidate inference. This is supplied
 * Newtonian simulation, not a measurement of a physical object. */
export function simulateNewtonian(raw: MotionProbe): MotionValue {
  const p = probe(raw), acceleration = p.force / p.mass;
  return { v: p.v + acceleration * p.dt, x: p.x + p.v * p.dt + .5 * acceleration * p.dt * p.dt };
}
