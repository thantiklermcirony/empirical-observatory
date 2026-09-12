'use client';
/* oxlint-disable next/no-html-link-for-pages -- Source audits are static research files. */
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  Download,
  Play,
} from 'lucide-react';
import {
  CHALLENGES,
  FUTURES,
  ACTIONS,
  runPaperCheck,
} from '@/lib/paper-challenges';
import type { CheckResult } from '@/lib/paper-challenges';
const palette = ['#79e6d5', '#f5bd77', '#b4a5fa', '#8bc5ff'];
function Groups({ groups, label }: { groups: number[][]; label: string }) {
  return (
    <div className="pc-groups">
      <h4>{label}</h4>
      {groups.map((g, i) => (
        <div key={i} style={{ borderColor: palette[i] }}>
          <span>State {i + 1}</span>
          {g.map((h) => (
            <b key={h}>h{h + 1}</b>
          ))}
        </div>
      ))}
    </div>
  );
}
function Evidence({ result }: { result: CheckResult }) {
  if (result.status === 'missing-inputs')
    return (
      <div className="pc-missing">
        <span>INPUTS REQUIRED → CALCULATION HELD</span>
        {result.details.map((d) => (
          <p key={d}>□ {d}</p>
        ))}
        <p>
          No synthetic data have been substituted for these missing measurements
          or specifications.
        </p>
      </div>
    );
  return (
    <>
      {result.groups && (
        <>
          <div className="pc-table-wrap">
            <table>
              <caption>
                Declared future laws: exact P(Y = 1 | history, test)
              </caption>
              <thead>
                <tr>
                  <th>History</th>
                  <th>Test u</th>
                  <th>Test v</th>
                </tr>
              </thead>
              <tbody>
                {FUTURES.map((r, i) => (
                  <tr
                    key={i}
                    className={
                      result.witness?.histories.includes(i) ? 'pc-conflict' : ''
                    }
                  >
                    <th>h{i + 1}</th>
                    {r.map((p, j) => (
                      <td key={j}>
                        <span
                          className="pc-prob"
                          style={{ width: `${p * 100}%` }}
                        />
                        {p.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pc-group-comparison">
            <Groups
              groups={result.groups}
              label={
                result.otherGroups
                  ? 'Before: test u only'
                  : 'Retained state labels'
              }
            />
            {result.otherGroups && (
              <>
                <ArrowRight />
                <Groups
                  groups={result.otherGroups}
                  label="After: tests u and v"
                />
              </>
            )}
          </div>
        </>
      )}
      {result.actions && (
        <div className="pc-table-wrap">
          <table>
            <caption>
              Acceptable means success probability ≥ 0.90; every column must be
              judged across all states.
            </caption>
            <thead>
              <tr>
                <th>State</th>
                {['a', 'b', 'c'].map((a) => (
                  <th key={a}>Action {a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIONS.map((r, i) => (
                <tr key={i}>
                  <th>s{i + 1}</th>
                  {r.map((p, j) => (
                    <td className={p >= 0.9 ? 'pc-safe' : 'pc-unsafe'} key={j}>
                      {p >= 0.9 ? '✓' : '×'} {p.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pc-insight">
            Each pair has a green action in common. No column is green for all
            three.
          </p>
        </div>
      )}
      {result.numbers && (
        <div
          className="pc-bars"
          role="img"
          aria-label={result.numbers
            .map((n) => `${n.label}: ${n.value}`)
            .join('. ')}
        >
          {result.numbers.map((n, i) => (
            <div key={n.label}>
              <span>
                {n.label}
                <b>{Number(n.value.toPrecision(7))}</b>
              </span>
              <div className="pc-bar-track">
                <i
                  style={{
                    width: `${(100 * n.value) / Math.max(1, ...result.numbers!.map((n) => n.value))}%`,
                    background: palette[i],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export default function PaperChallenges({ onBack }: { onBack: () => void }) {
  const [id, setId] = useState(CHALLENGES[0].id);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [error, setError] = useState('');
  const c = CHALLENGES.find((c) => c.id === id)!;
  const result = results[id];
  const computed = Object.values(results).filter(
    (r) => r.status === 'witness',
  ).length;
  const gaps = Object.values(results).filter(
    (r) => r.status === 'missing-inputs',
  ).length;
  function run(all = false) {
    try {
      const next = { ...results };
      for (const q of all ? CHALLENGES : [c]) next[q.id] = runPaperCheck(q.id);
      setResults(next);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed.');
    }
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 'paper-bench-1',
            scope:
              'Finite conditional witnesses and declared missing-input audits; no AI rediscovery or empirical validation',
            results,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'observatory-paper-challenges.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="paper-bench question-desk">
      <header className="qd-top">
        <button onClick={onBack}>
          <ArrowLeft size={18} /> Back to observatory
        </button>
        <span>
          <FlaskConical size={18} /> PAPER CHALLENGE BENCH
        </span>
        <a href="/atlas">Programme atlas →</a>
      </header>
      <div className="qd-heading">
        <div>
          <span className="eyebrow">CAN THE CALCULATION EARN THE CLAIM?</span>
          <h1>
            Ask the hard question.
            <br />
            <em>Keep the decisive distinction.</em>
          </h1>
        </div>
        <p>
          Six finite witnesses from the papers.
          <br />
          Four questions waiting for specified inputs.
        </p>
      </div>
      <p className="pc-scope">
        These are explicit, reproducible checks of selected paper claims. The
        answering functions compute from declared inputs; the paper expectations
        remain separate for comparison. This bench does not use a language model
        or claim independent rediscovery.
      </p>
      <div className="pc-controls">
        <button onClick={() => run(true)}>
          <Play size={16} /> Run all paper checks
        </button>
        <button onClick={download} disabled={!Object.keys(results).length}>
          <Download size={16} /> Export results
        </button>
        <p role="status">
          {computed} witnesses computed · {gaps} input gaps identified ·{' '}
          {CHALLENGES.length - Object.keys(results).length} unchecked
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="pc-layout">
        <label className="pc-mobile-picker">
          Choose a paper question
          <select
            aria-label="Choose a paper question"
            value={id}
            onChange={(e) => setId(e.target.value)}
          >
            {CHALLENGES.map((q, i) => (
              <option key={q.id} value={q.id}>
                {i + 1}. {q.title}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Paper challenges">
          {CHALLENGES.map((q, i) => (
            <button
              key={q.id}
              aria-pressed={id === q.id}
              onClick={() => setId(q.id)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <strong>{q.title}</strong>
              <small>
                {results[q.id]?.status === 'witness'
                  ? 'Witness computed'
                  : results[q.id]
                    ? 'Inputs missing'
                    : q.missing
                      ? 'Input audit'
                      : 'Finite calculation'}
              </small>
            </button>
          ))}
        </nav>
        <article className="pc-detail">
          <span className="eyebrow">
            {c.missing ? 'EVIDENCE GATE' : 'CONDITIONAL MATHEMATICAL CHECK'}
          </span>
          <h2>{c.question}</h2>
          <p>{c.scope}</p>
          <div className="pc-source">
            <strong>{c.paper}</strong>
            <span>{c.location}</span>
            <a
              href={`/research/question-papers/${c.source}.md`}
              target="_blank"
              rel="noreferrer"
            >
              Read the source extraction and assumptions ↗
            </a>
          </div>
          <div className="pc-assumptions">
            <h3>Assumptions in this check</h3>
            {c.assumptions.map((a) => (
              <p key={a}>
                <span>STIPULATED</span> {a}
              </p>
            ))}
          </div>
          <button className="pc-run" onClick={() => run()}>
            <Play size={16} />
            {c.missing ? 'Inspect the missing inputs' : 'Compute this witness'}
          </button>
          <section className="pc-result" aria-live="polite">
            <span className="eyebrow">
              {result
                ? result.status === 'witness'
                  ? 'COMPUTED RESULT'
                  : 'UNRESOLVED'
                : 'THE DECISIVE VISUAL'}
            </span>
            <h3>{result?.headline ?? c.visual}</h3>
            {result ? (
              <>
                <Evidence result={result} />
                {result.status === 'witness' &&
                  result.details.map((d) => <p key={d}>{d}</p>)}
              </>
            ) : (
              <p>
                Run this check to display its actual values and the distinction
                that matters.
              </p>
            )}
          </section>
          <details className="pc-expectation">
            <summary>Compare with the paper expectation</summary>
            <p>{c.expected}</p>
            <p>
              The calculation above does not receive this expected-answer text.
            </p>
          </details>
          <div className="pc-kill">
            <h3>What would change the conclusion?</h3>
            <p>{c.kill}</p>
          </div>
        </article>
      </div>
    </main>
  );
}
