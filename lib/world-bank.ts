import { TemporalInputError } from './engine/temporal-router.ts';
import { analyzePairs, type Pair, type Association } from './correlation.ts';
export type Indicator = { id: string; name: string; unit: string; sourceNote: string; sourceOrganization: string; metadata?: Record<string, string> };
export type Retrieval = { url: string; retrievedAt: string; sha256: string; lastUpdated: string | null; rows: number };
export type DataSpec = { x: string; y: string; country: string; start: number; end: number };
export type DataStudy = { spec: DataSpec; x: Indicator; y: Indicator; countryName: string; pairs: Pair[]; observations: Row[]; analysis: Association; population: number; excludedAggregates: number; missingX: number; missingY: number; missingEither: number; excluded: { key: string; label: string; missing: string }[]; retrievals: Retrieval[]; assumptions: string[] };
type Country = { id: string; iso2Code: string; name: string; region: { id: string; value: string } };
type Row = { indicator: { id: string; value: string }; countryiso3code: string; country: { id: string; value: string }; date: string; value: number | null; obs_status: string; unit: string; decimal: number; footnote?: string };
const ORIGIN = 'https://api.worldbank.org';
const seriesCode = /^[A-Z][A-Z0-9_.]{2,79}$/;
export function validateSpec(value: unknown): DataSpec {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TemporalInputError('data_spec', 'Choose two statistics, a place and a period.');
  const v = value as DataSpec;
  if (typeof v.x !== 'string' || typeof v.y !== 'string' || typeof v.country !== 'string' || Object.keys(v).sort().join(',') !== 'country,end,start,x,y' || !seriesCode.test(v.x) || !seriesCode.test(v.y) || v.x === v.y || !/^(all|[A-Z]{3})$/.test(v.country) || !Number.isInteger(v.start) || !Number.isInteger(v.end) || v.start < 1960 || v.end > new Date().getUTCFullYear() || v.end < v.start || v.end - v.start > 100 || (v.country === 'all' && v.start !== v.end)) throw new TemporalInputError('data_spec', 'Use two different indicator codes. Choose one common year across countries, or an annual period for one country.');
  return { x: v.x, y: v.y, country: v.country, start: v.start, end: v.end };
}
async function worldBankPayload(path: string, transport: typeof fetch = fetch) {
  const url = ORIGIN + '/v2/' + path;
  const response = await transport(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
  if (!response.ok || !response.body) throw new TemporalInputError('data_source_unavailable', 'The World Bank source did not respond successfully. No replacement values were used.');
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true }), chunks: Uint8Array[] = []; let raw = '', bytes = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 5000000) throw new TemporalInputError('data_size', 'The source response exceeds the retrieval limit. Narrow the request.'); chunks.push(value); raw += decoder.decode(value, { stream: true }); } } catch (e) { await reader.cancel().catch(() => {}); throw e; }
  raw += decoder.decode();
  let body: unknown; try { body = JSON.parse(raw); } catch { throw new TemporalInputError('data_source_format', 'The public source returned an unreadable response.'); }
  const buffer = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join('');
  return { body, url, retrievedAt: new Date().toISOString(), sha256 };
}
export async function worldBankJson(path: string, transport: typeof fetch = fetch): Promise<{ rows: unknown[]; receipt: Retrieval }> {
  const result = await worldBankPayload(path, transport), body = result.body;
  if (!Array.isArray(body) || body.length !== 2 || !body[0] || !Array.isArray(body[1]) || body[0].page !== 1 || body[0].pages !== 1 || !Number.isInteger(body[0].total) || body[0].total !== body[1].length) throw new TemporalInputError('data_source_format', 'The source returned an error or incomplete page. Nothing was silently truncated.');
  return { rows: body[1], receipt: { url: result.url, retrievedAt: result.retrievedAt, sha256: result.sha256, lastUpdated: body[0].lastupdated ?? null, rows: body[1].length } };
}
async function fullMetadata(id: string, transport: typeof fetch) {
  const result = await worldBankPayload(`sources/2/series/${id}/metadata?format=json`, transport);
  const body = result.body as { page: number; pages: number; total: number; source: { id: string; concept: { id: string; variable: { id: string; metatype: { id: string; value: string }[] }[] }[] }[] };
  if (!body || body.page !== 1 || body.pages !== 1 || !Array.isArray(body.source)) throw new TemporalInputError('data_metadata', 'The source definition is incomplete.');
  const fields = body.source.filter(s => s.id === '2').flatMap(s => s.concept).filter(c => c.id === 'Series').flatMap(c => c.variable).filter(v => v.id.trim() === id).flatMap(v => v.metatype);
  if (!fields.length) throw new TemporalInputError('data_metadata', 'No matching source definition was returned.');
  return { metadata: Object.fromEntries(fields.map(f => [f.id, f.value])), receipt: { url: result.url, retrievedAt: result.retrievedAt, sha256: result.sha256, lastUpdated: null, rows: fields.length } };
}
let catalogueCache: { expires: number; indicators: Indicator[]; countries: Country[] } | null = null;
export async function dataCatalogue(transport: typeof fetch = fetch) {
  if (transport === fetch && catalogueCache && catalogueCache.expires > Date.now()) return catalogueCache;
  const [indicators, countries] = await Promise.all([
    worldBankJson('indicator?source=2&format=json&per_page=3000', transport),
    worldBankJson('country?format=json&per_page=400', transport),
  ]);
  const clean = indicators.rows.filter((r): r is Indicator => !!r && typeof r === 'object' && typeof (r as Indicator).id === 'string' && typeof (r as Indicator).name === 'string').map(r => ({ id: r.id, name: r.name, unit: r.unit ?? '', sourceNote: r.sourceNote ?? '', sourceOrganization: r.sourceOrganization ?? '' }));
  const places = (countries.rows as Country[]).filter(c => c.region?.id !== 'NA' && /^[A-Z]{3}$/.test(c.id));
  const result = { expires: Date.now() + 3600000, indicators: clean, countries: places };
  if (transport === fetch) catalogueCache = result;
  return result;
}
export function searchIndicators(indicators: Indicator[], query: string) {
  const tokens = query.toLowerCase().split(/[^a-z0-9.]+/).filter(s => s.length > 1);
  return indicators.map(indicator => { const text = `${indicator.name} ${indicator.id}`.toLowerCase(); return { indicator, score: tokens.reduce((n, t) => n + (text.includes(t) ? 1 : 0), 0) }; }).filter(x => tokens.length ? x.score === tokens.length : true).sort((a, b) => a.indicator.name.localeCompare(b.indicator.name)).slice(0, 35).map(x => x.indicator);
}
export async function fetchStudy(specInput: DataSpec, transport: typeof fetch = fetch): Promise<DataStudy> {
  const spec = validateSpec(specInput);
  const [mx, my, countries, dx, dy, fx, fy] = await Promise.all([
    worldBankJson(`indicator/${spec.x}?source=2&format=json&per_page=10`, transport),
    worldBankJson(`indicator/${spec.y}?source=2&format=json&per_page=10`, transport),
    worldBankJson('country?format=json&per_page=400', transport),
    worldBankJson(`country/${spec.country}/indicator/${spec.x}?source=2&date=${spec.start}:${spec.end}&format=json&per_page=400&footnote=y`, transport),
    worldBankJson(`country/${spec.country}/indicator/${spec.y}?source=2&date=${spec.start}:${spec.end}&format=json&per_page=400&footnote=y`, transport),
    fullMetadata(spec.x, transport), fullMetadata(spec.y, transport),
  ]);
  const metadata = (r: typeof mx, id: string): Indicator => { const row = r.rows.find(v => (v as Indicator)?.id === id) as Indicator | undefined; if (!row || typeof row.name !== 'string') throw new TemporalInputError('data_indicator', 'The selected indicator is not available in World Development Indicators.'); return { id, name: row.name, unit: row.unit || 'See indicator name and definition', sourceNote: row.sourceNote || '', sourceOrganization: row.sourceOrganization || '' }; };
  const x = metadata(mx, spec.x), y = metadata(my, spec.y);
  x.metadata = fx.metadata; y.metadata = fy.metadata;
  x.unit = fx.metadata.Unitofmeasure || x.unit; y.unit = fy.metadata.Unitofmeasure || y.unit;
  const allCountries = countries.rows as Country[], validCountries = allCountries.filter(c => c.region?.id !== 'NA'), place = validCountries.find(c => c.id === spec.country);
  if (spec.country !== 'all' && !place) throw new TemporalInputError('data_country', 'Choose an individual country or economy; aggregate regions are excluded.');
  const ids = new Set(validCountries.map(c => c.id));
  const normalized = (rows: unknown[], code: string) => { const out = new Map<string, Row>(); for (const row of rows as Row[]) {
    if (!ids.has(row.countryiso3code)) continue;
    if (row.indicator?.id !== code || !/^\d{4}$/.test(row.date) || Number(row.date) < spec.start || Number(row.date) > spec.end || (spec.country !== 'all' && row.countryiso3code !== spec.country) || (row.value !== null && (typeof row.value !== 'number' || !Number.isFinite(row.value)))) throw new TemporalInputError('data_rows', 'The source returned mismatched or invalid observations.');
    const key = `${row.countryiso3code}:${row.date}`; if (out.has(key)) throw new TemporalInputError('data_duplicates', 'The source returned duplicate country-year observations.'); out.set(key, row);
  } return out; };
  const xs = normalized(dx.rows, spec.x), ys = normalized(dy.rows, spec.y);
  const universe = spec.country === 'all' ? validCountries.map(c => ({ key: `${c.id}:${spec.start}`, label: c.name, year: spec.start })) : Array.from({ length: spec.end - spec.start + 1 }, (_, i) => ({ key: `${spec.country}:${spec.start + i}`, label: `${spec.start + i}`, year: spec.start + i }));
  const pairs: Pair[] = [], excluded: DataStudy['excluded'] = []; let missingX = 0, missingY = 0;
  for (const item of universe) { const a = xs.get(item.key)?.value, b = ys.get(item.key)?.value; const ax = a == null, by = b == null; if (ax) missingX++; if (by) missingY++; if (ax || by) excluded.push({ key: item.key, label: item.label, missing: ax && by ? 'both' : ax ? 'x' : 'y' }); else pairs.push({ ...item, x: a, y: b }); }
  return { spec, x, y, countryName: spec.country === 'all' ? 'Countries and economies with paired observations' : place!.name, pairs, observations: [...dx.rows, ...dy.rows] as Row[], analysis: analyzePairs(pairs, spec.country !== 'all'), population: universe.length, excludedAggregates: spec.country === 'all' ? allCountries.length - validCountries.length : 0, missingX, missingY, missingEither: excluded.length, excluded, retrievals: [mx, my, countries, dx, dy, fx, fy].map(r => r.receipt), assumptions: ['Source: World Bank World Development Indicators (source 2). Retrieved now does not mean measured now; observation years and source revision dates are recorded.', 'Join uses country/economy ISO3 identifier and the exact year. Regional and income aggregates are excluded using the country catalogue.', 'No interpolation, averaging across years, hidden unit conversion or missing-value imputation is performed. Original definitions and units are retained.', 'Source observations may be estimates, modelled values or interpolated series. Consult each definition, footnote and originating organisation; they are not automatically verified ground truth.', 'Country/economy values have equal weight. No result-driven country or period selection.'] };
}
