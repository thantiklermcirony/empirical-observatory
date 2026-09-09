/** Earth Observatory: pure Oslo GBFS adapter. No network, interpolation or forecasting. */
export const OSLO_SOURCE = Object.freeze({
  id: 'oslobysykkel', name: 'Oslo City Bike',
  license: 'NLOD-2.0', licenseUrl: 'https://data.norge.no/nlod/en/2.0',
  attribution: 'Contains data from Oslo City Bike under NLOD 2.0. Selected and normalized by the Empirical Observatory; no provider endorsement.',
  documentation: 'https://oslobysykkel.no/en/open-data/realtime',
  informationUrl: 'https://gbfs.urbansharing.com/oslobysykkel.no/station_information.json',
  statusUrl: 'https://gbfs.urbansharing.com/oslobysykkel.no/station_status.json',
});
export const EARTH_SCHEMA = 'earth-observation/1';
const count = v => Number.isSafeInteger(v) && v >= 0 ? v : null;
const flag = v => v === true || v === 1 ? true : v === false || v === 0 ? false : null;
const text = v => typeof v === 'string' && v.trim() ? v.trim() : null;
const coordinate = (v, max) => Number.isFinite(v) && Math.abs(v) <= max ? v : null;
export function timeMs(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 && value < 1e11 ? value * 1000 : null;
  if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}
function stations(feed, label) {
  if (!Array.isArray(feed?.data?.stations) || feed.data.stations.length > 20000) throw new Error(`${label}: invalid station array`);
  const rows = new Map();
  for (const item of feed.data.stations) {
    const id = text(item?.station_id);
    if (!id || rows.has(id)) throw new Error(`${label}: missing or duplicate station identity`);
    rows.set(id, item);
  }
  return rows;
}
/** Preserve missing values and clock anomalies; a count of zero is an observation.
 * @param {any} information
 * @param {any} status
 * @param {{retrievedAt: string, stationIds?: string[], maxAgeSeconds?: number}} options
 */
export function normalizeSnapshot(information, status, { retrievedAt, stationIds, maxAgeSeconds = 120 }) {
  const retrievedMs = typeof retrievedAt === 'string' ? timeMs(retrievedAt) : null;
  if (retrievedMs === null || !Number.isFinite(maxAgeSeconds) || maxAgeSeconds < 0) throw new Error('Explicit valid retrieval clock and age threshold required');
  const info = stations(information, 'information'), live = stations(status, 'status');
  const ids = stationIds === undefined ? [...info.keys()].sort() : [...stationIds];
  if (ids.length > 20000 || new Set(ids).size !== ids.length || ids.some(id => !info.has(id))) throw new Error('Invalid requested station identities');
  const informationTimeMs = timeMs(information.last_updated), statusTimeMs = timeMs(status.last_updated);
  const records = ids.map(id => {
    const meta = info.get(id), obs = live.get(id);
    const capacity = count(meta.capacity), bikesAvailable = count(obs?.num_bikes_available), docksAvailable = count(obs?.num_docks_available);
    const observedAtMs = timeMs(obs?.last_reported), lat = coordinate(meta.lat, 90), lon = coordinate(meta.lon, 180);
    const quality = [];
    if (!obs) quality.push('missing-status');
    if (capacity === null || capacity === 0) quality.push('missing-positive-capacity');
    if (bikesAvailable === null) quality.push('missing-bike-count');
    if (docksAvailable === null) quality.push('missing-dock-count');
    if (lat === null || lon === null) quality.push('invalid-location');
    if (observedAtMs === null) quality.push('missing-event-time');
    if (informationTimeMs === null || statusTimeMs === null) quality.push('missing-feed-clock');
    if ([observedAtMs, informationTimeMs, statusTimeMs].some(t => t !== null && t > retrievedMs + 5000)) quality.push('future-clock');
    if (observedAtMs !== null && retrievedMs - observedAtMs > maxAgeSeconds * 1000) quality.push('stale-at-retrieval');
    if (capacity !== null && ((bikesAvailable !== null && bikesAvailable > capacity) || (docksAvailable !== null && docksAvailable > capacity) || (bikesAvailable !== null && docksAvailable !== null && bikesAvailable + docksAvailable > capacity))) quality.push('capacity-inconsistent');
    const operation = { installed: flag(obs?.is_installed), renting: flag(obs?.is_renting), returning: flag(obs?.is_returning) };
    if (Object.values(operation).some(v => v === false)) quality.push('station-not-operational');
    if (Object.values(operation).some(v => v === null)) quality.push('unknown-operation');
    const canNormalize = capacity !== null && capacity > 0 && bikesAvailable !== null && !quality.includes('capacity-inconsistent');
    return {
      id: `${OSLO_SOURCE.id}:${id}`, stationId: id, name: text(meta.name) || id,
      lat, lon, capacity, bikesAvailable, docksAvailable,
      bikesDisabled: count(obs?.num_bikes_disabled), docksDisabled: count(obs?.num_docks_disabled),
      observedAtMs, retrievedAtMs: retrievedMs, feedTimeMs: statusTimeMs, informationTimeMs,
      sourceKind: 'observed-feed', operation, quality,
      availabilityFraction: canNormalize ? bikesAvailable / capacity : null,
      derivedCoordinate: 'available-bikes / reported-capacity',
      eligibleForBoundedTask: quality.length === 0,
    };
  });
  return {
    schema: EARTH_SCHEMA, source: { ...OSLO_SOURCE }, retrievedAt: new Date(retrievedMs).toISOString(),
    capture: 'single-observation', units: { bikesAvailable: 'bikes', docksAvailable: 'docks', capacity: 'spaces', coordinates: 'WGS84-degrees', time: 'Unix-ms', availabilityFraction: 'dimensionless' },
    feed: { informationTimeMs, statusTimeMs, ttlSeconds: count(status.ttl), maxAgeSeconds },
    records,
  };
}
/** Strict structural gate for externally loaded normalized fixtures. Not a data authenticity attestation. */
export function validateSnapshot(snapshot) {
  if (snapshot?.schema !== EARTH_SCHEMA || snapshot?.source?.id !== OSLO_SOURCE.id || snapshot.capture !== 'single-observation' || timeMs(snapshot.retrievedAt) === null || !Array.isArray(snapshot.records) || snapshot.records.length > 20000) throw new Error('Unsupported Earth snapshot');
  const seen = new Set();
  for (const r of snapshot.records) {
    if (!text(r?.id) || seen.has(r.id) || !text(r.stationId) || !text(r.name) || r.id !== `${OSLO_SOURCE.id}:${r.stationId}`) throw new Error('Invalid station identity');
    seen.add(r.id);
    if (r.lat !== null && coordinate(r.lat, 90) === null || r.lon !== null && coordinate(r.lon, 180) === null) throw new Error('Invalid coordinates');
    for (const key of ['capacity', 'bikesAvailable', 'docksAvailable', 'bikesDisabled', 'docksDisabled']) if (r[key] !== null && count(r[key]) === null) throw new Error(`Invalid ${key}`);
    for (const key of ['observedAtMs', 'retrievedAtMs', 'feedTimeMs', 'informationTimeMs']) if (r[key] !== null && !(Number.isFinite(r[key]) && r[key] > 0)) throw new Error(`Invalid ${key}`);
    if (r.sourceKind !== 'observed-feed' || !Array.isArray(r.quality) || r.quality.some(q => typeof q !== 'string') || typeof r.eligibleForBoundedTask !== 'boolean') throw new Error('Invalid evidence metadata');
    if (r.retrievedAtMs !== Date.parse(snapshot.retrievedAt)) throw new Error('Mixed retrieval clocks');
    if (!r.operation || Object.values(r.operation).length !== 3 || ['installed', 'renting', 'returning'].some(k => ![true, false, null].includes(r.operation[k]))) throw new Error('Invalid operation metadata');
    if (r.availabilityFraction !== null && !(Number.isFinite(r.availabilityFraction) && r.availabilityFraction >= 0 && r.availabilityFraction <= 1 && r.capacity > 0 && r.bikesAvailable !== null && r.availabilityFraction === r.bikesAvailable / r.capacity)) throw new Error('Invalid bounded coordinate');
    if (r.eligibleForBoundedTask && (r.quality.length !== 0 || r.lat === null || r.lon === null || r.capacity === null || r.capacity === 0 || r.bikesAvailable === null || r.docksAvailable === null || r.bikesAvailable + r.docksAvailable > r.capacity || r.availabilityFraction === null || !Object.values(r.operation).every(v => v === true) || [r.observedAtMs, r.feedTimeMs, r.informationTimeMs].some(v => v === null || v > r.retrievedAtMs + 5000) || !(Number.isFinite(snapshot.feed?.maxAgeSeconds) && snapshot.feed.maxAgeSeconds >= 0) || r.retrievedAtMs - r.observedAtMs > snapshot.feed.maxAgeSeconds * 1000)) throw new Error('Ineligible record marked task-ready');
  }
  return snapshot;
}
/** A snapshot delta is observed count change, not trip count, demand or a causal estimate. */
export function compareSnapshots(earlier, later) {
  validateSnapshot(earlier); validateSnapshot(later);
  if (Date.parse(later.retrievedAt) <= Date.parse(earlier.retrievedAt)) throw new Error('Snapshots must have increasing retrieval times');
  const previous = new Map(earlier.records.map(r => [r.stationId, r]));
  return later.records.map(r => {
    const p = previous.get(r.stationId);
    const capacityChanged = !!p && p.capacity !== r.capacity;
    const eventAdvanced = !!p && p.observedAtMs !== null && r.observedAtMs !== null && r.observedAtMs > p.observedAtMs;
    const comparable = !!p && p.eligibleForBoundedTask && r.eligibleForBoundedTask && !capacityChanged && eventAdvanced;
    return { stationId: r.stationId, capacityChanged, eventAdvanced, comparable,
      observedBikeChange: comparable ? r.bikesAvailable - p.bikesAvailable : null,
      elapsedSeconds: comparable ? (r.observedAtMs - p.observedAtMs) / 1000 : null };
  });
}
