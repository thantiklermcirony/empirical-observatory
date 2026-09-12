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
      <p>When the shared AI connection is available, free-form questions outside
        the four supplied examples are sent to OpenAI to propose a structured
        inquiry. The proposal is checked before calculation and remains an
        unverified interpretation. Requests use store: false; the applicable OpenAI
        API data-retention policies still apply. The daily AI allowance stores
        only a UTC date and call count, not question text. Failed provider calls
        count toward the allowance. Saving a resulting printout also saves its
        proposed model and interpretation provenance.</p>
      <p>
        The central terminal sends your prompt or structured inquiry to the
        Observatory server for a bounded calculation. Running a question does
        not save it. “Save private printout” repeats the calculation and stores
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
      <p>
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
