import { validateSnapshot, OSLO_SOURCE } from './station-feed.mjs';

export const OBSERVATORY_LAYER_ID = 'observatory-experiments';
export const OBSERVATORY_LAYER_DISPOSITION = Object.freeze({ id: OBSERVATORY_LAYER_ID, token: 'o', disposition: 'enabled-only' });

/** Optional GEV lifecycle module. Inject the host's Cesium; do not bundle a second globe. */
export function createObservatoryLayer({ Cesium, loadSnapshot, now = Date.now, requestRender = () => {}, onSelect = () => {} }) {
  if (!Cesium?.CustomDataSource || typeof loadSnapshot !== 'function') throw new Error('Cesium and a snapshot loader are required');
  let source = null, enabled = false, epoch = 0, records = [], lastUpdate = null, error = null, controller = null, removeSelection = null, credit = null;
  function cancel() { epoch++; controller?.abort(); controller = null; }
  return {
    id: OBSERVATORY_LAYER_ID, name: 'Observation laboratory · Oslo', icon: '🔬', source: OSLO_SOURCE.name,
    updateInterval: 60000,
    async init(viewer, { signal } = {}) {
      if (signal?.aborted) return false;
      if (source) return true;
      source = new Cesium.CustomDataSource(OBSERVATORY_LAYER_ID);
      source.show = false;
      await viewer.dataSources.add(source);
      if (signal?.aborted) { viewer.dataSources.remove(source, true); source = null; return false; }
      credit = new Cesium.Credit('Oslo City Bike · <a href="https://data.norge.no/nlod/en/2.0">NLOD 2.0</a> · Observatory selection and normalization', true);
      viewer.creditDisplay.addStaticCredit(credit);
      removeSelection = viewer.selectedEntityChanged?.addEventListener(entity => {
        if (enabled && typeof entity?.id === 'string' && entity.id.startsWith(`${OBSERVATORY_LAYER_ID}:`)) {
          const record = records.find(r => `${OBSERVATORY_LAYER_ID}:${r.id}` === entity.id);
          if (record) onSelect(structuredClone(record));
        }
      }) || null;
      return true;
    },
    enable() { if (!source) return false; enabled = true; source.show = true; requestRender('observatory-visible'); return true; },
    disable() { enabled = false; cancel(); if (source) source.show = false; requestRender('observatory-hidden'); return true; },
    async update(viewer, { signal } = {}) {
      if (!enabled || !source || signal?.aborted) return false;
      cancel(); const ownEpoch = epoch, ownSource = source; controller = new AbortController();
      const ownController = controller;
      const abort = () => ownController.abort();
      signal?.addEventListener('abort', abort, { once: true });
      try {
        const snapshot = validateSnapshot(await loadSnapshot({ signal: ownController.signal }));
        if (ownController.signal.aborted || ownEpoch !== epoch || !enabled || source !== ownSource) return false;
        // Prepare entities before replacing prior data so malformed payloads cannot erase a valid view.
        const entities = snapshot.records.filter(r => r.lat !== null && r.lon !== null).map(r => ({
          id: `${OBSERVATORY_LAYER_ID}:${r.id}`, name: r.name,
          position: Cesium.Cartesian3.fromDegrees(r.lon, r.lat, 4),
          point: { pixelSize: 9, color: Cesium.Color.fromCssColorString(r.eligibleForBoundedTask ? '#71f1d4' : '#ffba72'), outlineColor: Cesium.Color.BLACK, outlineWidth: 1, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND },
          properties: { stationId: r.stationId, sourceKind: r.sourceKind, bikesAvailable: r.bikesAvailable, capacity: r.capacity, observedAtMs: r.observedAtMs, retrievedAtMs: r.retrievedAtMs, quality: r.quality.join(', ') },
        }));
        ownSource.entities.removeAll();
        for (const entity of entities) ownSource.entities.add(entity);
        records = structuredClone(snapshot.records); lastUpdate = Date.parse(snapshot.retrievedAt); error = null;
        requestRender('observatory-snapshot');
        return true;
      } catch (e) {
        if (ownEpoch === epoch && !ownController.signal.aborted) error = String(e?.message || e);
        return false;
      } finally { signal?.removeEventListener('abort', abort); if (controller === ownController) controller = null; }
    },
    destroy(viewer) {
      enabled = false; cancel(); removeSelection?.(); removeSelection = null;
      if (credit) viewer.creditDisplay.removeStaticCredit(credit);
      credit = null;
      if (source) viewer.dataSources.remove(source, true);
      source = null; records = []; lastUpdate = null; error = null;
      requestRender('observatory-destroyed'); return true;
    },
    getStats() { return { count: records.length, lastUpdate, error, source: OSLO_SOURCE.name, stale: lastUpdate !== null && now() - lastUpdate > 120000, status: error && !records.length ? 'unavailable' : undefined }; },
    getAnalystRecords(maxCount = 2000) { return enabled ? structuredClone(records.slice(0, Number.isFinite(maxCount) ? Math.max(0, Math.floor(maxCount)) : 2000)) : []; },
  };
}
