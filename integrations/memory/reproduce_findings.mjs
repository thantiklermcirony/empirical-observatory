// Historical v0.1 audit reproducer: run against the archived v0.1 source, not this corrected engine.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const root = process.argv[2];
if (!root) throw new Error('Pass the Observatory checkout path.');
const tao = await import(pathToFileURL(resolve(root, 'lib/engine/tao.ts')));
const q = await import(pathToFileURL(resolve(root, 'lib/engine/quantum.ts')));
const records = await import(pathToFileURL(resolve(root, 'lib/engine/records.ts')));
const counts = Object.fromEntries(q.STATES.map(s => [s, {n: 0, plus: 0}]));
for (let seed = 0; seed < 60000; seed++) {
  const state = q.mysteryState(seed);
  counts[state].n++;
  counts[state].plus += q.measure(state, 'Z', 1, seed, 0.12).plus;
}
const c0 = tao.controllerAction('tao', {x:.1, age:0, confidence:1}, .6, 2, .05, 0, tao.initialControl());
const c1 = tao.controllerAction('tao', {x:.9, age:0, confidence:1}, .6, 2, .05, .1, c0.memory);
const quantumEmpty = records.record('quantum', 'simulation', 5, {noise:999, budget:-1}, [], {}, true);
let emptyAccepted;
try { records.validateRecord(quantumEmpty); emptyAccepted = true; } catch { emptyAccepted = false; }
const output = {
  scope: 'Diagnostics of engine 0.1.0 inspected on 2026-09-09; not a programme performance benchmark.',
  firstShotConditionalByState: Object.entries(counts).map(([state, row]) => ({state, n:row.n, measuredPlusRate:row.plus/row.n, declaredPlusProbability:q.probability(state, 'Z', [], .12)})),
  alignmentIdentity: {input:1e-12, output:tao.flow('alignment', 1e-12, 0)},
  dwell: {firstMode:c0.memory.mode, firstAction:c0.u, secondMode:c1.memory.mode, secondAction:c1.u, elapsed:.1, declaredDwell:.5},
  completedQuantumRecordWithNoShotsAndInvalidConfigAccepted:emptyAccepted,
};
writeFileSync(new URL('./audit-reproduction.json', import.meta.url), JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
