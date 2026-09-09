'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Stat } from './Controls';
import {
  analyseBehaviour,
  makeTrial,
  responseWindow,
  trialPlan,
} from '@/lib/engine/behaviour';
import type { Trial } from '@/lib/engine/behaviour';
import { record } from '@/lib/engine/records';
import type { ExperimentRecord } from '@/lib/engine/records';
const directions = [
  { name: 'North', icon: ArrowUp, key: 'ArrowUp' },
  { name: 'East', icon: ArrowRight, key: 'ArrowRight' },
  { name: 'South', icon: ArrowDown, key: 'ArrowDown' },
  { name: 'West', icon: ArrowLeft, key: 'ArrowLeft' },
];
type Phase = 'idle' | 'waiting' | 'signal' | 'feedback' | 'paused' | 'complete';
export default function BehaviourLab({
  onRecord,
  active = true,
}: {
  onRecord: (r: ExperimentRecord) => void;
  active?: boolean;
}) {
  const [consent, setConsent] = useState(false),
    [seed, setSeed] = useState(1301),
    [trials, setTrials] = useState<Trial[]>([]),
    [phase, setPhase] = useState<Phase>('idle'),
    [feedback, setFeedback] = useState(
      'Wait for one port to light up, then press its arrow key or tap it.',
    ),
    [target, setTarget] = useState<number | null>(null);
  const plan = useRef(trialPlan(seed));
  const live = useRef({
    phase,
    history: trials,
    index: 0,
    onset: 0,
    start: 0,
    falseStarts: 0,
  });
  const callback = useRef(onRecord);
  useEffect(() => {
    callback.current = onRecord;
  }, [onRecord]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>('idle');
  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function change(p: Phase) {
    phaseRef.current = p;
    live.current.phase = p;
    setPhase(p);
  }
  function pause() {
    if (['waiting', 'signal', 'feedback'].includes(phaseRef.current)) {
      clear();
      setTarget(null);
      change('paused');
      setFeedback(
        'Paused. An interrupted trial is discarded and will restart on resume.',
      );
    }
  }
  useEffect(() => {
    if (!active) pause();
  }, [active]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      clear();
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  function beginTrial() {
    clear();
    const e = live.current,
      spec = plan.current[e.history.length];
    if (!spec) {
      finish();
      return;
    }
    e.index = e.history.length;
    e.falseStarts = 0;
    setTarget(null);
    change('waiting');
    setFeedback('Wait for the signal.');
    timer.current = setTimeout(() => {
      e.onset = performance.now();
      setTarget(spec.target);
      change('signal');
      setFeedback('Signal received. Select the matching port.');
      timer.current = setTimeout(
        () => respond(null),
        responseWindow(e.history, spec.condition),
      );
    }, spec.delayMs);
  }
  function respond(response: number | null) {
    const e = live.current;
    if (phaseRef.current === 'waiting') {
      if (response !== null) {
        e.falseStarts++;
        setFeedback('Early response. Wait until a port lights up.');
      }
      return;
    }
    if (phaseRef.current !== 'signal') return;
    clear();
    const spec = plan.current[e.index],
      now = response === null ? null : performance.now(),
      trial = makeTrial(
        spec,
        e.history,
        e.onset - e.start,
        response,
        now === null ? null : now - e.start,
        e.falseStarts,
      );
    e.history = [...e.history, trial];
    setTrials(e.history);
    setTarget(null);
    change('feedback');
    setFeedback(
      trial.correct
        ? `Signal captured in ${Math.round(trial.reactionMs!)} ms.`
        : response === null
          ? 'Signal missed. Watch for the next port.'
          : 'Different port selected. Ready for the next signal.',
    );
    timer.current = setTimeout(() => {
      if (e.history.length === plan.current.length) finish();
      else beginTrial();
    }, 650);
  }
  function finish() {
    clear();
    change('complete');
    setTarget(null);
    setFeedback(
      'Session complete. Your response history is saved in the logbook.',
    );
    const data = live.current.history;
    callback.current(
      record(
        'behaviour',
        'human-behaviour',
        seed,
        {
          protocol: 'signal-bay-0.1',
          consent: 'local-recording-v1',
          trialCount: 24,
          conditions:
            'Seeded balanced random assignment; adaptive response window depends on previous completed trials.',
          clock: 'performance.now, milliseconds relative to start',
          interruptedTrialPolicy: 'discard and repeat same trial',
        },
        data,
        analyseBehaviour(data),
      ),
    );
  }
  function start() {
    if (!consent) return;
    if (phaseRef.current === 'paused') {
      beginTrial();
      return;
    }
    plan.current = trialPlan(seed);
    live.current = {
      phase: 'waiting',
      history: [],
      index: 0,
      onset: 0,
      start: performance.now(),
      falseStarts: 0,
    };
    setTrials([]);
    beginTrial();
  }
  function reset() {
    clear();
    change('idle');
    setTarget(null);
    setTrials([]);
    live.current.history = [];
    setSeed((s) => s + 1);
    setFeedback(
      'Wait for one port to light up, then press its arrow key or tap it.',
    );
  }
  const respondRef = useRef(respond);
  useEffect(() => {
    respondRef.current = respond;
  });
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const i = directions.findIndex((d) => d.key === e.key);
      if (i >= 0 && ['waiting', 'signal'].includes(phaseRef.current)) {
        e.preventDefault();
        respondRef.current(i);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active]);
  const result = analyseBehaviour(trials),
    inProgress = ['waiting', 'signal', 'feedback'].includes(phase);
  return (
    <div className="lab-content">
      <div className="lab-grid">
        <section className="instrument-panel">
          <div className="panel-kicker">
            <span>SIGNAL INTERCEPTION / HUMAN RESPONSE</span>
            <span className="source-badge amber">LIVE BEHAVIOUR</span>
          </div>
          <div className="signal-arena">
            <div className="signal-centre">
              <span className="eyebrow">
                {phase === 'complete'
                  ? 'SESSION COMPLETE'
                  : phase === 'signal'
                    ? 'CAPTURE SIGNAL'
                    : 'SIGNAL ARRAY'}
              </span>
              <strong>
                {String(Math.min(trials.length + 1, 24)).padStart(2, '0')}
                <small>/24</small>
              </strong>
            </div>
            {directions.map((d, i) => (
              <Button
                key={d.name}
                className={`signal-port port-${i} ${target === i ? 'lit' : ''}`}
                aria-label={`${d.name} response port${target === i ? ', signal active' : ''}`}
                disabled={!['waiting', 'signal'].includes(phase)}
                onClick={() => respond(i)}
              >
                <d.icon size={30} />
                <span>{d.name}</span>
              </Button>
            ))}
          </div>
          <div className="signal-feedback" role="status">
            {feedback}
          </div>
          <Progress
            value={(trials.length / 24) * 100}
            aria-label="Signal session progress"
          />
          <div className="stats-row">
            <Stat label="Completed" value={trials.length} unit=" trials" />
            <Stat
              label="Captured"
              value={trials.filter((t) => t.correct).length}
            />
            <Stat label="Early responses" value={result.falseStarts} />
          </div>
        </section>
        <aside className="control-panel">
          <span className="eyebrow">YOUR OBJECTIVE</span>
          <h2>
            Follow the signal.
            <br />
            Notice the change.
          </h2>
          <p>
            Some trials use a fixed response window. Others adjust it using your
            recent history. Use the arrow keys or tap the illuminated port.
          </p>
          <div className="recording-consent">
            <Checkbox
              id="behaviour-consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(Boolean(v))}
              disabled={inProgress || phase === 'paused'}
            />
            <label htmlFor="behaviour-consent">
              Record my responses on this device for this experiment.
            </label>
          </div>
          <p className="scope-note">
            Keypresses and timing stay in this browser. Nothing is uploaded. You
            can pause at any time. A session takes about one minute.
          </p>
          <div className="button-row">
            {inProgress ? (
              <Button className="action" onClick={pause}>
                <Pause />
                Pause
              </Button>
            ) : (
              <Button
                className="action"
                disabled={!consent || phase === 'complete'}
                onClick={start}
              >
                <Play />
                {phase === 'paused' ? 'Resume session' : 'Begin 24 trials'}
              </Button>
            )}
            <Button
              className="action"
              variant="outline"
              onClick={reset}
              disabled={inProgress}
              aria-label="Reset signal session"
            >
              <RotateCcw />
            </Button>
          </div>
          <div className="session-contract">
            <span>RECORDING</span>
            <strong>
              {inProgress
                ? 'LOCAL ONLY'
                : phase === 'complete'
                  ? 'SAVED LOCALLY'
                  : 'NOT RECORDING'}
            </strong>
            <span>SEED</span>
            <strong>{seed}</strong>
            <span>INPUT</span>
            <strong>ARROW KEYS / TOUCH</strong>
          </div>
          <details className="method">
            <summary>What we can learn</summary>
            <p>
              This first session measures behaviour. It compares two
              response-window policies and scores two illustrative forecasts
              made before each trial. Higher success with a longer window does
              not establish improved learning. Participant/session holdouts and
              a stronger, frozen prediction comparison are needed for research
              claims.
            </p>
            <p>
              The input is your response history. EEG hardware belongs to the
              separate Instrument Dock and is not used to adapt this game.
            </p>
          </details>
        </aside>
      </div>
      {phase === 'complete' && (
        <section className="session-results instrument-panel">
          <div className="panel-kicker">
            <span>
              <CheckCircle2 size={16} /> SESSION EVIDENCE
            </span>
          </div>
          <h2>Your response history</h2>
          <div className="comparison-pair">
            {result.groups.map((g) => (
              <div key={g.condition}>
                <h3>
                  {g.condition === 'fixed' ? 'Fixed window' : 'Adaptive window'}
                </h3>
                <p>
                  {g.n} trials · {(g.accuracy * 100).toFixed(0)}% captured
                </p>
                <p>
                  Average window {g.meanWindowMs.toFixed(0)} ms. Correct
                  responses:{' '}
                  {g.meanCorrectReactionMs === null
                    ? 'none'
                    : `${g.meanCorrectReactionMs.toFixed(0)} ms`}
                  .
                </p>
              </div>
            ))}
          </div>
          <div className="stats-row">
            <Stat
              label="Last-outcome forecast error"
              value={result.brierCurrent.toFixed(3)}
            />
            <Stat
              label="Recent-history forecast error"
              value={result.brierHistory.toFixed(3)}
            />
          </div>
          <p className="scope-note">
            Brier score; lower is better. {result.interpretation}
          </p>
        </section>
      )}
    </div>
  );
}
