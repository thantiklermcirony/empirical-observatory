import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flow,
  stepPlant,
  initialPlant,
  initialControl,
  controllerAction,
  simulate,
  compareControllers,
  observe,
} from '../lib/engine/tao.ts';
import {
  STATES,
  probability,
  measure,
  updatePrior,
  suggestBasis,
  quantumReplay,
  mysteryState,
} from '../lib/engine/quantum.ts';
import {
  trialPlan,
  makeTrial,
  forecasts,
  analyseBehaviour,
} from '../lib/engine/behaviour.ts';
import { record, validateRecord } from '../lib/engine/records.ts';
import { validatePacket } from '../lib/engine/instrument-packet.ts';
const near = (a: number, b: number, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
void test('exact primitive flows preserve bounds and compose over time', () => {
  for (const kind of [
    'growth',
    'suppression',
    'alignment',
    'threat',
    'gate',
  ] as const)
    for (const x of [0, 1e-20, 1e-12, 0.0001, 0.3, 0.9999, 1]) {
      assert.equal(flow(kind, x, 0), x);
      const y = flow(kind, x, 8);
      assert.ok(y >= 0 && y <= 1);
      near(flow(kind, flow(kind, x, 0.3), 0.8), flow(kind, x, 1.1));
    }
});
void test('alignment is reversible in the interior', () =>
  near(flow('alignment', flow('alignment', 0.31, 1, 2), 1, -2), 0.31));
void test('invalid numerical inputs are rejected', () => {
  assert.throws(() => flow('growth', NaN, 1));
  assert.throws(() => flow('gate', 0.5, -1));
  assert.throws(() => stepPlant(initialPlant(), Infinity, 0.05, 'endpoint', 1));
});
void test('plant stays in [0,1] with adversarial bang-bang drive and allowed steps', () => {
  for (const dt of [0.001, 0.05, 0.25]) {
    let p = initialPlant();
    for (let i = 0; i < Math.ceil(30 / dt); i++) {
      p = stepPlant(p, i % 2 ? 1 : -1, dt, 'switching', 99);
      assert.ok(p.x >= 0 && p.x <= 1);
      assert.ok(p.memory >= 0 && p.memory <= 1);
    }
  }
});
void test('floating-point event boundary delivers disturbance once', () => {
  let p = initialPlant();
  for (let i = 0; i < 99; i++) p = stepPlant(p, 0, 0.05, 'endpoint', 1);
  p = stepPlant(p, 0, 0.05, 'endpoint', 1);
  assert.ok(p.x < 0.06);
  const next = stepPlant(p, 0, 0.05, 'endpoint', 1);
  assert.ok(
    next.x > p.x,
    'Repeated disturbance at the floating point boundary',
  );
});
void test('all controllers reject stale, low-confidence and invalid observations', () => {
  for (const kind of ['manual', 'linear', 'pi', 'sigmoid', 'tao'] as const)
    for (const o of [
      { x: 0.2, age: 0.5, confidence: 0.9 },
      { x: 0.2, age: 0, confidence: 0.2 },
      { x: NaN, age: 0, confidence: 1 },
    ]) {
      const c = controllerAction(kind, o, 0.6, 2, 0.05, 2, initialControl(), 1);
      assert.equal(c.u, 0);
      assert.equal(c.fallback, true);
    }
});
void test('TAO dwell prevents rapid mode switches', () => {
  let m = initialControl();
  let c = controllerAction(
    'tao',
    { x: 0.1, age: 0, confidence: 1 },
    0.6,
    2,
    0.05,
    0,
    m,
  );
  assert.equal(c.memory.mode, 'recover');
  assert.ok(c.u > 0);
  m = c.memory;
  c = controllerAction(
    'tao',
    { x: 0.9, age: 0, confidence: 1 },
    0.6,
    2,
    0.05,
    0.1,
    m,
  );
  assert.equal(c.memory.mode, 'recover');
  assert.ok(c.u < 0, 'Dwell constrains mode labels, not actuator direction.');
  c = controllerAction(
    'tao',
    { x: 0.9, age: 0, confidence: 1 },
    0.6,
    2,
    0.05,
    0.6,
    m,
  );
  assert.equal(c.memory.mode, 'release');
});
void test('stale age uses the configured step', () =>
  near(
    observe(
      { x: 0.5, memory: 0, t: 9 },
      'stale',
      0,
      { x: 0.5, age: 0.2, confidence: 1 },
      0.1,
    ).age,
    0.3,
  ));
void test('TAO simulation replay is exact and short runs have no recovery event', () => {
  const c = {
    controller: 'manual',
    stress: 'stale',
    seed: 91,
    gain: 2,
    duration: 30,
    dt: 0.05,
  } as const;
  const actions = Array.from({ length: 600 }, (_, i) => Math.sin(i / 30));
  assert.deepEqual(simulate(c, actions), simulate(c, actions));
  assert.equal(simulate({ ...c, duration: 1 }).metrics.recoverySeconds, null);
});
void test('benchmark uses disjoint seeds, identical tuning budgets and finite scores', () => {
  const b = compareControllers();
  assert.ok(b.testSeeds.every((s) => !b.trainingSeeds.includes(s)));
  for (const row of b.rows) {
    assert.equal(row.tuning.length, 6);
    assert.equal(row.runs.length, 12);
    assert.ok(Number.isFinite(row.mae));
    assert.ok(row.gain <= 18);
  }
});
void test('Quantum Tensors agrees with analytical Pauli probabilities', () => {
  const expected = [
    [0.5, 0.5, 1],
    [0.5, 0.5, 0],
    [1, 0.5, 0.5],
    [0, 0.5, 0.5],
    [0.5, 1, 0.5],
    [0.5, 0, 0.5],
  ];
  STATES.forEach((s, i) =>
    (['X', 'Y', 'Z'] as const).forEach((b, j) => {
      near(probability(s, b, [], 0), expected[i][j]);
      near(probability(s, b, [], 0.12), 0.88 * expected[i][j] + 0.06);
    }),
  );
});
void test('gate order changes the X measurement distribution', () => {
  near(probability('0', 'X', ['H', 'S'], 0), 0.5);
  near(probability('0', 'X', ['S', 'H'], 0), 1);
});
void test('quantum posterior normalises and seed tampering is detected', () => {
  const seed = 23,
    m = measure(mysteryState(seed), 'Z', 8, seed);
  const p = updatePrior(
    STATES.map(() => 1 / 6),
    m,
  );
  near(
    p.reduce((a, b) => a + b, 0),
    1,
  );
  assert.deepEqual(quantumReplay(seed, [m]).prior, p);
  assert.throws(() => quantumReplay(seed, [{ ...m, plus: (m.plus + 1) % 9 }]));
});
void test('uninformative quantum measurement produces no information gain', () => {
  for (const s of suggestBasis(
    STATES.map(() => 1 / 6),
    1,
  ))
    near(s.informationBits, 0);
});
void test('known eigenstate is recovered by repeated independent measurements', () => {
  let p = STATES.map(() => 1 / 6);
  for (let i = 0; i < 12; i++)
    p = updatePrior(
      p,
      measure('+i', (['X', 'Y', 'Z'] as const)[i % 3], 8, 100 + i),
    );
  assert.ok(p[4] > 0.95);
});
void test('response plan balances conditions and history forecasts precede each result', () => {
  const plan = trialPlan(81);
  assert.equal(plan.filter((x) => x.condition === 'fixed').length, 12);
  assert.deepEqual(plan, trialPlan(81));
  const t = makeTrial(plan[0], [], 1000, plan[0].target, 1200);
  assert.equal(t.forecastCurrent, 0.5);
  assert.equal(t.forecastHistory, 0.5);
  assert.equal(forecasts([t]).current, 0.75);
  assert.throws(() => makeTrial(plan[1], [t], 2000, 1, 1900));
});
void test('complete response records round-trip and reject altered accuracy', () => {
  const ts: ReturnType<typeof makeTrial>[] = [];
  for (const spec of trialPlan(17))
    ts.push(
      makeTrial(
        spec,
        ts,
        3000 * spec.index + 1000,
        spec.target,
        3000 * spec.index + 1300,
      ),
    );
  const r = record(
    'behaviour',
    'human-behaviour',
    17,
    { protocol: 'signal-bay-0.1' },
    ts,
    analyseBehaviour(ts),
  );
  assert.deepEqual(validateRecord(JSON.parse(JSON.stringify(r))), r);
  const bad = structuredClone(r);
  (bad.data as typeof ts)[0].correct = false;
  assert.throws(() => validateRecord(bad));
});
void test('signal import rejects nonfinite and out-of-order frames', () => {
  const r = record(
    'instrument',
    'synthetic-signal',
    0,
    { sampleRate: 250, channels: ['a'], device: 'Test', unit: 'uV' },
    [
      { timestamp: 2, channels: [1] },
      { timestamp: 1, channels: [2] },
    ],
    {},
    false,
  );
  assert.throws(() => validateRecord(r));
  r.data = [{ timestamp: 1, channels: [NaN] }];
  assert.throws(() => validateRecord(r));
});

void test('exact alignment retains identity and relative accuracy near the endpoints', () => {
  for (const x of [0, 1e-12, 1e-10, 0.5, 1 - 1e-12, 1]) {
    assert.equal(flow('alignment', x, 0), x);
    const composed = flow('alignment', flow('alignment', x, 0.3), 0.8);
    const direct = flow('alignment', x, 1.1);
    assert.ok(Math.abs(composed - direct) < Math.max(1e-25, direct * 1e-13));
  }
});
void test('state selection is not coupled to the first quantum shot', () => {
  const counts = STATES.map(() => ({ n: 0, plus: 0 }));
  for (let seed = 0; seed < 60000; seed++) {
    const state = mysteryState(seed),
      c = counts[STATES.indexOf(state)];
    c.n++;
    c.plus += measure(state, 'Z', 1, seed).plus;
  }
  counts.forEach((c, i) =>
    near(c.plus / c.n, probability(STATES[i], 'Z'), 0.022),
  );
});
void test('legacy quantum replay retains an explicit biased-sampling warning', () => {
  const seed = 23,
    state = mysteryState(seed, '0.1.0');
  const r = quantumReplay(seed, [measure(state, 'Z', 8, seed)], '0.1.0');
  assert.equal(r.state, state);
  assert.match(r.sampling, /biased/);
});
void test('quantum record enforces shot, noise and completion contracts', () => {
  const r = record(
    'quantum',
    'simulation',
    23,
    { noise: 0.12, budget: 96, guess: '+' },
    [measure(mysteryState(23), 'Z', 8, 23)],
    {},
  );
  assert.deepEqual(validateRecord(r), r);
  for (const change of [
    { data: [] },
    { config: { ...r.config, guess: ['+'] } },
    { config: { ...r.config, noise: 999 } },
    { config: { ...r.config, budget: -1 } },
    { data: [{ basis: 'Z', shots: 1, plus: 1, noise: 0.12 }] },
  ])
    assert.throws(() => validateRecord({ ...r, ...change }));
});
void test('instrument packets round-trip and reject duplicate clocks and malformed labels', () => {
  const p = {
    schema: 'observatory-stream/1',
    source: 'synthetic-signal',
    device: 'Test board',
    unit: 'uV',
    sampleRate: 250,
    channels: ['a'],
    frames: [
      { timestamp: 1, channels: [2] },
      { timestamp: 2, channels: [3] },
    ],
  };
  const valid = validatePacket(p);
  assert.doesNotThrow(() =>
    validateRecord(
      record(
        'instrument',
        valid.source,
        0,
        { ...valid },
        valid.frames,
        {},
        false,
      ),
    ),
  );
  for (const change of [
    { device: 123 },
    { unit: {} },
    { channels: [null] },
    { frames: [p.frames[0], p.frames[0]] },
    { frames: [null] },
  ])
    assert.throws(() => validatePacket({ ...p, ...change }));
});
