'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation preserves the verified production link contract. */
import { useState } from 'react';
import {
  ArrowUpRight,
  Orbit,
  RotateCcw,
  Eye,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecoveryEvidence, RecoveryCase } from '@/lib/recovery-evidence';
import ForecastLedger from '@/components/observatory/ForecastLedger';

const colours = ['#79e6d5', '#f5bd77', '#b4a5fa'];
function History({
  sample,
  revealed,
}: {
  sample: RecoveryCase;
  revealed: boolean;
}) {
  const shown = sample.visits.filter(
    (v) => v.day <= sample.targetDay + 4 && (revealed || v.day <= sample.cutoffDay),
  );
  const minDay = Math.min(...sample.visits.map((v) => v.day), sample.cutoffDay);
  const maxDay = sample.targetDay + 4;
  const maxScore = Math.max(8, ...shown.map((v) => v.severe));
  const x = (d: number) =>
    54 + ((d - minDay) / Math.max(1, maxDay - minDay)) * 640;
  const y = (s: number) => 220 - (s / maxScore) * 160;
  return (
    <svg
      className="recovery-history"
      viewBox="0 0 730 270"
      role="img"
      aria-label={`Observed severe-coded item history for ${sample.id}. Future ${revealed ? 'revealed' : 'hidden'}.`}
    >
      <rect
        x={x(sample.cutoffDay)}
        y="28"
        width={Math.max(0, 700 - x(sample.cutoffDay))}
        height="194"
        fill="#b4a5fa0c"
      />
      {[0, 2, 4, 6, 8]
        .filter((s) => s <= maxScore)
        .map((s) => (
          <g key={s}>
            <line
              x1="54"
              x2="700"
              y1={y(s)}
              y2={y(s)}
              stroke={s === 4 ? '#f5bd7780' : '#304650'}
              strokeDasharray={s === 4 ? '5 5' : undefined}
            />
            <text x="35" y={y(s) + 5} textAnchor="end">
              {s}
            </text>
          </g>
        ))}
      <text x="54" y="18">
        Known severe-coded items (lower bound)
      </text>
      <line
        x1={x(sample.cutoffDay)}
        x2={x(sample.cutoffDay)}
        y1="28"
        y2="223"
        stroke="#79e6d5"
        strokeDasharray="3 4"
      />
      <polyline
        fill="none"
        stroke="#79e6d5"
        strokeWidth="2.5"
        points={shown.map((v) => `${x(v.day)},${y(v.severe)}`).join(' ')}
      />
      {shown.map((v, i) => (
        <circle
          key={i}
          cx={x(v.day)}
          cy={y(v.severe)}
          r="4"
          fill={v.severe < 4 && v.severe + 30 - v.assessed >= 4 ? '#121e27' : v.day > sample.cutoffDay ? '#f5bd77' : '#79e6d5'}
          stroke={v.severe < 4 && v.severe + 30 - v.assessed >= 4 ? '#f5bd77' : 'none'}
          strokeWidth="2"
        >
          <title>{`Day ${v.day}: ${v.severe} known severe, ${v.assessed}/30 assessed; ${30-v.assessed} missing${v.severe < 4 && v.severe + 30 - v.assessed >= 4 ? '; threshold state uncertain' : ''}`}</title>
        </circle>
      ))}
      <text x={x(sample.cutoffDay)-7} y="42" textAnchor="end">
        Prediction cutoff
      </text>
      <text x="377" y="247" textAnchor="middle">
        Days after first recorded assessment · hollow point = uncertain threshold state
      </text>
    </svg>
  );
}

const programme = [
  {
    name: 'Foundations',
    detail:
      'The programme asks which distinctions a description must preserve. Each experiment turns that question into a measurable comparison.',
    href: '/atlas',
    link: 'Explore the research Atlas',
  },
  {
    name: 'Biology',
    detail:
      'Recovery Lab tests observed changes over time. Virtual Cell keeps both completed context-transfer tests, including their failed success gates.',
    href: '/cell#flight02',
    link: 'Inspect the cell experiments',
  },
  {
    name: 'Live systems',
    detail:
      'The grid collector records an official forecast before its outcome is available. Delayed scoring will exercise the same evidence trail on arriving data.',
    href: '#forecast-ledger',
    link: 'Inspect the live forecast record',
  },
  {
    name: 'Learning & control',
    detail:
      'TAO and adaptive measurement experiments explore actions and test selection. An improved prediction alone does not establish an improved intervention.',
    href: '/#tao',
    link: 'Open the control experiment',
  },
  {
    name: 'Software & AI',
    detail:
      'Active Context records actual checks and identifies which results require reassessment when declared dependencies change. Its local tool and replay are available; improved AI task performance remains to be tested.',
    href: '/active-context',
    link: 'Try Active Context',
  },
];

export default function RecoveryLab({
  evidence,
}: {
  evidence: RecoveryEvidence;
}) {
  const [caseIndex, setCaseIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState(1);
  const sample = evidence.cases[caseIndex];
  const currentStep = evidence.steps[step];
  return (
    <main className="recovery-page">
      <header className="recovery-header">
        <a className="atlas-brand" href="/">
          <Orbit size={26} />
          <span>
            EMPIRICAL OBSERVATORY<strong>RECOVERY LAB / 01</strong>
          </span>
        </a>
        <nav aria-label="Recovery Lab">
          <a href="/atlas">Research Atlas</a>
          <a href="#forecast-ledger">Live forecasts</a>
          <a href="/projects">Current projects</a>
        </nav>
      </header>
      <div className="recovery-heading">
        <div>
          <span className="recovery-kicker">
            HISTORY → PREDICTION → EVIDENCE
          </span>
          <h1>{evidence.question}</h1>
        </div>
        <span className="recovery-status">
          <span aria-hidden="true" /> {evidence.status}
        </span>
      </div>
      <p className="recovery-scope">{evidence.scope}</p>
      <div className="recovery-facts">
        {evidence.counts.map((c) => (
          <div key={c.label}>
            <strong>{c.value}</strong>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
      <section className="recovery-workbench" aria-labelledby="replay-title">
        <div className="recovery-time-lens">
          <div className="recovery-section-title">
            <div>
              <span className="recovery-kicker">
                TIME LENS / HELD-OUT REPLAY
              </span>
              <h2 id="replay-title">Hide the future. Test the description.</h2>
            </div>
            <span className="recovery-mini">
              Real observations · retrospective evaluation
            </span>
          </div>
          {sample ? (
            <>
              <div className="recovery-controls">
                <label htmlFor="recovery-case">Recorded case</label>
                <select
                  id="recovery-case"
                  value={caseIndex}
                  onChange={(e) => {
                    setCaseIndex(Number(e.target.value));
                    setRevealed(false);
                  }}
                >
                  {evidence.cases.map((c, i) => (
                    <option key={c.id} value={i}>
                      {c.id} · {c.cohort}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => setRevealed((v) => !v)}
                  variant={revealed ? 'outline' : 'default'}
                >
                  {revealed ? <RotateCcw /> : <Eye />}
                  {revealed ? 'Hide outcome' : 'Reveal outcome'}
                </Button>
              </div>
              <History sample={sample} revealed={revealed} />
              <p className="recovery-mini">The target uses the closest identifiable assessment within days 5–9 after the cutoff. Recorded death or euthanasia through day 9 takes precedence. Missing items can leave the threshold state uncertain.</p>
              <div className="recovery-reveal" aria-live="polite">
                <span>
                  {revealed ? 'OBSERVED AFTER THE CUTOFF' : 'FUTURE HIDDEN'}
                </span>
                <strong>
                  {revealed
                    ? sample.observed
                    : 'Compare the forecasts, then reveal the result.'}
                </strong>
                <p>
                  {revealed
                    ? `Target day ${sample.targetDay}${sample.observedDay !== null ? `; outcome record on day ${sample.observedDay}` : ''}.`
                    : 'Models were evaluated on animals withheld from their training.'}
                </p>
              </div>
              <details>
                <summary>Show the measurements as a table</summary>
                <table>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Known severe (lower bound)</th>
                      <th>Items assessed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.visits
                      .filter((v) => revealed || v.day <= sample.cutoffDay)
                      .map((v, i) => (
                        <tr key={i}>
                          <td>{v.day}</td>
                          <td>{v.severe}</td>
                          <td>{v.assessed}/30 ({30-v.assessed} missing)</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </details>
            </>
          ) : (
            <div className="recovery-empty">
              <p>{evidence.verdict}</p>
              <a href="#evidence">
                Inspect the experiment’s current evidence{' '}
                <ArrowRight size={16} />
              </a>
            </div>
          )}
        </div>
        <aside className="recovery-forecast">
          <span className="recovery-kicker">COMPETING DESCRIPTIONS</span>
          <h2>What happens next?</h2>
          <div className="recovery-legend">
            {evidence.classes.map((s, i) => (
              <span key={s}>
                <i style={{ background: colours[i] }} />
                {s}
              </span>
            ))}
          </div>
          {sample ? (
            sample.probabilities.map((p) => (
              <div className="recovery-probability" key={p.model}>
                <h3>{p.model}</h3>
                <div className="recovery-probability-bar" aria-hidden="true">
                  {p.values.map((v, i) => (
                    <span
                      key={i}
                      style={{ width: `${v * 100}%`, background: colours[i] }}
                    />
                  ))}
                </div>
                <dl>
                  {p.values.map((v, i) => (
                    <div key={i}>
                      <dt>{evidence.classes[i]}</dt>
                      <dd>{(v * 100).toFixed(1)}%</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))
          ) : (
            <p>
              Forecasts appear here only after the frozen comparison has been
              executed.
            </p>
          )}
        </aside>
      </section>
      <section id="evidence" className="recovery-evidence">
        <div>
          <span className="recovery-kicker">THE WHOLE TEST</span>
          <h2>{evidence.verdict}</h2>
          <p>{evidence.gate.detail}</p>
          <span
            className={`recovery-gate ${evidence.gate.passed === true ? 'passed' : ''}`}
          >
            {evidence.gate.passed === null
              ? 'No result claimed'
              : evidence.gate.passed
                ? 'Declared gate passed'
                : 'Declared gate not passed'}
          </span>
        </div>
        <div>
          {evidence.methods.length > 0 && (
            <table>
              <caption>{evidence.metric}</caption>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {evidence.methods.map((m) => (
                  <tr key={m.name}>
                    <th>
                      {m.name}
                      <small>{m.role}</small>
                    </th>
                    <td>
                      {m.score === null ? 'Unavailable' : m.score.toFixed(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ul>
            {evidence.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="recovery-loop" aria-labelledby="loop-title">
        <span className="recovery-kicker">
          ONE METHOD / SEPARATE SCIENTIFIC QUESTIONS
        </span>
        <h2 id="loop-title">An experiment that leaves a trail.</h2>
        <div
          className="recovery-steps"
          role="group"
          aria-label="Explore the research loop"
        >
          {evidence.steps.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setStep(i)}
              aria-pressed={step === i}
            >
              <span>0{i + 1}</span>
              {s.name}
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
        {currentStep && (
          <div className="recovery-step-detail" aria-live="polite">
            <strong>{currentStep.status}</strong>
            <p>{currentStep.detail}</p>
          </div>
        )}
        <p>
          Automated collection, checks and scoring can run repeatedly. Model
          promotion requires a recorded review and fresh evidence. The engine
          does not rewrite a failed result.
        </p>
      </section>
      <ForecastLedger />
      <section className="recovery-programme">
        <div>
          <span className="recovery-kicker">HOW IT FITS TOGETHER</span>
          <h2>
            One Observatory.
            <br />
            Many testable questions.
          </h2>
          <p>
            The common centre is a method for preserving evidence. Models and
            scientific claims evolve separately.
          </p>
        </div>
        <div>
          <div
            className="recovery-domain-tabs"
            role="group"
            aria-label="Programme connections"
          >
            {programme.map((d, i) => (
              <button
                key={d.name}
                aria-pressed={i === domain}
                onClick={() => setDomain(i)}
              >
                {d.name}
              </button>
            ))}
          </div>
          <h3>{programme[domain].name}</h3>
          <p>{programme[domain].detail}</p>
          <a href={programme[domain].href}>
            {programme[domain].link} <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
      <footer className="recovery-footer">
        <div>
          <Check size={18} />
          <span>Inspect, reproduce, challenge</span>
        </div>
        {evidence.links.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label} <ArrowUpRight size={14} />
          </a>
        ))}
        <a href="/privacy">Records and privacy</a>
      </footer>
    </main>
  );
}
