import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalTemporalJson, compileTemporalInquiry, createTemporalExample, hashTemporalJson,
  INQUIRY_FIELDS, runTemporalInquiry, temporalCatalogue, TemporalInputError, verifyTemporalReport } from '../../lib/engine/temporal-router.ts';
import type { Inquiry, Json, QuantumReferenceEvaluation, TemporalReport, TemporalRuntimeOptions } from '../../lib/engine/temporal-router.ts';

const copy = <T>(x: T): T => structuredClone(x);
const change = (q: Inquiry, revision = 2): Inquiry => { const next = copy(q); next.identity.revision = revision; delete next.provenance.correction; return next; };
const issueCodes = (q: Inquiry) => compileTemporalInquiry(q).steps.map(s => s.issues.map(i => i.code));

void test('accepted Python differential fixtures: values, admission, order and dependencies', async t => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/python-cases.json', import.meta.url), 'utf8'));
  const reports = new Map<string, TemporalReport>();
  for (const entry of fixture.cases) await t.test(entry.name, async () => {
    if (entry.expected.throws) { await assert.rejects(runTemporalInquiry(entry.inquiry, reports.get(entry.previous)), TemporalInputError); return; }
    const actual = await runTemporalInquiry(entry.inquiry, reports.get(entry.previous)); reports.set(entry.name, actual);
    assert.equal(actual.execution.plan.status, entry.expected.plan_status);
    assert.equal(actual.execution.status, entry.expected.execution_status);
    assert.equal(actual.execution.jobs.length, entry.expected.jobs);
    assert.deepEqual(actual.results.map(({ id, status, value, depends_on, premise_ids }) => ({ id, status, value, depends_on, premise_ids })), entry.expected.results);
    for (let i = 0; i < actual.execution.plan.steps.length; i++) {
      const got = actual.execution.plan.steps[i], expected = entry.expected.plan[i];
      assert.equal(got.status, expected.status); assert.equal(got.capability_id, expected.capability_id);
      for (const code of expected.issues) assert.ok(got.issues.some(issue => issue.code === code), `${entry.name} missing ${code}`);
    }
    assert.equal(await verifyTemporalReport(actual), true);
  });
});

void test('exact examples retain fourteen fields, immutable inputs and bound scope', async () => {
  const q = createTemporalExample('resource'), original = copy(q), r = await runTemporalInquiry(q);
  assert.deepEqual(q, original); assert.deepEqual(Object.keys(r).sort(), [...INQUIRY_FIELDS].sort());
  assert.deepEqual(r.results[0].value, { ceiling_interval_mM: ['5541/10000', '283/500'], width_mM: '119/10000', target_mM: '3/5', target_excluded: true });
  assert.match(r.results[0].interpretation, /not thereby achieved/);
  const corrected = await runTemporalInquiry(createTemporalExample('resource-corrected'), r);
  assert.deepEqual((corrected.results[0].value as { ceiling_interval_mM: string[] }).ceiling_interval_mM, ['6051/10000', '127/200']);
  assert.equal((corrected.contrast.revision_binding as { kind: string }).kind, 'validated_quantity_replacement');
  assert.equal((corrected.contrast.revision_changes as { transition: string }[])[0].transition, 'revised');
});

void test('equal values with changed capability, premise or preparation change support', async () => {
  const q = createTemporalExample('actions-ab'); q.operations = [q.operations[0]]; q.mechanism = {};
  q.quantities[0].value = '0'; q.quantities[1].value = '0';
  const first = await runTemporalInquiry(q), next = change(q);
  next.operations[0].verb = 'contract'; next.operations[0].inputs.parameter = 'c';
  const second = await runTemporalInquiry(next, first);
  assert.equal(first.results[0].value, second.results[0].value);
  assert.equal((second.contrast.revision_changes as { transition: string }[])[0].transition, 'support_changed');
  const source = createTemporalExample('resource'), a = await runTemporalInquiry(source), b = change(source);
  b.observer.preparation_id = 'new-preparation'; for (const item of b.quantities.slice(0, 3)) item.preparation_id = 'new-preparation';
  const moved = await runTemporalInquiry(b, a);
  assert.deepEqual(moved.results[0].value, a.results[0].value);
  assert.equal((moved.contrast.revision_changes as { transition: string }[])[0].transition, 'support_changed');
  const p = change(source); p.premises[0].status = 'derived';
  assert.equal(((await runTemporalInquiry(p, a)).contrast.revision_changes as { transition: string }[])[0].transition, 'support_changed');
});

void test('parent support changes propagate even through identical final zero', async () => {
  const q = createTemporalExample('actions-ab'); q.quantities[2].value = '0'; const a = await runTemporalInquiry(q), b = change(q);
  b.premises[0].status = 'derived'; const result = await runTemporalInquiry(b, a);
  assert.equal(result.results[1].value, '0');
  assert.equal((result.contrast.revision_changes as { transition: string }[])[1].transition, 'support_changed');
});

void test('unconsumed metadata does not change result support; relevant build identity does', async () => {
  const q = createTemporalExample('resource'); q.quantities.push({ id: 'note', meaning: 'unrelated', role: 'metadata', unit: '1', shape: 'scalar', value: 'one' });
  const first = await runTemporalInquiry(q), next = change(q); next.quantities.at(-1)!.value = 'two';
  assert.equal(((await runTemporalInquiry(next, first)).contrast.revision_changes as { transition: string }[])[0].transition, 'unchanged');
  const changedBuild = await runTemporalInquiry(next, first, { implementationIdentity: { id: 'reviewed-build', source_sha256: 'a'.repeat(64) } });
  assert.equal((changedBuild.contrast.revision_changes as { transition: string }[])[0].transition, 'support_changed');
});

void test('premise withdrawal retains unrelated independent results and history', async () => {
  const q = createTemporalExample('resource'), old = await runTemporalInquiry(q), next = change(q);
  next.premises[0].status = 'missing'; const result = await runTemporalInquiry(next, old);
  assert.equal(result.results[0].value, null); assert.equal(result.execution.jobs.length, 0);
  assert.equal((result.contrast.revision_changes as { transition: string }[])[0].transition, 'withdrawn');
  assert.equal(await verifyTemporalReport(old), true);
});

void test('correction identity and context cannot be forged by naming a replacement', async () => {
  const q = createTemporalExample('resource'), previous = await runTemporalInquiry(q);
  for (const replaces of ['revision1:missing', 'revision0:N', 'revision2:N', 'other:N']) {
    const c = createTemporalExample('resource-corrected'); c.provenance.correction = { replaces, reason: 'test' };
    await assert.rejects(runTemporalInquiry(c, previous), TemporalInputError);
  }
  const sameValue = change(q); sameValue.provenance.correction = { replaces: 'revision1:N', reason: 'test' };
  await assert.rejects(runTemporalInquiry(sameValue, previous), TemporalInputError);
  await assert.rejects(runTemporalInquiry(createTemporalExample('resource-corrected')), TemporalInputError);
  await assert.rejects(runTemporalInquiry(q, previous), TemporalInputError);
  const altered = copy(previous); (altered.results[0].value as { target_excluded: boolean }).target_excluded = false;
  assert.equal(await verifyTemporalReport(altered), false);
  await assert.rejects(runTemporalInquiry(change(q), altered), TemporalInputError);
});

void test('quantum default is explicitly pending; no solver or invented prediction', async () => {
  const q = createTemporalExample('quantum'), r = await runTemporalInquiry(q);
  assert.equal(r.results[0].status, 'unresolved'); assert.equal(r.results[0].value, null); assert.equal(r.execution.jobs.length, 0);
  assert.ok(r.results[0].issues.some(i => i.code === 'requires_adapter'));
  assert.ok(r.results[0].issues.some(i => i.code === 'missing_transfer_map'));
  q.observer.time = { value: '100', unit: 'model_time' }; q.quantities[0].time = { value: '0', unit: 'model_time' };
  assert.ok(issueCodes(q)[0].includes('observation_time_not_supported')); assert.ok(issueCodes(q)[0].includes('input_time_not_supported'));
});

void test('trusted quantum callback receives only protocol; failures and pending stay unavailable', async () => {
  let calls = 0; const q = createTemporalExample('quantum');
  const options: TemporalRuntimeOptions = { quantumReference: { identity: { id: 'test-only-adapter', source_sha256: 'b'.repeat(64) }, execute: async protocol => {
    calls++; assert.deepEqual(protocol, q.quantities[0].value);
    return { status: 'unresolved', result_kind: 'model_prediction', conclusions: [], blocked_by: ['P-H'], errors: [] };
  } } };
  assert.equal(compileTemporalInquiry(q, options).status, 'ready');
  const pending = await runTemporalInquiry(q, undefined, options);
  assert.equal(calls, 1); assert.equal(pending.results[0].status, 'unresolved'); assert.equal(pending.results[0].value, null);
  assert.equal(pending.execution.jobs.length, 1); assert.equal(pending.execution.status, 'partial_or_gap');
  options.quantumReference!.execute = async () => { throw new Error('numerical decline'); };
  assert.equal((await runTemporalInquiry(q, undefined, options)).results[0].status, 'execution_error');
  options.quantumReference!.execute = async () => ({ status: 'execution_error', result_kind: 'model_prediction', conclusions: [], errors: ['declined'] });
  assert.equal((await runTemporalInquiry(q, undefined, options)).results[0].status, 'execution_error');
  q.premises[0].status = 'missing'; options.quantumReference!.execute = async () => { assert.fail('must not call'); };
  assert.equal((await runTemporalInquiry(q, undefined, options)).execution.jobs.length, 0);
});

void test('callback fixture is labeled as test data; no source/physical promotion', async () => {
  const native: QuantumReferenceEvaluation = { status: 'established_in_scope', result_kind: 'model_prediction', conclusions: [{ id: 'test-only', status: 'established_in_scope', value: 'fixture' }], provenance: { scope: 'interface test only, no numerical quantum claim' } };
  const q = createTemporalExample('quantum');
  const r = await runTemporalInquiry(q, undefined, { quantumReference: { identity: { id: 'test-only', source_sha256: 'c'.repeat(64) }, execute: async () => copy(native) } });
  assert.deepEqual(r.results[0].adapter_artifact, native);
  assert.equal(r.results[0].result_kind, 'model_prediction'); assert.match(r.results[0].interpretation, /no quantum-to-redox/);
});

void test('compiler fails closed on hostile schemas and declaration bypass', async () => {
  const mutations: ((q: Inquiry) => void)[] = [
    q => { (q.operations[0] as unknown as Record<string, Json>).command = ['echo', 'bad']; },
    q => { q.operations[0].inputs.state = { step: 'step0' }; },
    q => { q.operations[0].after = ['step1']; },
    q => { q.operations[0].after = ['x', 'x']; },
    q => { q.quantities.push(copy(q.quantities[0])); },
    q => { q.identity.revision = 0; },
    q => { (q as unknown as Record<string, Json>).capabilities = []; },
  ];
  for (const mutate of mutations) { const q = createTemporalExample('actions-ab'); mutate(q); assert.throws(() => compileTemporalInquiry(q), TemporalInputError); }
  for (const mechanism of [{ formula: 'x-u' }, { models: { step0: 'math.projective.action' } }, { models: { step0: 'math.projective.action', step1: 'math.projective.action' } }, { models: { step0: 'math.projective.action', step1: 'math.contraction.action', ghost: 'math.projective.action' } }]) {
    const q = createTemporalExample('actions-ab'); q.mechanism = mechanism as unknown as import('../../lib/engine/temporal-router.ts').JsonObject; const r = await runTemporalInquiry(q);
    assert.equal(r.execution.jobs.length, 0); assert.ok(r.results.every(x => x.value === null));
  }
});

void test('JSON guards reject prototype/accessor/cycle/unsafe numbers/depth/bytes', () => {
  const cycle: unknown[] = []; cycle.push(cycle);
  const getter = Object.defineProperty({}, 'value', { enumerable: true, get() { assert.fail('getter must not execute'); } });
  const sparse: unknown[] = []; sparse.length = 3;
  for (const raw of [cycle, getter, { x: BigInt(1) }, { x: NaN }, { x: Infinity }, { x: 2 ** 54 }, new Date(), { x: undefined }, JSON.parse('{"__proto__":{"polluted":true}}'), { x: () => 1 }, sparse]) assert.throws(() => canonicalTemporalJson(raw), TemporalInputError);
  let deep: Json = null; for (let i = 0; i < 34; i++) deep = [deep]; assert.throws(() => canonicalTemporalJson(deep), TemporalInputError);
  const q = createTemporalExample('resource'); q.question.original = 'x'.repeat(65537); assert.throws(() => compileTemporalInquiry(q), TemporalInputError);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});

void test('exact numeric syntax, 512-bit budget and boundary failures are explicit', async () => {
  for (const value of ['1/0', '1/-2', '1/+2', '1e-2', '9'.repeat(161), true, 0.25]) {
    const q = createTemporalExample('actions-ab'); q.quantities[0].value = value;
    const r = await runTemporalInquiry(q); assert.equal(r.results[0].status, 'execution_error'); assert.equal(r.results[1].value, null);
  }
  const q = createTemporalExample('actions-ab'); q.quantities[0].value = `${2n ** 512n - 1n}/${2n ** 512n}`;
  assert.equal((await runTemporalInquiry(q)).results[0].status, 'execution_error');
});

void test('pure deterministic receipts and caller mutation isolation', async () => {
  const q = createTemporalExample('actions-ab'), before = copy(q), promise = runTemporalInquiry(q);
  q.quantities[0].value = '0'; const r = await promise;
  assert.equal(r.results[1].value, '7/26'); assert.equal(r.execution.input_sha256, await hashTemporalJson(before));
  const again = await runTemporalInquiry(before); assert.equal(r.execution.receipt_sha256, again.execution.receipt_sha256);
  const caps = temporalCatalogue(); caps[0].inputs.state.units = ['bad']; assert.deepEqual(temporalCatalogue()[0].inputs.state.units, ['1']);
});
