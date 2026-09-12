import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { languageProbe } from '../lib/engine/family-language.ts';
import { FamilyWorld, SigmoidLearner, partnerProbe, FAMILY_WORLD_VERSION, drive, type Agent, type Action } from '../lib/engine/family-world.ts';
import { random, mean } from '../lib/engine/random.ts';

const development = process.argv.includes('--development');
const seeds = development ? [101, 102, 103] : Array.from({ length: 12 }, (_, i) => 1001 + i);
const mse = (a: number[], b: number[]) => mean(a.map((v, i) => (v - b[i]) ** 2));
function needFirst(world: FamilyWorld, a: Agent): Action {
  const min = Math.min(...a.needs), i = a.needs.indexOf(min), h = world.homes[a.family];
  if (min < 0.7) return { verb: (['forage', 'drink', 'rest'] as const)[i] };
  if (h.shelters < 2 || h.gardens < 2) return { verb: h.materials < 0.3 ? 'gather' : h.gardens < 2 ? 'plant' : 'build' };
  if (!h.welcomed) return { verb: h.materials < 0.4 ? 'gather' : 'welcome' };
  return { verb: (['forage', 'drink', 'rest'] as const)[i] };
}
function control(seed: number, mode: 'learned' | 'random' | 'need-first' | 'linear', adaptiveAttention = true) {
  const architecture = mode === 'linear' ? 'linear' : 'stacked';
  const trained = new FamilyWorld(seed, { policy: 'random', architecture, adaptiveAttention }); trained.step(600);
  const w = new FamilyWorld((seed ^ 0x2201) >>> 0, { policy: 'random', architecture, adaptiveAttention });
  w.agents.forEach((a, i) => { a.brain = trained.agents[i].brain; });
  w.options.training = false; w.options.policy = mode === 'random' ? 'random' : 'learned';
  if (mode === 'need-first') w.choose = a => needFirst(w, a);
  const deficits: number[] = [];
  for (let t = 0; t < 200; t++) { w.drought = t >= 100; w.step(); deficits.push(mean(w.agents.map(a => drive(a.needs)))); }
  return mean(deficits);
}
function prediction(seed: number) {
  const trained = new FamilyWorld(seed, { policy: 'random', architecture: 'stacked' });
  const linearRng = random((seed ^ 0x54fe) >>> 0), nonlinearRng = random((seed ^ 0x21fe) >>> 0);
  const linear = Array.from({ length: 8 }, () => new SigmoidLearner(34, linearRng, 4, []));
  const nonlinear = Array.from({ length: 8 }, () => new SigmoidLearner(34, nonlinearRng));
  const frozen = nonlinear.map(m => { const copy = new SigmoidLearner(34, random(1)); copy.weights = structuredClone(m.weights); return copy; });
  const sums = Array.from({ length: 8 }, () => [0, 0, 0, 0]), ns = Array(8).fill(0) as number[];
  for (let t = 0; t < 600; t++) {
    trained.step();
    for (const a of trained.agents) {
      const e = a.replay.at(-1); if (!e) continue;
      for (let j = 0; j < 4; j++) sums[a.id][j] += e.y[j]; ns[a.id]++;
      linear[a.id].train(e.x, e.y);
      nonlinear[a.id].train(e.x, e.y);
      // Identical observations, replay selections and update counts.
      for (let j = 0; j < 3; j++) { const r = a.replay[(t * 17 + j * 23) % a.replay.length]; linear[a.id].train(r.x, r.y); nonlinear[a.id].train(r.x, r.y); }
    }
  }
  const test = new FamilyWorld((seed ^ 0x123456) >>> 0, { policy: 'random', learning: false });
  const score = { learned: 0, initial: 0, constant: 0, linear: 0 }; let n = 0;
  for (let t = 0; t < 250; t++) {
    test.drought = t >= 125; test.step();
    for (const a of test.agents) {
      const model = trained.agents[a.id], e = a.replay.at(-1); if (!model || !e || !ns[a.id]) continue;
      score.learned += mse(nonlinear[a.id].predict(e.x), e.y);
      score.initial += mse(frozen[a.id].predict(e.x), e.y);
      score.constant += mse(sums[a.id].map(v => v / ns[a.id]), e.y);
      score.linear += mse(linear[a.id].predict(e.x), e.y); n++;
    }
  }
  return { learned: score.learned / n, initial: score.initial / n, constant: score.constant / n, linear: score.linear / n, observations: n };
}
const rows = seeds.map(seed => {
  const row = { seed, prediction: prediction(seed), control: { learned: control(seed, 'learned'), random: control(seed, 'random'), needFirst: control(seed, 'need-first'), linear: control(seed, 'linear'), fixedAttention: control(seed, 'learned', false) },
    partners: partnerProbe((seed ^ 0x6789) >>> 0), equalPartners: partnerProbe((seed ^ 0x9876) >>> 0, true), highCost: partnerProbe((seed ^ 0x6789) >>> 0, false, 0.4) };
  console.log(JSON.stringify(row)); return row;
});
function summarize(values: number[]) {
  const rng = random(20260911), draws = Array.from({ length: 10000 }, () => mean(values.map(() => values[Math.floor(rng() * values.length)]))).sort((a, b) => a - b);
  return { mean: mean(values), ci95: [draws[249], draws[9749]] };
}
const result = { version: FAMILY_WORLD_VERSION, source: 'synthetic authored simulator; 0.1 development, not consciousness evidence', development, seeds,
  sourceHashes: Object.fromEntries(['lib/engine/family-world.ts', 'lib/engine/family-language.ts', 'scripts/family-world-research.ts', 'research/two-family-world/PROTOCOL.md'].map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  language: languageProbe(),
  architectures: { stackedSigmoid: { dimensions: [34, 20, 12, 4], parameters: 1004, multiplyAddsPerPrediction: 968 }, linearSigmoid: { dimensions: [34, 4], parameters: 140, multiplyAddsPerPrediction: 136 }, note: 'Parameter and matrix multiply-add counts only; not tokens, energy, dollars or equivalent general intelligence.' },
  summary: {
    predictionLearned: summarize(rows.map(r => r.prediction.learned as number)), predictionInitial: summarize(rows.map(r => r.prediction.initial as number)),
    predictionConstant: summarize(rows.map(r => r.prediction.constant as number)), predictionLinear: summarize(rows.map(r => r.prediction.linear as number)),
    predictionDeltaVsConstant: summarize(rows.map(r => (r.prediction.learned as number) - (r.prediction.constant as number))),
    deficitLearned: summarize(rows.map(r => r.control.learned)), deficitRandom: summarize(rows.map(r => r.control.random)), deficitNeedFirst: summarize(rows.map(r => r.control.needFirst)),
    deficitDeltaVsRandom: summarize(rows.map(r => r.control.learned - r.control.random)), deficitDeltaVsNeedFirst: summarize(rows.map(r => r.control.learned - r.control.needFirst)),
    deficitLinear: summarize(rows.map(r => r.control.linear)), deficitFixedAttention: summarize(rows.map(r => r.control.fixedAttention)), deficitDeltaVsFixedAttention: summarize(rows.map(r => r.control.learned - r.control.fixedAttention)),
    partnerBrierRemembered: summarize(rows.map(r => r.partners.brierRemembered)), partnerBrierErased: summarize(rows.map(r => r.partners.brierErased)),
    partnerDelta: summarize(rows.map(r => r.partners.brierRemembered - r.partners.brierErased)), equalPartnerDelta: summarize(rows.map(r => r.equalPartners.brierRemembered - r.equalPartners.brierErased)),
  }, rows };
mkdirSync('research/two-family-world/results', { recursive: true });
writeFileSync(`research/two-family-world/results/${development ? 'development' : 'evaluation'}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));
if (!development) {
  const demo = new FamilyWorld(20260911), frames = [demo.snapshot()];
  for (let i = 0; i < 200; i++) { demo.drought = i >= 120 && i < 155; demo.step(5); frames.push(demo.snapshot()); }
  writeFileSync('research/two-family-world/results/demo.json', JSON.stringify({ label: 'Recorded seeded run, including planned drought', frames }));
}
