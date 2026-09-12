'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createLearningLedger, freezeExperiment, importLearning, LEARNING_STORAGE_KEY, MAX_LEARNING_BYTES, predictMotion, proposeExperiment, recordOutcome, replayLearning, reuseModel, simulateNewtonian } from '@/lib/engine/learning-session';
import type { LearningLedger, MotionProbe, LearningState } from '@/lib/engine/learning-session';

const defaultProbe: MotionProbe = { mass: 2, force: 2, dt: 1, x: 0, v: 0 };
const labels = { exploring: 'Comparing explanations', pending: 'Candidate needs fresh checks', admitted: 'Model admitted for reuse', 'model-gap': 'The model family failed', revoked: 'Previous model withdrawn' };
const number = (n: number) => Number(n.toPrecision(6)).toString();
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
function PredictionFan({ state, probe }: { state: LearningState; probe: MotionProbe }) {
  const curves = state.candidates.map(m => Array.from({ length: 21 }, (_, i) => i === 0 ? probe.x : predictMotion(m, { ...probe, dt: probe.dt * i / 20 }).x));
  const all = curves.flat();
  const low = Math.min(probe.x - .1, ...all), high = Math.max(probe.x + .1, ...all);
  const x = (i: number) => 46 + i * 25.7, y = (v: number) => 210 - (v - low) / (high - low) * 180;
  return <figure className="lw-figure"><svg viewBox="0 0 600 260" role="img" aria-label={`${state.candidates.length} surviving motion explanations: predicted position over ${probe.dt} seconds.`}>
    <line x1="46" y1="30" x2="46" y2="210" stroke="#527583" /><line x1="46" y1="210" x2="560" y2="210" stroke="#527583" />
    <text x="46" y="18">Position</text><text x="560" y="246" textAnchor="end">Time (s)</text><text x="40" y="34" textAnchor="end">{number(high)}</text><text x="40" y="212" textAnchor="end">{number(low)}</text><text x="46" y="232">0</text><text x="560" y="232" textAnchor="end">{probe.dt}</text>
    {curves.map((curve, i) => <polyline key={state.candidates[i].id} points={curve.map((p, j) => `${x(j)},${y(p)}`).join(' ')} fill="none" stroke="#79e6d5" strokeWidth={curves.length === 1 ? 3 : 1} opacity={curves.length === 1 ? 1 : .22} />)}
    {!curves.length && <text x="300" y="115" textAnchor="middle">No surviving explanation</text>}
  </svg><figcaption>Each line is a surviving explanation. Overlapping lines can still hide different parameters; agreement is limited to this supplied model family.</figcaption></figure>;
}
export default function LearningWorkspace({ onBack }: { onBack: () => void }) {
  const [ledger, setLedger] = useState<LearningLedger>(createLearningLedger);
  const [loaded, setLoaded] = useState(false), [blockedStorage, setBlockedStorage] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [input, setInput] = useState<MotionProbe>(defaultProbe);
  const [outX, setOutX] = useState(''), [outV, setOutV] = useState(''), [source, setSource] = useState('');
  const stopped = useRef(false), mounted = useRef(true);
  const current = useRef(ledger);
  useEffect(() => {
    stopped.current = false;
    mounted.current = true;
    const restore = () => {
    if (!mounted.current) return;
    try {
      const text = localStorage.getItem(LEARNING_STORAGE_KEY);
      if (text) { const saved = importLearning(text); setLedger(saved); current.current = saved; setNotice('Saved evidence replayed. All model and validation states were rebuilt.'); }
    } catch (e) { setBlockedStorage(true); setError(`Saved data could not be loaded: ${e instanceof Error ? e.message : 'storage unavailable'}. Export the stored text before starting a new investigation.`); }
    setLoaded(true);
    };
    void Promise.resolve().then(restore);
    return () => { stopped.current = true; mounted.current = false; };
  }, []);
  const state = replayLearning(ledger), proposal = proposeExperiment(ledger);
  const shownProbe = state.pending?.probe ?? state.checks.at(-1)?.probe ?? proposal?.probe ?? defaultProbe;
  const controlsDisabled = !loaded || busy || blockedStorage;
  function save(next: LearningLedger) {
    replayLearning(next);
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(next));
    current.current = next; setLedger(next); setError('');
  }
  function act(work: () => void) {
    try { work(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'The operation failed.'); }
  }
  async function runCycle() {
    setBusy(true); stopped.current = false; setError('');
    try {
      let working = current.current;
      for (let i = 0; i < 12 && !stopped.current; i++) {
        let s = replayLearning(working);
        if (s.status === 'admitted' || !s.candidates.length) break;
        if (!s.pending) {
          const next = proposeExperiment(working);
          if (!next) break;
          working = freezeExperiment(working, next.probe); save(working);
        }
        await new Promise(resolve => setTimeout(resolve, 280));
        if (stopped.current) break;
        s = replayLearning(working);
        working = recordOutcome(working, simulateNewtonian(s.pending!.probe), 'supplied-newtonian-simulator-v1'); save(working);
        await new Promise(resolve => setTimeout(resolve, 160));
      }
      const final = replayLearning(current.current);
      if (!stopped.current) setNotice(final.status === 'admitted' ? 'One candidate passed four distinct checks made after identification. It is saved and ready for reuse.' : 'Cycle stopped. Inspect the remaining ambiguity, model gap, or pending prediction.');
    } catch (e) { if (!stopped.current) setError(e instanceof Error ? e.message : 'Cycle failed.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <main className="question-desk reasoning-workspace learning-workspace">
    <header className="qd-top"><button onClick={onBack} disabled={busy}>← Reasoning workspace</button><span>LEARNING LOOP / 01</span></header>
    <div className="lw-heading"><div><span className="eyebrow">REMEMBER · PREDICT · TEST · REVISE</span><h1>An explanation must survive<br /><em>its next measurement.</em></h1></div><p>Investigate how force changes motion.<br />The learner selects experiments and retains the evidence.</p></div>
    <div className="lw-layout">
      <section className="qd-panel lw-control"><h2>Run an investigation</h2><p>Start with 105 supplied motion equations. Let fresh simulated measurements eliminate the ones that fail.</p>
        <Button onClick={runCycle} disabled={controlsDisabled || !state.candidates.length || state.status === 'admitted'}>{busy ? 'Testing the next prediction…' : 'Run learning cycle'}</Button>
        {busy && <Button variant="outline" onClick={() => { stopped.current = true; }}>Stop after current step</Button>}
        <p className="rw-scope">This source simulates Newton’s motion equations. The result tests the learning process; it is not a physical discovery.</p>
        <h3>Next experiment</h3>
        {state.pending ? <><p className="lw-pending">Prediction #{state.pending.seq} is frozen and saved. Its outcome is still unknown.</p><p>Mass {state.pending.probe.mass}, force {state.pending.probe.force}, duration {state.pending.probe.dt}.</p><Button variant="outline" disabled={controlsDisabled} onClick={() => act(() => save(recordOutcome(ledger, simulateNewtonian(state.pending!.probe), 'supplied-newtonian-simulator-v1')))}>Measure in simulator</Button></> : proposal ? <><p>{proposal.reason}</p><p>Mass {proposal.probe.mass} · force {proposal.probe.force} · duration {proposal.probe.dt}</p><Button variant="outline" disabled={controlsDisabled} onClick={() => act(() => save(freezeExperiment(ledger, proposal.probe)))}>Freeze this prediction</Button></> : <p>{!state.candidates.length ? 'The evidence contradicts every supplied equation. Preserve this record and investigate a different model family.' : 'No remaining registered probe separates these candidates. Their parameters are still unresolved.'}</p>}
        <details><summary>Use your own measurement</summary><p>Each probe starts from the declared initial state. You supply the measured outcome and its source; the Observatory cannot authenticate it.</p>
          <div className="lw-fields">{(['mass', 'force', 'dt', 'x', 'v'] as const).map(key => <label key={key}>{({ mass: 'Mass', force: 'Force', dt: 'Duration', x: 'Initial position', v: 'Initial velocity' })[key]}<input type="number" step="any" value={input[key]} disabled={controlsDisabled || !!state.pending} onChange={e => setInput({ ...input, [key]: Number(e.target.value) })} /></label>)}</div>
          <Button variant="outline" disabled={controlsDisabled || !!state.pending || !state.candidates.length} onClick={() => act(() => save(freezeExperiment(ledger, input)))}>Freeze custom prediction</Button>
          {state.pending && <><label>Measured position<input type="number" step="any" value={outX} onChange={e => setOutX(e.target.value)} disabled={controlsDisabled} /></label><label>Measured velocity<input type="number" step="any" value={outV} onChange={e => setOutV(e.target.value)} disabled={controlsDisabled} /></label><label>Source / observation reference<input value={source} maxLength={160} onChange={e => setSource(e.target.value)} disabled={controlsDisabled} /></label><Button variant="outline" disabled={controlsDisabled || !outX.trim() || !outV.trim() || !source.trim()} onClick={() => act(() => { save(recordOutcome(ledger, { x: Number(outX), v: Number(outV) }, source)); setOutX(''); setOutV(''); })}>Record and score outcome</Button></>}
        </details>
      </section>
      <section className="qd-panel lw-state" aria-live="polite"><span className="eyebrow">{labels[state.status]}</span><div className="lw-metrics"><div><b>{state.candidates.length}</b><span>explanations left</span></div><div><b>{state.validationEvents.length}/4</b><span>fresh validation checks</span></div><div><b>{state.reuses}</b><span>saved model uses</span></div></div>
        <PredictionFan state={state} probe={shownProbe} />
        {state.candidates.length === 1 && <div className="rw-answer"><b>{state.status === 'admitted' ? 'Admitted equation' : 'Candidate equation'}</b><p>a = {state.candidates[0].k} × F × mass<sup>{state.candidates[0].e}</sup><br />Δx = vΔt + {state.candidates[0].q}aΔt²</p><small>Conditional on this model family, input domain, source, and numerical tolerance. Four checks are provisional evidence.</small></div>}
        {state.status === 'admitted' && <><h3>Use what it learned</h3><p>Predict for the custom input above without requesting another measurement or changing validation.</p><Button disabled={controlsDisabled || !!state.pending} onClick={() => act(() => { const next = reuseModel(ledger, input); save(next); const event = next.events.at(-1)!; if (event.kind === 'reuse') setNotice(`Saved-model prediction: position ${number(event.value.x)}, velocity ${number(event.value.v)}. No new observation was acquired.`); })}>Predict with saved model</Button></>}
        {notice && <p className="lw-notice" role="status">{notice}</p>}{error && <p className="qd-error" role="alert">{error}</p>}
        <p className="rw-memory">{ledger.events.length} events saved in this browser on this site address. Reloading replays the evidence. Export to keep a copy or transfer between local and live versions.</p>
        <div className="qd-actions"><Button variant="outline" disabled={!loaded || busy} onClick={() => download('observatory-learning-ledger.json', ledger)}>Export evidence</Button><label className="lw-import">Import evidence<input type="file" accept="application/json,.json" disabled={!loaded || busy} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > MAX_LEARNING_BYTES) { setError('Import limit is 4 MB.'); return; } try { const next = importLearning(await file.text()); save(next); setBlockedStorage(false); setNotice('Imported evidence replayed and checked.'); } catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); } }} /></label></div>
        {blockedStorage && <Button variant="outline" onClick={() => act(() => download('unreadable-learning-storage.json', { raw: localStorage.getItem(LEARNING_STORAGE_KEY) }))}>Export unreadable stored data</Button>}
        <details><summary>Start a separate investigation</summary><p>Export the current evidence first if you want to keep it. Starting again replaces this browser’s active record.</p><Button variant="outline" disabled={!loaded || busy} onClick={() => act(() => { save(createLearningLedger()); setBlockedStorage(false); setNotice('New investigation started.'); })}>Start fresh</Button></details>
      </section>
    </div>
    <section className="qd-panel lw-history"><h2>The evidence trail</h2><div className="lw-table-scroll"><table><thead><tr><th>Outcome</th><th>Candidate count</th><th>What changed</th><th>Source</th></tr></thead><tbody>{state.checks.map(c => <tr key={c.event}><td>#{c.event}</td><td>{c.before} → {c.remaining}</td><td>{c.validation ? 'Fresh validation passed' : labels[c.status]}</td><td>{c.source}</td></tr>)}</tbody></table></div>{!state.checks.length && <p>No outcomes yet. The first step freezes competing predictions.</p>}<p className="rw-memory">The candidate equations, probe catalogue and admission rules are supplied. This loop chooses among them; it does not invent new operators or rewrite its own tests. Source labels and the corruption checksum are not proof of authenticity.</p></section>
  </main>;
}
