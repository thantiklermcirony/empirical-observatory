# GB Grid Observatory: collector qualification

This phase archives the official NESO national carbon-intensity forecast before its target interval and later records the provider's estimated actual. It does not fit a model, choose a favorable forecast retrospectively, calculate a headline win, or establish a public commitment merely by writing a local timestamp.

The first forecast for each target is preserved. Source bytes, SHA-256, request and receipt times, selected HTTP headers, code hash and run health are retained. A later GitHub commit can provide additional public availability evidence; its timestamp must be checked separately against the target. The HTTP `Date` header is retained as transport metadata and is not treated as the forecast's original issue time.

## Run and test

Python 3.10 or newer; standard library only. No API key, account or package installation is needed.

```sh
python -m unittest discover -s . -p test_collector.py -v
python collector.py verify --store ./data
python collector.py collect --store ./data --schedule-offset-minute 5
python collector.py verify --store ./data
```

Run from the directory containing these files, or supply its full path. A proposed scheduled job runs at minutes 5 and 35 each UTC hour. Scheduling and publishing are the owner's responsibility; this package does not install a scheduled job. Set job concurrency to one, persist the same complete store between runs, and preserve collection evidence even if the CLI exits 1 because a phase failed. A scheduler timeout of five minutes bounds the complete process, including operating-system DNS/network behavior. Existing `.collector.lock` files require inspection of the previous run before removal; the collector never guesses that another process has finished.

For a brand-new store, collect once before the first verification; subsequent scheduled runs verify both before and after collection. The verifier recomputes every raw-body hash and capture byte count, checks safe in-store references, exact response intervals and values, receipt/lead/maturity timestamps, the first captured forecast vintage, actual/revision sources and frozen configuration. It does not trust `summary.json` as evidence, authenticate the local clock, detect an entirely rewritten coherent history without an external commitment, or repair a broken archive. Fail closed on verification errors. `python validate.py` runs the offline tests and records source hashes and a test log; it does not collect network data.

The public callable is `run_cycle(store_path, fetch_json_callable=fetch_http, now_callable=..., schedule_offset_minute=5)`. Tests inject a `Response(body: bytes, status: int, headers: dict)` and an aware clock; production uses HTTPS to the fixed official host. There is no graph backend or model dependency.

## Time and outcome contract

Let R be the UTC timestamp recorded after receiving the forecast body. Choose the first UTC half-hour start T satisfying `T >= R + 24 hours`, and target `[T, T + 30 minutes)`. The actual lead is in **[24, 24.5) hours**, and the exact seconds are saved. A request spanning a half-hour boundary uses the receipt time. No unavailable earlier target is synthesized. Because the API lacks an original forecast issue timestamp in this response, `issued_at`/UI `issuedAt` explicitly mean our receipt time; `provider_issued_at` is null.

One query requests three half-hour intervals around `request_start + 24 hours`; exactly one returned interval must match the receipt-derived target. Forecasts must be finite nonnegative numbers. A future non-null actual, duplicate target rows, absent target row, malformed dates or a mismatched schema fail that capture while retaining any received raw body. An unexpectedly very slow request can miss the requested range and fails without silently selecting a different target.

A target becomes eligible for resolution at **target end + 48 hours**. The collector stores the first non-null, finite nonnegative national actual received after that threshold. Zero is valid. This 48-hour rule is a declared operational maturity delay, not a provider guarantee that the value is final. The provider's national actual is an estimate of average grid intensity in gCO2/kWh; it is not a directly measured household footprint or marginal avoided emissions.

Unresolved targets are checked no more often than every six hours. Resolved targets can be checked daily for revisions. Both checks stop seven days after maturity (nine days after target end). A changed actual, including its later withdrawal to null, goes in a separate immutable revision file. Returning to the first value is also recorded if the preceding observation differed. The first mature label is never replaced. Unresolved targets beyond the monitoring window are marked expired; there is no retrospective backfill masquerading as a timely resolution.

## Bounded requests and missingness

Each invocation makes one forecast request and at most one daily national-actual batch request; one daily batch covers at most 48 target intervals. With uninterrupted half-hour scheduling this is at most 96 requests/day. This is an intentionally modest cadence, not a published provider quota or service guarantee. The transport has a 1 MB body cap, a 20-second socket timeout, and checks a 30-second elapsed read deadline between reads. A single pending socket operation can run past the read deadline until its socket timeout; the external job timeout is the hard overall guard. It follows HTTPS redirects only within the fixed provider host. Non-200 responses are archived as failures with `Retry-After` when present; there is no immediate retry. If the provider requests a longer pause, the scheduled owner must honor that pause before the next job.

The store records nominal half-hour run slots from its first invocation onward. The latest nominal slot at actual run start is counted as observed. Absent slots are explicit; duplicate/manual invocations do not fill older slots. This cannot reconstruct GitHub's queued event time, prove why a run was absent, or count outages before the store began. Capture errors and unobserved slots are separate. Neither forecasts nor targets are invented to fill gaps. All timestamps require a timezone and normalize to UTC, including during UK daylight-saving transitions.

## Stored evidence and Site projection

- `config.json`: immutable collection contract and attribution.
- `raw/<sha256>.body` and `captures/<run>-<phase>.json`: source bytes and receipts.
- `forecasts/<target>.json`: first locally captured forecast vintage.
- `resolutions/<target>.json`: first eligible mature actual.
- `revisions/<target>/<run>.json`: later observed changes, without replacing the label.
- `runs/<run>.json`: source-code hash, status, errors and counts.
- `check-state.json`: replaceable scheduling cache; immutable source records remain authoritative.
- `summary.json`: regenerated bounded public view; the last 192 forecasts are included, with all-time health counts.

The requested UI fields are present at the top level: `status`, `capturedAt`, `records[{issuedAt,start,end,forecast,actual,leadHours}]`, `resolved`, `missed`, and `detail`. `capturedAt` is the latest first-vintage capture retained in the store. `missed` means unobserved nominal run slots, and `resolved` is an all-store count that can exceed the displayed recent records. `status=collecting` only means the latest collector cycle had no errors; it is not a claim of accuracy, uninterrupted coverage, or mature outcomes. A Site should also independently mark the response stale from `generated_at`. The fuller snake-case fields retain interval, resolution, provenance and revision detail.

This qualification stream intentionally has receipt-dependent targets. Do not coerce it into the generic experiment ledger's fixed-cutoff schedule. Before a later model experiment, freeze a separate aligned cutoff/target contract, feature availability rules, candidate, official-forecast and persistence comparators, mature outcome policy, missingness denominator, loss/calibration metrics and stop rules. Features need both event and actual ingestion times before their cutoff. Nothing in this collector establishes a new scientific hypothesis or model superiority.

## Sources, rights and attribution

[Official API definitions](https://carbon-intensity.github.io/api-definitions/) specify the national interval endpoint and its forecast/actual fields. [Carbon Intensity](https://carbonintensity.org.uk/) describes the service. The [provider's terms](https://github.com/carbon-intensity/terms) and [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/) apply to source data. Preserve the embedded NESO attribution and source/license links when publishing the data or Site. The service is provided by NESO with its credited collaborators; this independent collector does not imply endorsement. The existing verification and subsequent live check should be retained separately from the offline fixture results.
