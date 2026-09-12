import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { analyzePairs, pearson, spearman, ranks } from '../../lib/correlation.ts';
import { fetchStudy, validateSpec, worldBankJson } from '../../lib/world-bank.ts';
import { dataInvestigation, resolveDataPrompt } from '../../lib/data-investigation.ts';
import { researchModelCall } from '../../lib/ai-research-transport.ts';
import { runResearchQuestion } from '../../lib/research-engine.ts';
import { hashTemporalJson } from '../../lib/engine/temporal-router.ts';
const close = (a, b, tolerance = 1e-12) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const pairs = (x, y, years = x.map((_, i) => 2000 + i)) => x.map((v, i) => ({ key: `${years[i]}`, label: `${years[i]}`, year: years[i], x: v, y: y[i] }));
test('correlations preserve direction, rank ties and undefined constant/small inputs', () => {
  close(pearson([1, 2, 3], [4, 6, 8]), 1); close(spearman([1, 2, 3], [9, 4, 1]), -1);
  assert.deepEqual(ranks([5, 1, 1, 8]), [3, 1.5, 1.5, 4]);
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null); assert.equal(pearson([1, 2], [1, 2]), null);
  close(pearson([-2, -1, 0, 1, 2], [4, 1, 0, 1, 4]), 0); close(spearman([-2, -1, 0, 1, 2], [4, 1, 0, 1, 4]), 0);
});
test('outlier stress reveals a relationship reversing after a single omission', () => {
  const a = analyzePairs(pairs([0, 1, 2, 3, 4, 100], [4, 3, 2, 1, 0, 100]), false);
  assert.ok(a.pearson > .99); close(a.leaveOneOut[0], -1); assert.ok(a.spearman < 0);
});
test('levels and changes disagree; gaps are never bridged into annual differences', () => {
  const a = analyzePairs(pairs([0, 1, 4, 6, 10], [0, 4, 6, 9, 10]), true);
  assert.ok(a.pearson > .9); close(a.firstDifferences.pearson, -1);
  const gap = analyzePairs(pairs([0, 1, 4, 6], [0, 4, 6, 9], [2000, 2001, 2003, 2004]), true);
  assert.equal(gap.firstDifferences.n, 2); assert.equal(gap.firstDifferences.pearson, null);
});
test('input contract rejects cross-country mixed years, URLs and repeated variables', () => {
  for (const value of [{ x: 'X.TEST', y: 'X.TEST', country: 'all', start: 2023, end: 2023 }, { x: 'X.TEST', y: 'Y.TEST', country: 'all', start: 2020, end: 2023 }, { x: 'https://localhost', y: 'Y.TEST', country: 'USA', start: 2020, end: 2023 }]) assert.throws(() => validateSpec(value));
});
const indicators = [{ id: 'X.TEST', name: 'Test X', source: { id: '2' }, unit: '', sourceNote: 'Declared synthetic test only.', sourceOrganization: 'Test' }, { id: 'Y.TEST', name: 'Test Y', source: { id: '2' }, unit: '', sourceNote: 'Declared synthetic test only.', sourceOrganization: 'Test' }];
const countries = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'].map(id => ({ id, name: id, iso2Code: id.slice(0, 2), region: { id: 'TST', value: 'Test region' } }));
countries.push({ id: 'AGG', name: 'Aggregate', iso2Code: 'AG', region: { id: 'NA', value: 'Aggregates' } });
function transport(url) {
  const u = new URL(url); assert.equal(u.origin, 'https://api.worldbank.org');
  if (u.pathname.includes('/metadata')) { const id = u.pathname.split('/')[5]; return Promise.resolve(Response.json({ page: 1, pages: 1, total: 3, source: [{ id: '2', concept: [{ id: 'Series', variable: [{ id, metatype: [{ id: 'Unitofmeasure', value: 'test units' }, { id: 'Periodicity', value: 'Annual' }, { id: 'License_Type', value: 'test' }] }] }] }] })); }
  let rows;
  if (u.pathname === '/v2/country') rows = countries;
  else if (u.pathname === '/v2/indicator') rows = indicators;
  else if (u.pathname.startsWith('/v2/indicator/')) rows = indicators.filter(i => u.pathname.endsWith(i.id));
  else {
    assert.equal(u.searchParams.get('footnote'), 'y'); const x = u.pathname.endsWith('X.TEST'), id = x ? 'X.TEST' : 'Y.TEST';
    rows = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'AGG', ''].map((country, i) => ({ indicator: { id, value: id }, countryiso3code: country, country: { id: country, value: country }, date: '2023', value: x ? [0, 1, 2, 3, null, 9000, 5000][i] : [0, 2, 4, 6, 8, -9000, -5000][i], unit: '', obs_status: '', decimal: 1, footnote: i === 1 ? 'A material test qualification.' : '' }));
  }
  return Promise.resolve(Response.json([{ page: 1, pages: 1, total: rows.length, lastupdated: '2026-01-01' }, rows]));
}
test('source adapter preserves zero, notes, missingness, raw hashes and excludes aggregates before pairing', async () => {
  const study = await fetchStudy({ x: 'X.TEST', y: 'Y.TEST', country: 'all', start: 2023, end: 2023 }, transport);
  assert.equal(study.population, 5); assert.equal(study.pairs.length, 4); assert.equal(study.pairs[0].x, 0); assert.equal(study.missingX, 1); assert.equal(study.excludedAggregates, 1);
  assert.equal(study.x.unit, 'test units'); assert.ok(study.observations.some(r => r.footnote)); close(study.analysis.pearson, 1);
  const raw = '[{"page":1,"pages":1,"total":0},[]]'; const result = await worldBankJson('test', async () => new Response(raw));
  assert.equal(result.receipt.sha256, createHash('sha256').update(raw).digest('hex'));
});
test('incomplete source pages and duplicate observations are rejected', async () => {
  for (const header of [{ page: 1, pages: 2, total: 0 }, { page: 1, total: 0 }, { page: 1, pages: 1, total: 1 }]) await assert.rejects(worldBankJson('test', async () => Response.json([header, []])));
  await assert.rejects(fetchStudy({ x: 'X.TEST', y: 'Y.TEST', country: 'all', start: 2023, end: 2023 }, async url => { const r = await transport(url); if (!url.includes('/country/all/')) return r; const body = await r.json(); body[1].push(body[1][0]); body[0].total++; return Response.json(body); }), /duplicate/);
});
test('unresolved question actually checks the catalogue, records the gap, and issues a valid report', async () => {
  let calls = 0; const report = await dataInvestigation('Is happiness correlated with solar winds?', {}, async () => { throw new Error('No AI expected'); }, async (...args) => { calls++; return transport(...args); });
  assert.equal(calls, 2); assert.equal(report.research.dataStudy, undefined); assert.match(report.research.sourceAttempts[0], /catalogue/);
  const { receiptSha256, ...content } = report; assert.equal(receiptSha256, await hashTemporalJson(content));
});
test('explicit source selections calculate actual retrieved values and preserve question and receipt', async () => {
  const prompt = 'Correlate World Bank X.TEST with Y.TEST; country=all; years=2023:2023.';
  const report = await dataInvestigation(prompt, {}, async () => {}, transport);
  assert.equal(report.prompt, prompt); assert.equal(report.research.dataStudy.pairs.length, 4); assert.match(report.research.answer.answer, /1.0000/);
  assert.equal(report.research.aiCalls, 0); assert.equal(report.research.cases.length, 0);
  const { receiptSha256, ...content } = report; assert.equal(receiptSha256, await hashTemporalJson(content));
  assert.equal(resolveDataPrompt('Are Test X and Test Y correlated?', indicators, countries), null);
});
test('web research is bounded, counted, store=false, and rejects unsafe source URLs', async () => {
  let calls = 0, sources;
  const result = await researchModelCall({ apiKey: 'test-secret', model: 'test-model', dailyCallLimit: '200' }, 'test', {}, {}, async () => { calls++; }, async (_url, options) => {
    const body = JSON.parse(options.body); assert.equal(body.store, false); assert.equal(body.max_tool_calls, 3); assert.equal(body.tools[0].type, 'web_search');
    return Response.json({ status: 'completed', output: [{ type: 'web_search_call', action: { sources: [{ title: 'safe', url: 'https://data.worldbank.org/' }, { title: 'bad', url: 'javascript:alert(1)' }] } }, { type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }] });
  }, { webSearch: true, onSources: s => { sources = s; } });
  assert.equal(calls, 1); assert.equal(result.ok, true); assert.equal(sources.length, 1);
});
test('a numerical paraphrase cannot be replaced with unrelated fixture values', async () => {
  const report = await runResearchQuestion('I have a bounded score 0.2 and apply alignment 0.5 then contraction 0.25. Does order matter?', {}, async () => {});
  assert.equal(report.research.cases.length, 0); assert.match(report.research.answer.answer, /capability gap/);
  const exact = await runResearchQuestion('Compare alignment then contraction with contraction then alignment in the declared bounded scalar model. x=1/5, u=1/2, c=1/4.', {}, async () => {});
  assert.match(exact.research.answer.answer, /7\/44/); assert.match(exact.research.answer.answer, /22\/41/);
});

test('geography, controls and operation qualifiers are never discarded, and X/Y order is preserved', () => {
  for (const prompt of ['Is Test X correlated with Test Y across countries in Europe in 2023?', 'Is Test X correlated with Test Y across countries in 2023? Exclude high-income economies.', 'Is Test X correlated with Test Y after controlling for age across countries in 2023?']) assert.equal(resolveDataPrompt(prompt, indicators, countries), null);
  assert.equal(resolveDataPrompt('Is Test Y correlated with Test X across countries in 2023?', indicators, countries).x, 'Y.TEST');
});
test('AI discovery is followed by source verification and actual calculation before explanation', async () => {
  let reserved = 0, modelCalls = 0;
  const report = await dataInvestigation('Investigate the correlation of two test statistics.', { apiKey: 'test-secret', model: 'test-model', dailyCallLimit: '200' }, async () => { reserved++; }, async (url, options) => {
    if (!url.startsWith('https://api.openai.com/')) return transport(url);
    modelCalls++; assert.equal(options.redirect, 'manual'); const body = JSON.parse(options.body);
    let value;
    if (modelCalls === 1) { assert.equal(body.tools[0].type, 'web_search'); value = { x: 'X.TEST', y: 'Y.TEST', country: 'all', start: 2023, end: 2023, missing: [] }; }
    else { const input = JSON.parse(body.input); assert.equal(body.tools, undefined); assert.equal(input.study.analysis.n, 4); close(input.study.analysis.pearson, 1); assert.equal(input.study.observations, undefined); value = { explanation: 'The retrieved pairs have a positive association. This does not establish causation.' }; }
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
  });
  assert.equal(reserved, 2); assert.equal(modelCalls, 2); assert.equal(report.research.mode, 'ai_synthesis'); assert.equal(report.research.dataStudy.analysis.n, 4);
});
test('public-source and provider redirects are rejected without a follow-up request', async () => {
  let calls = 0;
  await assert.rejects(worldBankJson('test', async (_url, options) => { calls++; assert.equal(options.redirect, 'manual'); return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example/' } }); }));
  assert.equal(calls, 1);
  await assert.rejects(researchModelCall({ apiKey: 'test-secret', model: 'test-model', dailyCallLimit: '200' }, 'test', {}, {}, async () => {}, async (_url, options) => { assert.equal(options.redirect, 'manual'); return new Response(null, { status: 302 }); }));
});
