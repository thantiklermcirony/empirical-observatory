# From a question to a defensible answer

The public terminal sends ordinary language to `POST /api/inquiry/research`. The visitor does not need to author the fourteen-field computational contract. Advanced declared inquiries retain their existing fixed-engine endpoint.

1. A shared OpenAI planner divides the original question among relevant mathematical, temporal, adaptation, biological, dynamics, quantum and encyclopedia tasks. It receives authored source briefs with explicit evidence classes and the finite capability catalogue.
2. The server validates the plan, limits it to seven unique tasks and four calculations, and runs the existing engines. Exact supported prose retains its original inputs even if the planner suggests a different fixture. Other model proposals retain the original question, clear supplied results and downgrade claims of observed/derived evidence to unverified assumptions. A failed branch proposal leaves independent calculations available.
3. A second OpenAI call receives the original question, plan, source briefs and actual returned values, status, units, gaps and content receipts. Long arrays are explicitly sampled in this context; full arrays remain in the report. The answer must cite existing evidence IDs. This structural check does not prove the explanation semantically correct.
4. The printout leads with the answer, then evidence sections, calculated graphs, branch plan, missing observations, next steps and sources. Graphs use returned model values, never invented AI images of data. Conditional mathematics, synthetic simulations and biological observations remain distinct. Private reports do not change encyclopedia admission.

Both AI stages share the existing atomic 200-provider-request UTC daily counter with the earlier interpreter endpoint. An investigation uses at most two calls. Failed provider attempts consume their reserved call; there are no hidden retries. Each call has a 25-second deadline, an 85,000-character input ceiling and a 3,600-output-token ceiling. No model can execute code, add adapters, fetch a URL, or promote a theorem. An external visitor supplies no API key.

The production API credential is still required. When it is missing, the application supplies a clearly labelled authored source brief and relevant illustrative calculations. An AI failure keeps available calculations and labels the explanation as source-guided. This fallback is deliberately finite and is not an unrestricted AI answer engine.

## Saving without changing the explanation

Running does not store a question. With a configured server secret, the response includes a one-hour HMAC save receipt covering the exact printout and expiry. The signing key is derived with HKDF from the server credential using a separate purpose label; neither key is returned or persisted. `POST /api/inquiry/save` verifies that receipt before storing an unchanged report. This requires no additional AI request. A server signature attests issuance, not scientific truth.

Without hosted AI, Save recomputes the original source-guided research request. The existing random record token, hashed token storage, 30-day expiry and 1 MB record limit remain. The save envelope has a separate 1,050,000-byte cap; computational requests retain the 64 KiB cap. Altered/expired signatures fail rather than accepting client-written results.

## Acceptance and limits

The prompt “is biology bounded and adaptive, prove it” must receive a readable conditional answer, exact bounded-action and resource examples, a controller baseline comparison, an encyclopedia relationship and concrete missing measurements. A synthetic ceiling can exclude its declared target. It cannot prove all biology is governed by one bounded adaptive law. A successful control fixture is not an empirical biological discovery.

Tests exercise the actual research route and SQLite storage; the two-stage provider is mocked because no live API credential is configured. They verify evidence delivery, exact input preservation, independent branch failures, invalid citations, the atomic quota, signature tampering/expiry, and preserving the exact report on save without another provider call. A live credential-dependent test remains required before declaring hosted AI operational.

The next scientific experiment remains the prospective calibration/observation challenge in [Next_Observatory_Experiment.md](Next_Observatory_Experiment.md). Its conventional ledger baseline, equal assay cost, coverage and precision gates precede new scientific coding. Specialists remain paused.
