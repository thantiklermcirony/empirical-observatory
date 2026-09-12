# Current investigation flow — 12 September 2026

The ordinary-language terminal now uses `POST /api/inquiry/research`: a shared AI planner assigns relevant branch work, fixed engines calculate, and a second AI call explains the actual returned evidence in plain language. It returns a plan, cited answer, exact model cases, graphs, specific missing observations and encyclopedia connections. The advanced structured endpoint is unchanged.

This service shares the existing atomic 200-provider-call UTC daily allowance; it uses at most two calls per investigation, counts failed attempts and never retries automatically. Without a configured credential, it returns an explicitly source-guided explanation and illustrative computations. Hosted AI is not yet verified live.

Save accepts either an original request (recalculated) or the server-issued `signedReport` envelope (verified and preserved exactly, without another AI call). The receipt expires after one hour; saved private records retain their existing 30-day access-token protection. Save has a separate 1,050,000-byte envelope limit. See [Investigation_Pipeline.md](research/Investigation_Pipeline.md) for the current contract and tests. The earlier fixed-gateway description below is retained as implementation history; its prose-only and save-only restrictions are superseded here.

---

# Central desk: one question, scoped branch printouts

The front door is `/` or `/question`. A complete documented model prompt or explicit fourteen-field inquiry goes to `POST /api/inquiry`. The host binds the reviewed temporal router and quantum reference; client input cannot supply runtime adapters, code, URLs or source identities.

The deterministic interpreter uses full-string declared templates. The optional shared hosted interpreter accepts other prose through `POST /api/inquiry/interpret` and returns a proposed contract or explicit missing inputs. It never supplies an execution adapter or promotes empirical evidence. The desk sends valid proposals to the same scientific router. Model interpretation can be wrong even when a contract passes structural checks; inspect its quantities and premises.

## Active flow

1. Parse unique-key bounded JSON and validate the question envelope.
2. Preserve named quantities, units, preparations, clock and ordered verbs.
3. Check capability ports and premises. Execute eligible fixed operations; retain independent gaps.
4. Return exact rational bounded actions/resource ceilings or a dimensionless numerical reference prediction. The controller template calls the existing seeded reactor engine and retains its native record.
5. Project the same receipts into five branch panels, a graphical explanation and relevant source-pinned encyclopedia entries. An editorial relationship is not evidential transfer.
6. Optional Save recomputes the original request on the server and stores an immutable printout. Separate laboratory/encyclopedia views read that same record. Public claims are not modified.

## AI interface

- `GET /api/inquiry/interpret`: connection readiness, configured model and shared daily limit; no secrets.
- `POST /api/inquiry/interpret`: exactly `{ "prompt": "..." }`, up to 2,000 characters. Returns `proposal` with `inquiry`, or `needs_input` with questions. Branch clients use this same service, then submit a proposal to `/api/inquiry`.
- Production configuration: secret `OPENAI_API_KEY`, `OBSERVATORY_AI_MODEL`, and `OBSERVATORY_AI_DAILY_CALL_LIMIT=200`. Without all three the AI route returns 503; deterministic calculation remains available.
- A single atomic D1 reservation caps all visitors and branches at 200 calls per UTC day. Calls that fail after reservation still count. No retries, self-generated loops or background branch calls are enabled. This is a request limit, not a dollar limit.
- The interpreter sends the fixed catalogue and question to OpenAI Responses with `store: false`, a 2,200-output-token cap and a 25-second deadline. It has no tools or arbitrary network target. The catalogue bounds input overhead. Actual charges depend on the configured model and usage.

- `/agents`: instructions and curl example.
- `GET /api/inquiry`: full capability contracts and five working structured examples.
- `POST /api/inquiry`: `{ "prompt": "..." }` or `{ "inquiry": { ... }, "previous": { ... } }`.
- `/api/inquiry/openapi`: OpenAPI 3.1 discovery.
- `/llms.txt`: compact discovery document.
- Browser Model Context, when supported: `evaluate_observatory_inquiry`, `read_observatory_printout`.

`previous` is caller-declared comparison material, not authenticated history. Revision and source-support checks remain required. The application explicitly distinguishes its fixed runtime from an AI language interpreter.

## Records

`POST /api/inquiry/save` accepts only `{ "request": ORIGINAL_REQUEST }`, recomputes it and returns `id`, `token`, `expiresAt` and `printout`. A fabricated client result or content seal is never accepted as a server result. GET/DELETE `/api/inquiry/ID` requires that record's random 256-bit Bearer token. No listing endpoint exists. The UI carries the secret in a URL fragment, never a query parameter. A recipient of the complete link can read/delete that record.

D1 stores only the token hash. Records expire at 30 days; the next save removes expired rows. Limits: 64 KiB request, 1 MB saved record, 200 retained records per creation day. The append-only Drizzle migration adds a printout table and day/expiry indexes; the existing usage-counter table is unchanged. These are private research snapshots, not the separate forecasting ledger's evidence-admission events.

## Validation

The portable routing core passed 68 Node tests, including 54 differentials against the accepted Python implementation. The quantum port passed 31 groups and 186 full-Python reference trajectories; maximum density discrepancy was about 2.06e-11. This is finite numerical agreement, not a formal floating-point enclosure. Gateway tests cover full-string qualifiers, exact inputs, missing premises, duplicate JSON, body limits, recomputation, token isolation, expiry, immutable correction snapshots and actual SQLite execution of the migration. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` with Node 24.

Exact frozen asset identities are bound in `lib/lab-engine.ts`; `.gitattributes` preserves the reviewed bytes. UI explanations and branch projections retain result status, kind, scope, premises and source receipts. Empty/unowned operations remain gaps. Source hashes identify bytes; they do not authenticate measurements or estimate a theory's probability of truth.

## Not yet active

Hosted interpretation requires a securely configured API account and a live end-to-end check; implementing the adapter is not evidence that this connection is active. Arbitrary scientific-model construction, self-modifying code, calibrated biological transfer from quantum yields, automatic public encyclopedia admission and every candidate laboratory are not implemented by this release. The ten final specialist source releases preserve accepted/candidate/held status separately. This integration makes a usable finite research desk; it does not establish a universal scientific theory.
