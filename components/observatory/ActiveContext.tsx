'use client';
/* oxlint-disable next/no-html-link-for-pages -- Preserve the verified production native navigation contract. */
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Orbit,
  Terminal,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Frame = {
  id: string;
  title: string;
  description: string;
  status: string;
  reusable: boolean;
  reasons: string[];
  receipt_hash: string | null;
  selected_checks: string[];
  estimated_cost: number;
  uncovered_claims: string[];
};
type Demo = { generated_at: string; frames: Frame[]; boundary: string };
type Result = {
  methods: Record<
    string,
    {
      correct_decisions: number;
      executed_checks: number;
      total_seconds: number;
      false_verified_claims: number;
    }
  >;
};
const source =
  'https://github.com/thantiklermcirony/empirical-observatory/tree/main/automation/active-context';

export default function ActiveContext({
  demo,
  result,
}: {
  demo: Demo;
  result: Result;
}) {
  const [index, setIndex] = useState(3);
  const frame = demo.frames[index];
  const decision = frame.reusable
    ? 'Earlier check still applies'
    : frame.id === 'failed'
      ? 'Latest check failed'
      : 'A check is required';
  return (
    <main className="recovery-page context-page">
      <header className="recovery-header">
        <a className="atlas-brand" href="/">
          <Orbit size={26} />
          <span>
            EMPIRICAL OBSERVATORY<strong>ACTIVE CONTEXT / 0.1</strong>
          </span>
        </a>
        <nav aria-label="Active Context">
          <a href="/projects">Current projects</a>
          <a href="/recovery">Recovery Lab</a>
          <a href={source}>
            Source <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <div className="context-intro">
        <div>
          <span className="recovery-kicker">A TOOL FOR CODING AGENTS</span>
          <h1>Resume with evidence.</h1>
          <p>
            See which earlier checks still apply after a project changes—and
            what needs checking next.
          </p>
        </div>
        <a className="context-download" href="/research/Active_Context_0.1.zip">
          <Download size={20} />
          <span>
            Try it locally<small>Python 3.12+ · no extra packages</small>
          </span>
        </a>
      </div>
      <section className="context-console" aria-labelledby="context-replay">
        <div className="context-console-top">
          <span>
            <Terminal size={18} /> RECORDED COMMAND REPLAY
          </span>
          <span>6 states · real local executions</span>
        </div>
        <div className="context-workspace">
          <div className="context-timeline">
            <h2 id="context-replay">
              The project changed.
              <br />
              Did the evidence?
            </h2>
            <p>Select a moment in this recorded example.</p>
            <div role="group" aria-label="Replay project changes">
              {demo.frames.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setIndex(i)}
                  aria-pressed={i === index}
                >
                  <span>0{i + 1}</span>
                  {step.title}
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </div>
          <div className="context-decision" aria-live="polite">
            <span className="recovery-kicker">
              {frame.id === 'failed'
                ? 'FAILED EVIDENCE PRESERVED'
                : 'APPLICABILITY CHECK'}
            </span>
            <h2>{decision}</h2>
            <p>{frame.description}</p>
            <div
              className="context-chain"
              aria-label="Declared evidence dependencies"
            >
              <div>
                <small>DECLARED INPUT</small>
                <strong>app.py</strong>
                <span>
                  {['changed', 'failed'].includes(frame.id)
                    ? 'Changed implementation'
                    : 'Sum implementation'}
                </span>
              </div>
              <ArrowRight aria-hidden="true" />
              <div>
                <small>EXECUTED CHECK</small>
                <strong>2 + 3 = 5</strong>
                <span>
                  {frame.id === 'failed'
                    ? 'Exit code 1'
                    : frame.reusable
                      ? 'Exit code 0'
                      : 'Needs a current result'}
                </span>
              </div>
              <ArrowRight aria-hidden="true" />
              <div
                className={
                  frame.reusable ? 'context-usable' : 'context-recheck'
                }
              >
                <small>CONTINUATION</small>
                <strong>{frame.reusable ? 'Reusable' : 'Recheck'}</strong>
                <span>Within declared inputs</span>
              </div>
            </div>
            <div className="context-instruction">
              <span>NEXT CHECK</span>
              <strong>
                {frame.selected_checks.length
                  ? frame.selected_checks.join(', ')
                  : 'None for this unchanged contract'}
              </strong>
              <p>
                {frame.reusable
                  ? 'This does not cover undeclared dependencies or guarantee overall correctness.'
                  : 'The plan proposes a command. It does not execute it or assume it will pass.'}
              </p>
            </div>
            <details>
              <summary>Inspect the agent’s evidence packet</summary>
              <pre>
                {JSON.stringify(
                  {
                    status: frame.status,
                    reusable: frame.reusable,
                    reasons: frame.reasons,
                    receipt_hash: frame.receipt_hash,
                    selected_checks: frame.selected_checks,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
            <div className="context-replay-controls">
              <Button
                onClick={() => setIndex((index + 1) % demo.frames.length)}
              >
                {index === demo.frames.length - 1 ? (
                  <RotateCcw />
                ) : (
                  <ArrowRight />
                )}
                {index === demo.frames.length - 1
                  ? 'Restart replay'
                  : 'Next state'}
              </Button>
              <span>Recorded replay; your computer is not being scanned.</span>
            </div>
          </div>
        </div>
      </section>
      <section className="context-use" aria-labelledby="context-use-title">
        <div>
          <span className="recovery-kicker">YOUR FIRST TEN MINUTES</span>
          <h2 id="context-use-title">Give your agent a better handoff.</h2>
          <p>
            Download the tool and run the disposable demo. Then declare one real
            project check, record its result, change an input and inspect what
            needs reassessment.
          </p>
          <pre>python demo.py --output demo-result.json</pre>
          <p>
            The CLI runs checks only when explicitly asked. The optional AI
            interface is read-only and has a documented protocol version.
          </p>
          <a href={`${source.replace('/tree/', '/blob/')}/README.md`}>
            Read the setup guide <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="context-proof">
          <span className="recovery-kicker">EVIDENCE BEFORE BIG CLAIMS</span>
          <h2>30 correct decisions. The strong baseline ties.</h2>
          <p>
            This is an engineering tool with declared dependencies. A smaller
            recheck list alone does not establish improved AI performance or
            lower total cost.
          </p>
          <div className="context-result-table">
            <table>
              <caption>
                30 constructed continuations · five real libraries
              </caption>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Correct /30</th>
                  <th>Checks</th>
                  <th>Total s</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['active_context', 'Active Context'],
                  ['content_dependency', 'Dependency tracking'],
                  ['rerun_all', 'Rerun all'],
                  ['fixed_freshness', 'Fixed freshness'],
                ].map(([key, label]) => (
                  <tr key={key}>
                    <th>{label}</th>
                    <td>{result.methods[key].correct_decisions}</td>
                    <td>{result.methods[key].executed_checks}</td>
                    <td>{result.methods[key].total_seconds.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Active Context and dependency tracking selected the same checks. Our
            20% advantage gate failed. Fixed freshness wrongly reused passing
            evidence in 10 cases. Check counts cover continuation only; times
            also include 95 shared initial/historical capture executions. One
            local run does not establish production speed.
          </p>
          <a href="/research/Active_Context_Results.md">
            Inspect the complete diagnostic results <ArrowRight size={16} />
          </a>
          <a href="/research/Active_Context_Protocol.md">
            Read the evaluation protocol <ArrowRight size={16} />
          </a>
          <a href="/research/Active_Context_Evidence.zip">
            Download all recorded decisions and checks <Download size={16} />
          </a>
          <details>
            <summary>What this version cannot observe</summary>
            <p>
              Undeclared inputs, external services and incomplete environment
              descriptions may escape detection. Before/after snapshots can miss
              a change followed by a revert. A local hash chain does not
              authenticate execution. Dependencies and check coverage must be
              declared; general state discovery remains research.
            </p>
          </details>
        </div>
      </section>
      <section className="context-participate">
        <Check size={22} />
        <div>
          <h2>Bring one difficult continuation.</h2>
          <p>
            A changed dependency, a stale passing result, or an expensive check
            your agent keeps repeating. A small reproducible example helps
            determine whether this tool earns its place.
          </p>
        </div>
        <a href="https://github.com/thantiklermcirony/empirical-observatory/issues/new?template=active-context.yml">
          Report a reproducible case <ArrowUpRight size={16} />
        </a>
      </section>
      <footer className="context-footer">
        <span>
          Local replay recorded {demo.generated_at.slice(0, 10)}. Constructed
          demonstration; no AI superiority claimed.
        </span>
        <a href="/research/Active_Context_Demo.json">
          Download replay evidence
        </a>
        <a href="https://github.com/thantiklermcirony/empirical-observatory/blob/main/research/Observatory_Core_Blueprint.md">
          The larger scientific programme
        </a>
      </footer>
    </main>
  );
}
