import test from 'node:test';
import assert from 'node:assert/strict';
import {
  predictivePartition,
  stateLawWitness,
  refineJurisdiction,
  actionCover,
  boundedComposition,
  storageCount,
} from '../lib/engine/paper-checks.ts';
import { runPaperCheck, CHALLENGES } from '../lib/paper-challenges.ts';
const rows = [
  [0.2, 0.8],
  [0.2, 0.8],
  [0.2, 0.6],
  [0.9, 0.8],
];
void test('independent hand oracle: exact predictive quotient and a lost-history witness', () => {
  assert.deepEqual(predictivePartition(rows, [0, 1]), [[0, 1], [2], [3]]);
  assert.equal(stateLawWitness(rows, [0, 1], ['A', 'A', 'B', 'C']), null);
  assert.deepEqual(stateLawWitness(rows, [0, 1], ['A', 'A', 'B', 'B']), {
    histories: [2, 3],
    test: 0,
    probabilities: [0.2, 0.9],
  });
  // Changing units of representation through a bijection preserves a partition.
  assert.equal(stateLawWitness(rows, [0, 1], ['11', '11', '12', '13']), null);
});
void test('adding a retained test refines; replacing it fails the nesting premise', () => {
  const r = refineJurisdiction(rows, [0], [0, 1]);
  assert.equal(r.status, 'nested');
  assert.deepEqual(r.coarse, [[0, 1, 2], [3]]);
  assert.deepEqual(r.fine, [[0, 1], [2], [3]]);
  assert.deepEqual(r.map, [0, 0, 1]);
  assert.equal(refineJurisdiction(rows, [0], [1]).status, 'not-applicable');
});
void test('minimum action code can be smaller than the predictive partition', () => {
  const r = actionCover(
    [
      [0.95, 0.9, 0.1],
      [0.2, 0.95, 0.9],
      [0.6, 0.98, 0.95],
    ],
    0.9,
  );
  assert.deepEqual(r.common, [1]);
  assert.deepEqual(r.cover, [1]);
  assert.equal(r.codes, 1);
});
void test('ternary conflict invisible to pairwise compatibility still requires two codes', () => {
  const p = [
    [0.95, 0.93, 0.1],
    [0.1, 0.91, 0.94],
    [0.92, 0.2, 0.96],
  ];
  const r = actionCover(p, 0.9);
  assert.equal(r.codes, 2);
  assert.deepEqual(r.common, []);
  for (const pair of [
    [0, 1],
    [1, 2],
    [0, 2],
  ])
    assert.equal(
      actionCover(
        pair.map((i) => p[i]),
        0.9,
      ).codes,
      1,
    );
  assert.equal(
    actionCover(
      [
        [0.1, 0.2],
        [0.8, 0.99],
      ],
      0.9,
    ).status,
    'infeasible',
  );
});
void test('cover size agrees with an independent brute-force deterministic-code oracle on every 3x3 Boolean instance', () => {
  // Oracle assigns state labels, then checks whole-cell intersections. Solver enumerates action covers.
  for (let bits = 0; bits < 512; bits++) {
    const p = Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, j) => (bits >> (i * 3 + j)) & 1),
    );
    let expected: number | null = null;
    for (let k = 1; k <= 3 && expected === null; k++)
      for (let code = 0; code < k ** 3; code++) {
        const labels = Array.from(
          { length: 3 },
          (_, i) => Math.floor(code / k ** i) % k,
        );
        if (
          Array.from({ length: k }, (_, label) =>
            p.map((_, i) => i).filter((i) => labels[i] === label),
          ).every(
            (cell) =>
              !cell.length ||
              [0, 1, 2].some((a) => cell.every((i) => p[i][a] === 1)),
          )
        ) {
          expected = k;
          break;
        }
      }
    assert.equal(actionCover(p, 1).codes, expected, `Boolean instance ${bits}`);
  }
});
void test('bounded additive conjugacy gives a counterexample to unique raw-coordinate selection', () => {
  assert.equal(boundedComposition(0.5, 0.5, 'rapidity'), 0.8);
  assert.ok(
    Math.abs(
      boundedComposition(0.5, 0.5, 'tangent') - (2 * Math.atan(2)) / Math.PI,
    ) < 1e-15,
  );
  assert.ok(Math.abs(boundedComposition(0.5, 0.5, 'tangent') - 0.8) > 0.09);
  for (const chart of ['rapidity', 'tangent'] as const)
    for (const x of [-0.8, -0.3, 0, 0.2, 0.7]) {
      assert.ok(Math.abs(boundedComposition(x, 0, chart) - x) < 1e-14);
      assert.ok(Math.abs(boundedComposition(x, -x, chart)) < 1e-14);
      const left = boundedComposition(
        boundedComposition(x, 0.15, chart),
        -0.25,
        chart,
      );
      const right = boundedComposition(
        x,
        boundedComposition(0.15, -0.25, chart),
        chart,
      );
      assert.ok(Math.abs(left - right) < 1e-13);
    }
});
void test('counting oracle and invalid domains', () => {
  assert.deepEqual(storageCount(4, 2, 6), {
    needed: 8,
    tables: '256',
    descriptions: '64',
    enough: false,
  });
  assert.equal(storageCount(4, 2, 8).enough, true);
  for (const fn of [
    () => predictivePartition([[NaN]], [0]),
    () => predictivePartition(rows, [2]),
    () => predictivePartition(rows, [0, 0]),
    () => actionCover([[1, 2]], 0.9),
    () => actionCover([[1]], NaN),
    () => boundedComposition(1, 0, 'tangent'),
    () => storageCount(4, -1, 6),
  ])
    assert.throws(fn);
});
void test('challenge calculation does not consume expected answer prose', () => {
  for (const c of CHALLENGES) {
    const before = runPaperCheck(c.id);
    const expected = c.expected;
    c.expected = 'DELIBERATELY WRONG';
    try {
      assert.deepEqual(runPaperCheck(c.id), before);
    } finally {
      c.expected = expected;
    }
  }
  assert.equal(
    CHALLENGES.map((c) => runPaperCheck(c.id)).filter(
      (r) => r.status === 'witness',
    ).length,
    6,
  );
  assert.equal(runPaperCheck('hormesis').status, 'missing-inputs');
  assert.equal(runPaperCheck('ida').status, 'missing-inputs');
});
