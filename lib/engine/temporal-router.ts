/** Portable, bounded execution of declared scientific operations.
 * Engineering port of the reviewed temporal grammar spine; no text inference,
 * external commands, data collection, physical calibration or quantum solver.
 */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type Issue = { code: string; message: string; [key: string]: Json };
export type Clock = { kind: string; unit: string };
export type Time = { value: string | number; unit: string };
export type Contract = { meaning: string; role: string; unit: string; shape: Json };
export type Quantity = Contract & { id: string; value?: Json; preparation_id?: string; time?: Time };
export type InputRef = string | { step: string };
export type Operation = { id: string; verb: string; kind: string; inputs: Record<string, InputRef>; after?: string[]; requested_output?: Contract };
export type Inquiry = {
  identity: { id: string; revision: number }; question: JsonObject;
  system: { jurisdiction: string }; observer: { preparation_id: string; clock: Clock; time?: Time };
  quantities: Quantity[]; operations: Operation[]; constraints: JsonObject; mechanism: JsonObject;
  premises: { id: string; status: string }[]; execution: JsonObject; results: Json;
  contrast: JsonObject; next_question: JsonObject; provenance: JsonObject;
};
export type Port = { meaning: string; role: string; units: string[]; shape: Json; contextual?: boolean };
export type Capability = {
  id: string; verb: string; kind: string; jurisdictions: string[]; owner: string;
  inputs: Record<string, Port>; output: Contract; premises: string[]; clock: Clock;
  scope: string; result_kind: string; enabled: boolean; observation_time?: Time;
  allow_observation_time?: boolean; implementation: 'portable_exact' | 'requires_adapter' | 'trusted_adapter';
};
export type QuantumReferenceEvaluation = {
  status: 'established_in_scope' | 'unresolved' | 'execution_error'; result_kind: 'model_prediction';
  conclusions: Json[]; blocked_by?: string[]; errors?: Json[]; provenance?: JsonObject;
};
export type QuantumReferenceExecutor = (protocol: unknown) => Promise<QuantumReferenceEvaluation>;
export type RuntimeIdentity = { id: string; source_sha256: string };
/** Trusted application configuration; never accept this object from an HTTP question. */
export type TemporalRuntimeOptions = {
  implementationIdentity?: RuntimeIdentity;
  quantumReference?: { execute: QuantumReferenceExecutor; identity: RuntimeIdentity };
};
export type TemporalStep = {
  id: string; status: 'ready' | 'blocked'; capability_id: string | null;
  candidate_capability_id: string | null; owner: string | null; bindings: Record<string, InputRef>;
  depends_on: string[]; premise_ids: string[]; issues: Issue[]; output_contract: Contract | null;
};
export type TemporalPlan = {
  inquiry_id: string; revision: number; word: { id: string; verb: string; kind: string }[];
  steps: TemporalStep[]; status: 'ready' | 'partial' | 'blocked'; issues: Issue[];
};
export type TemporalResult = {
  id: string; status: 'established_in_scope' | 'unresolved' | 'execution_error'; value: Json;
  unit: string | null; result_kind: string; depends_on: string[]; premise_ids: string[];
  issues: Issue[]; capability_id: string | null; scope: string; interpretation: string;
  support: JsonObject; support_sha256: string;
  adapter_artifact?: Json;
};
export type TemporalReport = Omit<Inquiry, 'results' | 'execution'> & {
  results: TemporalResult[];
  execution: {
    router: string; mode: string; input_sha256: string; scientific_word: TemporalPlan['word'];
    plan: TemporalPlan; jobs: JsonObject[]; effective_models: Record<string, string | null>;
    status: 'complete_in_declared_scope' | 'partial_or_gap'; receipt_sha256: string;
    implementation_identity: JsonObject; integrity_scope: string;
  };
};

export const TEMPORAL_VERSION = 'temporal-router-ts/0.1.0';
export const INQUIRY_FIELDS = Object.freeze('identity question system observer quantities operations constraints mechanism premises execution results contrast next_question provenance'.split(' '));
export const TEMPORAL_LIMITS = Object.freeze({ inputBytes: 65536, previousBytes: 2000000, steps: 32, quantities: 128, premises: 128, depth: 32, nodes: 20000, rationalChars: 160, rationalBits: 512, arithmeticBits: 4096 });
const PHYSICAL = new Set(['action', 'wait', 'instrument']);
const KINDS = new Set([...PHYSICAL, 'derive', 'compare']);
const AVAILABLE = new Set(['assumed', 'observed', 'derived', 'imported_theorem']);
const TRANSFER_GAPS = ['QMAP-SYSTEM', 'QMAP-CLOCK', 'QMAP-FLUX', 'QMAP-OBSERVER', 'QMAP-EXPERIMENTAL-UNIT', 'QMAP-CAUSAL'];
const SOURCE_IDENTITY: JsonObject = {
  implementation_revision: TEMPORAL_VERSION,
  parent: 'accepted temporal-grammar-spine/0.1',
  parent_grammar_sha256: '62db5bb854b52667969f1a18407d32591640af2fb191c36c7a27472dfb3d852e',
  parent_worker_sha256: '751574fe5724d5b2ec785ca89c4d2232b2e2f88e2454e82832a9a004e6253180',
  arithmetic: 'normalized BigInt rationals; projective and contraction point maps; monotone rectangle extrema',
  identity_scope: 'Declared implementation revision and accepted source references. Deployment owner must separately bind the actual built asset hash; this is not a runtime source-file check.',
};

export class TemporalInputError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.name = 'TemporalInputError'; this.code = code; }
}
function fail(code: string, message: string): never { throw new TemporalInputError(code, message); }
function issue(code: string, message: string, context: JsonObject = {}): Issue { return { code, message, ...context }; }
function isObject(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function object(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) fail('invalid_schema', `${label} must be an object`);
}
function exact(value: unknown, required: readonly string[], optional: readonly string[] = [], label = 'object'): void {
  object(value, label);
  if (required.some(k => !Object.hasOwn(value, k)) || Object.keys(value).some(k => !required.includes(k) && !optional.includes(k)))
    fail('invalid_schema', `Unexpected or missing ${label} fields`);
}
function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) fail('invalid_schema', `${label} must be a nonempty string of at most 512 characters`);
}
function list(value: unknown, label: string): asserts value is unknown[] { if (!Array.isArray(value)) fail('invalid_schema', `${label} must be a list`); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

/** Sorted-key JSON profile for this JS port, not byte-equivalent to Python float formatting. */
export function canonicalTemporalJson(value: unknown, maxBytes: number = TEMPORAL_LIMITS.previousBytes): string {
  const ancestors = new Set<object>(); let nodes = 0;
  function encode(v: unknown, depth: number): string {
    if (++nodes > TEMPORAL_LIMITS.nodes || depth > TEMPORAL_LIMITS.depth) fail('input_budget', 'JSON nesting or node budget exceeded');
    if (v === null || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'string') { if (v.length > maxBytes) fail('input_budget', 'String exceeds byte budget'); return JSON.stringify(v); }
    if (typeof v === 'number') {
      if (!Number.isFinite(v) || (Number.isInteger(v) && !Number.isSafeInteger(v))) fail('invalid_json', 'Use finite JSON numbers; encode large exact integers as strings');
      return JSON.stringify(v);
    }
    if (typeof v !== 'object' || v === null || ancestors.has(v)) fail('invalid_json', 'Only acyclic JSON data is admitted');
    const proto = Object.getPrototypeOf(v);
    if (proto !== (Array.isArray(v) ? Array.prototype : Object.prototype) && proto !== null) fail('invalid_json', 'Only plain JSON objects are admitted');
    ancestors.add(v);
    const keys = Reflect.ownKeys(v);
    for (const key of keys) {
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key)) fail('invalid_json', 'Unsupported object key');
      const descriptor = Object.getOwnPropertyDescriptor(v, key)!;
      if (!('value' in descriptor)) fail('invalid_json', 'Object accessors are not JSON');
      if (!descriptor.enumerable && !(Array.isArray(v) && key === 'length')) fail('invalid_json', 'Non-enumerable properties are not JSON');
    }
    let result: string;
    if (Array.isArray(v)) {
      if (keys.length !== v.length + 1 || v.length > TEMPORAL_LIMITS.nodes) fail('invalid_json', 'Sparse or extended arrays are not admitted');
      result = '[' + v.map(x => encode(x, depth + 1)).join(',') + ']';
    } else {
      result = '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + encode((v as Record<string, unknown>)[k], depth + 1)).join(',') + '}';
    }
    ancestors.delete(v); return result;
  }
  const encoded = encode(value, 0);
  if (new TextEncoder().encode(encoded).length > maxBytes) fail('input_budget', `JSON exceeds ${maxBytes} bytes`);
  return encoded;
}
export async function hashTemporalJson(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalTemporalJson(value));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, '0')).join('');
}
function same(a: unknown, b: unknown): boolean { return canonicalTemporalJson(a) === canonicalTemporalJson(b); }
function union(...groups: string[][]): string[] { return [...new Set(groups.flat())]; }
function records<T extends { id: string }>(raw: unknown, label: string, limit: number): Map<string, T> {
  list(raw, label); if (raw.length > limit) fail('input_budget', `${label} budget exceeded`);
  const result = new Map<string, T>();
  for (const value of raw) {
    object(value, label); text(value.id, `${label}.id`);
    if (result.has(value.id)) fail('invalid_schema', `Duplicate ${label} id: ${value.id}`);
    result.set(value.id, value as T);
  }
  return result;
}
function validateClock(clock: unknown): void { exact(clock, ['kind', 'unit'], [], 'clock'); const c = clock as Clock; text(c.kind, 'clock.kind'); text(c.unit, 'clock.unit'); }
function validateTime(time: unknown): void {
  exact(time, ['value', 'unit'], [], 'time'); const t = time as Time; text(t.unit, 'time.unit');
  if (!['string', 'number'].includes(typeof t.value) || t.value === '') fail('invalid_schema', 'Time must contain explicit numeric data');
}
function validateContract(c: unknown): void {
  exact(c, ['meaning', 'role', 'unit', 'shape'], [], 'quantity contract'); const value = c as Contract;
  text(value.meaning, 'meaning'); text(value.role, 'role'); text(value.unit, 'unit'); if (value.shape === null) fail('invalid_schema', 'Shape must be explicit');
}
function validateInquiry(raw: unknown): Inquiry {
  canonicalTemporalJson(raw, TEMPORAL_LIMITS.inputBytes);
  exact(raw, INQUIRY_FIELDS, [], 'fourteen-field inquiry'); const q = raw as Inquiry;
  exact(q.identity, ['id', 'revision'], [], 'identity'); text(q.identity.id, 'identity.id');
  if (!Number.isSafeInteger(q.identity.revision) || q.identity.revision < 1) fail('invalid_schema', 'Revision must be an integer >= 1');
  exact(q.system, ['jurisdiction'], [], 'system'); text(q.system.jurisdiction, 'jurisdiction');
  exact(q.observer, ['preparation_id', 'clock'], ['time'], 'observer'); text(q.observer.preparation_id, 'preparation_id'); validateClock(q.observer.clock);
  if (Object.hasOwn(q.observer, 'time')) validateTime(q.observer.time);
  for (const field of ['question', 'execution', 'constraints', 'mechanism', 'contrast', 'next_question', 'provenance'] as const) object(q[field], field);
  for (const item of records<Quantity>(q.quantities, 'quantities', TEMPORAL_LIMITS.quantities).values()) {
    exact(item, ['id', 'meaning', 'role', 'unit', 'shape'], ['value', 'preparation_id', 'time'], 'quantity');
    validateContract({ meaning: item.meaning, role: item.role, unit: item.unit, shape: item.shape });
    if (Object.hasOwn(item, 'preparation_id')) text(item.preparation_id, 'quantity.preparation_id');
    if (Object.hasOwn(item, 'time')) validateTime(item.time);
  }
  for (const p of records<{ id: string; status: string }>(q.premises, 'premises', TEMPORAL_LIMITS.premises).values()) { exact(p, ['id', 'status'], [], 'premise'); text(p.status, 'premise.status'); }
  records<Operation>(q.operations, 'operations', TEMPORAL_LIMITS.steps);
  return clone(q);
}

function port(meaning: string, role: string, units: string[], shape: Json = 'scalar', contextual = false): Port { return { meaning, role, units, shape, contextual }; }
function output(meaning: string, role: string, unit: string, shape: Json = 'scalar'): Contract { return { meaning, role, unit, shape }; }
function runtimeOptions(options: TemporalRuntimeOptions): TemporalRuntimeOptions {
  exact(options, [], ['implementationIdentity', 'quantumReference'], 'trusted runtime options');
  const identity = (value: RuntimeIdentity) => {
    exact(value, ['id', 'source_sha256'], [], 'implementation identity'); text(value.id, 'implementation.id');
    if (typeof value.source_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.source_sha256)) fail('invalid_configuration', 'Configured source identity requires SHA256');
  };
  if (Object.hasOwn(options, 'implementationIdentity')) identity(options.implementationIdentity!);
  if (Object.hasOwn(options, 'quantumReference')) {
    if (!options.quantumReference) fail('invalid_configuration', 'Configured quantum adapter cannot be null');
    exact(options.quantumReference, ['execute', 'identity'], [], 'quantum adapter'); identity(options.quantumReference.identity);
    if (typeof options.quantumReference.execute !== 'function') fail('invalid_configuration', 'Configured adapter must be a function');
  }
  return { ...(options.implementationIdentity ? { implementationIdentity: clone(options.implementationIdentity) } : {}),
    ...(options.quantumReference ? { quantumReference: { execute: options.quantumReference.execute, identity: clone(options.quantumReference.identity) } } : {}) };
}
export function temporalCatalogue(options: TemporalRuntimeOptions = {}): Capability[] {
  const runtime = runtimeOptions(options);
  const action = (projective: boolean): Capability => ({
    id: projective ? 'math.projective.action' : 'math.contraction.action', verb: projective ? 'align' : 'contract', kind: 'action', jurisdictions: ['bounded_scalar_model'], owner: 'mathematics', enabled: true,
    inputs: { state: port('bounded_scalar_state', 'state', ['1']), parameter: port(projective ? 'action_parameter' : 'contraction_factor', 'parameter', ['1']) },
    output: output('bounded_scalar_state', 'state', '1'), premises: [projective ? 'DECLARED-PROJECTIVE' : 'DECLARED-CONTRACTION', 'FIXED-CALIBRATION'], clock: { kind: 'action_index', unit: '1' },
    scope: 'Exact declared bounded scalar map; no physical mechanism inferred.', result_kind: 'formal_under_premises', implementation: 'portable_exact',
  });
  return [action(true), action(false), {
    id: 'biology.resource.ceiling', verb: 'bound_resource', kind: 'derive', jurisdictions: ['synthetic_redox_resource_model'], owner: 'biology+mathematics', enabled: true,
    inputs: { fraction: port('reduced_fraction_q', 'observable', ['1'], 'scalar', true), total_pool: port('glutathione_total_pool', 'resource', ['mM'], 'interval', true), nadph: port('nadph_reserve', 'resource', ['mM', 'uM'], 'interval', true), target: port('gpx_extent_target', 'parameter', ['mM']) },
    output: output('gpx_necessary_resource_ceiling', 'bound', 'mM', 'object'),
    premises: ['BIO-VOLUME', 'BIO-LEDGER', 'BIO-NONNEG', 'BIO-SUPPLY', 'BIO-UNIT-MAP', 'BIO-MATCHED-UNIT', 'BIO-ASSAY-CALIBRATION'],
    clock: { kind: 'physical', unit: 'min' }, observation_time: { value: '0', unit: 'min' },
    scope: 'Time-zero stocks, fixed volume, source ceiling 0.003 mM/min over 20 min. Possible necessary ceilings, not achieved extent or survival.', result_kind: 'formal_under_premises', implementation: 'portable_exact',
  }, {
    id: 'quantum.reference.evolve', verb: 'predict_yields', kind: 'derive', jurisdictions: ['quantum_reference_model'], owner: 'quantum', enabled: true, allow_observation_time: false,
    inputs: { protocol: port('four_level_reference_protocol', 'mechanism', ['model_time'], 'object') }, output: output('reference_product_yields', 'prediction', '1', 'object'),
    premises: ['P-H', 'P-E', 'P-R', 'P-I'], clock: { kind: 'model', unit: 'model_time' },
    scope: 'Conditional four-level reference model; a separately configured and reviewed adapter is required. No physical or quantum-to-redox calibration is implied.', result_kind: 'model_prediction', implementation: runtime.quantumReference ? 'trusted_adapter' : 'requires_adapter',
  }];
}

export function compileTemporalInquiry(raw: unknown, options: TemporalRuntimeOptions = {}): TemporalPlan {
  const q = validateInquiry(raw), caps = temporalCatalogue(options);
  const quantities = new Map(q.quantities.map(x => [x.id, x])), premises = new Map(q.premises.map(x => [x.id, x]));
  const operations = new Map(q.operations.map(x => [x.id, x]));
  const declarations: Issue[] = []; let models: Record<string, string> | null = null;
  if (Object.keys(q.mechanism).length) {
    if (!same(Object.keys(q.mechanism), ['models']) || !isObject(q.mechanism.models) || Object.values(q.mechanism.models).some(x => typeof x !== 'string' || !x.trim()))
      declarations.push(issue('unsupported_mechanism', 'Use {} or a complete models mapping from step IDs to registered capability IDs.'));
    else {
      models = q.mechanism.models as Record<string, string>;
      if (!same(Object.keys(models).sort(), [...operations.keys()].sort())) declarations.push(issue('unsupported_mechanism', 'Mechanism must name exactly the declared steps.'));
      for (const [id, model] of Object.entries(models)) if (!caps.some(c => c.id === model)) declarations.push(issue('unsupported_mechanism', 'Unregistered model.', { step_id: id, capability_id: model }));
    }
  }
  if (Object.keys(q.constraints).length) declarations.push(issue('unsupported_constraints', 'Only {} is supported; additional constraints require an admitted adapter.'));
  const compression = (Object.hasOwn(q.execution, 'compression') ? q.execution.compression : 'ordered') !== 'ordered';
  const steps: TemporalStep[] = [], done = new Map<string, TemporalStep>(); let lastPhysical: string | null = null, lastState: string | null = null;
  for (const op of q.operations) {
    exact(op, ['id', 'verb', 'kind', 'inputs'], ['after', 'requested_output'], 'operation'); text(op.verb, 'verb'); text(op.kind, 'kind'); object(op.inputs, 'inputs');
    if (!KINDS.has(op.kind)) fail('invalid_schema', 'Unknown operation kind');
    if (Object.hasOwn(op, 'requested_output')) validateContract(op.requested_output);
    const after = op.after === undefined ? [] : op.after; list(after, 'after');
    if (new Set(after).size !== after.length) fail('invalid_schema', 'Duplicate after dependency');
    for (const id of after) { text(id, 'after reference'); if (!done.has(id)) fail('invalid_schema', 'after must reference an earlier step'); }
    const actuals = new Map<string, Quantity | Contract | null>(), refs: string[] = [], issues: Issue[] = [];
    for (const [portId, ref] of Object.entries(op.inputs)) {
      text(portId, 'port');
      if (typeof ref === 'string') {
        const value = quantities.get(ref); if (!value) fail('invalid_schema', `Unknown quantity: ${ref}`); actuals.set(portId, value);
        if (value.value === undefined || value.value === null) issues.push(issue('missing_value', 'Required input value is missing.', { port: portId, quantity_id: ref }));
        if ((value.preparation_id ?? q.observer.preparation_id) !== q.observer.preparation_id) issues.push(issue('preparation_mismatch', 'Input belongs to a different preparation.', { port: portId }));
      } else {
        exact(ref, ['step'], [], 'step reference'); text(ref.step, 'step reference'); const previous = done.get(ref.step);
        if (!previous) fail('invalid_schema', 'Inputs must reference an earlier step'); refs.push(ref.step); actuals.set(portId, previous.output_contract);
      }
    }
    const dependencies = union(after, refs, PHYSICAL.has(op.kind) && lastPhysical ? [lastPhysical] : []);
    const inherited = union(...dependencies.map(id => done.get(id)!.premise_ids));
    for (const id of dependencies) if (done.get(id)!.status !== 'ready') issues.push(issue('dependency_blocked', 'Required earlier step is blocked.', { dependency_id: id }));
    if (compression) issues.push(issue('compression_not_admitted', 'Only ordered execution is admitted; counts or pairs are not a closure certificate.'));
    const candidates = caps.filter(c => c.verb === op.verb && c.kind === op.kind && c.jurisdictions.includes(q.system.jurisdiction));
    // This fixed catalogue has one registered descriptor per verb/kind/jurisdiction.
    if (candidates.length > 1) fail('ambiguous_capability', 'No unique trusted capability');
    const cap = candidates[0] ?? null;
    if (!cap) {
      issues.push(issue('unsupported_operation', 'No registered capability for this verb, kind and jurisdiction.'));
      if (op.verb === 'infer_quantum_redox') issues.push(issue('missing_transfer_map', 'No admitted quantum-to-redox species, clock, flux, observation, experimental-unit or causal map.', { missing_premises: TRANSFER_GAPS }));
    } else {
      for (const p of Object.keys(cap.inputs).sort()) if (!Object.hasOwn(op.inputs, p)) issues.push(issue('missing_input_port', 'Required input port is missing.', { port: p }));
      for (const p of Object.keys(op.inputs).sort()) if (!Object.hasOwn(cap.inputs, p)) issues.push(issue('extra_input_port', 'Undeclared input would be ignored.', { port: p }));
      for (const [p, expected] of Object.entries(cap.inputs)) {
        if (!Object.hasOwn(op.inputs, p)) continue;
        const actual = actuals.get(p)!;
        if (PHYSICAL.has(op.kind) && expected.role === 'state' && lastState && !same(op.inputs[p], { step: lastState })) issues.push(issue('state_lineage_mismatch', 'Use the preceding physical state output; no reset or branch is inferred.', { port: p, required_step: lastState }));
        if (!actual) { issues.push(issue('output_contract_unavailable', 'Earlier output has no unique contract.', { port: p })); continue; }
        for (const key of ['meaning', 'role', 'shape'] as const) if (!same(actual[key], expected[key])) issues.push(issue(`input_${key}_mismatch`, `Input ${key} differs from the capability.`, { port: p }));
        if (!expected.units.includes(actual.unit)) issues.push(issue('input_unit_mismatch', 'Input unit is not admitted; no conversion is inferred.', { port: p }));
        const a = actual as Quantity;
        if (cap.allow_observation_time === false && Object.hasOwn(a, 'time')) issues.push(issue('input_time_not_supported', 'This whole-protocol capability does not accept an input observation time.', { port: p }));
        if (expected.contextual) {
          if (a.preparation_id !== q.observer.preparation_id) issues.push(issue('context_preparation_missing_or_mismatched', 'Contextual input requires the same declared preparation.', { port: p }));
          if (!a.time || !q.observer.time || !same(a.time, q.observer.time) || a.time.unit !== q.observer.clock.unit) issues.push(issue('context_time_missing_or_mismatched', 'Input requires the exact declared observation time and clock.', { port: p }));
        }
      }
      if (op.requested_output && !same(op.requested_output, cap.output)) issues.push(issue('requested_output_mismatch', 'The capability does not return the requested meaning, role, unit and shape.'));
      if (!same(cap.clock, q.observer.clock)) issues.push(issue('clock_mismatch', 'Observer and capability clocks differ.'));
      if (cap.allow_observation_time === false && Object.hasOwn(q.observer, 'time')) issues.push(issue('observation_time_not_supported', 'The native protocol owns its clock grid; explicit observer time is unsupported.'));
      if (cap.observation_time && (!q.observer.time || !same(cap.observation_time, q.observer.time))) issues.push(issue('observation_time_not_supported', 'The capability does not support this observation time.'));
      for (const id of cap.premises) if (!AVAILABLE.has(premises.get(id)?.status ?? '')) issues.push(issue('premise_unavailable', 'Required premise is absent or unavailable.', { premise_id: id }));
      if (cap.implementation === 'requires_adapter') {
        issues.push(issue('requires_adapter', 'The native four-level quantum solver is not available in this portable runtime. No prediction was computed.', { capability_id: cap.id }));
        issues.push(issue('missing_transfer_map', 'No physical-time, concentration or quantum-to-redox calibration is admitted.', { missing_premises: TRANSFER_GAPS }));
      }
    }
    if (models && models[op.id] !== cap?.id) declarations.push(issue('mechanism_mismatch', 'Declared mechanism does not match the selected capability.', { step_id: op.id, declared_capability_id: models[op.id] ?? null, selected_capability_id: cap?.id ?? null }));
    const ready = issues.length === 0;
    const step: TemporalStep = { id: op.id, status: ready ? 'ready' : 'blocked', capability_id: ready ? cap!.id : null, candidate_capability_id: cap?.id ?? null, owner: cap?.owner ?? null, bindings: ready ? clone(op.inputs) : {}, depends_on: dependencies, premise_ids: union(inherited, cap?.premises ?? []), issues, output_contract: cap ? clone(cap.output) : null };
    steps.push(step); done.set(op.id, step);
    if (PHYSICAL.has(op.kind)) { lastPhysical = op.id; if (cap?.output.role === 'state') lastState = op.id; }
  }
  if (declarations.length) for (const step of steps) { step.status = 'blocked'; step.capability_id = null; step.bindings = {}; step.issues.push(...clone(declarations)); }
  const readyCount = steps.filter(s => s.status === 'ready').length;
  return { inquiry_id: q.identity.id, revision: q.identity.revision, word: q.operations.map(({ id, verb, kind }) => ({ id, verb, kind })), steps, issues: declarations,
    status: declarations.length || compression || (steps.length > 0 && readyCount === 0) ? 'blocked' : readyCount === steps.length ? 'ready' : 'partial' };
}

function abs(n: bigint): bigint { return n < 0n ? -n : n; }
function bits(n: bigint): number { return abs(n).toString(2).length; }
function gcd(a: bigint, b: bigint): bigint { a = abs(a); b = abs(b); while (b) { const r = a % b; a = b; b = r; } return a; }
class Rational {
  n: bigint; d: bigint;
  constructor(n: bigint, d = 1n) {
    if (d === 0n) fail('numeric_domain', 'Zero rational denominator');
    if (Math.max(bits(n), bits(d)) > TEMPORAL_LIMITS.arithmeticBits) fail('arithmetic_budget', 'Exact arithmetic bit budget exceeded');
    if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g;
  }
  add(b: Rational): Rational { return new Rational(this.n * b.d + b.n * this.d, this.d * b.d); }
  sub(b: Rational): Rational { return new Rational(this.n * b.d - b.n * this.d, this.d * b.d); }
  mul(b: Rational): Rational { return new Rational(this.n * b.n, this.d * b.d); }
  div(b: Rational): Rational { return new Rational(this.n * b.d, this.d * b.n); }
  compare(b: Rational): number { const delta = this.n * b.d - b.n * this.d; return delta < 0n ? -1 : delta > 0n ? 1 : 0; }
  toString(): string { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
}
function rational(value: unknown): Rational {
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isSafeInteger(value))) fail('numeric_syntax', 'Use exact integer, fraction or decimal strings');
  const s = String(value);
  if (s.length > TEMPORAL_LIMITS.rationalChars || !/^[+-]?(?:\d+(?:\/[+-]?\d+)?|\d*\.\d+)$/.test(s)) fail('numeric_syntax', 'Exact numeric syntax or size limit');
  let result: Rational;
  if (s.includes('/')) {
    const [n, d] = s.split('/');
    // Match the accepted Python Fraction parser: the overall sign belongs to
    // the numerator, even though its preliminary syntax regex was broader.
    if (!/^\d+$/.test(d)) fail('numeric_syntax', 'Rational denominator must be unsigned');
    result = new Rational(BigInt(n), BigInt(d));
  }
  else if (s.includes('.')) {
    const negative = s[0] === '-', unsigned = s.replace(/^[+-]/, ''), [whole, fraction] = unsigned.split('.');
    result = new Rational(BigInt((whole || '0') + fraction) * (negative ? -1n : 1n), 10n ** BigInt(fraction.length));
  } else result = new Rational(BigInt(s));
  if (Math.max(bits(result.n), bits(result.d)) > TEMPORAL_LIMITS.rationalBits) fail('numeric_budget', 'Exact input exceeds 512 bits');
  return result;
}
function interval(value: unknown): [Rational, Rational] {
  if (!Array.isArray(value) || value.length !== 2) fail('numeric_shape', 'An interval needs two exact endpoints');
  const lo = rational(value[0]), hi = rational(value[1]); if (lo.compare(hi) > 0) fail('numeric_domain', 'Reversed interval'); return [lo, hi];
}
function bounded(value: Rational, lo: string, hi: string, open = false): boolean {
  return open ? value.compare(rational(lo)) > 0 && value.compare(rational(hi)) < 0 : value.compare(rational(lo)) >= 0 && value.compare(rational(hi)) <= 0;
}
function evaluate(capability: string, bindings: Record<string, Quantity>): { value: Json; interpretation: string } {
  if (capability === 'math.projective.action' || capability === 'math.contraction.action') {
    const x = rational(bindings.state.value), p = rational(bindings.parameter.value);
    if (!bounded(x, '-1', '1', true)) fail('numeric_domain', 'State must lie in the open unit interval');
    if (!bounded(p, capability === 'math.projective.action' ? '-1' : '0', '1', capability === 'math.projective.action')) fail('numeric_domain', 'Action parameter outside the admitted domain');
    const value = capability === 'math.projective.action' ? x.add(p).div(rational('1').add(x.mul(p))) : p.mul(x);
    return { value: value.toString(), interpretation: 'Exact point in a declared bounded scalar model; no empirical state identification.' };
  }
  if (capability !== 'biology.resource.ceiling') fail('requires_adapter', 'No portable evaluator for this capability');
  const q = rational(bindings.fraction.value), total = interval(bindings.total_pool.value), reserve = interval(bindings.nadph.value), target = rational(bindings.target.value);
  if (!bounded(q, '0', '1') || !bounded(target, '0', '10')) fail('numeric_domain', 'Fraction or target outside the supported model range');
  if (bindings.nadph.unit === 'uM') { reserve[0] = reserve[0].div(rational('1000')); reserve[1] = reserve[1].div(rational('1000')); }
  if (!bounded(total[0], '1/5', '1') || !bounded(total[1], '1/5', '1') || !bounded(reserve[0], '0', '2/25') || !bounded(reserve[1], '0', '2/25')) fail('numeric_domain', 'Resource observation outside the admitted rectangle');
  // q >= 0: both coordinates have nonnegative coefficients. The two rectangle
  // corners attain extrema of this ceiling expression, not biological extent.
  const ceiling = (t: Rational, n: Rational) => q.mul(t).div(rational('2')).add(n).add(rational('3/50'));
  const lo = ceiling(total[0], reserve[0]), hi = ceiling(total[1], reserve[1]);
  return { value: { ceiling_interval_mM: [lo.toString(), hi.toString()], width_mM: hi.sub(lo).toString(), target_mM: target.toString(), target_excluded: target.compare(hi) > 0 },
    interpretation: 'Exact extrema of possible necessary ceilings under the declared fixed-volume resource ledger. A target not excluded is not thereby achieved or feasible as a biological trajectory.' };
}

export async function verifyTemporalReport(raw: unknown): Promise<boolean> {
  try {
    canonicalTemporalJson(raw); exact(raw, INQUIRY_FIELDS, [], 'report'); const r = clone(raw) as TemporalReport;
    if (r.execution.router !== TEMPORAL_VERSION || !Array.isArray(r.results)) return false;
    const receipt = r.execution.receipt_sha256; delete (r.execution as Partial<TemporalReport['execution']>).receipt_sha256;
    return typeof receipt === 'string' && await hashTemporalJson(r) === receipt;
  } catch { return false; }
}
async function revisionBinding(previous: TemporalReport | undefined, q: Inquiry): Promise<JsonObject> {
  const correction = q.provenance.correction;
  if (!previous) { if (correction !== undefined && correction !== null) fail('invalid_correction', 'An explicit correction requires the previous receipt'); return { kind: 'initial_execution' }; }
  if (!await verifyTemporalReport(previous)) fail('invalid_receipt', 'Previous report is altered or belongs to a different implementation revision');
  if (previous.identity.id !== q.identity.id || q.identity.revision !== previous.identity.revision + 1) fail('invalid_revision', 'Use the same inquiry ID and next integer revision');
  const result: JsonObject = { kind: 'revision_comparison', previous_receipt_sha256: previous.execution.receipt_sha256 };
  if (correction === undefined || correction === null) return result;
  exact(correction, ['replaces', 'reason'], [], 'correction'); const c = correction as { replaces: string; reason: string }; text(c.reason, 'correction.reason'); text(c.replaces, 'correction.replaces');
  const match = /^revision([1-9][0-9]*):(.+)$/.exec(c.replaces);
  if (!match || Number(match[1]) !== previous.identity.revision) fail('invalid_correction', 'Correction must name the previous revision');
  const old = records<Quantity>(previous.quantities, 'previous quantities', TEMPORAL_LIMITS.quantities), current = new Map(q.quantities.map(x => [x.id, x]));
  if (!old.has(match[2]) || !same([...old.keys()].sort(), [...current.keys()].sort())) fail('invalid_correction', 'Correction references a missing quantity or changes identities');
  for (const field of ['system', 'observer', 'operations', 'constraints', 'mechanism', 'premises'] as const) if (!same(previous[field], q[field])) fail('invalid_correction', `Quantity correction also changes ${field}`);
  for (const [id, before] of old) {
    const after = current.get(id)!;
    if (id !== match[2]) { if (!same(before, after)) fail('invalid_correction', 'Correction changes an unnamed quantity'); }
    else {
      if (before.value === undefined || after.value === undefined || before.value === null || after.value === null || same(before.value, after.value)) fail('invalid_correction', 'Correction must replace an existing value with a different supplied value');
      const a = clone(before), b = clone(after); delete a.value; delete b.value;
      if (!same(a, b)) fail('invalid_correction', 'Correction changes meaning, units, shape or acquisition context');
    }
  }
  return { ...result, kind: 'validated_quantity_replacement', quantity_id: match[2], replaces: c.replaces, authority: 'Local content/context check; not authenticated measurement admission' };
}
function revisionChanges(previous: TemporalReport | undefined, current: TemporalResult[], revision: number): JsonObject[] {
  if (!previous) return []; const latest = new Map(current.map(x => [x.id, x])), old = new Map(previous.results.map(x => [x.id, x])); const changes: JsonObject[] = [];
  for (const [id, before] of old) {
    const after = latest.get(id), withdrawn = before.status === 'established_in_scope' && after?.status !== 'established_in_scope';
    const valueChanged = !after || !same(before.value, after.value), supportChanged = !after || before.support_sha256 !== after.support_sha256;
    const revised = !after || valueChanged || before.status !== after.status;
    changes.push({ result_id: id, previous_revision: previous.identity.revision, current_revision: revision, transition: withdrawn ? 'withdrawn' : revised ? 'revised' : supportChanged ? 'support_changed' : 'unchanged', value_changed: valueChanged, support_changed: supportChanged, previous_receipt_sha256: previous.execution.receipt_sha256 });
  }
  for (const id of latest.keys()) if (!old.has(id)) changes.push({ result_id: id, transition: 'added', previous_revision: previous.identity.revision, current_revision: revision, previous_receipt_sha256: previous.execution.receipt_sha256 });
  return changes;
}
export async function runTemporalInquiry(raw: unknown, previousRaw?: unknown, options: TemporalRuntimeOptions = {}): Promise<TemporalReport> {
  // Copy before the first await: caller mutation cannot change a running inquiry.
  const runtime = runtimeOptions(options), q = validateInquiry(raw), plan = compileTemporalInquiry(q, runtime);
  if (previousRaw !== undefined) canonicalTemporalJson(previousRaw);
  const previous = previousRaw === undefined ? undefined : clone(previousRaw) as TemporalReport;
  const revision = await revisionBinding(previous, q);
  const quantities = new Map(q.quantities.map(x => [x.id, x])), operations = new Map(q.operations.map(x => [x.id, x])), premises = new Map(q.premises.map(x => [x.id, x]));
  const capabilities = new Map(temporalCatalogue(runtime).map(x => [x.id, x])), outputs = new Map<string, Quantity>(), supportIds = new Map<string, string>();
  const results: TemporalResult[] = [], jobs: JsonObject[] = [];
  for (const step of plan.steps) {
    const cap = capabilities.get(step.candidate_capability_id ?? ''), bindings: Record<string, Quantity> = Object.create(null);
    const result: TemporalResult = { id: step.id, status: 'unresolved', value: null, unit: step.output_contract?.unit ?? null, result_kind: cap?.result_kind ?? 'hypothesis_or_analogy', capability_id: step.capability_id,
      depends_on: clone(step.depends_on), premise_ids: clone(step.premise_ids), issues: clone(step.issues), scope: cap?.scope ?? 'No admitted operation', interpretation: '', support: {}, support_sha256: '' };
    if (step.status === 'ready' && step.depends_on.some(id => !outputs.has(id))) result.issues.push(issue('dependency_unavailable', 'An earlier operation failed to execute.'));
    else if (step.status === 'ready') {
      for (const [portId, ref] of Object.entries(step.bindings)) bindings[portId] = clone(typeof ref === 'string' ? quantities.get(ref)! : outputs.get(ref.step)!);
      const job: JsonObject = { step_id: step.id, capability_id: cap!.id, executed: true, runtime: cap!.implementation === 'trusted_adapter' ? 'configured_quantum_reference_adapter' : 'portable_exact_typescript', input_ports: Object.keys(bindings).sort() };
      try {
        if (cap!.id === 'quantum.reference.evolve') {
          const native = await runtime.quantumReference!.execute(clone(bindings.protocol.value));
          canonicalTemporalJson(native);
          if (!native || !['established_in_scope', 'unresolved', 'execution_error'].includes(native.status) || native.result_kind !== 'model_prediction' || !Array.isArray(native.conclusions)) fail('invalid_adapter_result', 'Quantum adapter returned an incompatible result');
          result.status = native.status; result.value = native.status === 'established_in_scope' ? { conclusions: native.conclusions } : null;
          result.adapter_artifact = clone(native) as unknown as Json;
          result.interpretation = 'Conditional dimensionless reference prediction from the configured adapter; no quantum-to-redox or physical-time calibration.';
          if (native.status !== 'established_in_scope') result.issues.push(issue('adapter_result_unavailable', 'The adapter reported no established prediction.', { blocked_by: native.blocked_by ?? [], errors: native.errors ?? [] }));
        } else {
          const evaluated = evaluate(cap!.id, bindings); result.value = evaluated.value; result.interpretation = evaluated.interpretation; result.status = 'established_in_scope';
        }
        if (result.status === 'established_in_scope') outputs.set(step.id, { ...clone(cap!.output), id: step.id, value: result.value, preparation_id: q.observer.preparation_id, ...(q.observer.time ? { time: clone(q.observer.time) } : {}) });
        job.status = result.status === 'established_in_scope' ? 'completed' : result.status;
      } catch (error) {
        result.status = 'execution_error'; result.value = null;
        result.issues.push(issue(error instanceof TemporalInputError ? error.code : 'execution_failure', error instanceof Error ? error.message : 'Portable evaluation failed')); job.status = 'failed';
      }
      jobs.push(job);
    }
    // Include consumed bindings even for blocked results: support identity records
    // the exact request being withheld, without treating it as executed evidence.
    const requestedBindings = Object.fromEntries(Object.entries(operations.get(step.id)!.inputs).map(([p, ref]) => [p, typeof ref === 'string' ? quantities.get(ref)! : { step: ref.step, parent_support_sha256: supportIds.get(ref.step) ?? null }]));
    result.support = clone({ operation: operations.get(step.id)!, capability: cap ?? null, bindings, requested_bindings: requestedBindings, system: q.system, observer: q.observer,
      premises: step.premise_ids.map(id => premises.get(id) ?? { id, status: 'missing' }), implementation: { ...SOURCE_IDENTITY, configured_asset: runtime.implementationIdentity ?? null, quantum_adapter: cap?.id === 'quantum.reference.evolve' ? runtime.quantumReference?.identity ?? null : null },
      parents: Object.fromEntries(step.depends_on.map(id => [id, supportIds.get(id)!])), output_contract: step.output_contract, issues: result.issues }) as unknown as JsonObject;
    result.support_sha256 = await hashTemporalJson(result.support); supportIds.set(step.id, result.support_sha256); results.push(result);
  }
  const report = { ...clone(q), results,
    execution: { router: TEMPORAL_VERSION, mode: 'Portable exact TypeScript; no Python, external action, hosted job service or authenticated admission', input_sha256: await hashTemporalJson(q), scientific_word: plan.word, plan, jobs,
      effective_models: Object.fromEntries(results.map(r => [r.id, r.capability_id])), status: results.length > 0 && results.every(r => r.status === 'established_in_scope') ? 'complete_in_declared_scope' : 'partial_or_gap',
      implementation_identity: { ...clone(SOURCE_IDENTITY), configured_asset: runtime.implementationIdentity ?? null }, integrity_scope: 'Local content seal and declared source revision; not authentication, public timestamp attestation or empirical validation.' },
    contrast: { ...clone(q.contrast), revision_binding: revision, revision_changes: revisionChanges(previous, results, q.identity.revision) },
    next_question: { origin: 'compiler_missing_obligations', requests: results.filter(r => r.status !== 'established_in_scope').map(r => ({ step_id: r.id, issues: r.issues })) },
  } as unknown as TemporalReport;
  report.execution.receipt_sha256 = await hashTemporalJson(report);
  return report;
}

export type TemporalExample = 'actions-ab' | 'actions-ba' | 'resource' | 'resource-corrected' | 'quantum';
export function createTemporalExample(kind: TemporalExample): Inquiry {
  if (!['actions-ab', 'actions-ba', 'resource', 'resource-corrected', 'quantum'].includes(kind)) fail('unknown_example', 'Unknown declared example');
  const caps = temporalCatalogue();
  const q: Inquiry = { identity: { id: 'bounded-word', revision: 1 }, question: { original: 'Run the explicitly declared scientific question.', scope: 'Authored structured model; not inferred from prose.' }, system: { jurisdiction: 'bounded_scalar_model' }, observer: { preparation_id: 'synthetic-preparation-1', clock: { kind: 'action_index', unit: '1' } }, quantities: [], operations: [], constraints: {}, mechanism: {}, premises: [], execution: { compression: 'ordered' }, results: [], contrast: {}, next_question: {}, provenance: { evidence_kind: 'synthetic', interpretation_origin: 'authored structured model' } };
  const quantity = (id: string, meaning: string, role: string, unit: string, value: Json, shape: Json = 'scalar', context: Partial<Quantity> = {}): Quantity => ({ id, meaning, role, unit, value, shape, ...context });
  if (kind.startsWith('actions-')) {
    q.question = { original: 'Does the order of alignment and contraction affect the final bounded state?', scope: 'Declared align=(x+u)/(1+x*u) and contract=c*x; no physical intervention inferred.' };
    q.quantities = [quantity('x', 'bounded_scalar_state', 'state', '1', '1/4'), quantity('u', 'action_parameter', 'parameter', '1', '1/3'), quantity('c', 'contraction_factor', 'parameter', '1', '1/2')];
    const verbs = kind === 'actions-ba' ? ['contract', 'align'] : ['align', 'contract'];
    q.operations = verbs.map((verb, i) => ({ id: `step${i}`, verb, kind: 'action', inputs: { state: i ? { step: `step${i - 1}` } : 'x', parameter: verb === 'align' ? 'u' : 'c' } }));
    q.mechanism = { models: Object.fromEntries(q.operations.map(op => [op.id, caps.find(c => c.verb === op.verb)!.id])) };
    q.premises = ['DECLARED-PROJECTIVE', 'DECLARED-CONTRACTION', 'FIXED-CALIBRATION'].map(id => ({ id, status: 'assumed' }));
  } else if (kind.startsWith('resource')) {
    const cap = caps.find(c => c.id === 'biology.resource.ceiling')!, time: Time = { value: '0', unit: 'min' }, context = { preparation_id: q.observer.preparation_id, time };
    q.identity = { id: 'resource-observation', revision: kind === 'resource-corrected' ? 2 : 1 }; q.system.jurisdiction = cap.jurisdictions[0]; q.observer.clock = clone(cap.clock); q.observer.time = time;
    q.question = { original: 'Can a 0.60 mM GPx target be excluded by the necessary resource ceiling?', scope: 'Stipulated q*T/2+N+0.06 mM; not an achieved extent or a calibrated cell model.' };
    q.quantities = [quantity('q', 'reduced_fraction_q', 'observable', '1', '0.99', 'scalar', context), quantity('T', 'glutathione_total_pool', 'resource', 'mM', ['0.98', '1'], 'interval', context), quantity('N', 'nadph_reserve', 'resource', 'uM', kind === 'resource-corrected' ? ['60', '80'] : ['9', '11'], 'interval', context), quantity('target', 'gpx_extent_target', 'parameter', 'mM', '0.60')];
    q.operations = [{ id: 'ceiling', verb: 'bound_resource', kind: 'derive', inputs: { fraction: 'q', total_pool: 'T', nadph: 'N', target: 'target' } }]; q.mechanism = { models: { ceiling: cap.id } }; q.premises = cap.premises.map(id => ({ id, status: 'assumed' }));
    if (kind === 'resource-corrected') q.provenance.correction = { replaces: 'revision1:N', reason: 'Synthetic correction of the same preparation at the same time.' };
  } else {
    const cap = caps.find(c => c.id === 'quantum.reference.evolve')!; q.identity.id = 'quantum-model-prediction'; q.system.jurisdiction = cap.jurisdictions[0]; q.observer.clock = clone(cap.clock);
    q.question = { original: 'Predict yields for the declared dimensionless reference ensembles.', scope: 'Native four-level solver required; not implemented by this portable core.' };
    q.quantities = [quantity('protocol', 'four_level_reference_protocol', 'mechanism', 'model_time', { schema_version: 'quantum-reaction/0.1', model: { omega: 1, detuning: 0, gamma: 0, k_s: 1, k_t: 1 }, clock: { units: 'model_time', end: 40, points: 21 }, preparations: [{ id: 'plus_y', bloch: [0, 1, 0] }, { id: 'minus_y', bloch: [0, -1, 0] }], contrast: { parameter: 'gamma', value: 10 }, premises: Object.fromEntries(cap.premises.map(id => [id, 'assumed'])) }, 'object')];
    q.operations = [{ id: 'yields', verb: 'predict_yields', kind: 'derive', inputs: { protocol: 'protocol' } }]; q.premises = cap.premises.map(id => ({ id, status: 'assumed' }));
  }
  return q;
}
