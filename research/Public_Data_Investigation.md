# Public-data investigations

The central question endpoint can now retrieve and compare World Bank World Development Indicators (WDI, source 2). This is the first supported public statistics provider, not access to every statistic in existence. A current fetch preserves the observation year and source revision; annual statistics are not real-time sensor readings.

## User flow and scientific contract

The terminal offers a source-definition search over the current WDI catalogue, country/economy selection, and either one common year across economies or an annual period within one economy. It fetches original observations and full metadata before computing. Search is available without an AI credential.

Supported prompt examples:

- `Is GDP per capita (current US$) correlated with life expectancy at birth across countries in 2023?`
- `Correlate World Bank NY.GDP.PCAP.CD with SP.DYN.LE00.IN; country=all; years=2023:2023.`
- `Correlate World Bank NY.GDP.PCAP.CD with SP.DYN.LE00.IN; country=USA; years=2000:2023.`

Natural-language deterministic matching is a full-string grammar with exact source names. Extra geography, exclusions, controls, weights or lags must not be discarded. Ambiguous questions first search the catalogue, then list the unresolved choices. With hosted AI available, a bounded web-search planning step can propose source codes; the adapter verifies the actual codes and metadata before using observations. Unsupported designs remain gaps.

The report records raw returned observations, exact paired rows, missingness, source footnotes, units, definitions, frequency, source limitations, license metadata, retrieval times, revision dates and SHA-256 hashes of fetched bytes. It excludes aggregates by the country catalogue, pairs country/economy identifiers and exact years, preserves zero, rejects duplicate or incomplete pages, and performs no imputation or hidden year substitution.

## Prespecified stress checks

- Pearson linear correlation and Spearman correlation using average ranks for ties.
- Descriptive slope and r-squared, without causal interpretation.
- Leave-one-out Pearson range, without removing any observation from the main result.
- Log-X sensitivity only for strictly positive X.
- Within-country annual series: Pearson and Spearman on adjacent-year changes. Missing years are not bridged.
- Explicit prominent warnings when ranks, a single omission, or annual changes reverse the sign.
- Constant inputs or fewer than three pairs produce undefined correlation, not zero.

These are descriptive analyses of available country/economy observations, not an independent random population sample. No default population p-value or confidence interval is issued. A p-value is not the probability a correlation or theory is true; r-squared is not a probability of truth either. A nonlinear deterministic relationship can have both correlations zero. These checks do not identify causal direction, eliminate confounding, or correct measurement uncertainty, spatial/serial dependence or repeated exploratory queries. Weighted, adjusted, lagged and causal analyses require additional reviewed operations and justified designs.

## Hosted investigation behavior

For general questions, the first AI call uses bounded web search before proposing branch tasks, distinguishing sourced findings, observations, assumptions, candidate mechanisms and unknowns. The second call interprets actual fixed laboratory receipts. Retrieved source text remains untrusted input and cannot install code or change the contract. Web URLs returned by the provider are preserved as consulted sources; that does not validate the claims.

The existing shared cap remains 200 Responses requests per UTC day, including failed attempts, with at most two Responses calls per investigation. A web-search planning call allows at most three built-in tool calls. Search tool charges, when used, are additional to model token charges; the daily request cap is not a fixed monetary budget. There are no background research loops or hidden provider retries. Requests use store:false. Production AI activation still requires the server credential and a genuine end-to-end test; mocked-provider checks are not live AI verification.

Public source operations are fixed HTTPS calls to api.worldbank.org, not arbitrary URL fetching. Selected series are fetched afresh; the indicator/country search catalogue is cached in memory for up to one hour. Results are not automatically stored or publicly admitted. Without a server signing key, Save recomputes a fresh source snapshot and displays that newly saved report; JSON download retains the exact preceding run. With a server-issued signing receipt, the existing signed save preserves the exact result. Private retention remains 30 days.

## Verification baseline

Before publication, the actual WDI 2023 GDP-per-capita/current-US$ versus life-expectancy case was independently calculated from fetched data: 204 matched economies of 217, 13 missing GDP values, 78 catalogue aggregates excluded; Pearson 0.62040852369834, Spearman 0.8649959591055656, log-GDP Pearson 0.8551433336382771, leave-one-out range [0.61514841907502, 0.6473536177300314]. Source revision was 2026-07-13. These are observational descriptions, not a scientific discovery or evidence that income causes longevity.

Primary protocol references: [World Bank API overview](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation), [API basic call structure](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures), [Pearson reference and assumptions](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html), [Spearman reference](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html), [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search).

The existing calibration/resource experiment remains the programme's next prospective scientific experiment. No specialist freeze or pause was changed by adding this general observational analysis capability.
