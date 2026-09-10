'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { parseForecastFeed } from '@/lib/forecast-feed';
type Feed = {
  status: string;
  capturedAt: string | null;
  records: {
    issuedAt: string;
    start: string;
    end: string;
    forecast: number;
    actual: number | null;
    leadHours: number;
  }[];
  resolved: number;
  missed: number;
  detail: string;
};
async function requestFeed(signal: AbortSignal) {
  const response = await fetch('/api/forecast', {signal});
  if (!response.ok) throw new Error('The published forecast record is temporarily unavailable.');
  return parseForecastFeed(await response.json());
}
export default function ForecastLedger() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'recent' | 'resolved'>('recent');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setFeed(await requestFeed(AbortSignal.timeout(15000)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Forecast record unavailable.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void requestFeed(AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(value => {if(active) setFeed(value);})
      .catch(e => {if(active) setError(e instanceof Error ? e.message : 'Forecast record unavailable.');})
      .finally(() => {if(active) setLoading(false);});
    return () => {active = false; controller.abort();};
  }, []);
  const time = (s: string) =>
    new Date(s).toLocaleString('en-GB', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ' UTC';
  return (
    <section id="forecast-ledger" className="recovery-live">
      <div>
        <span className="recovery-kicker">
          ARRIVING EVIDENCE / GB ELECTRICITY
        </span>
        <h2>Record today. Resolve later.</h2>
        <p>
          The official national carbon-intensity forecast becomes a permanent
          comparison. This first phase collects evidence; it does not claim a
          better predictor.
        </p>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Reading record…' : 'Refresh published record'}
        </Button>
        <a href="https://github.com/thantiklermcirony/empirical-observatory/actions/workflows/collect-grid.yml">
          Inspect automatic collection ↗
        </a>
      </div>
      <div aria-live="polite">
        {error && <p className="recovery-error">{error}</p>}
        {feed ? (
          <>
            <span className="recovery-status">{feed.status}</span>
            <p>{feed.detail}</p>
            {feed.capturedAt && <p>Latest receipt: {time(feed.capturedAt)}</p>}
            <div className="recovery-live-counts">
              <strong>
                {feed.resolved} <span>resolved</span>
              </strong>
              <strong>
                {feed.missed} <span>missed slots</span>
              </strong>
            </div>
            <div className="recovery-domain-tabs" role="group" aria-label="Forecast record view">
              <button aria-pressed={view === 'recent'} onClick={() => setView('recent')}>Recent forecasts</button>
              <button aria-pressed={view === 'resolved'} onClick={() => setView('resolved')}>Resolved outcomes</button>
            </div>
            {view === 'resolved' && !feed.records.some(r => r.actual !== null) && <p>No mature outcomes in the recent published window yet. Older records remain in the public data branch.</p>}
            {feed.records.filter(r => view === 'recent' || r.actual !== null).slice(0, 3).map((r) => (
              <div className="recovery-live-row" key={r.start}>
                <span>{time(r.start)}</span>
                <strong>
                  {r.forecast} <small>gCO₂/kWh forecast</small>
                </strong>
                <span>
                  {r.actual === null
                    ? 'Awaiting mature outcome'
                    : `${r.actual} gCO₂/kWh estimated actual`}
                </span>
                <small>
                  Captured {r.leadHours.toFixed(2)} hours before the target
                  interval
                </small>
              </div>
            ))}
          </>
        ) : (
          !error && <p>Reading the public collection record…</p>
        )}
        <p className="recovery-mini">
          Source:{' '}
          <a href="https://carbonintensity.org.uk/">
            NESO Carbon Intensity API
          </a>
          , CC BY 4.0. National estimated actuals; average intensity does not
          measure marginal emissions avoided.
        </p>
      </div>
    </section>
  );
}
