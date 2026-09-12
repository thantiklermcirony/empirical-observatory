/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the reproduced vinext production Link runtime failure. */
import UsagePreference from '@/components/observatory/UsagePreference';

export default function Privacy() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '64px auto',
        padding: 24,
        lineHeight: 1.7,
      }}
    >
      <a href="/">← Back to the Observatory</a>
      <h1>Records and usage counts</h1>
      <p>When the shared AI connection is available, ordinary-language questions
        are sent to OpenAI to plan an investigation. Planning may use hosted web
        search, sending relevant search terms to that service and consulting public sources.
        Each planning request allows at most three search tool calls. The relevant source briefs,
        proposed plan and returned laboratory results are then sent for a
        plain-language explanation. This uses up to two calls from a shared
        allowance of 200 provider requests per UTC day. Proposals are checked
        before calculation and remain unverified interpretations. Requests use
        store: false; the applicable OpenAI
        API data-retention policies still apply. The daily AI allowance stores
        only a UTC date and call count, not question text. Failed provider calls
        count toward the allowance. Saving a resulting printout also saves its
        proposed model and interpretation provenance.</p>
      <p>
        The central terminal sends your prompt or structured inquiry to the
        Observatory server for a bounded calculation. Running a question does
        not save it. “Save private printout” verifies a server-issued receipt for
        an AI report, preserving the exact explanation without another AI call.
        Reports made without hosted AI are recalculated on save. Public-data reports
        retrieve a fresh snapshot during that recalculation; source revisions may change it.
        Download JSON to retain the exact preceding run. Saving stores
        its request, assumptions, results and content receipt in our database.
        Saved records expire after 30 days and expired rows are removed on the
        next save. Anyone with the complete private link can read or delete that
        record. The secret stays in the link fragment and is sent as an
        authorization header when you reopen it. We store only a hash of that
        secret. There is no public listing of private printouts, and they do not
        update public encyclopedia claims. Downloaded JSON remains on your device.
        Hosting infrastructure may process
        ordinary request logs; avoid entering sensitive personal information.
      </p>
      <p>Statistics searches and selected public series are requested from the World Bank
        by the Observatory server. The source receives indicator codes, country and date
        parameters, not your complete question. The search catalogue may be cached for
        one hour. Reports retain the returned observations, definitions, footnotes and
        retrieval records. Public-source requests do not consume the AI call allowance.</p>
      <p>
        The office television embeds an original Carl Sagan recording through
        YouTube’s privacy-enhanced player. It starts muted; enabling sound is
        your choice. YouTube receives requests when the player loads.
        The optional archive radio loads a NASA recording from Wikimedia only
        when you press play. Wikimedia receives that media request. The radio
        starts silent and can be paused or switched off at any time.
      </p>
      <p>
        We keep aggregate daily counts of page views, laboratory openings and
        links to GitHub, plus broad referral categories such as search or
        GitHub. This counter stores no IP addresses, full referring URLs,
        cookies, visitor IDs or browser fingerprints. It counts activity, not
        unique people. These are unverified activity counts and may include
        automated requests. Counts aged 90 days or more are removed when the
        next event arrives.
      </p>
      <p>
        Do Not Track and Global Privacy Control are respected. Your counting
        preference is stored only on your device and applies to future page
        views and interactions.
      </p>
      <UsagePreference />
    </main>
  );
}
