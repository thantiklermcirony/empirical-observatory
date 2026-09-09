import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSnapshot, validateSnapshot, compareSnapshots, timeMs } from './station-feed.mjs';
import { createObservatoryLayer } from './gods-eye-layer.mjs';
import { captureOslo } from './collect-oslo.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const t = 1788949000;
function fixture(change = {}) {
  const information = { last_updated: t, ttl: 15, data: { stations: [{ station_id: '1', name: 'Test station', lat: 59.9, lon: 10.7, capacity: 20 }] } };
  const status = { last_updated: t, ttl: 15, data: { stations: [{ station_id: '1', last_reported: t, num_bikes_available: 8, num_docks_available: 10, is_installed: true, is_renting: true, is_returning: true, ...change }] } };
  return { information, status };
}
function snap(change = {}, seconds = 5) { const { information, status } = fixture(change); return normalizeSnapshot(information, status, { retrievedAt: new Date((t + seconds) * 1000).toISOString() }); }

test('preserves true zero; missing counts remain null; bounded fraction has an explicit denominator', () => {
  assert.equal(snap({ num_bikes_available: 0 }).records[0].availabilityFraction, 0);
  const r = snap({ num_bikes_available: undefined }).records[0];
  assert.equal(r.bikesAvailable, null); assert.equal(r.availabilityFraction, null); assert.equal(r.eligibleForBoundedTask, false);
  assert.equal(snap().records[0].availabilityFraction, 0.4);
});
test('does not silently clamp inconsistent data or invent capacity', () => {
  const inconsistent = snap({ num_bikes_available: 30 }).records[0];
  assert(inconsistent.quality.includes('capacity-inconsistent')); assert.equal(inconsistent.availabilityFraction, null);
  const { information, status } = fixture(); delete information.data.stations[0].capacity;
  assert.equal(normalizeSnapshot(information, status, { retrievedAt: snap().retrievedAt }).records[0].capacity, null);
});
test('rejects duplicate station IDs and unknown requested stations', () => {
  const { information, status } = fixture(); status.data.stations.push(status.data.stations[0]);
  assert.throws(() => normalizeSnapshot(information, status, { retrievedAt: snap().retrievedAt }), /duplicate/);
  assert.throws(() => normalizeSnapshot(fixture().information, fixture().status, { retrievedAt: snap().retrievedAt, stationIds: ['unknown'] }), /identities/);
});
test('timestamps distinguish retrieval from event time and reject ambiguous local clocks', () => {
  assert.equal(timeMs('2026-09-09 10:00'), null);
  assert.equal(timeMs('2026-09-09T10:00:00Z'), Date.parse('2026-09-09T10:00:00Z'));
  assert(snap({ last_reported: t + 90 }).records[0].quality.includes('future-clock'));
  assert(snap({}, 200).records[0].quality.includes('stale-at-retrieval'));
  assert.notEqual(snap().records[0].observedAtMs, snap().records[0].retrievedAtMs);
});
test('missing station status is not a zero-bike observation', () => {
  const { information, status } = fixture(); status.data.stations = [];
  const r = normalizeSnapshot(information, status, { retrievedAt: snap().retrievedAt }).records[0];
  assert.equal(r.bikesAvailable, null); assert(r.quality.includes('missing-status'));
});
test('snapshot deltas reject future ordering, duplicate event times, and capacity changes', () => {
  const a = snap(), b = snap({ num_bikes_available: 9, last_reported: t + 10 }, 15);
  assert.equal(compareSnapshots(a, b)[0].observedBikeChange, 1);
  assert.equal(compareSnapshots(a, snap({}, 15))[0].comparable, false);
  assert.throws(() => compareSnapshots(b, a), /increasing/);
  b.records[0].capacity = 30; b.records[0].availabilityFraction = 9 / 30;
  assert.equal(compareSnapshots(a, b)[0].capacityChanged, true); assert.equal(compareSnapshots(a, b)[0].observedBikeChange, null);
});
test('untrusted normalized payloads reject impossible coordinates/counts/fractions', () => {
  for (const [key, value] of [['lat', 100], ['bikesAvailable', -1], ['availabilityFraction', 1.01]]) { const s = snap(); s.records[0][key] = value; assert.throws(() => validateSnapshot(s)); }
  assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(snap()))), snap());
});

function host() {
  const sources = [], credits = new Set(); let selected;
  const Cesium = {
    CustomDataSource: class { constructor() { this.show = false; this.entities = { values: [], add: e => this.entities.values.push(e), removeAll: () => { this.entities.values = []; } }; } },
    Cartesian3: { fromDegrees: (...args) => args }, Color: { fromCssColorString: v => v, BLACK: 'black' }, HeightReference: { CLAMP_TO_GROUND: 1 }, Credit: class { constructor(text) { this.text = text; } },
  };
  const viewer = {
    dataSources: { add: s => { sources.push(s); return Promise.resolve(s); }, remove: s => { sources.splice(sources.indexOf(s), 1); } },
    creditDisplay: { addStaticCredit: c => credits.add(c), removeStaticCredit: c => credits.delete(c) },
    selectedEntityChanged: { addEventListener: f => { selected = f; return () => { selected = null; }; } },
  };
  return { Cesium, viewer, sources, credits, select: e => selected?.(e) };
}
test('GEV lifecycle owns data, selection, credits and cleanup; exports plain isolated records', async () => {
  const h = host(); let picked = null;
  const layer = createObservatoryLayer({ Cesium: h.Cesium, loadSnapshot: async () => snap(), now: () => (t + 6) * 1000, onSelect: r => { picked = r; } });
  await layer.init(h.viewer); assert.equal(h.sources[0].show, false);
  layer.enable(h.viewer); assert.equal(await layer.update(h.viewer), true); assert.equal(layer.getStats().stale, false);
  const exported = layer.getAnalystRecords(); exported[0].name = 'changed'; assert.equal(layer.getAnalystRecords()[0].name, 'Test station');
  h.select(h.sources[0].entities.values[0]); assert.equal(picked.stationId, '1');
  layer.disable(h.viewer); assert.deepEqual(layer.getAnalystRecords(), []);
  layer.destroy(h.viewer); assert.equal(h.sources.length, 0); assert.equal(h.credits.size, 0);
});
test('GEV ignores a delayed result after disable', async () => {
  const h = host(); let release;
  const layer = createObservatoryLayer({ Cesium: h.Cesium, loadSnapshot: () => new Promise(resolve => { release = resolve; }) });
  await layer.init(h.viewer); layer.enable(); const work = layer.update(h.viewer); layer.disable(); release(snap());
  assert.equal(await work, false); assert.equal(h.sources[0].entities.values.length, 0); assert.equal(layer.getStats().count, 0);
});
test('GEV records source failure without erasing earlier evidence', async () => {
  const h = host(); let fail = false;
  const layer = createObservatoryLayer({ Cesium: h.Cesium, loadSnapshot: async () => { if (fail) throw new Error('offline'); return snap(); } });
  await layer.init(h.viewer); layer.enable(); await layer.update(h.viewer); fail = true;
  assert.equal(await layer.update(h.viewer), false); assert.equal(layer.getStats().count, 1); assert.equal(layer.getStats().error, 'offline');
});
test('capture uses exact allowlisted URLs, application identification and original-byte hashes', async () => {
  const requests = []; const f = fixture();
  const result = await captureOslo({ now: () => snap().retrievedAt, fetchImpl: async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify(url.endsWith('system_information.json') ? { data: { system_id: 'oslobysykkel' } } : url.endsWith('station_information.json') ? f.information : f.status), { status: 200 });
  } });
  assert.equal(result.snapshot.records.length, 1); assert.equal(requests.length, 3);
  assert(requests.every(r => r.url.startsWith('https://gbfs.urbansharing.com/oslobysykkel.no/') && r.options.headers['Client-Identifier']));
  assert(result.manifest.every(m => /^[a-f0-9]{64}$/.test(m.sha256)));
});
test('capture rejects source substitution and oversized/error replies', async () => {
  await assert.rejects(captureOslo({ fetchImpl: async () => new Response('{}', { status: 503 }) }), /503/);
  await assert.rejects(captureOslo({ fetchImpl: async () => new Response('{}', { headers: { 'Content-Length': '5000001' } }) }), /size limit/);
  await assert.rejects(captureOslo({ fetchImpl: async () => new Response('{"data":{"system_id":"other"}}') }), /Unexpected source/);
});
test('packaged real Oslo snapshot matches its manifest hash and retains observed clocks', async () => {
  const bytes = await readFile(new URL('./oslo-snapshot.json', import.meta.url));
  const manifest = JSON.parse(await readFile(new URL('./oslo-snapshot.manifest.json', import.meta.url), 'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.normalizedSha256);
  const snapshot = validateSnapshot(JSON.parse(bytes));
  assert.equal(snapshot.records.length, 24); assert.equal(snapshot.retrievedAt, '2026-09-09T10:47:03.723Z');
  assert(snapshot.records.every(r => r.sourceKind === 'observed-feed' && r.observedAtMs !== null));
  assert.equal(snapshot.capture, 'single-observation');
});
