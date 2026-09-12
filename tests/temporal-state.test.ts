import assert from 'node:assert/strict';
import test from 'node:test';
import { acuteExcessMortality, referenceRepairRate, referenceRepairTimeDays, simulatePiecewiseRateSnt, simulateTemporalExposure } from '../lib/engine/temporal-state.ts';

void test('published acute SNT examples are reproduced', () => {
  assert.ok(Math.abs(acuteExcessMortality(5) - 7.1e-6) < 0.2e-6);
  assert.ok(Math.abs(acuteExcessMortality(10) - 3.2e-5) < 0.2e-5);
  assert.ok(Math.abs(acuteExcessMortality(1000) - 0.064) < 0.001);
});

void test('rate SNT reproduces the printed routine for both synthetic profiles', () => {
  const rapid = simulatePiecewiseRateSnt([100, 500, 100], [1.2, 0.4, 0.4]);
  const spread = simulatePiecewiseRateSnt([1, 5, 1], [120, 40, 40]);
  // Golden values independently evaluated from the paper's printed Python routine.
  assert.ok(Math.abs(rapid.mortalities.at(-1)! - 0.023762472955089858) < 1e-14);
  assert.ok(Math.abs(spread.mortalities.at(-1)! - 0.0003164518885335371) < 1e-14);
});

void test('constant-rate subdivision stays within the declared quadrature error', () => {
  const whole = simulatePiecewiseRateSnt([10], [10]);
  const split = simulatePiecewiseRateSnt(Array(100).fill(10), Array(100).fill(0.1));
  assert.ok(Math.abs(whole.mortalities[0] - split.mortalities.at(-1)!) < 1e-9);
  assert.ok(Math.abs(whole.undones[0] - split.undones.at(-1)!) < 1e-12);
});

void test('interactive and piecewise defaults use one canonical repair time', () => {
  assert.equal(referenceRepairRate, 1 / referenceRepairTimeDays);
  const interactive = simulateTemporalExposure('uniform');
  const reference = simulatePiecewiseRateSnt(Array(200).fill(10), Array(200).fill(0.05));
  assert.ok(Math.abs(interactive.finalMortality - reference.mortalities.at(-1)!) < 1e-14);
});

void test('equal total doses retain timing information through undone damage', () => {
  const runs = (['acute', 'spaced', 'uniform', 'late'] as const).map(id => simulateTemporalExposure(id));
  for (const run of runs) assert.ok(Math.abs(run.totalDose - 100) < 1e-10);
  assert.ok(runs[0].finalMortality > runs[1].finalMortality);
  assert.ok(runs[1].finalMortality > runs[2].finalMortality);
});
