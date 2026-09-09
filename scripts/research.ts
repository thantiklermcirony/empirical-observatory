import { writeFileSync, mkdirSync } from 'node:fs';
import { compareControllers } from '../lib/engine/tao.ts';
import { STATES, probability } from '../lib/engine/quantum.ts';
mkdirSync('public/research', { recursive: true });
const benchmark = compareControllers();
writeFileSync(
  'public/research/benchmark.json',
  JSON.stringify(benchmark, null, 2) + '\n',
);
writeFileSync(
  'public/research/quantum-reference.json',
  JSON.stringify(
    {
      engine: 'quantum-tensors@0.4.15',
      noise: 0.12,
      rows: STATES.flatMap((state) =>
        (['X', 'Y', 'Z'] as const).map((basis) => ({
          state,
          basis,
          ideal: probability(state, basis, [], 0),
          depolarised: probability(state, basis, [], 0.12),
        })),
      ),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    benchmark.rows.map(
      ({
        controller,
        gain,
        mae,
        actuatorEffort,
        recoverySeconds,
        unrecovered,
      }) => ({
        controller,
        gain,
        mae,
        actuatorEffort,
        recoverySeconds,
        unrecovered,
      }),
    ),
    null,
    2,
  ),
);
