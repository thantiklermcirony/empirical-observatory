'use client';
/* oxlint-disable next/no-html-link-for-pages -- Evidence references preserve native document navigation. */
import type { ResearchContent } from '@/lib/research-contract';
import { RESEARCH_BRANCHES } from '@/lib/research-knowledge';
import InquiryVisual from './InquiryVisual';

export default function ResearchAnswerView({ research }: { research: ResearchContent }) {
  const { answer, plan, cases, sources } = research;
  function showEvidence(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const element = document.getElementById(`evidence-${id}`);
    if (!element) return;
    event.preventDefault(); // Preserve the private record's access fragment.
    for (let parent = element.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
    element.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  return <section className="research-answer" aria-label="Evidence-led answer">
    <div className="research-mode"><span>{research.mode === 'ai_synthesis' ? 'AI EXPLANATION · LABORATORY EVIDENCE' : 'SOURCE-GUIDED EXPLANATION'}</span><p>{research.connectionMessage}</p>{research.aiCalls > 0 && <small>{research.aiCalls} shared AI calls · {research.model}</small>}</div>
    <p className="research-lead">{answer.answer}</p>
    <div className="research-sections">{answer.sections.map((section, i) => <section key={i}><h3>{section.heading}</h3><p>{section.body}</p><div className="research-references">{section.evidenceIds.map(id => <a key={id} href={`#evidence-${id}`} onClick={event => showEvidence(event, id)}>{id} · {sources.find(s => s.id === id)?.title ?? cases.find(c => c.id === id)?.label ?? 'Evidence'}</a>)}</div></section>)}</div>
    <details className="research-plan"><summary>How the laboratories divided the question</summary><p>{plan.interpretation}</p><div>{plan.tasks.map(task => <section key={task.branch}><span className="cd-label">{RESEARCH_BRANCHES.find(b => b.id === task.branch)?.title}</span><h4>{task.question}</h4><p>{task.approach}</p>{task.missing.length > 0 && <ul>{task.missing.map((gap, i) => <li key={i}>{gap}</li>)}</ul>}</section>)}</div></details>
    {cases.length > 0 && <section className="research-calculations"><span className="cd-label">CALCULATED EVIDENCE</span><h3>Read the results, then inspect their limits.</h3>{cases.map(c => <section id={`evidence-${c.id}`} key={c.id} className="research-case"><div className="research-case-label"><strong>{c.id} · {c.label}</strong><span>{c.illustrative ? 'Declared model demonstration' : 'AI-proposed model · assumptions unverified'}</span></div><p>{c.purpose}</p><h4>{c.printout.summary}</h4><InquiryVisual report={c.printout} /><details><summary>Exact question, returned values and receipt</summary><p>{c.printout.prompt}</p>{c.printout.branches.filter(b => b.state !== 'not_selected').map(b => <section key={b.id}><h4>{b.title} · {b.state.replaceAll('_', ' ')}</h4><p>{b.summary}</p><pre>{JSON.stringify(b.results, null, 2)}</pre></section>)}<p>Receipt: <code>{c.printout.receiptSha256}</code></p></details></section>)}</section>}
    <section className="research-next"><div><span className="cd-label">WHAT IS STILL MISSING</span><h3>The evidence that would change the answer</h3>{answer.missingEvidence.length ? <ul>{answer.missingEvidence.map((gap, i) => <li key={i}>{gap}</li>)}</ul> : <p>No additional input is needed for this scoped answer. Its stated assumptions still apply.</p>}</div><div><span className="cd-label">NEXT INVESTIGATION</span><ol>{answer.nextSteps.map((step, i) => <li key={i}>{step}</li>)}</ol></div></section>
    <details className="research-source-list"><summary>Source briefs and their evidence classes</summary>{sources.map(source => <section key={source.id} id={`evidence-${source.id}`}><h4><a href={source.href}>{source.id} · {source.title} ↗</a></h4><small>{source.evidence}</small><p>{source.finding}</p></section>)}</details>
  </section>;
}
