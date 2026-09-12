'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native links preserve reliable route navigation in this deployment. */
import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRight,
  Play,
  Download,
  ScanLine,
  Network,
  Terminal,
  RotateCcw,
  CircleHelp,
  Check,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MODELS,
  beginInvestigation,
  stepInvestigation,
} from '@/lib/engine/question';
import type { Frame, Investigation, ModelId } from '@/lib/engine/question';
import { atlasNodes } from '@/lib/atlas';
import QuestionRoom from './QuestionRoom';
import QuestionMedia from './QuestionMedia';
import ArchiveRadio from './ArchiveRadio';
import PaperChallenges from './PaperChallenges';
import ReasoningWorkspace from './ReasoningWorkspace';
import { frameScale } from '@/lib/engine/question-media';
import type { Request } from '@/lib/engine/question';

const colors = [
  '#f5bd77',
  '#79e6d5',
  '#b4a5fa',
  '#8bc5ff',
  '#ef8db8',
  '#bac87d',
];
function Plot({ frame }: { frame: Frame }) {
  const {
    max: ymax,
    min: ymin,
    maxx: xmax,
    bars: isBar,
    scatter,
  } = frameScale(frame);
  const px = (x: number) => 46 + (360 * x) / xmax;
  const py = (y: number) => 204 - (164 * (y - ymin)) / (ymax - ymin);
  return (
    <figure className="qd-plot">
      <h3>{frame.title}</h3>
      <svg
        viewBox="0 0 440 244"
        role="img"
        aria-label={`${frame.title}. ${frame.yLabel} against ${frame.xLabel}. Exact values are available in the calculation details.`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="46"
              x2="410"
              y1={204 - t * 164}
              y2={204 - t * 164}
              stroke="#29434d"
              strokeDasharray="3 5"
            />
            <text
              x="38"
              y={208 - t * 164}
              textAnchor="end"
              fill="#a0b2bd"
              fontSize="12"
            >
              {Number((ymin + t * (ymax - ymin)).toPrecision(2))}
            </text>
          </g>
        ))}
        {frame.series.map((s, i) =>
          isBar ? (
            <g key={s.label}>
              <rect
                x={55 + (i * 350) / frame.series.length}
                y={py(s.points[0].y)}
                width={Math.min(50, 260 / frame.series.length)}
                height={Math.max(1, py(0) - py(s.points[0].y))}
                rx="2"
                fill={colors[i % 6]}
              />
              <text
                x={55 + (i * 350) / frame.series.length}
                y="225"
                fill={colors[i % 6]}
                fontSize="12"
              >
                {i + 1}
              </text>
            </g>
          ) : scatter ? (
            <g key={s.label}>
              {s.points.map((p, j) => (
                <circle
                  key={j}
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r="6"
                  fill={colors[i % 6]}
                >
                  <title>
                    {s.label}: effort {p.x.toPrecision(5)}, error{' '}
                    {p.y.toPrecision(5)}
                  </title>
                </circle>
              ))}
            </g>
          ) : (
            <path
              key={s.label}
              d={s.points
                .map((p, j) => `${j ? 'L' : 'M'}${px(p.x)},${py(p.y)}`)
                .join(' ')}
              stroke={colors[i % 6]}
              strokeWidth="2.4"
              fill="none"
            />
          ),
        )}
        {frame.threshold !== undefined && (
          <g>
            <line
              x1="46"
              x2="410"
              y1={py(frame.threshold)}
              y2={py(frame.threshold)}
              stroke="#ef8db8"
              strokeDasharray="7 4"
            />
            <text
              x="400"
              y={py(frame.threshold) - 8}
              textAnchor="end"
              fontSize="12"
              fill="#ef8db8"
            >
              Error &lt; {frame.threshold}
            </text>
          </g>
        )}
        {!isBar &&
          [0, 0.5, 1].map((t) => (
            <text
              key={t}
              x={px(t * xmax)}
              y="225"
              textAnchor="middle"
              fill="#a0b2bd"
              fontSize="12"
            >
              {Number((t * xmax).toPrecision(3))}
            </text>
          ))}
      </svg>
      <div className="qd-axis">
        {frame.yLabel}
        <span>{isBar ? 'Candidate / schedule' : frame.xLabel}</span>
      </div>
      <div className="qd-legend">
        {frame.series.map((s, i) => (
          <span key={s.label}>
            <i style={{ background: colors[i % 6] }} />
            {isBar ? `${i + 1}. ` : ''}
            {s.label}
          </span>
        ))}
      </div>
      <figcaption>{frame.explanation}</figcaption>
    </figure>
  );
}
const initial = MODELS[0];
export default function QuestionDesk() {
  const [room, setRoom] = useState(true);
  const [workspace, setWorkspace] = useState(false);
  const [bench, setBench] = useState(false);
  const [objective, setObjective] = useState<'tracking' | 'effort'>('tracking');
  const [prompt, setPrompt] = useState(initial.question);
  const [model, setModel] = useState<ModelId>('uhl');
  const [parameter, setParameter] = useState(initial.parameter.value);
  const [confirmed, setConfirmed] = useState(false);
  const [run, setRun] = useState<Investigation | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState(6);
  const abort = useRef<AbortController | null>(null);
  const m = MODELS.find((x) => x.id === model)!;
  const preview = prompt.trim()
    ? beginInvestigation({
        prompt,
        model,
        parameter,
        objective,
        confirmed: false,
      })
    : null;
  const pass = run?.passes[selected];
  function invalidate() {
    setRun(null);
    setConfirmed(false);
    setError('');
    setSelected(0);
  }
  function choose(id: ModelId, example = false) {
    const next = MODELS.find((x) => x.id === id)!;
    setModel(id);
    setObjective('tracking');
    setParameter(next.parameter.value);
    if (example) setPrompt(next.question);
    invalidate();
  }
  function nextCheck() {
    try {
      const start =
        run && ['ready', 'running'].includes(run.status)
          ? run
          : beginInvestigation({
              prompt,
              model,
              parameter,
              confirmed,
              maxPasses: budget,
              objective,
            });
      const next = stepInvestigation(start);
      setRun(next);
      setSelected(Math.max(0, next.passes.length - 1));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The calculation failed.');
    }
  }
  async function runAll() {
    setBusy(true);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          parameter,
          confirmed,
          maxPasses: budget,
          objective,
        }),
        signal: controller.signal,
      });
      const result = (await response.json()) as Investigation & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'The investigation could not run.');
      setRun(result as Investigation);
      setSelected(Math.max(0, result.passes.length - 1));
    } catch (e) {
      setError(
        controller.signal.aborted
          ? 'Request cancelled. No result was accepted.'
          : e instanceof Error
            ? e.message
            : 'The server could not be reached. You can still run the next check locally.',
      );
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  function download() {
    if (!run) return;
    const blob = new Blob([JSON.stringify(run, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'observatory-question-record.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  const status = busy
    ? 'Computing'
    : run
      ? {
          ready: 'Ready',
          running: 'Next question ready',
          conclusion: 'Conditional conclusion',
          gap: 'Evidence gap',
          budget: 'Budget reached',
        }[run.status]
      : 'Review the interpretation';
  const suggested = prompt.trim()
    ? beginInvestigation({ prompt }).candidates
    : [];
  async function runFromRoom(request: Request) {
    setBusy(true);
    try {
      const response = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(20000),
      });
      const result = (await response.json()) as Investigation & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'The investigation could not run.');
      setObjective(request.objective ?? 'tracking');
      setPrompt(request.prompt);
      setModel(request.model!);
      setParameter(request.parameter!);
      setConfirmed(true);
      setRun(result);
      setSelected(Math.max(0, result.passes.length - 1));
      return result as Investigation;
    } finally {
      setBusy(false);
    }
  }
  if (workspace) return <ReasoningWorkspace onBack={() => setWorkspace(false)} />;
  if (bench) return <PaperChallenges onBack={() => setBench(false)} />;
  if (room)
    return (
      <>
        <QuestionRoom
          onRun={runFromRoom}
          onExit={() => setRoom(false)}
          onChallenges={() => setBench(true)}
          onWorkspace={() => setWorkspace(true)}
        />
        <ArchiveRadio />
      </>
    );
  return (
    <>
      <main className="question-desk">
        <header className="qd-top">
          <button disabled={busy} onClick={() => setRoom(true)}>
            <ArrowLeft size={18} /> Observatory room
          </button>
          <span>
            <ScanLine size={18} /> QUESTION DESK <b>01</b>
          </span>
          <a href="/atlas">
            Programme atlas <ArrowUpRight size={17} />
          </a>
        </header>
        <div className="qd-heading">
          <div>
            <span className="eyebrow">THE INVESTIGATION CONTROL ROOM</span>
            <h1>
              Change the question.
              <br />
              <em>See what becomes answerable.</em>
            </h1>
          </div>
          <p>
            A question → a model → a check → a better question.
            <br />
            Follow the calculation all the way to its limit.
          </p>
        </div>
        <nav className="qd-examples" aria-label="Worked questions">
          <button onClick={() => setWorkspace(true)} disabled={busy}>Reasoning workspace →</button>
          <button onClick={() => setBench(true)} disabled={busy}>
            Paper challenge bench →
          </button>
          <span>START WITH</span>
          {MODELS.map((x) => (
            <button
              key={x.id}
              disabled={busy}
              aria-pressed={model === x.id}
              onClick={() => choose(x.id, true)}
            >
              {x.name.split(' · ')[0]}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </nav>
        <div className="qd-workspace">
          <section className="qd-panel qd-visual" aria-label="Question visuals">
            <div className="qd-panel-title">
              <Network size={16} />
              <span>01 / PERSPECTIVE</span>
              <span className="qd-live-dot" />
            </div>
            {pass ? (
              <>
                <div className="qd-view-picker">
                  <button
                    aria-pressed={selected === 0}
                    onClick={() => setSelected(0)}
                  >
                    Original view
                  </button>
                  <button
                    disabled={!run || run.passes.length < 2}
                    aria-pressed={selected > 0}
                    onClick={() => setSelected(run!.passes.length - 1)}
                  >
                    Reframed view
                  </button>
                </div>
                <Plot frame={pass.frame} />
                <QuestionMedia run={run!} index={selected} />
              </>
            ) : (
              <div className="qd-map-empty">
                <div className="qd-orbits" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <b>
                    {m.id === 'uhl'
                      ? 'Φ'
                      : m.id === 'quantum'
                        ? 'Ψ'
                        : m.id === 'tao'
                          ? 'x'
                          : 'τ'}
                  </b>
                </div>
                <h2>{m.family}</h2>
                <p>{m.why}</p>
                <code>{m.equation}</code>
                <span className="qd-caption">
                  The plot appears when you run a check.
                </span>
              </div>
            )}
            <div className="qd-perspective-copy">
              <span className="eyebrow">THE CHANGE IN PERSPECTIVE</span>
              <p>
                {m.id === 'uhl'
                  ? 'From “the response is running out” to “which coordinate makes composition clear?”'
                  : m.id === 'tao'
                    ? 'From “our controller should win” to “which controller works under this disturbance and cost?”'
                    : m.id === 'quantum'
                      ? 'From “what is the state?” to “what measurement would distinguish the states still possible?”'
                      : 'From “how much exposure?” to “what remains, after this history and time to repair?”'}
              </p>
            </div>
            <a className="qd-room-link" href={m.href}>
              Continue in the related laboratory <ArrowUpRight size={18} />
            </a>
          </section>
          <section
            className="qd-panel qd-console"
            aria-label="Investigation console"
          >
            <div className="qd-panel-title">
              <Terminal size={16} />
              <span>02 / ASK THE OBSERVATORY</span>
              <span className="qd-small-tag">RULE-BASED RUNNER</span>
            </div>
            <label className="qd-input-label" htmlFor="question-prompt">
              Your question
            </label>
            <textarea
              id="question-prompt"
              value={prompt}
              maxLength={2000}
              disabled={busy}
              onChange={(e) => {
                setPrompt(e.target.value);
                invalidate();
              }}
              placeholder="What do you want to understand?"
            />
            <p className="qd-input-help">
              Use your own words. Review the proposed mathematical meaning on
              the right before calculating. Numbers in your text are not
              imported automatically.
            </p>
            <fieldset disabled={busy} className="qd-model-picker">
              <legend>Choose the interpretation to test</legend>
              {MODELS.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  aria-pressed={model === x.id}
                  onClick={() => choose(x.id)}
                >
                  <span>{x.name}</span>
                  {suggested.includes(x.id) && <small>vocabulary match</small>}
                </button>
              ))}
            </fieldset>
            {model === 'tao' && (
              <label className="qd-input-label">
                What should win?
                <select
                  aria-label="Controller comparison objective"
                  value={objective}
                  disabled={busy}
                  onChange={(e) => {
                    setObjective(e.target.value as 'tracking' | 'effort');
                    invalidate();
                  }}
                >
                  <option value="tracking">Lowest tracking error</option>
                  <option value="effort">
                    Least effort with error below 0.05
                  </option>
                </select>
              </label>
            )}
            <div className="qd-contract">
              <strong>THE QUESTION THIS RUN WILL COMPUTE</strong>
              <p>{preview?.effectiveQuestion}</p>
              <small>{preview?.originalQuestionGap}</small>
            </div>
            <div className="qd-parameter">
              <label id="qd-parameter-label">
                {m.parameter.label}
                <strong>
                  {parameter} <small>{m.parameter.unit}</small>
                </strong>
              </label>
              <Slider
                aria-labelledby="qd-parameter-label"
                disabled={busy}
                value={[parameter]}
                min={m.parameter.min}
                max={m.parameter.max}
                step={m.parameter.step}
                onValueChange={(v) => {
                  setParameter(Array.isArray(v) ? v[0] : v);
                  invalidate();
                }}
              />
              <p>
                Editable example value. This is not an estimate extracted from
                your question.
              </p>
            </div>
            <label className="qd-confirm" htmlFor="qd-confirm">
              <Checkbox
                id="qd-confirm"
                checked={confirmed}
                disabled={busy}
                onCheckedChange={(v) => setConfirmed(Boolean(v))}
              />
              <span>
                I want to test this interpretation under the displayed
                assumptions.
              </span>
            </label>
            <div className="qd-actions">
              <Button
                size="lg"
                disabled={busy || !confirmed || !prompt.trim()}
                onClick={runAll}
              >
                <Play /> Run investigation
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={
                  busy ||
                  !confirmed ||
                  !prompt.trim() ||
                  Boolean(run && !['ready', 'running'].includes(run.status))
                }
                onClick={nextCheck}
              >
                Run next check <ArrowRight />
              </Button>
              {busy && (
                <Button
                  variant="outline"
                  onClick={() => abort.current?.abort()}
                >
                  <Square />
                  Cancel
                </Button>
              )}
            </div>
            <div className="qd-budget">
              <label htmlFor="qd-budget">Maximum passes</label>
              <input
                id="qd-budget"
                type="number"
                min="1"
                max="6"
                value={budget}
                disabled={busy}
                onChange={(e) => {
                  setBudget(
                    Math.min(6, Math.max(1, Number(e.target.value) || 1)),
                  );
                  setRun(null);
                }}
              />
              <span>Stops at a result, missing information or this limit.</span>
            </div>
            {error && (
              <p className="qd-error" role="alert">
                {error}
              </p>
            )}
            <div className="qd-result" aria-live="polite">
              <span className="qd-status">
                <i />
                {status}
              </span>
              {run ? (
                <>
                  <h2>{pass?.answer ?? run.reason}</h2>
                  <p>{run.reason}</p>
                  <p>
                    <strong>Original wording: not established.</strong>{' '}
                    {run.originalQuestionGap}
                  </p>
                </>
              ) : (
                <p>
                  The core preserves the question and every result. It proposes
                  only follow-up checks this model can actually execute.
                </p>
              )}
            </div>
            {run && run.passes.length > 0 && (
              <>
                <ol className="qd-trace" aria-label="Investigation passes">
                  {run.passes.map((p, i) => (
                    <li key={i}>
                      <button
                        aria-current={i === selected ? 'step' : undefined}
                        onClick={() => setSelected(i)}
                      >
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{p.question}</strong>
                          <small>{p.operation}</small>
                        </div>
                        {i === selected ? (
                          <ScanLine size={17} />
                        ) : (
                          <Check size={17} />
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
                {pass && (
                  <details className="qd-details">
                    <summary>Inspect this calculation</summary>
                    <p>{pass.evidence}</p>
                    <dl>
                      {Object.entries(pass.values).map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>
                            {typeof value === 'number'
                              ? Number(value.toPrecision(8))
                              : value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p>
                      <strong>Next question:</strong>{' '}
                      {pass.next ??
                        'No further executable question in this contract. See the conclusion or gap above.'}
                    </p>
                  </details>
                )}
                <div className="qd-export">
                  <Button variant="outline" onClick={download}>
                    <Download /> Export the evidence
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setRun(null);
                      setSelected(0);
                    }}
                  >
                    <RotateCcw /> Reset run
                  </Button>
                </div>
              </>
            )}
          </section>
          <aside
            className="qd-panel qd-translation"
            aria-label="Question translation"
          >
            <div className="qd-panel-title">
              <CircleHelp size={16} />
              <span>03 / WHAT YOUR WORDS MEAN</span>
            </div>
            <blockquote>
              {prompt || 'Your original question stays here.'}
            </blockquote>
            <div className="qd-mappings">
              {preview?.mapping.map((term, i) => (
                <article key={i}>
                  <span className={`qd-term-kind ${term.role}`}>
                    {term.role === 'entity'
                      ? 'NOUN / ENTITY'
                      : 'VERB / OPERATION'}
                  </span>
                  <strong>{term.words}</strong>
                  <ArrowRight size={15} />
                  <code>{term.symbol}</code>
                  <p>{term.meaning}</p>
                </article>
              ))}
            </div>
            <p className="qd-caption">
              Vocabulary matches suggest a role; they are not a full language
              parser or a proof that the model applies. Change the
              interpretation in the centre to correct the mapping.
            </p>
            <section className="qd-contract">
              <span className="eyebrow">WHY THIS MATHEMATICS?</span>
              <h3>{m.family}</h3>
              <p>{m.why}</p>
              <code>{m.equation}</code>
              <h3>What must be true?</h3>
              <ol>
                {m.premises.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
              <h3>Where the answer ends</h3>
              <p>{m.limit}</p>
            </section>
          </aside>
        </div>
        <section className="qd-network">
          <div>
            <span className="eyebrow">ONE DESK / THE WHOLE PROGRAMME</span>
            <h2>The model determines the instrument.</h2>
            <p>
              Four models run here now. The other rooms supply records,
              specialist tools or research questions; their links do not imply a
              universal solver.
            </p>
          </div>
          <div className="qd-network-grid">
            {atlasNodes
              .filter((n) => n.id !== 'centre')
              .map((n) => (
                <a key={n.id} href={n.source}>
                  <span>
                    {n.title}
                    <ArrowUpRight size={16} />
                  </span>
                  <small>
                    {['uhl', 'tao', 'quantum'].includes(n.id)
                      ? 'Related executable model'
                      : 'Records / specialist handoff'}
                  </small>
                </a>
              ))}
          </div>
        </section>
        <details className="qd-agent">
          <summary>
            <Terminal size={18} /> Connect another agent to the desk
          </summary>
          <p>
            The same bounded runner is available through{' '}
            <a href="/api/question">the Question API</a>. An external agent can
            propose a structured question, select a declared model and receive
            the full calculation trace. No language model, API key or unattended
            background agent is connected to this page.
          </p>
          <pre>
            {JSON.stringify(
              {
                prompt: initial.question,
                model: 'uhl',
                parameter: 0.25,
                confirmed: true,
                maxPasses: 6,
              },
              null,
              2,
            )}
          </pre>
          <p>
            POST this JSON to <code>/api/question</code>. A new call is a new
            investigation, with an explicit budget. External agents must
            preserve the model assumptions and treat the returned conclusion as
            conditional.
          </p>
          <a href="/research/Question_Desk.md">
            Read the runner contract and extension guide{' '}
            <ArrowUpRight size={16} />
          </a>
        </details>
      </main>
      <ArchiveRadio />
    </>
  );
}
