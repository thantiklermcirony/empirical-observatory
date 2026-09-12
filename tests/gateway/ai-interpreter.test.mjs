import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { env } from './cloudflare-binding.mjs';
import { aiStatus, interpretQuestion } from '../../lib/ai-interpreter.ts';
import { createTemporalExample } from '../../lib/engine/temporal-router.ts';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'cloudflare:workers') return { url: new URL('./cloudflare-binding.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('@/')) return { url: pathToFileURL(resolve(specifier.slice(2) + '.ts')).href, shortCircuit: true };
  return next(specifier, context);
} });
const route = await import('../../app/api/inquiry/interpret/route.ts');
const config = { apiKey: 'test-only-not-a-real-key', model: 'test-model', dailyCallLimit: '200' };
const missing = { status: 'needs_input', explanation: 'A measured preparation is missing.', questions: ['Which preparation?'], inquiry_json: null };
const response = value => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
const promptRequest = body => new Request('https://example.test/api/inquiry/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('AI remains disabled without explicit credential, model and bounded daily limit', async () => {
  for (const change of [{ apiKey: '' }, { model: '' }, { dailyCallLimit: '0' }, { dailyCallLimit: '201' }, { dailyCallLimit: '501' }, { dailyCallLimit: '1.5' }]) {
    assert.equal(aiStatus({ ...config, ...change }).ready, false);
    await assert.rejects(interpretQuestion('question', { ...config, ...change }, () => { throw new Error('must not call'); }), /not been connected/);
  }
  assert.equal(aiStatus(config).dailyCallLimit, 200);
  assert.ok(!JSON.stringify(aiStatus(config)).includes(config.apiKey));
});
test('missing input cannot silently become a fabricated result', async () => {
  let called = 0;
  const result = await interpretQuestion('What is the actual effect?', config, async (url, options) => {
    called++; assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.redirect, 'error');
    const request = JSON.parse(options.body);
    assert.equal(request.store, false); assert.equal(request.max_output_tokens, 2200);
    assert.equal(request.text.format.strict, true); assert.equal(request.input, 'What is the actual effect?');
    assert.equal(request.tools, undefined);
    return response(missing);
  });
  assert.equal(called, 1); assert.equal(result.status, 'needs_input'); assert.equal(result.inquiry, null);
});
test('valid proposals keep the user question and cannot claim observed premises', async () => {
  const inquiry = createTemporalExample('actions-ab');
  inquiry.results = [{ value: 'forged provider result', status: 'established_in_scope' }];
  inquiry.premises.forEach(p => { p.status = 'observed'; });
  const result = await interpretQuestion('My original question with its qualifiers', config, async () => response({ ...missing, status: 'proposal', inquiry_json: JSON.stringify(inquiry) }));
  assert.equal(result.inquiry.question.original, 'My original question with its qualifiers');
  assert.ok(result.inquiry.premises.every(p => p.status === 'assumed'));
  assert.equal(result.inquiry.provenance.ai_interpretation.empirical_validation, false);
  assert.equal(result.inquiry.provenance.evidence_kind, 'unverified_declared_model');
  assert.deepEqual(result.inquiry.results, []);
});
test('invalid, duplicate, oversized and incomplete provider outputs are rejected', async () => {
  const malformed = [
    response({ ...missing, extra: 'not allowed' }),
    response({ ...missing, inquiry_json: '{}' }),
    response({ ...missing, status: 'proposal', inquiry_json: '{}' }),
    response({ ...missing, questions: Array(9).fill('question') }),
    Response.json({ status: 'incomplete', output: [] }),
    Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }),
    new Response('{"status":"completed","status":"completed"}'),
    new Response(' '.repeat(131073)),
    new Response('provider private details', { status: 401 }),
  ];
  for (const output of malformed) await assert.rejects(interpretQuestion('question', config, async () => output));
});
test('quota reserves exactly 200 calls, rejects invalid requests first and stays closed on provider failure', async () => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('drizzle/0002_chunky_adam_destine.sql', 'utf8'));
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  env.DB = { prepare(query) { return { bind(...args) { return { async first() { return sql.prepare(query).get(...args) ?? null; } }; } }; } };
  try {
    assert.equal((await route.POST(promptRequest({ prompt: 'question' }))).status, 503);
    env.OPENAI_API_KEY = config.apiKey; env.OBSERVATORY_AI_MODEL = config.model; env.OBSERVATORY_AI_DAILY_CALL_LIMIT = '200';
    globalThis.fetch = async () => { providerCalls++; return response(missing); };
    assert.equal((await route.POST(promptRequest({ prompt: 'question', runtime: {} }))).status, 400);
    assert.equal(providerCalls, 0);
    const requests = await Promise.all(Array.from({ length: 201 }, () => route.POST(promptRequest({ prompt: 'question' }))));
    assert.equal(requests.filter(r => r.status === 200).length, 200);
    assert.equal(requests.filter(r => r.status === 429).length, 1);
    assert.equal(providerCalls, 200);
    assert.equal(sql.prepare('SELECT calls FROM ai_daily_calls').get().calls, 200);
    sql.prepare('UPDATE ai_daily_calls SET calls = 199').run();
    globalThis.fetch = async () => { providerCalls++; throw new Error('private provider detail'); };
    const failed = await route.POST(promptRequest({ prompt: 'question' }));
    assert.equal(failed.status, 503); assert.ok(!(await failed.text()).includes('private provider detail'));
    assert.equal((await route.POST(promptRequest({ prompt: 'question' }))).status, 429);
    assert.equal(providerCalls, 201);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of ['DB', 'OPENAI_API_KEY', 'OBSERVATORY_AI_MODEL', 'OBSERVATORY_AI_DAILY_CALL_LIMIT']) delete env[key];
    sql.close();
  }
});
