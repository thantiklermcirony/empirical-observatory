/** Worker/browser port of the accepted quantum-reaction/0.1 reference mechanism.
 * Fixed invariant subspace only. No normalized-survivor approximation or new physics.
 * No imports, network, filesystem, dynamic code or arbitrary matrix inputs.
 */
export const QUANTUM_REFERENCE_PORT_VERSION = 'quantum-reference-ts/0.1';
export const QUANTUM_LIMITS = Object.freeze({ points: 201, preparations: 4, inputBytes: 65536,
  durationRateBudget: 1e6, numericalTolerance: 1e-8, exponentialSquarings: 24 });
export const REFERENCE_SOURCES = Object.freeze({
  model: '0933bc7249a9477dbc9ac9c0e489b1fcb58b6e9fdb84305b6146a38af820eec4',
  solver: '51d75cd066381ffee1ed3335adc3fac1053e403d3e69665c20a0778dd1a61dfe',
});
const PARAMS = ['omega', 'detuning', 'gamma', 'k_s', 'k_t'] as const;
const PREMISES = ['P-H', 'P-E', 'P-R', 'P-I'] as const;
export type QuantumJson = null | string | number | boolean | QuantumJson[] | { [key: string]: QuantumJson };
type JsonObject = { [key: string]: QuantumJson };
type Parameter = typeof PARAMS[number];
type Premise = typeof PREMISES[number];
export type QuantumModel = Record<Parameter, number>;
export interface QuantumPreparation extends JsonObject { id: string; bloch: [number, number, number] }
export interface QuantumProtocol {
  schema_version: 'quantum-reaction/0.1'; model: QuantumModel;
  clock: { units: 'model_time'; end: number; points: number };
  preparations: QuantumPreparation[];
  contrast: { parameter: Parameter; value: number };
  premises: Record<Premise, 'assumed' | 'missing' | 'rejected'>;
}
export interface QuantumRow extends JsonObject { time: number; survival: number; population_s: number; population_t: number;
  coherence_st: [number, number]; yield_s: number; yield_t: number }
export interface QuantumChecks { maximum_trace_error: number; maximum_hermiticity_error: number;
  minimum_eigenvalue: number; maximum_product_decrease: number; maximum_survival_increase: number;
  semigroup_subdivision_max_error: number; scaled_taylor_tail_bound: number;
  maximum_exponential_squarings: number; refinement_subdivisions: number }
export interface QuantumRun { preparation: QuantumPreparation; model: QuantumModel; trajectory: QuantumRow[];
  final: QuantumRow; checks: QuantumChecks; yield_units: string;
  remaining_possible_yield_increment_bound: number; uncertainty: string }
export interface QuantumConclusion extends JsonObject { id: string; status: 'established_in_scope' | 'unresolved';
  result_kind: 'model_prediction' | 'hypothesis_or_analogy'; value: QuantumJson; units: string | null;
  blocked_by: string[]; scope: string; depends_on: string[] }
export interface QuantumEvaluation {
  status: 'established_in_scope' | 'unresolved' | 'execution_error'; result_kind: 'model_prediction';
  value: { conclusions: QuantumConclusion[] } | null; conclusions: QuantumConclusion[];
  runs: QuantumRun[]; contrast: { runs: QuantumRun[]; yield_s_changes: { preparation_id: string; base: number; changed: number; difference: number }[] };
  blocked_by: string[]; error?: { code: 'INVALID_PROTOCOL' | 'NUMERICAL_FAILURE' | 'EXECUTION_FAILURE'; message: string };
  errors: QuantumJson[]; provenance: JsonObject;
  execution: { engine: string; input_sha256: string | null; engine_invoked: boolean;
    reference_source_sha256: typeof REFERENCE_SOURCES; method: string; numerical_tolerance: number;
    verification_scope: string; limits: typeof QUANTUM_LIMITS };
  scope: string; biological_transfer: { status: 'unresolved'; blocked_by: string[]; physical_flux_admitted: false };
}
class ProtocolError extends Error {}
class NumericalError extends Error {}
const scope = 'Specified dimensionless four-level S/T plus product-sink reference model; no intermediate measurement, physical clock or biological calibration.';

function object(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k)))
    throw new ProtocolError(`${label} must contain exactly ${keys.join(', ')}.`);
  return value as Record<string, unknown>;
}
function real(value: unknown, label: string, low: number, high: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high)
    throw new ProtocolError(`${label} must be a finite number in [${low}, ${high}], not a boolean or numeric string.`);
  return value;
}
function model(value: unknown): QuantumModel {
  const m = object(value, PARAMS, 'model');
  return Object.fromEntries(PARAMS.map(k => [k, real(m[k], `model.${k}`,
    k === 'gamma' ? 0 : k === 'k_s' || k === 'k_t' ? 1e-6 : -1e4, 1e4)])) as QuantumModel;
}
/** Strict subset of native admission: at most 201 samples and four preparations.
 * Native equations/ranges are unchanged. The input gateway must reject duplicate JSON keys.
 */
export function validateQuantumProtocol(raw: unknown): QuantumProtocol {
  const q = object(raw, ['schema_version', 'model', 'clock', 'preparations', 'contrast', 'premises'], 'input');
  if (q.schema_version !== 'quantum-reaction/0.1') throw new ProtocolError('Unsupported schema_version.');
  const m = model(q.model), c = object(q.clock, ['units', 'end', 'points'], 'clock');
  if (c.units !== 'model_time') throw new ProtocolError('Only dimensionless model_time is admitted; no physical-time conversion.');
  const end = real(c.end, 'clock.end', 1e-6, 1e4);
  const points = real(c.points, 'clock.points', 2, QUANTUM_LIMITS.points);
  if (!Number.isInteger(points)) throw new ProtocolError('clock.points must be an integer.');
  if (!Array.isArray(q.preparations) || q.preparations.length < 1 || q.preparations.length > QUANTUM_LIMITS.preparations)
    throw new ProtocolError(`One to ${QUANTUM_LIMITS.preparations} preparations are admitted by this port.`);
  const ids = new Set<string>();
  const preparations = q.preparations.map(item => {
    const p = object(item, ['id', 'bloch'], 'preparation');
    if (typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,48}$/.test(p.id) || ids.has(p.id))
      throw new ProtocolError('Preparation IDs must be unique short alphanumeric identifiers.');
    ids.add(p.id);
    if (!Array.isArray(p.bloch) || p.bloch.length !== 3) throw new ProtocolError('bloch must be [x,y,z].');
    const b = p.bloch.map(v => real(v, 'Bloch coordinate', -1, 1)) as [number, number, number];
    if (b[0] ** 2 + b[1] ** 2 + b[2] ** 2 > 1 + 1e-14) throw new ProtocolError('Initial state lies outside the positive Bloch ball.');
    return { id: p.id, bloch: b };
  });
  const p = object(q.premises, PREMISES, 'premises');
  for (const k of PREMISES) if (!['assumed', 'missing', 'rejected'].includes(p[k] as string))
    throw new ProtocolError('Native premises must be assumed, missing or rejected; empirical admission is separate.');
  const contrast = object(q.contrast, ['parameter', 'value'], 'contrast');
  if (!PARAMS.includes(contrast.parameter as Parameter)) throw new ProtocolError('Unsupported contrast parameter.');
  const parameter = contrast.parameter as Parameter;
  const changed = model({ ...m, [parameter]: contrast.value });
  if (changed[parameter] === m[parameter]) throw new ProtocolError('Contrast must change an operation parameter.');
  for (const current of [m, changed]) if (end * PARAMS.reduce((sum, k) => sum + Math.abs(current[k]), 0) > QUANTUM_LIMITS.durationRateBudget)
    throw new ProtocolError('Model duration exceeds the reference compute budget.');
  const validated: QuantumProtocol = { schema_version: 'quantum-reaction/0.1', model: m,
    clock: { units: 'model_time', end, points }, preparations,
    contrast: { parameter, value: changed[parameter] }, premises: { ...p } as QuantumProtocol['premises'] };
  if (new TextEncoder().encode(JSON.stringify(validated)).length > QUANTUM_LIMITS.inputBytes)
    throw new ProtocolError('Protocol byte budget exceeded.');
  return validated;
}

// Invariant coordinates: [rho_SS, rho_TT, Re rho_ST, Im rho_ST, rho_PSPS, rho_PTPT].
// All other entries remain zero under the frozen Hamiltonian/collapse operators.
const N = 6;
type Matrix = Float64Array;
function identity(): Matrix { const a = new Float64Array(N * N); for (let i = 0; i < N; i++) a[i * N + i] = 1; return a; }
function multiply(a: Matrix, b: Matrix): Matrix {
  const c = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
    const x = a[i * N + k];
    for (let j = 0; j < N; j++) c[i * N + j] += x * b[k * N + j];
  }
  return c;
}
function norm(a: Matrix): number {
  let result = 0;
  for (let i = 0; i < N; i++) { let row = 0; for (let j = 0; j < N; j++) row += Math.abs(a[i * N + j]); result = Math.max(result, row); }
  return result;
}
function generator(m: QuantumModel): Matrix {
  const { omega: w, detuning: d, gamma, k_s: s, k_t: t } = m;
  const g = gamma + (s + t) / 2;
  return new Float64Array([
    -s, 0, 0, -w, 0, 0,
    0, -t, 0, w, 0, 0,
    0, 0, -g, d, 0, 0,
    w / 2, -w / 2, -d, -g, 0, 0,
    s, 0, 0, 0, 0, 0,
    0, t, 0, 0, 0, 0,
  ]);
}
function exponential(a: Matrix, dt: number, threshold: number): { matrix: Matrix; tail: number; squarings: number } {
  const size = norm(a) * dt;
  const squarings = Math.max(0, Math.ceil(Math.log2(size / threshold)));
  if (!Number.isFinite(size) || squarings > QUANTUM_LIMITS.exponentialSquarings) throw new NumericalError('Matrix-exponential scaling budget exceeded.');
  const scaled = Float64Array.from(a, v => v * (dt / 2 ** squarings)), magnitude = norm(scaled);
  let term = identity(), sum = identity(), termBound = 1, tail = Infinity;
  for (let k = 1; k <= 32; k++) {
    term = multiply(term, scaled);
    for (let i = 0; i < term.length; i++) { term[i] /= k; sum[i] += term[i]; }
    termBound *= magnitude / k;
    tail = (termBound * magnitude / (k + 1)) / (1 - magnitude / (k + 2));
    if (tail <= 2e-18) break;
  }
  if (tail > 2e-18) throw new NumericalError('Matrix exponential did not converge within its degree budget.');
  for (let k = 0; k < squarings; k++) sum = multiply(sum, sum);
  if (!sum.every(Number.isFinite)) throw new NumericalError('Nonfinite matrix exponential.');
  return { matrix: sum, tail, squarings };
}
function apply(a: Matrix, state: number[]): number[] {
  return Array.from({ length: N }, (_, i) => {
    let sum = 0; for (let j = 0; j < N; j++) sum += a[i * N + j] * state[j]; return sum;
  });
}
function initial(p: QuantumPreparation): number[] { const [x, y, z] = p.bloch; return [(1 + z) / 2, (1 - z) / 2, x / 2, -y / 2, 0, 0]; }
function trajectory(step: Matrix, p: QuantumPreparation, points: number, subdivisions: number): number[][] {
  let current = initial(p); const rows = [current];
  for (let i = 1; i < points; i++) { for (let j = 0; j < subdivisions; j++) current = apply(step, current); rows.push(current); }
  return rows;
}
function row(v: number[], time: number): QuantumRow { return { time, survival: v[0] + v[1], population_s: v[0], population_t: v[1], coherence_st: [v[2], v[3]], yield_s: v[4], yield_t: v[5] }; }
function diagnostics(states: number[][]): Omit<QuantumChecks, 'semigroup_subdivision_max_error' | 'scaled_taylor_tail_bound' | 'maximum_exponential_squarings' | 'refinement_subdivisions'> {
  let trace = 0, eigen = Infinity, product = 0, survival = 0;
  for (let i = 0; i < states.length; i++) {
    const v = states[i];
    if (!v.every(Number.isFinite)) throw new NumericalError('Nonfinite density state.');
    trace = Math.max(trace, Math.abs(v[0] + v[1] + v[4] + v[5] - 1));
    const survivalEigen = (v[0] + v[1] - Math.hypot(v[0] - v[1], 2 * v[2], 2 * v[3])) / 2;
    eigen = Math.min(eigen, survivalEigen, v[4], v[5]);
    if (i) { const old = states[i - 1]; product = Math.max(product, old[4] - v[4], old[5] - v[5]); survival = Math.max(survival, v[0] + v[1] - old[0] - old[1]); }
  }
  if (Math.max(trace, -eigen, product, survival) > QUANTUM_LIMITS.numericalTolerance)
    throw new NumericalError(`Physical-invariant check failed: trace=${trace}, minEigen=${eigen}, productDecrease=${product}, survivalIncrease=${survival}.`);
  return { maximum_trace_error: trace, maximum_hermiticity_error: 0, minimum_eigenvalue: eigen,
    maximum_product_decrease: product, maximum_survival_increase: survival };
}
function simulateAll(m: QuantumModel, protocol: QuantumProtocol): QuantumRun[] {
  const { end, points } = protocol.clock, dt = end / (points - 1), g = generator(m);
  const coarse = exponential(g, dt, 0.5), fine = exponential(g, dt / 3, 0.25);
  return protocol.preparations.map(preparation => {
    const states = trajectory(coarse.matrix, preparation, points, 1), refined = trajectory(fine.matrix, preparation, points, 3);
    const checks = diagnostics(states); diagnostics(refined);
    let difference = 0;
    for (let i = 0; i < points; i++) {
      for (let j = 0; j < N; j++) difference = Math.max(difference, Math.abs(states[i][j] - refined[i][j]));
      difference = Math.max(difference, Math.hypot(states[i][2] - refined[i][2], states[i][3] - refined[i][3]));
    }
    if (difference > QUANTUM_LIMITS.numericalTolerance) throw new NumericalError(`Semigroup subdivision discrepancy ${difference} exceeds tolerance.`);
    const rows = states.map((v, i) => row(v, end * i / (points - 1)));
    return { preparation, model: m, trajectory: rows, final: rows[rows.length - 1],
      checks: { ...checks, semigroup_subdivision_max_error: difference,
        scaled_taylor_tail_bound: Math.max(coarse.tail, fine.tail),
        maximum_exponential_squarings: Math.max(coarse.squarings, fine.squarings), refinement_subdivisions: 3 },
      yield_units: 'fraction of initial prepared ensemble', remaining_possible_yield_increment_bound: rows[rows.length - 1].survival,
      uncertainty: 'Sampled physical invariants and numerical convergence checks only; no empirical interval or rigorous floating-point enclosure.' };
  });
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(value);
}
async function inputHash(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
/** No expected admission or numerical failure escapes as a successful prediction. */
export async function evaluateQuantumReference(raw: unknown): Promise<QuantumEvaluation> {
  const result: QuantumEvaluation = { status: 'execution_error', result_kind: 'model_prediction',
    value: null, conclusions: [], runs: [], contrast: { runs: [], yield_s_changes: [] }, blocked_by: [], scope,
    errors: [], provenance: { engine: QUANTUM_REFERENCE_PORT_VERSION, native_schema: 'quantum-reaction/0.1',
      reference_source_sha256: { ...REFERENCE_SOURCES }, input_sha256: null,
      evidence: 'Constructed model calculation; no empirical data or physical calibration.',
      numerical_method: 'Fixed six-real-coordinate invariant restriction; scaled Taylor exponential with factor-three subdivision.',
      numerical_tolerance: QUANTUM_LIMITS.numericalTolerance,
      verification_scope: 'Sampled invariants and numerical agreement, not a rigorous floating-point enclosure.' },
    biological_transfer: { status: 'unresolved', blocked_by: ['P-BIO'], physical_flux_admitted: false },
    execution: { engine: QUANTUM_REFERENCE_PORT_VERSION, input_sha256: null, engine_invoked: false,
      reference_source_sha256: REFERENCE_SOURCES, method: 'Exact invariant six-real-coordinate restriction; scaled Taylor matrix exponential, independent factor-three subdivision.',
      numerical_tolerance: QUANTUM_LIMITS.numericalTolerance,
      verification_scope: 'Finite sampled checks, not a formal error certificate; scaled Taylor tail excludes floating-point and squaring errors.', limits: QUANTUM_LIMITS } };
  let protocol: QuantumProtocol;
  try { protocol = validateQuantumProtocol(raw); }
  catch (error) { result.error = { code: 'INVALID_PROTOCOL', message: error instanceof Error ? error.message : 'Invalid protocol.' }; result.errors = [result.error]; return result; }
  try { result.execution.input_sha256 = await inputHash(protocol); }
  catch (error) { result.error = { code: 'EXECUTION_FAILURE', message: error instanceof Error ? error.message : 'Input provenance hashing failed.' }; result.errors = [result.error]; return result; }
  result.provenance.input_sha256 = result.execution.input_sha256;
  result.blocked_by = PREMISES.filter(p => protocol.premises[p] !== 'assumed');
  if (result.blocked_by.length) { result.status = 'unresolved'; return result; }
  try {
    result.execution.engine_invoked = true;
    const runs = simulateAll(protocol.model, protocol);
    const changed = { ...protocol.model, [protocol.contrast.parameter]: protocol.contrast.value };
    const contrastRuns = simulateAll(changed, protocol);
    const changes = runs.map((r, i) => ({ preparation_id: r.preparation.id, base: r.final.yield_s,
      changed: contrastRuns[i].final.yield_s, difference: contrastRuns[i].final.yield_s - r.final.yield_s }));
    result.runs = runs; result.contrast = { runs: contrastRuns, yield_s_changes: changes };
    result.conclusions = [
      { id: 'Q-REFERENCE-YIELDS', result_kind: 'model_prediction', status: 'established_in_scope', value: runs.map(r => ({ preparation: r.preparation, final: r.final })), units: 'dimensionless fractions of initial ensemble', blocked_by: [], scope, depends_on: [...PREMISES] },
      { id: 'Q-REFERENCE-CONTRAST', result_kind: 'model_prediction', status: 'established_in_scope', value: changes, units: 'dimensionless', blocked_by: [], scope: 'Changed operation in the same reference model; no physical likelihood.', depends_on: [...PREMISES] },
      { id: 'Q-REDOX-MAP', result_kind: 'hypothesis_or_analogy', status: 'unresolved', value: null, units: null, blocked_by: ['P-BIO'], scope: 'Reference yields are not redox fluxes or concentrations; independent species, clock, volume, stoichiometry and observation calibration are absent.', depends_on: ['P-BIO'] },
    ];
    result.value = { conclusions: result.conclusions }; result.status = 'established_in_scope'; return result;
  } catch (error) {
    result.error = { code: 'NUMERICAL_FAILURE', message: error instanceof Error ? error.message : 'Numerical execution failed.' };
    result.errors = [result.error];
    return result;
  }
}
