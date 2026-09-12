'use client';
/* oxlint-disable next/no-img-element -- Full-room generated artwork is a local static asset with a fixed responsive frame. */
/* oxlint-disable next/no-html-link-for-pages -- Native links match the Observatory routing contract. */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Monitor, Printer, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MODELS, beginInvestigation } from '@/lib/engine/question';
import type { Investigation, ModelId, Request } from '@/lib/engine/question';

export default function QuestionRoom({
  onRun,
  onExit,
  onChallenges,
  onWorkspace,
}: {
  onRun: (r: Request) => Promise<Investigation>;
  onExit: () => void;
  onChallenges: () => void;
  onWorkspace: () => void;
}) {
  const [stage, setStage] = useState<
    'room' | 'walking' | 'terminal' | 'working' | 'printed'
  >('room');
  const [prompt, setPrompt] = useState(MODELS[0].question);
  const [model, setModel] = useState<ModelId>('uhl');
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<Investigation | null>(null);
  const [error, setError] = useState('');
  const [reduce, setReduce] = useState(false);
  const entryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const m = MODELS.find((x) => x.id === model)!;
  useEffect(
    () => () => {
      if (entryTimer.current) clearTimeout(entryTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (stage === 'terminal') input.current?.focus();
  }, [stage]);
  function enter() {
    if (
      reduce ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setStage('terminal');
      return;
    }
    setStage('walking');
    entryTimer.current = setTimeout(() => setStage('terminal'), 1100);
  }
  async function submit() {
    setError('');
    setStage('working');
    try {
      const result = await onRun({
        prompt,
        model,
        parameter: m.parameter.value,
        confirmed,
        maxPasses: 6,
      });
      setReceipt(result);
      setStage('printed');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not run the investigation.',
      );
      setStage('terminal');
    }
  }
  function updatePrompt(value: string) {
    setPrompt(value);
    setConfirmed(false);
    if (value.trim()) {
      const choice = beginInvestigation({ prompt: value }).model;
      if (choice) setModel(choice);
    }
  }
  return (
    <main
      className={`observatory-room room-${stage} ${reduce ? 'room-reduced' : ''}`}
    >
      <div className="room-scene">
        <img
          src="/images/observatory-1980s.png"
          alt="A 1980s astronomical observatory, with an old wooden desk, amber CRT computer, dot-matrix printer, scientific instruments and an E.T. poster."
        />
        <div className="room-shade" />
      </div>
      <header className="room-header">
        <a href="/#deck">
          <ArrowLeft size={16} /> The Observatory
        </a>
        <span>FIELD STATION / 1986</span>
        <button disabled={stage === 'working'} onClick={onExit}>
          Skip to the desk <ArrowRight size={16} />
        </button>
      </header>
      {(stage === 'room' || stage === 'walking') && (
        <div className="room-invitation">
          <span>THE EMPIRICAL OBSERVATORY</span>
          <h1>
            There is a question
            <br />
            on your mind.
          </h1>
          <p>Pull up a chair. Let’s see what it becomes.</p>
          <Button onClick={onWorkspace}>Open the reasoning workspace <ArrowRight size={18} /></Button>
          <button className="room-challenges" onClick={onChallenges}>
            Test the programme’s papers →
          </button>
          <Button disabled={stage === 'walking'} onClick={enter}>
            <Monitor size={18} />
            {stage === 'walking' ? 'Taking a seat…' : 'Explore four numerical models'}
            <ArrowRight size={18} />
          </Button>
        </div>
      )}
      {stage === 'terminal' && (
        <section className="room-terminal" aria-label="1980s question terminal">
          <div className="terminal-bezel">
            <div className="terminal-screen">
              <div className="terminal-boot">
                <span>OBSERVATORY / QUESTION SYSTEM</span>
                <span>READY.</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (confirmed) void submit();
                }}
              >
                <label htmlFor="room-prompt">
                  &gt; WHAT WOULD YOU LIKE TO UNDERSTAND?
                </label>
                <textarea
                  ref={input}
                  id="room-prompt"
                  value={prompt}
                  onChange={(e) => updatePrompt(e.target.value)}
                  maxLength={2000}
                />
                <div className="terminal-models">
                  {MODELS.map((x) => (
                    <button
                      type="button"
                      key={x.id}
                      aria-pressed={x.id === model}
                      onClick={() => {
                        setModel(x.id);
                        setConfirmed(false);
                      }}
                    >
                      {x.id.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="terminal-contract">
                  <strong>PROPOSED INTERPRETATION: {m.name}</strong>
                  <p>
                    {
                      beginInvestigation({
                        prompt: prompt.trim() || m.question,
                        model,
                        parameter: m.parameter.value,
                      }).effectiveQuestion
                    }
                  </p>
                  <small>
                    This model question is computed. Extra premises or numbers
                    in your wording remain unverified.
                  </small>
                  <details>
                    <summary>Read assumptions & example value</summary>
                    <ul>
                      {m.premises.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <p>
                      {m.parameter.label}: {m.parameter.value}{' '}
                      {m.parameter.unit}. Editable in the full desk.
                    </p>
                    <p>{m.limit}</p>
                  </details>
                </div>
                <label className="terminal-confirm" htmlFor="terminal-confirm">
                  <Checkbox
                    id="terminal-confirm"
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(Boolean(v))}
                  />
                  <span>
                    Test this model with its displayed example assumptions.
                  </span>
                </label>
                <div className="terminal-actions">
                  <Button type="submit" disabled={!confirmed || !prompt.trim()}>
                    RUN INVESTIGATION <ArrowRight size={18} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStage('room')}
                  >
                    Leave the chair
                  </Button>
                </div>
                {error && <p role="alert">{error}</p>}
              </form>
              <span className="terminal-cursor" aria-hidden="true">
                ▌
              </span>
            </div>
            <div className="terminal-brand">
              <span>EMPIRICAL INSTRUMENTS</span>
              <i />
              POWER
            </div>
          </div>
        </section>
      )}
      {(stage === 'working' || stage === 'printed') && (
        <>
          <div
            className="room-instrument-display"
            aria-label="Desk instrument status"
          >
            <span>
              {stage === 'working' ? 'CALCULATING' : 'RECORD COMPLETE'}
            </span>
            <svg
              viewBox="0 0 200 55"
              role="img"
              aria-label={
                stage === 'working'
                  ? 'Instrument busy indicator'
                  : receipt?.passes.length
                    ? 'Unscaled result preview; inspect the graphical desk for labelled axes'
                    : 'No computed trace'
              }
            >
              <path
                d={
                  receipt?.passes.at(-1)?.frame.series[0].points.length
                    ? receipt.passes
                        .at(-1)!
                        .frame.series[0].points.slice(0, 40)
                        .map(
                          (p, i, arr) =>
                            `${i ? 'L' : 'M'}${(i * 190) / Math.max(1, arr.length - 1)},${45 - (30 * p.y) / Math.max(...arr.map((q) => q.y), 0.00001)}`,
                        )
                        .join(' ')
                    : receipt
                      ? ''
                      : 'M0,40 L30,40 L38,12 L46,43 L65,30 L92,30 L102,18 L118,40 L200,40'
                }
                stroke="#8fea9d"
                fill="none"
                strokeWidth="2"
              />
            </svg>
            <small>
              {receipt
                ? `${receipt.passes.length} checks · ${receipt.status}`
                : 'Running the selected numerical model'}
            </small>
          </div>
          <div className="room-paper" aria-live="polite">
            <div className="paper-perforation" />
            <div className="paper-content">
              <span>
                <Printer size={15} /> OBSERVATORY RECORD
              </span>
              {receipt ? (
                <>
                  <p>Computed interpretation: {receipt.effectiveQuestion}</p>
                  <strong>
                    {receipt.passes.at(-1)?.answer ?? receipt.reason}
                  </strong>
                  <p>
                    {receipt.passes.length} checks.{' '}
                    {receipt.status === 'conclusion'
                      ? 'Conditional conclusion.'
                      : receipt.status === 'gap'
                        ? 'A gap remains.'
                        : 'Budget reached.'}
                  </p>
                  <small>Original wording remains unverified.</small>
                  <Button onClick={onExit}>
                    Open the graphical results <ArrowRight size={17} />
                  </Button>
                </>
              ) : (
                <p>
                  Computing the question…
                  <br />
                  The printed result will use actual calculation output.
                </p>
              )}
            </div>
            <div className="paper-perforation" />
          </div>
          {receipt && (
            <div className="room-results-label">
              <span>YOUR QUESTION HAS BECOME AN INVESTIGATION.</span>
              <p>
                {receipt.passes.length
                  ? 'The plots, translations and next questions are ready on the desk.'
                  : 'No calculation was admitted. Review the missing model connection at the desk.'}
              </p>
            </div>
          )}
        </>
      )}
      <footer className="room-footer">
        <label htmlFor="room-reduce">
          <Checkbox
            id="room-reduce"
            checked={reduce}
            onCheckedChange={(v) => setReduce(Boolean(v))}
          />{' '}
          Reduce camera motion
        </label>
        <span>
          <VolumeX size={14} /> Quiet room
        </span>
        <span>Art is illustrative. Calculations are reproducible.</span>
      </footer>
    </main>
  );
}
