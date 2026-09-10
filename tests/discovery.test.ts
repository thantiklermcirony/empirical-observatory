import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyNotebookEntry } from '../lib/engine/discovery-record.ts';
import {
  actions,
  prior,
  entropy,
  informationGain,
  updateBelief,
  recommend,
  available,
  categorical,
  keyedUniform,
  replay,
  chooseAction,
  runEpisode,
  validateNotebookEntry,
} from '../lib/engine/discovery.ts';
import type { Action, Policy } from '../lib/engine/discovery.ts';
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-12, a + ' != ' + b);
void test('observation changes the next affordable experiment', () => {
  const a = updateBelief(prior, actions[0], 0),
    b = updateBelief(prior, actions[0], 1);
  a.forEach((p, i) => near(p, [0.45, 0.45, 0.05, 0.05][i]));
  assert.equal(recommend(prior, 2)?.id, 'gate');
  assert.equal(recommend(a, 1)?.id, 'local_a');
  assert.equal(recommend(b, 1)?.id, 'local_b');
  assert.equal(recommend(a, 0), null);
});
void test('uninformative observations preserve belief and provide zero information', () => {
  const neutral: Action = {
    id: 'neutral',
    label: 'neutral',
    cost: 1,
    likelihood: [
      [0.5, 0.5],
      [0.5, 0.5],
      [0.5, 0.5],
      [0.5, 0.5],
    ],
  };
  assert.deepEqual(updateBelief(prior, neutral, 1), prior);
  near(informationGain(prior, neutral), 0);
  near(entropy(prior), 2);
  near(informationGain([1, 0, 0, 0], actions[0]), 0);
});
void test('impossible evidence fails explicitly instead of inventing confidence', () => {
  const certain: Action = {
    id: 'certain',
    label: 'certain',
    cost: 1,
    likelihood: [
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 0],
    ],
  };
  assert.throws(() => updateBelief(prior, certain, 1), /impossible/);
});
void test('invalid probability, outcome and budget contracts are rejected', () => {
  assert.throws(() => updateBelief([0.5, 0.5, 0.5, 0.5], actions[0], 1));
  assert.throws(() => entropy([NaN, 0, 0, 1]));
  assert.throws(() => updateBelief(prior, actions[0], 2));
  assert.throws(() => available(1.5));
  assert.throws(() => available(-1));
  assert.throws(() => categorical(prior, 1));
});
void test('measurement histories cannot overspend or substitute an unknown observation', () => {
  assert.equal(replay([{ action: 'full', outcome: 0 }]).remaining, 0);
  assert.throws(
    () =>
      replay([
        { action: 'full', outcome: 0 },
        { action: 'gate', outcome: 0 },
      ]),
    /budget/,
  );
  assert.throws(() => replay([{ action: 'invented', outcome: 0 }]));
});
void test('planning has no seed or hidden-state input; randomization cannot change adaptive choices', () => {
  for (const u of [0.001, 0.4, 0.99])
    assert.equal(chooseAction('adaptive_eig', prior, 2, u)?.id, 'gate');
  assert.equal(
    chooseAction('prior_only_planner', updateBelief(prior, actions[0], 1), 1)
      ?.id,
    'gate',
  );
  assert.equal(chooseAction('best_fixed', prior, 2)?.id, 'full');
});
void test('keyed noise agrees with independent Python SHA256 vectors', async () => {
  near(await keyedUniform('adaptive-v1|0|hidden'), 0.9054011827101931);
  near(
    await keyedUniform('adaptive-v1|1|measurement|gate|0'),
    0.44535629136953503,
  );
  near(
    await keyedUniform('adaptive-v1|127|policy|random_feasible|1'),
    0.27918052359018475,
  );
});
void test('joint likelihood arithmetic yields 81 percent for the adaptive decision tree', () => {
  let accuracy = 0;
  for (let family = 0; family < 2; family++)
    for (let local = 0; local < 2; local++) {
      const action = actions[family === 0 ? 1 : 2];
      const joint = prior.map(
        (p, h) =>
          p * actions[0].likelihood[h][family] * action.likelihood[h][local],
      );
      accuracy += Math.max(...joint);
    }
  near(accuracy, 0.81);
  const fixed = actions[3].likelihood[0].reduce(
    (sum, _, y) =>
      sum + Math.max(...prior.map((p, h) => p * actions[3].likelihood[h][y])),
    0,
  );
  near(fixed, 0.7);
});
void test('information objective can prefer a worse final decision', () => {
  const needle: Action = {
    id: 'needle',
    label: 'needle',
    cost: 1,
    likelihood: [
      [0, 1],
      [1, 0],
      [1, 0],
      [1, 0],
    ],
  };
  const broad: Action = {
    id: 'broad',
    label: 'broad',
    cost: 1,
    likelihood: prior.map((_, h) =>
      prior.map((_, y) => (h === y ? 0.6 : 0.4 / 3)),
    ),
  };
  assert.ok(informationGain(prior, needle) > informationGain(prior, broad));
  const accuracy = (a: Action) =>
    a.likelihood[0].reduce(
      (s, _, y) => s + Math.max(...prior.map((p, h) => p * a.likelihood[h][y])),
      0,
    );
  near(accuracy(needle), 0.5);
  near(accuracy(broad), 0.6);
});
void test('all policies share hidden systems and exhaust the same budget on development seeds', async () => {
  for (let seed = 0; seed < 128; seed++) {
    const runs = await Promise.all(
      (
        [
          'adaptive_eig',
          'best_fixed',
          'random_feasible',
          'prior_only_planner',
        ] as Policy[]
      ).map((p) => runEpisode(p, seed)),
    );
    assert.ok(runs.every((r) => r.hidden === runs[0].hidden && r.cost === 2));
    for (const r of runs) assert.deepEqual(replay(r.history).belief, r.belief);
  }
});
void test('replayable local records retain source and completion limits', () => {
  const record = {
    schema: 'observatory-discovery/1',
    source: 'synthetic',
    version: 'adaptive-tests-v1',
    seed: 7,
    policy: 'best_fixed',
    history: [{ action: 'full', outcome: 1 }],
    createdAt: '2026-09-10T00:00:00Z',
  };
  assert.equal(validateNotebookEntry(record).seed, 7);
  assert.throws(() => validateNotebookEntry({ ...record, source: 'hardware' }));
  assert.throws(() => validateNotebookEntry({ ...record, history: [] }));
  assert.throws(() => validateNotebookEntry({ ...record, truth: 'validated' }));
});
void test('local notebook checks deterministic outcomes and policy paths', async () => {
  for (const policy of [
    'adaptive_eig',
    'best_fixed',
    'random_feasible',
    'prior_only_planner',
  ] as Policy[]) {
    const run = await runEpisode(policy, 7);
    const record = {
      schema: 'observatory-discovery/1',
      source: 'synthetic',
      version: 'adaptive-tests-v1',
      seed: 7,
      policy,
      history: run.history,
      createdAt: '2026-09-10T00:00:00Z',
    };
    assert.deepEqual(await verifyNotebookEntry(record), record);
    await assert.rejects(
      verifyNotebookEntry({
        ...record,
        history: run.history.map((e, i) =>
          i
            ? e
            : {
                ...e,
                outcome:
                  (e.outcome + 1) %
                  actions.find((a) => a.id === e.action)!.likelihood[0].length,
              },
        ),
      }),
      /seed/,
    );
  }
  const fixed = await runEpisode('best_fixed', 7);
  const record = {
    schema: 'observatory-discovery/1',
    source: 'synthetic',
    version: 'adaptive-tests-v1',
    seed: 7,
    policy: 'adaptive_eig',
    history: fixed.history,
    createdAt: '2026-09-10T00:00:00Z',
  };
  await assert.rejects(verifyNotebookEntry(record), /rule/);
  assert.equal(
    (await verifyNotebookEntry({ ...record, policy: 'manual' })).policy,
    'manual',
  );
});
