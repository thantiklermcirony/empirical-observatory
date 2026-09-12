'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { reason } from '@/lib/engine/reasoning';
import type { Need, Notebook, ReasoningResult, Triple } from '@/lib/engine/reasoning';
import { REASONING_EXAMPLES } from '@/lib/engine/reasoning-examples';
import LearningWorkspace from './LearningWorkspace';

const statement = (t: Triple) => t.join(' · ');
const missingLeaves = (node: Need | null): Triple[] => node ? node.state === 'missing' ? [node.statement] : node.children.flatMap(missingLeaves) : [];
function Dependency({ node }: { node: Need }) {
  return <li className={`rw-need rw-${node.state}`}>
    <span><b>{node.state === 'option' ? `RULE ${node.rule}` : node.state === 'missing' ? 'NEEDED' : node.state.toUpperCase()}</b> {node.state === 'option' ? 'One possible route: all prerequisites below.' : statement(node.statement)}</span>
    {node.children.length > 0 && <ul>{node.children.map((child, i) => <Dependency key={i} node={child} />)}</ul>}
  </li>;
}
export default function ReasoningWorkspace({ onBack }: { onBack: () => void }) {
  const [learning, setLearning] = useState(false);
  const [prompt, setPrompt] = useState<string>(REASONING_EXAMPLES[0].prompt);
  const [memory, setMemory] = useState<Notebook>({ facts: [], rules: [] });
  const [result, setResult] = useState<ReasoningResult | null>(null);
  const [description, setDescription] = useState<string>(REASONING_EXAMPLES[0].description);
  const [error, setError] = useState('');
  const missing = [...new Map(missingLeaves(result?.needs ?? null).map(t => [statement(t), t])).values()];
  function run() {
    try {
      const next = reason({ prompt, notebook: memory });
      setResult(next);
      setMemory(next.notebook);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'The question could not run.'); }
  }
  function exportRun() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'observatory-reasoning-record.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  if (learning) return <LearningWorkspace onBack={() => setLearning(false)} />;
  return <main className="question-desk reasoning-workspace">
    <header className="qd-top"><button onClick={onBack}>← Observatory room</button><span>REASONING WORKSPACE / 01</span><button onClick={() => setLearning(true)}>Open the learning loop →</button></header>
    <div className="qd-heading"><div><span className="eyebrow">ONE WORKSPACE FOR QUESTIONS, MEMORY AND CHECKS</span><h1>Make every step<br /><em>answerable to its evidence.</em></h1></div><p>State what you know. Inspect what follows.<br />Use the next gap to ask a better question.</p></div>
    <nav className="qd-examples" aria-label="Start a fresh example"><span>START A FRESH EXAMPLE</span>{REASONING_EXAMPLES.map(example => <button key={example.name} onClick={() => { setPrompt(example.prompt); setDescription(example.description); setMemory({ facts: [], rules: [] }); setResult(null); setError(''); }}>{example.name}</button>)}</nav>
    <p className="rw-scope">{description}</p>
    <div className="rw-layout">
      <section className="qd-panel rw-console">
        <h2>Your question and premises</h2>
        <label htmlFor="reasoning-prompt">Write statements, a rule if needed, and one question.</label>
        <textarea id="reasoning-prompt" value={prompt} maxLength={8000} spellCheck={false} onChange={e => { setPrompt(e.target.value); setResult(null); setError(''); }} />
        <div className="qd-actions"><Button onClick={run} disabled={!prompt.trim()}>Run locally</Button><Button variant="outline" onClick={() => { setMemory({facts: [], rules: []}); setResult(null); setError(''); }}>Clear memory</Button></div>
        <p className="rw-memory">{memory.facts.length} stated facts · {memory.rules.length} rules retained in this open workspace. Leaving this workspace or reloading clears them; export a run to keep a copy.</p>
        <details><summary>Supported language and memory updates</summary><p>Simple sentences: “The ball is inside the box.” “The box is at the shelf.” “Where is the ball?” “The ball is red.” “What is the ball?”</p><p>For other relations, use one line per statement:</p><pre>{'Fact: object | relation | value\nRule: ?x | relation | ?y -> ?x | other relation | ?y\nAsk: object | relation | ?answer\nForget: object | relation | value'}</pre><p>Join rule premises with &amp;. Labels can be your own words. Variables start with ?. Unrecognised text stops the entire run. “At” does not imply a unique location; remove an old fact explicitly when updating it.</p></details>
        {error && <p role="alert" className="qd-error">{error}</p>}
        <p className="rw-scope">A small rule system, with no language model connected. Facts are your premises, not independently verified observations. It does not invent rules or train itself.</p>
      </section>
      <section className="qd-panel rw-findings" aria-live="polite" aria-label="Reasoning result">
        <h2>{result ? ({answered: 'Conditional answer', gap: 'Next information needed', budget: 'Work budget reached', 'interpretation-needed': 'Review the interpretation'}[result.status]) : 'The investigation'}</h2>
        {result ? <>
          <p>{result.reason}</p>
          {result.answers.map(answer => <div className="rw-answer" key={answer.id}>{statement(answer.statement)} <small>{answer.id}</small></div>)}
          {result.diagnostics.length > 0 && <ul>{result.diagnostics.map((d, i) => <li key={i}>{d}</li>)}</ul>}
          {missing.length > 0 && <><h3>Possible next inputs</h3><p>These are gaps in the stated rules. Supply evidence or revise a rule; do not assume the missing premise is true.</p><ul className="rw-missing-list">{missing.map(t => <li key={statement(t)}>{statement(t)}</li>)}</ul></>}
          {result.needs && <details><summary>Explore the dependency tree</summary><ul className="rw-tree"><Dependency node={result.needs} /></ul></details>}
          {result.proofs.length > 0 && <details open><summary>Inspect the derivation ({result.proofs.length} statements)</summary><ol className="rw-proofs">{result.proofs.map(p => <li key={p.id}><code>{p.id}</code> {statement(p.statement)}<small>{p.source === 'given' ? 'Stated premise' : `Rule ${p.rule}, using ${p.parents.join(', ')}`}</small></li>)}</ol></details>}
          <p className="rw-memory">{result.operations} matching operations · {result.rounds} rule passes. Derived answers are recalculated from the stated facts after every change.</p>
          <Button variant="outline" onClick={exportRun}>Export this run</Button>
        </> : <p>Run the question to see its answer, the exact facts and rules used, and any missing information. Change a premise and run it again.</p>}
      </section>
      <aside className="qd-panel rw-vocabulary"><h2>Nouns and relations</h2><p>The labels this run actually used. These are symbolic roles, not a claim to understand every English word.</p>{result ? <ul>{result.mapping.map(item => <li key={`${item.role}:${item.word}`}><b>{item.word}</b><small>{item.role === 'relation' ? 'relation / operation label' : item.role}</small></li>)}</ul> : <p>The map appears with your first run.</p>}</aside>
    </div>
  </main>;
}
