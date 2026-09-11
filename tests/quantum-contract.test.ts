import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestBasis, updatePrior } from '../lib/engine/quantum.ts';

void test('quantum planner rejects invalid candidate distributions before planning', () => {
  const sparse: number[] = [1]; sparse.length = 6;
  for (const prior of [[], [0, 0, 0, 0, 0, 0], sparse, [NaN, 0, 0, 0, 0, 1], [-1, 2, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0]]) {
    assert.throws(() => suggestBasis(prior), /Six prior probabilities/);
    assert.throws(() => updatePrior(prior, { basis: 'Z', shots: 8, plus: 4, noise: .12 }), /Six prior probabilities/);
  }
});

void test('valid point prior has no reducible hypothesis uncertainty', () => {
  for (let i = 0; i < 6; i++) {
    const prior = Array.from({ length: 6 }, (_, j) => i === j ? 1 : 0);
    for (const result of suggestBasis(prior)) assert.equal(result.informationBits, 0);
  }
});
