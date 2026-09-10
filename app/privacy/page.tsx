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
      <p>
        Your experiment records stay in your browser. The Observatory does not
        upload your responses, signal recordings, experiment settings or
        results.
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
