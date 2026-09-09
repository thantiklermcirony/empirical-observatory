# Earth Observatory integration package

This package turns public station reports into explicit, replayable observations and supplies an optional God's Eye View layer. The host already has a live GBFS bikeshare layer. Our addition is the measurement record: missing values, source clocks, reported capacity, quality flags, archived snapshots and repeatable comparisons. It does not establish a predictive advantage.

## Included interfaces

| File | Purpose |
|---|---|
| `station-feed.mjs` | Pure Oslo GBFS parser, normalized-snapshot validator and count-change comparison |
| `collect-oslo.mjs` | One-shot, identified, size-bounded API capture with exact-byte hashes |
| `gods-eye-layer.mjs` | Optional Cesium-injected lifecycle layer; no vendored globe |
| `earth.test.mjs` | Node tests for clocks, missingness, bounds, lifecycle races and capture errors |
| `oslo-snapshot.json` | Actual 24-station capture selected lexically from 234 stations; completed 9 September 2026 at 10:47:03.723 UTC |
| `oslo-snapshot.manifest.json` | Retrieval clocks, source URLs, exact-byte hashes, selection and modification notice |
| `fresh-capture/` | Full original capture and normalized companion (234 station records) |
| `prepare-snapshot.mjs` | Verify raw capture hashes and regenerate the selected fixture |

Run `node --test earth.test.mjs`. Capture with `node collect-oslo.mjs ./oslo-capture`. No key or account is required for the Oslo endpoints. This script makes three requests and exits; it does not create a scheduled job. The official provider requests a `Client-Identifier` header and says the data updates every ten seconds. The observed feed TTL is retained in each capture; a 60-second cadence is a reasonable initial pilot choice. [Provider documentation](https://oslobysykkel.no/en/open-data/realtime).

The packaged capture was fetched successfully from the live provider using TLS verification. All raw file hashes and the complete normalized capture hash were checked before deriving the 24-station subset. All 24 selected records were eligible at retrieval time; this does not make them live when read later. Thirteen tests pass, including verification of the packaged snapshot hash. `raw/` contains an earlier exploratory capture without its own retrieval manifest and is not needed in a release; use `fresh-capture/` and the selected fixture for reproducible artifacts.

## Data meaning

`bikesAvailable / capacity` is a derived available-bike fraction. It is **not** the fraction of all physical docks occupied: disabled bikes, disabled docks and other unavailable capacity may matter. Unknown capacity remains null; no default capacity is invented. Individual or combined counts exceeding reported capacity are flagged and excluded from bounded tasks. A station reporting zero available bikes is distinct from a missing station report. Clock quality is evaluated at retrieval time; the UI must separately display age relative to the current clock.

The adapter keeps three clocks: station `last_reported`, feed `last_updated`, and our own retrieval time. Information and status are sequential requests, not an atomic transaction. Capacity changes between captures invalidate a direct normalized-state comparison. Even a valid change in available bikes is not a measured trip count or a causal effect.

## God's Eye View wiring

Compatibility target: [commit 759652207fd1279ece97f0f19af566feb9a82146](https://github.com/bilawalsidhu/gods-eye-view/tree/759652207fd1279ece97f0f19af566feb9a82146). Source contracts were inspected; the complete upstream app has not been run with this extension. This is an integration module with mock-host tests, not a claim of browser acceptance.

Place the two pure modules under an integration directory. Use the host's installed Cesium. Register in `src/main.js` before registrations are finalized:

```js
import { createObservatoryLayer } from './integrations/observatory/gods-eye-layer.mjs';

const observatory = createObservatoryLayer({
  Cesium,
  loadSnapshot: async ({ signal }) => {
    const response = await fetch('/observatory/oslo-snapshot.json', { signal });
    if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
    return response.json();
  },
  requestRender: governorRequestRender,
  onSelect: record => experimentPanel.selectRecord(record), // your panel controller
});
dataManager.register(observatory);
```

Also add `{ id: 'observatory-experiments', token: 'o', disposition: 'enabled-only' }` to the **canonical** `LAYER_STATE_REGISTRY` in `src/data/layerState.js`. The `o` token is unused at the pinned revision. Merely expanding the array passed to `finalizeRegistrations` in `main.js` does not update the host's imported share codec. The layer implements `init`, `enable`, `disable`, `update`, `destroy`, `getStats` and plain-record `getAnalystRecords`. [Bootstrap](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/src/main.js), [manager](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/src/data/manager.js), [share registry](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/src/data/layerState.js).

Add an Oslo attribution entry to the host's `DATA_SOURCES.md`; the module owns an on-screen Cesium credit during its initialized lifetime. Supply a same-origin, fixed-endpoint feed service if live polling is desired. Do not expose arbitrary proxy URLs. The offline fixture route above requires no external request during playback. Browser CORS and hosting behavior for direct provider calls have not been tested.

The extension's selection callback opens an observation/experiment panel. That panel, task rules and replay controls belong to the host integration work; this module does not fake them. Share state presently remembers only whether the layer is enabled. Dataset hash, mission state and replay cursor require a later versioned experiment-share codec rather than adding a secret or an entire dataset to a URL.

The host's existing [bikeshare source](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/src/data/bikeshare.js) already implements camera proximity, availability colours and station selection. We should reuse these conventions in a reviewed upstream contribution. Its fallback capacity serves a visualisation purpose; a scientific benchmark must retain the raw missing-capacity state instead.

## License and attribution

Oslo City Bike publishes the relevant data under [NLOD 2.0](https://data.norge.no/nlod/en/2.0). That license permits reuse, adaptation and redistribution with attribution and responsible use; data quality and ongoing delivery are not warranted. The provider's [open-data page](https://oslobysykkel.no/en/open-data) establishes its application to these feeds. Keep `source`, license URL, retrieval timestamps and modification notice with any exported subset. Do not imply provider endorsement.

God's Eye View's [MIT source license](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/LICENSE) separately excludes provider datasets and assets. This package vendors none of that code or media. A full globe deployment still needs per-provider terms review; optional Google/Cesium photorealistic tiles have their own account, eligibility and cost requirements. The Oslo data and module do not require those tiles.

## Required research correction and next acceptance gate

Oslo's historical download is anonymised **trip data**. The provider excludes cancelled trips, trips under one minute and staff bike moves. Therefore integrating departures minus arrivals cannot reconstruct actual station availability: initial occupancy, rebalancing, faults and capacity changes are missing. Use archived trips only for a separately named trip-demand experiment. [Historical dataset and selection rules](https://oslobysykkel.no/en/open-data/historical).

To evaluate availability forecasts, prospectively collect genuine station-status snapshots through a documented window, retain outages and capacity changes, and freeze development/held-out days and stations before analysis. Compare persistence, seasonal means and strong history models with identical information and request budgets. No short live capture, toy masking exercise or visually attractive trajectory demonstrates predictive improvement. If the data are insufficient, release the instrument and protocol with that status.

Acceptance before an upstream PR: run the full pinned globe locally; test layer toggle, cancel during request, destroy/re-enable, selection, old-data label, broken fixture, provider outage, attribution, share restore and a replay export against the same hash. Source-only and mock-host tests cannot replace those checks.

## Release wording

Supported: “An Oslo GBFS observation adapter, real captured data with provenance, a strict missing-data contract, and a lifecycle-tested integration module for God's Eye View.”

Unsupported: “God's Eye integration deployed/accepted,” “a new globe engine,” “historical station availability reconstructed from trips,” “history improves prediction,” “real-time global experiment coverage,” or “TAO validated in urban mobility.” No upstream messages or PRs were sent by this work.
