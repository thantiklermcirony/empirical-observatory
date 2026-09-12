import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { env } from './cloudflare-binding.mjs';
import { runResearchQuestion, sourceResearchBrief, sourcePlan } from '../../lib/research-engine.ts';
import { signPrintout, verifySignedPrintout } from '../../lib/report-signature.ts';
import { reserveAiCall } from '../../lib/ai-research-transport.ts';
import { createTemporalExample, hashTemporalJson } from '../../lib/engine/temporal-router.ts';
import { LAB_EXAMPLES } from '../../lib/lab-contract.ts';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'cloudflare:workers') return { url: new URL('./cloudflare-binding.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@/')) return { url: pathToFileURL(resolve(specifier.slice(2) + '.ts')).href, shortCircuit: true };
  return next(specifier, context);
} });
const researchRoute = await import('../../app/api/inquiry/research/route.ts');
const saveRoute = await import('../../app/api/inquiry/save/route.ts');
const config = { apiKey: 'test-only-research-secret', model: 'test-model', dailyCallLimit: '200' };
const question = 'is biology bounded and adaptive, prove it';
const response = value => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
const answer = { headline: 'A resource limit is conditional; adaptation needs a comparison.', answer: 'The declared resource example excludes its target. It does not prove that every biological system adapts.', sections: [{ heading: 'Resource evidence', body: 'The ceiling excludes the declared target, under its assumptions.', evidenceIds: ['S-BIO', 'R2'] }], missingEvidence: ['Matched absolute pools, calibration and a response measured against a baseline.'], nextSteps: ['Measure reserves and recovery after a declared challenge.'] };
const request = body => new Request('https://example.test/api/inquiry/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
class Database {
  constructor() { this.sql = new DatabaseSync(':memory:'); for (const name of ['0001_giant_living_lightning.sql', '0002_chunky_adam_destine.sql']) this.sql.exec(readFileSync(resolve('drizzle', name), 'utf8')); }
  prepare(sql) { const db = this.sql; return { args: [], bind(...args) { return { ...this, args }; }, async first() { return db.prepare(sql).get(...this.args) ?? null; }, async run() { return { meta: { changes: Number(db.prepare(sql).run(...this.args).changes) } }; } }; }
  async batch(statements) { this.sql.exec('BEGIN'); try { const r = []; for (const s of statements) r.push(await s.run()); this.sql.exec('COMMIT'); return r; } catch (e) { this.sql.exec('ROLLBACK'); throw e; } }
}
test('the visitor biology question produces scoped calculations, actual numbers, links and concrete missing evidence without AI', async () => {
  const r = await runResearchQuestion(question, {}, () => { throw new Error('no quota needed'); }, () => { throw new Error('no provider'); });
  assert.equal(r.research.mode, 'source_brief'); assert.equal(r.research.aiCalls, 0);
  assert.deepEqual(r.research.cases.map(c => c.label), ['order', 'resource', 'control']);
  assert.match(r.research.answer.answer, /does not prove/);
  assert.ok(r.research.answer.missingEvidence.some(x => /NADPH/.test(x)));
  assert.ok(!JSON.stringify(r.research.answer).includes('fourteen-field'));
  assert.equal(r.research.cases[0].printout.inquiries[0].results.at(-1).value, '7/26');
  const resource = r.research.cases[1].printout.inquiries[0].results.find(x => x.capability_id === 'biology.resource.ceiling');
  assert.equal(resource.value.target_excluded, true);
  assert.ok(r.encyclopedia.some(e => e.id === 'E04'));
  const { receiptSha256, ...content } = r; assert.equal(await hashTemporalJson(content), receiptSha256);
});
test('two-stage AI actually receives executed laboratory values before explaining the original question', async () => {
  let calls = 0, reservations = 0;
  const r = await runResearchQuestion(question, config, async () => { reservations++; }, async (url, options) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(options.redirect, 'manual');
    const body = JSON.parse(options.body); assert.equal(body.store, false); if (calls === 1) { assert.equal(body.tools?.[0]?.type, 'web_search'); assert.equal(body.max_tool_calls, 3); } else assert.equal(body.tools, undefined);
    const input = JSON.parse(body.input); assert.equal(input.question, question);
    if (calls === 1) return response(sourcePlan(question));
    assert.equal(input.laboratoryResults.length, 3);
    assert.ok(JSON.stringify(input.laboratoryResults).includes('7/26'));
    assert.ok(JSON.stringify(input.laboratoryResults).includes('target_excluded'));
    assert.ok(JSON.stringify(input.laboratoryResults).includes('0.009131048332392842'));
    assert.ok(input.laboratoryResults.every(c => /^[a-f0-9]{64}$/.test(c.receipt)));
    return response(answer);
  });
  assert.equal(calls, 2); assert.equal(reservations, 2); assert.equal(r.research.aiCalls, 2);
  assert.equal(r.research.mode, 'ai_synthesis'); assert.deepEqual(r.research.answer, answer);
});
test('exact supported quantities override an AI attempt to substitute example defaults', async () => {
  const prompt = LAB_EXAMPLES[0].prompt.replace('x=1/4', 'x=1/2');
  let calls = 0;
  const r = await runResearchQuestion(prompt, config, async () => {}, async () => response(++calls === 1 ? sourcePlan(prompt) : { ...answer, sections: [{ ...answer.sections[0], evidenceIds: ['R1'] }] }));
  assert.equal(r.research.cases.length, 1); assert.equal(r.research.cases[0].printout.prompt, prompt);
  assert.notEqual(r.research.cases[0].printout.inquiries[0].results.at(-1).value, '7/26');
});
test('unsupported AI branch proposal cannot erase valid branch calculations or become observed evidence', async () => {
  const plan = sourcePlan(question);
  const bio = plan.tasks.find(t => t.branch === 'biology'); bio.exampleIds = []; bio.inquiryJson = '{"runtime":"invented"}';
  let calls = 0;
  const r = await runResearchQuestion(question, config, async () => {}, async () => response(++calls === 1 ? plan : { ...answer, sections: [{ ...answer.sections[0], evidenceIds: ['R1', 'S-BIO'] }] }));
  assert.equal(r.research.mode, 'ai_synthesis'); assert.deepEqual(r.research.cases.map(c => c.label), ['order', 'control']);
  assert.ok(r.research.plan.tasks.find(t => t.branch === 'biology').missing.some(x => /could not|did not/.test(x)));
});
test('invented citations and failed second calls return a labelled source explanation while retaining calculations', async () => {
  for (const fail of ['citation', 'provider']) {
    let calls = 0;
    const r = await runResearchQuestion(question, config, async () => {}, async () => {
      if (++calls === 1) return response(sourcePlan(question));
      return fail === 'provider' ? new Response('private-provider-error', { status: 500 }) : response({ ...answer, sections: [{ ...answer.sections[0], evidenceIds: ['FABRICATED'] }] });
    });
    assert.equal(r.research.mode, 'partial_ai'); assert.equal(r.research.cases.length, 3); assert.equal(r.research.aiCalls, 2);
    assert.ok(!JSON.stringify(r).includes('private-provider-error')); assert.ok(!JSON.stringify(r).includes('FABRICATED'));
  }
});
test('quota is atomic, shared and reserves failed provider attempts; no 201st call or hidden retry', async () => {
  const db = new Database(), date = new Date('2026-09-12T00:00:00Z');
  try {
    const attempts = await Promise.allSettled(Array.from({ length: 205 }, () => reserveAiCall(db, 200, date)));
    assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 200);
    assert.equal(db.sql.prepare('SELECT calls FROM ai_daily_calls').get().calls, 200);
    let called = 0;
    const r = await runResearchQuestion(question, config, () => reserveAiCall(db, 200, date), async () => { called++; return new Response(null, { status: 500 }); });
    assert.equal(called, 0); assert.equal(r.research.aiCalls, 0); assert.match(r.research.connectionMessage, /allowance is used/);
    await reserveAiCall(db, 200, new Date('2026-09-13T00:00:00Z'));
    await assert.rejects(reserveAiCall(db, 201, date), /invalid/);
  } finally { db.sql.close(); }
});
test('signed AI report saves exactly without another provider call; tampering, expiry and wrong key fail', async () => {
  const report = await sourceResearchBrief(question), now = new Date();
  const signed = await signPrintout(report, config.apiKey, now);
  assert.deepEqual(await verifySignedPrintout(signed, config.apiKey, now), report);
  const tampered = structuredClone(signed); tampered.printout.summary = 'fabricated proof';
  await assert.rejects(verifySignedPrintout(tampered, config.apiKey, now), /changed/);
  await assert.rejects(verifySignedPrintout(signed, 'wrong-key', now), /changed/);
  await assert.rejects(verifySignedPrintout(signed, config.apiKey, new Date(signed.expiresAt)), /expired/);
  const db = new Database(); env.DB = db; env.OPENAI_API_KEY = config.apiKey;
  const originalFetch = globalThis.fetch; globalThis.fetch = () => { throw new Error('Save must not call AI'); };
  try {
    const bad = await saveRoute.POST(request({ signedReport: tampered })); assert.equal(bad.status, 400);
    const saved = await saveRoute.POST(request({ signedReport: signed })); assert.equal(saved.status, 201);
    const body = await saved.json(); assert.deepEqual(body.printout, report);
    assert.ok(!db.sql.prepare('SELECT printout_json FROM lab_printouts').get().printout_json.includes(config.apiKey));
  } finally { globalThis.fetch = originalFetch; delete env.OPENAI_API_KEY; db.sql.close(); }
});
test('actual research API accepts a broad question without saving it and rejects envelope injection', async () => {
  const db = new Database(); env.DB = db; delete env.OPENAI_API_KEY;
  try {
    const r = await researchRoute.POST(request({ prompt: question })); assert.equal(r.status, 200);
    const body = await r.json(); assert.equal(body.printout.research.mode, 'source_brief'); assert.equal(body.signedReport, undefined);
    assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM lab_printouts').get().n, 0);
    assert.equal((await researchRoute.POST(request({ prompt: question, runtime: {} }))).status, 400);
    assert.equal((await researchRoute.POST(request({ inquiry: createTemporalExample('resource') }))).status, 400);
  } finally { db.sql.close(); }
});
