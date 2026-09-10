'use client';
/* oxlint-disable react/react-compiler -- Device-local persistence and simulation effects are imperative; React Compiler is not enabled. */
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Download,
  FlaskConical,
  Play,
  RotateCcw,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  actions,
  hypotheses,
  discoveryVersion,
  replay,
  informationGain,
  recommend,
  measure,
  hiddenState,
  conclusion,
  chooseAction,
  keyedUniform,
} from '@/lib/engine/discovery';
import { verifyNotebookEntry } from '@/lib/engine/discovery-record';
import type {
  Policy,
  Observation,
  NotebookEntry,
} from '@/lib/engine/discovery';
const names: Record<Policy, string> = {
  adaptive_eig: 'Adaptive tests',
  best_fixed: 'Best fixed plan',
  random_feasible: 'Random feasible tests',
  prior_only_planner: 'Unchanging planner',
};
const storageKey = 'observatory-discovery-notebook-v1';
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + '\n'], {
      type: 'application/json',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function DiscoveryLoop() {
  const [seed, setSeed] = useState(7),
    [policy, setPolicy] = useState<Policy>('adaptive_eig');
  const [history, setHistory] = useState<Observation[]>([]),
    [manual, setManual] = useState(false),
    [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState<number | null>(null),
    [notebook, setNotebook] = useState<NotebookEntry[]>([]),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState('');
  const generation = useRef(0);
  const state = replay(history),
    next = state.remaining ? recommend(state.belief, state.remaining) : null;
  const best = conclusion(state.belief);
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const raw = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
        if (Array.isArray(raw)) {
          const checked = await Promise.allSettled(
            raw.slice(0, 30).map(verifyNotebookEntry),
          );
          if (active) {
            setNotebook(
              checked.flatMap((r) =>
                r.status === 'fulfilled' ? [r.value] : [],
              ),
            );
            if (checked.some((r) => r.status === 'rejected'))
              setNotice(
                'Some local records did not match their simulation seed or rule and were excluded.',
              );
          }
        }
      } catch {
        if (active)
          setNotice(
            'Local notebook could not be read. You can still explore and download a record.',
          );
      }
      if (active) setReady(true);
    }
    void restore();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notebook));
    } catch {
      setNotice(
        'Local storage is unavailable. Download records you want to keep.',
      );
    }
  }, [notebook, ready]);
  function reset() {
    generation.current++;
    setSeed((s) => (s + 1) >>> 0);
    setHistory([]);
    setHidden(null);
    setBusy(false);
    setManual(false);
    setNotice('');
  }
  async function step(actionId?: string) {
    if (busy || !state.remaining) return;
    setBusy(true);
    const version = generation.current;
    try {
      const policyDraw = await keyedUniform(
        'adaptive-v1|' + seed + '|policy|' + policy + '|' + history.length,
      );
      const action = actionId
        ? actions.find((a) => a.id === actionId)
        : chooseAction(
            manual ? 'adaptive_eig' : policy,
            state.belief,
            state.remaining,
            policyDraw,
          );
      if (!action || action.cost > state.remaining)
        throw new Error('That test is outside the remaining budget.');
      const outcome = await measure(
        seed,
        action,
        history.filter((e) => e.action === action.id).length,
      );
      if (version !== generation.current) return;
      const events = [...history, { action: action.id, outcome }];
      setHistory(events);
      if (actionId) setManual(true);
      if (replay(events).remaining === 0) {
        const truth = await hiddenState(seed);
        if (version === generation.current) setHidden(truth);
      }
    } catch (error) {
      if (version === generation.current)
        setNotice(
          error instanceof Error
            ? error.message
            : 'The simulation could not finish.',
        );
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  function entry(): NotebookEntry {
    return {
      schema: 'observatory-discovery/1',
      source: 'synthetic',
      version: discoveryVersion,
      seed,
      policy: manual ? 'manual' : policy,
      history,
      createdAt: new Date().toISOString(),
    };
  }
  async function save() {
    const record = await verifyNotebookEntry(entry());
    setNotebook((rows) =>
      [
        record,
        ...rows.filter(
          (r) =>
            !(
              r.seed === record.seed &&
              JSON.stringify(r.history) === JSON.stringify(record.history)
            ),
        ),
      ].slice(0, 30),
    );
    setNotice(
      'Completed simulation saved in this browser. Shared scientific conclusions are unchanged.',
    );
  }
  return (
    <section id="discovery" className="discovery-loop">
      <div className="discovery-heading">
        <div>
          <span className="atlas-kicker">
            EXPLORATION ENGINE / KNOWN-MODEL SIMULATION
          </span>
          <h2>
            Let the answer choose
            <br />
            the next question.
          </h2>
        </div>
        <p>
          Four possible hidden states. Two units of measurement. Watch the first
          result change which test is useful next.
        </p>
      </div>
      <div className="discovery-station">
        <div className="discovery-beliefs">
          <span className="atlas-kicker">CURRENT EXPLANATIONS</span>
          <h3>Which state is it?</h3>
          <p>Probability within the supplied four-state model.</p>
          {hypotheses.map((h, i) => (
            <div className="discovery-belief" key={h}>
              <label>
                {h}
                <b>{(state.belief[i] * 100).toFixed(1)}%</b>
              </label>
              <div>
                <i
                  style={{
                    width: state.belief[i] * 100 + '%',
                    background: i < 2 ? '#a9a1ff' : '#79e9d4',
                  }}
                />
              </div>
            </div>
          ))}
          <p className="atlas-small">
            A and B are synthetic families; 0 and 1 are their hidden modes.
            These are not biological findings.
          </p>
        </div>
        <div className="discovery-controls">
          <div className="discovery-budget">
            <span>
              <FlaskConical size={17} /> Measurement budget
            </span>
            <strong>{state.remaining} / 2</strong>
          </div>
          <label htmlFor="discovery-policy">Exploration rule</label>
          <select
            id="discovery-policy"
            value={policy}
            disabled={history.length > 0 || busy}
            onChange={(e) => setPolicy(e.target.value as Policy)}
          >
            {Object.entries(names).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <p className="discovery-recommend">
            {state.remaining ? (
              <>
                <span>Adaptive recommendation</span>
                <strong>{next?.label}</strong>
                <small>
                  {next
                    ? (informationGain(state.belief, next) / next.cost).toFixed(
                        3,
                      )
                    : '0'}{' '}
                  expected information bits per cost unit
                </small>
              </>
            ) : (
              <>
                <span>Budget complete / model-based conclusion</span>
                <strong>{hypotheses[best]} is the leading explanation.</strong>
                <small>
                  {(state.belief[best] * 100).toFixed(1)}% within this model;
                  disagreement with reality would require a new investigation.
                </small>
              </>
            )}
          </p>
          <div className="discovery-actions">
            <Button
              className="discovery-run"
              onClick={() => void step()}
              disabled={busy || !state.remaining}
            >
              <Play size={16} />
              {busy
                ? 'Measuring…'
                : history.length
                  ? manual
                    ? 'Continue adaptively'
                    : 'Run next test'
                  : 'Begin exploration'}
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw size={15} /> New system
            </Button>
          </div>
          <details className="discovery-manual">
            <summary>Choose a test yourself</summary>
            <div>
              {actions.map((a) => (
                <Button
                  key={a.id}
                  variant="outline"
                  disabled={busy || a.cost > state.remaining}
                  onClick={() => void step(a.id)}
                >
                  {a.label}
                  <small>
                    {a.cost} unit{a.cost > 1 ? 's' : ''}
                  </small>
                </Button>
              ))}
            </div>
            <p>
              Manual choices mark the whole run as manual; automatic
              continuation follows the adaptive recommendation. Every test uses
              the same measurement model and budget.
            </p>
          </details>
          <p className="atlas-small">
            System seed {seed}. Observations update the probabilities and next
            test. The policy itself is fixed; it does not learn across runs.
          </p>
        </div>
        <div className="discovery-evidence" aria-live="polite">
          <span className="atlas-kicker">
            OBSERVATION → REVISION → CONCLUSION
          </span>
          <h3>The evidence trail</h3>
          {!history.length ? (
            <p className="discovery-empty">
              No measurement yet. All four explanations begin equally likely.
            </p>
          ) : (
            <ol>
              {history.map((e, i) => (
                <li key={i}>
                  <span>MEASUREMENT {i + 1}</span>
                  <strong>
                    {actions.find((a) => a.id === e.action)?.label}
                  </strong>
                  <p>
                    Observed channel {e.outcome}.{' '}
                    {e.action === 'gate'
                      ? 'This changes which family-specific challenge is most informative.'
                      : 'The belief update combines this result with the earlier evidence.'}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {hidden !== null && (
            <div
              className={
                'discovery-verdict ' + (best === hidden ? 'matched' : 'missed')
              }
            >
              <span>SIMULATOR REVEAL</span>
              <strong>Hidden state: {hypotheses[hidden]}</strong>
              <p>
                {best === hidden
                  ? 'The leading explanation matched this simulated system.'
                  : 'The leading explanation was wrong on this noisy run. The failed outcome remains part of the record.'}
              </p>
            </div>
          )}
          <div className="discovery-actions">
            <Button
              variant="outline"
              disabled={state.remaining > 0 || busy || !ready}
              onClick={() =>
                void save().catch(() =>
                  setNotice(
                    'This record could not be verified. Please start a new system.',
                  ),
                )
              }
            >
              <Save size={15} /> Save locally
            </Button>
            <Button
              variant="ghost"
              disabled={state.remaining > 0 || busy}
              onClick={() =>
                download(entry(), 'Observatory_Discovery_' + seed + '.json')
              }
            >
              <Download size={15} /> Record
            </Button>
          </div>
        </div>
      </div>
      {notice && (
        <p className="discovery-notice" role="status">
          {notice}
        </p>
      )}
      <div className="discovery-results">
        <div>
          <span className="atlas-kicker">WHOLE MODEL / EXACT ENUMERATION</span>
          <h3>Does adapting the test help?</h3>
          <p>
            Across every possible outcome in this constructed world, adaptive
            tests identify the state 81% of the time. The strongest fixed plan
            reaches 70%. Both spend exactly two units. This demonstrates a
            working adaptive loop under stated assumptions.
          </p>
          <Link href="/research/observatory-evolution/README.md">
            Inspect protocol, baselines and checks <ArrowUpRight size={15} />
          </Link>
        </div>
        <table>
          <caption>Exact expected decision accuracy</caption>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Correct</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Adaptive tests</td>
              <td>81.0%</td>
              <td>2</td>
            </tr>
            <tr>
              <td>Best fixed plan</td>
              <td>70.0%</td>
              <td>2</td>
            </tr>
            <tr>
              <td>Random feasible</td>
              <td>58.6%</td>
              <td>2</td>
            </tr>
            <tr>
              <td>Unchanging planner</td>
              <td>45.0%</td>
              <td>2</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="discovery-warning">
        <strong>More information is not always a better decision.</strong>
        <p>
          A separate one-step counterexample gives the information-seeking test
          50% decision accuracy and the alternative 60%. Choose the objective
          explicitly: uncertainty reduction and decision quality can favor
          different experiments.
        </p>
      </div>
      <details className="discovery-notebook">
        <summary>Local notebook · {notebook.length} completed runs</summary>
        <p>
          Stored only in this browser. Seed outcomes and declared policy paths
          are checked when loaded. These are replayable, unsigned simulation
          records. Saving them does not change the public evidence atlas.
        </p>
        {notebook.length > 0 ? (
          <>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  { schema: 'observatory-notebook/1', records: notebook },
                  'Observatory_Notebook.json',
                )
              }
            >
              <Download size={15} /> Export notebook
            </Button>
            <ul>
              {notebook.map((r, i) => {
                const b = replay(r.history).belief;
                return (
                  <li key={r.createdAt + i}>
                    Seed {r.seed} ·{' '}
                    {r.policy === 'manual' ? 'Manual' : names[r.policy]} ·
                    leading explanation {hypotheses[conclusion(b)]} ·{' '}
                    {r.history.length} measurements
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p>No completed runs saved yet.</p>
        )}
      </details>
    </section>
  );
}
