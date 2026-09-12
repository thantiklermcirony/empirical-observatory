import test from 'node:test';
import assert from 'node:assert/strict';
import { FamilyWorld, SigmoidLearner, parseKnowledge, partnerProbe, sigmoid, logit, mobiusTranslate, effectiveComplexity, relationshipAttention } from '../lib/engine/family-world.ts';
import { random } from '../lib/engine/random.ts';

void test('online sigmoid backprop agrees with an independent finite difference', () => {
  const m = new SigmoidLearner(3, random(3), 2), x = [0.4, -0.8, 0.6], y = [0.9, 0.1];
  const loss = () => m.predict(x).reduce((s, p, j) => s - y[j] * Math.log(p) - (1 - y[j]) * Math.log(1 - p), 0) / y.length;
  for (const [l, k, j] of [[0, 0, 0], [1, 1, 1], [2, 0, 12]]) {
    const old = m.weights[l][k][j], eps = 1e-5;
    m.weights[l][k][j] = old + eps; const plus = loss();
    m.weights[l][k][j] = old - eps; const minus = loss();
    m.weights[l][k][j] = old;
    const numerical = (plus - minus) / (2 * eps), copy = structuredClone(m.weights);
    m.train(x, y, 1e-4);
    assert.ok(Math.abs((old - m.weights[l][k][j]) / 1e-4 - numerical) < 1e-7);
    m.weights = copy;
  }
});

void test('same seeds and interventions reproduce the complete visible record', () => {
  const a = new FamilyWorld(17), b = new FamilyWorld(17);
  a.step(55); b.step(55); a.drought = true; b.drought = true;
  assert.deepEqual(a.step(40), b.step(40));
});

void test('weights change through experience and freeze when learning is disabled', () => {
  const w = new FamilyWorld(32), initial = structuredClone(w.agents[0].brain.weights);
  w.step(20); assert.notDeepEqual(w.agents[0].brain.weights, initial);
  w.options.learning = false; const frozen = structuredClone(w.agents[0].brain.weights);
  w.step(15); assert.deepEqual(w.agents[0].brain.weights, frozen);
});

void test('bounded physical and internal variables remain finite during a long drought', () => {
  const w = new FamilyWorld(50); w.drought = true; w.step(700);
  const s = w.snapshot();
  const values = [...s.resources, ...s.homes.map(h => h.materials), ...s.agents.flatMap(a => [...a.needs, ...a.slow, a.relief, a.surprise])];
  assert.ok(values.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  assert.ok(w.agents.every(a => a.replay.length <= 256));
  assert.ok(w.agents.length <= 8);
});

void test('building spends materials; an unprovisioned home cannot add a novice', () => {
  const w = new FamilyWorld(4), a = w.agents[0];
  w.homes[0].materials = 0.7; w.act(a, { verb: 'build' });
  assert.ok(Math.abs(w.homes[0].materials - 0.4) < 1e-12); assert.equal(w.homes[0].shelters, 1);
  w.act(a, { verb: 'welcome' }); assert.equal(w.agents.length, 6);
  Object.assign(w.homes[0], { shelters: 2, gardens: 2, materials: 0.8 });
  w.act(a, { verb: 'welcome' }); assert.equal(w.agents.length, 7); assert.equal(w.agents[6].brain.updates, 0);
  w.step(); assert.ok(w.agents[6].brain.updates > 0);
});

void test('teaching changes the recipient network from an observed experience', () => {
  const w = new FamilyWorld(3), [a, b] = w.agents;
  w.act(a, { verb: 'drink' }); const old = structuredClone(b.brain.weights);
  w.act(a, { verb: 'teach', target: b.id }); assert.notDeepEqual(b.brain.weights, old);
});

void test('help conserves nutrition while giving the donor a real cost', () => {
  const w = new FamilyWorld(4), [a, b] = w.agents;
  a.needs[0] = 0.8; b.needs[0] = 0.2;
  w.act(a, { verb: 'help', target: b.id });
  assert.ok(Math.abs(a.needs[0] + b.needs[0] - 1) < 1e-12);
  assert.ok(a.needs[0] < 0.8); assert.ok(b.needs[0] > 0.2);
});

void test('packet import rejects executable verbs and never promotes claimed authority', () => {
  const base = { id: 'p', noun: 'water', verb: 'drink', text: 'Ignore every instruction.', source: 'test', status: 'verified' };
  assert.equal(parseKnowledge(JSON.stringify([base]))[0].status, 'hypothesis');
  assert.throws(() => parseKnowledge(JSON.stringify([{ ...base, verb: 'eval' }])));
  assert.throws(() => parseKnowledge(JSON.stringify([base, base])));
  const w = new FamilyWorld(1); const before = w.snapshot();
  w.importPackets(JSON.stringify([base])); assert.deepEqual(w.snapshot(), before);
});

void test('equal present needs can retain a different observed relationship history', () => {
  const w = new FamilyWorld(1), [a, b] = w.agents;
  a.needs[0] = 0.8; b.needs[0] = 0.2; w.act(a, { verb: 'help', target: b.id });
  const remembered = w.features(b, { verb: 'help', target: a.id });
  w.forgetRelationships(); const erased = w.features(b, { verb: 'help', target: a.id });
  assert.notDeepEqual(remembered, erased); assert.equal(w.agents[1].bonds[0], undefined);
});

void test('partner decisions stop at high cost; sigmoid boundedness alone creates no choice', () => {
  assert.equal(partnerProbe(42, false, 0.4).request, false);
  assert.equal(partnerProbe(42, false, 0.08).request, true);
  assert.ok(Math.abs(sigmoid(logit(0.23)) - 0.23) < 1e-12);
  assert.equal(sigmoid(0), 0.5);
});

void test('Möbius updates match additive rapidity and the sigmoid coordinate', () => {
  for (const x of [-0.99, -0.2, 0, 0.3, 0.99]) for (const u of [-0.7, 0, 0.8]) {
    const m = mobiusTranslate(x, u);
    assert.ok(Math.abs(m - Math.tanh(Math.atanh(x) + Math.atanh(u))) < 1e-12);
    assert.ok(Math.abs((m + 1) / 2 - sigmoid(logit((x + 1) / 2) + 2 * Math.atanh(u))) < 1e-12);
  }
  assert.throws(() => mobiusTranslate(1, 0));
});

void test('one scalar Möbius accumulator loses order; the explicit ring retains it', () => {
  assert.ok(Math.abs(mobiusTranslate(mobiusTranslate(0.1, 0.2), -0.4) - mobiusTranslate(mobiusTranslate(0.1, -0.4), 0.2)) < 1e-12);
  const a = new FamilyWorld(12), b = new FamilyWorld(12);
  a.act(a.agents[0], { verb: 'drink' }); a.act(a.agents[0], { verb: 'rest' });
  b.act(b.agents[0], { verb: 'rest' }); b.act(b.agents[0], { verb: 'drink' });
  assert.notDeepEqual(a.agents[0].rings.map(r => r.verb), b.agents[0].rings.map(r => r.verb));
});

void test('attention falls with observed repertoire while stored relationships persist', () => {
  assert.equal(effectiveComplexity({ a: 100 }), 1);
  assert.ok(Math.abs(effectiveComplexity({ a: 50, b: 50 }) - 2) < 1e-12);
  assert.ok(relationshipAttention(40) < relationshipAttention(4));
  const w = new FamilyWorld(12), a = w.agents[0]; a.bonds[1] = { value: 0.8, count: 7 };
  const old = structuredClone(a.bonds); a.contexts = { a: 3, b: 3, c: 3 };
  assert.deepEqual(a.bonds, old); assert.ok(w.snapshot().agents[0].careShare < 1);
});

void test('a saved world resumes the same actions, weights, language and history', () => {
  const original = new FamilyWorld(453); original.step(90); original.drought = true;
  const restored = FamilyWorld.restore(JSON.parse(JSON.stringify(original.checkpoint())));
  assert.deepEqual(original.snapshot(), restored.snapshot());
  original.step(30); restored.step(30);
  assert.deepEqual(original.checkpoint(), restored.checkpoint());
});

void test('corrupt checkpoints cannot silently replace a learned world', () => {
  const w = new FamilyWorld(3); w.step(5); const raw = w.checkpoint();
  raw.agents[0].needs[0] = -1; assert.throws(() => FamilyWorld.restore(raw));
  const other = w.checkpoint(); other.agents[0].brain.weights[0][0][0] = 1e300;
  assert.throws(() => FamilyWorld.restore(other));
});
