import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginInvestigation,
  investigate,
  stepInvestigation,
  MODELS,
  parseRequest,
} from '../lib/engine/question.ts';
import { questionSvg, frameScale } from '../lib/engine/question-media.ts';
void test('confirmation cannot turn an unrelated question into a default fixture answer', () => {
  const r = investigate({
    prompt: 'What is the capital of France?',
    model: 'uhl',
    confirmed: true,
  });
  assert.equal(r.status, 'gap');
  assert.equal(r.passes.length, 0);
});
void test('contradictions and embedded quantities are never certified as an answered original prompt', () => {
  for (const prompt of [
    'Do not assume logistic: does boundedness force this?',
    'Noise is 100%; distinguish quantum states',
    'Compute exposure with no repair and τ=999',
  ]) {
    const model = prompt.includes('Noise')
      ? 'quantum'
      : prompt.includes('exposure')
        ? 'time'
        : 'uhl';
    const r = investigate({ prompt, model, confirmed: true });
    assert.equal(r.originalQuestionStatus, 'not-established');
    assert.ok(r.effectiveQuestion);
    assert.match(r.originalQuestionGap, /unverified|No answer/);
  }
});
void test('the effort-constrained question selects its own objective, not the lowest-error winner', () => {
  const base = {
    prompt:
      'Which controller uses the least actuator effort while keeping mean absolute tracking error below 0.05?',
    model: 'tao',
    confirmed: true,
    parameter: 4,
  };
  const accuracy = investigate(base),
    effort = investigate({ ...base, objective: 'effort' });
  assert.ok(
    accuracy.passes.some(
      (p, i) => p.values.winner !== effort.passes[i].values.winner,
    ),
  );
  for (const p of effort.passes) {
    assert.equal(p.values.winner, 'tao');
    assert.ok(Number(p.values['tao MAE']) < 0.05);
  }
  assert.ok(effort.passes[0].frame.series.some((s) => s.label === 'Target'));
  assert.equal(effort.passes[1].frame.kind, 'scatter');
  assert.equal(effort.passes[1].frame.threshold, 0.05);
  assert.match(questionSvg(effort, 1), /<circle/);
  assert.match(questionSvg(effort, 1), /Error threshold/);
  assert.throws(() => parseRequest({ ...base, objective: 'profit' }));
  assert.throws(() =>
    parseRequest({ ...base, model: 'uhl', objective: 'effort' }),
  );
});
void test('probability graphics share [0,1] and repair graphics retain changed parameters', () => {
  for (const noise of [0, 0.15, 1])
    for (const p of investigate({
      prompt: 'quantum',
      model: 'quantum',
      parameter: noise,
      confirmed: true,
    }).passes) {
      const scale = frameScale(p.frame);
      assert.equal(scale.min, 0);
      assert.equal(scale.max, 1);
    }
  const time = investigate({
    prompt: 'exposure repair',
    model: 'time',
    confirmed: true,
    parameter: 0.5,
  });
  assert.equal(frameScale(time.passes[1].frame).max, 100);
  assert.equal(frameScale(time.passes[2].frame).max, 100);
  assert.match(time.passes[1].frame.title, /τ = 0.5/);
  assert.match(time.passes[2].frame.title, /τ = 1 /);
  assert.match(questionSvg(time, 2), /base parameter 0.5 · effective τ 1 ·/);
});
void test('an unfamiliar question remains a gap without arbitrary model selection', () => {
  const r = investigate({ prompt: 'What colour is my missing sock?' });
  assert.equal(r.status, 'gap');
  assert.equal(r.model, null);
  assert.equal(r.passes.length, 0);
});
void test('keywords alone cannot authorise a numerical conclusion', () => {
  const r = investigate({ prompt: 'quantum measurement', confirmed: true });
  assert.equal(r.confirmed, false);
  assert.equal(r.passes.length, 0);
});
void test('explicit model still needs confirmation', () =>
  assert.equal(
    investigate({ prompt: 'exposure damage', model: 'time' }).status,
    'gap',
  ));
void test('ambiguous vocabulary retains alternatives', () => {
  const r = beginInvestigation({ prompt: 'state recover time quantum' });
  assert.ok(r.candidates.length > 1);
  assert.equal(r.confirmed, false);
});
void test('all four adapters terminate within budget with finite numerical outputs', () => {
  for (const m of MODELS) {
    const r = investigate({ prompt: m.question, model: m.id, confirmed: true });
    assert.ok(r.passes.length > 0 && r.passes.length <= 6);
    assert.ok(['conclusion', 'gap', 'budget'].includes(r.status));
    for (const p of r.passes)
      for (const s of p.frame.series)
        for (const pt of s.points) {
          assert.ok(Number.isFinite(pt.x));
          assert.ok(Number.isFinite(pt.y));
        }
  }
});
void test('one-step and automatic execution produce identical records', () => {
  for (const m of MODELS) {
    const input = { prompt: m.question, model: m.id, confirmed: true };
    let r = beginInvestigation(input);
    while (['ready', 'running'].includes(r.status)) r = stepInvestigation(r);
    assert.deepEqual(r, investigate(input));
  }
});
void test('budget exhaustion is not reported as a final conclusion', () => {
  const r = investigate({
    prompt: 'quantum states',
    model: 'quantum',
    confirmed: true,
    maxPasses: 1,
  });
  assert.equal(r.passes.length, 1);
  assert.equal(r.status, 'budget');
  assert.ok(r.passes[0].next);
});
void test('a completely noisy quantum instrument stops at an information gap', () => {
  const r = investigate({
    prompt: 'quantum states',
    model: 'quantum',
    parameter: 1,
    confirmed: true,
  });
  assert.equal(r.status, 'gap');
  assert.equal(r.passes.length, 1);
  assert.ok(r.passes[0].posterior?.every((x) => Math.abs(x - 1 / 6) < 1e-12));
});
void test('bounded composition identity holds across admissible start states', () => {
  for (const x of [0.05, 0.2, 0.5, 0.8, 0.95]) {
    const r = investigate({
      prompt: 'bounded flow',
      model: 'uhl',
      parameter: x,
      confirmed: true,
    });
    assert.ok(Number(r.passes[2].values.residual) < 1e-12);
    assert.ok(Number(r.passes[1].values.maximumResidual) < 1e-9);
  }
});
void test('temporal adapter keeps dose equal and distinguishes repair history', () => {
  const r = investigate({
    prompt: 'exposure and repair',
    model: 'time',
    parameter: 0.5,
    confirmed: true,
  });
  assert.equal(r.passes[0].values.earlyDose, r.passes[0].values.lateDose);
  assert.ok(Number(r.passes[1].values.early) < Number(r.passes[1].values.late));
  assert.ok(
    Math.abs(Number(r.passes[1].values.late) - 50 * (1 - Math.exp(-2))) < 1e-10,
  );
});
void test('TAO records conventional competitors and controller effort', () => {
  const r = investigate({
    prompt: 'TAO reactor',
    model: 'tao',
    confirmed: true,
  });
  assert.equal(r.passes.length, 4);
  assert.ok('pi effort' in r.passes[0].values);
  assert.ok(r.passes.some((p) => p.answer.includes('Anti-windup PI')));
});
void test('malformed, excessive and unsupported requests fail before computing', () => {
  for (const raw of [
    null,
    [],
    { prompt: '' },
    { prompt: 'x'.repeat(2001) },
    { prompt: 'x', model: 'unknown' },
    { prompt: 'x', model: 'uhl', parameter: NaN },
    { prompt: 'x', model: 'time', parameter: 0 },
    { prompt: 'x', model: 'quantum', parameter: 2 },
    { prompt: 'x', maxPasses: 100000 },
    { prompt: 'x', maxPasses: 1.5 },
    { prompt: 'x', confirmed: 'yes' },
    { prompt: 'x', parameter: 1 },
  ])
    assert.throws(() => parseRequest(raw));
});
void test('terminal records are idempotent', () => {
  const r = investigate({ prompt: 'bounded', model: 'uhl', confirmed: true });
  assert.deepEqual(stepInvestigation(r), r);
});
void test('SVG exports escape user text and retain model provenance', () => {
  const r = investigate({
    prompt: '<script>alert("unsafe")</script> & bounded',
    model: 'uhl',
    confirmed: true,
  });
  const s = questionSvg(r);
  assert.ok(!s.includes('<script>'));
  assert.ok(s.includes('&lt;script&gt;'));
  assert.ok(s.includes('question-desk-2'));
  assert.ok(s.includes('Conditional model calculation'));
});
void test('SVG requires an executed result', () =>
  assert.throws(() => questionSvg(beginInvestigation({ prompt: 'unknown' }))));
