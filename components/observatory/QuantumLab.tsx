'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, ScanLine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Choice, Stat } from './Controls';
import {
  STATES,
  entropy,
  measure,
  mysteryState,
  probability,
  suggestBasis,
  updatePrior,
} from '@/lib/engine/quantum';
import type { Basis, Gate, Measurement, StateName } from '@/lib/engine/quantum';
import { record } from '@/lib/engine/records';
import type { ExperimentRecord } from '@/lib/engine/records';
const xyz = [
  [0, 0, 1],
  [0, 0, -1],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
];
export default function QuantumLab({
  onRecord,
}: {
  onRecord: (r: ExperimentRecord) => void;
}) {
  const [seed, setSeed] = useState(2081),
    [prior, setPrior] = useState(STATES.map(() => 1 / 6)),
    [measurements, setMeasurements] = useState<Measurement[]>([]),
    [basis, setBasis] = useState<Basis>('Z'),
    [guess, setGuess] = useState<StateName>('+'),
    [finished, setFinished] = useState(false),
    [, setRevealed] = useState(false),
    [message, setMessage] = useState(
      'The beacon prepares one of six states. Each shot measures a freshly prepared copy.',
    ),
    [gates, setGates] = useState<Gate[]>([]);
  const used = measurements.reduce((n, m) => n + m.shots, 0),
    suggestions = useMemo(() => suggestBasis(prior, 0.12, 8), [prior]),
    mostLikely = STATES[prior.indexOf(Math.max(...prior))],
    vector = xyz[0].map((_, j) =>
      prior.reduce((v, p, i) => v + p * xyz[i][j], 0),
    ),
    point = {
      x: 180 + 85 * vector[0] + 35 * vector[1],
      y: 150 - 90 * vector[2] + 24 * vector[1],
    };
  function sample() {
    if (finished || used >= 96) return;
    const m = measure(
      mysteryState(seed),
      basis,
      8,
      (seed + measurements.length * 104729) >>> 0,
      0.12,
    );
    setMeasurements((ms) => [...ms, m]);
    setPrior((p) => updatePrior(p, m));
    setMessage(
      `${m.plus} of ${m.shots} shots returned + in the ${basis} basis. Choose another measurement or identify the beacon.`,
    );
  }
  function identify() {
    if (finished || !measurements.length) return;
    const actual = mysteryState(seed),
      correct = guess === actual;
    setFinished(true);
    setRevealed(true);
    setMessage(
      correct
        ? `Beacon identified: |${actual}⟩. Your experiment is saved. Try to use fewer shots next time.`
        : `This beacon was |${actual}⟩. Your estimate was |${guess}⟩. The complete evidence is saved so you can inspect what happened.`,
    );
    onRecord(
      record(
        'quantum',
        'simulation',
        seed,
        {
          noise: 0.12,
          preparations: 'fresh independent copies',
          budget: 96,
          guess,
          library: 'quantum-tensors@0.4.15',
        },
        measurements,
        {
          correct,
          actual,
          guess,
          shots: used,
          posterior: prior,
          entropyBits: entropy(prior),
        },
      ),
    );
  }
  function reset() {
    setSeed((s) => s + 1);
    setPrior(STATES.map(() => 1 / 6));
    setMeasurements([]);
    setFinished(false);
    setRevealed(false);
    setMessage('A new beacon is ready. Choose your first measurement.');
  }
  const pOrder = probability('0', 'Z', gates, 0);
  return (
    <div className="lab-content">
      <div className="lab-grid">
        <section className="instrument-panel">
          <div className="panel-kicker">
            <span>UNKNOWN BEACON / STATE IDENTIFICATION</span>
            <span className="source-badge violet">QUANTUM SIMULATION</span>
          </div>
          <div className="bloch-view">
            <svg
              viewBox="0 0 360 310"
              role="img"
              aria-label={`Posterior mean Bloch vector: x ${vector[0].toFixed(2)}, y ${vector[1].toFixed(2)}, z ${vector[2].toFixed(2)}`}
            >
              <circle
                cx="180"
                cy="150"
                r="105"
                fill="#1a183133"
                stroke="#7d739c"
              />
              <ellipse
                cx="180"
                cy="150"
                rx="105"
                ry="32"
                fill="none"
                stroke="#504765"
              />
              <ellipse
                cx="180"
                cy="150"
                rx="38"
                ry="105"
                fill="none"
                stroke="#504765"
              />
              <path
                d="M55 150H310 M180 25V276 M125 113L244 193"
                stroke="#82749f"
                strokeDasharray="3 5"
              />
              <text x="313" y="155">
                X
              </text>
              <text x="183" y="20">
                Z
              </text>
              <text x="248" y="204">
                Y
              </text>
              <line
                x1="180"
                y1="150"
                x2={point.x}
                y2={point.y}
                stroke="#b4a5fa"
                strokeWidth="3"
              />
              <circle cx={point.x} cy={point.y} r="6" fill="#d2c7ff" />
              <circle cx="180" cy="150" r="2" fill="#ddd" />
              <text x="180" y="307" textAnchor="middle">
                POSTERIOR MEAN · NOT THE HIDDEN STATE
              </text>
            </svg>
          </div>
          <div className="stats-row">
            <Stat label="Measurements" value={used} unit=" / 96" />
            <Stat
              label="Uncertainty"
              value={entropy(prior).toFixed(2)}
              unit=" bits"
            />
            <Stat label="Leading candidate" value={`|${mostLikely}⟩`} />
          </div>
          <div
            className="posterior-bars"
            aria-label="Candidate state probabilities"
          >
            {STATES.map((s, i) => (
              <div key={s}>
                <span>|{s}⟩</span>
                <Progress
                  value={prior[i] * 100}
                  aria-label={`Probability of ${s}`}
                />
                <output>{(prior[i] * 100).toFixed(1)}%</output>
              </div>
            ))}
          </div>
        </section>
        <aside className="control-panel">
          <span className="eyebrow">YOUR OBJECTIVE</span>
          <h2>
            Find the state
            <br />
            behind the signal.
          </h2>
          <p>
            The same reading can hide different quantum states. Choose a new
            measurement basis to distinguish them.
          </p>
          <Choice
            label="Measurement basis"
            value={basis}
            onChange={(v) => setBasis(v as Basis)}
            options={(['X', 'Y', 'Z'] as Basis[]).map((value) => ({
              value,
              label: `${value} basis`,
            }))}
            disabled={finished || used >= 96}
          />
          <Button
            className="action full"
            onClick={sample}
            disabled={finished || used >= 96}
          >
            <ScanLine />
            Measure 8 fresh copies
          </Button>
          <div className="advisor">
            <Sparkles size={18} />
            <div>
              <strong>Experiment adviser</strong>
              <p>
                {suggestions[0].informationBits < 0.0001
                  ? 'The candidate family is already well distinguished.'
                  : `Try ${suggestions[0].basis}: expected uncertainty reduction ${suggestions[0].informationBits.toFixed(2)} bits.`}
              </p>
              <small>Computed across six declared hypotheses.</small>
            </div>
          </div>
          <Choice
            label="Your identification"
            value={guess}
            onChange={(v) => setGuess(v as StateName)}
            options={STATES.map((value) => ({ value, label: `|${value}⟩` }))}
            disabled={finished}
          />
          <div className="button-row">
            <Button
              className="action"
              onClick={identify}
              disabled={finished || !used}
            >
              <CheckCircle2 />
              Identify beacon
            </Button>
            {finished && (
              <Button variant="outline" className="action" onClick={reset}>
                <RotateCcw />
                New beacon
              </Button>
            )}
          </div>
          <div className="mission-message" role="status">
            <p>{message}</p>
          </div>
          <details className="method">
            <summary>What this experiment establishes</summary>
            <p>
              Born probabilities are calculated by Quantum Tensors. Shots are
              sampled with a reproducible seed and 12% depolarising noise.
              Bayesian updates and the adviser assume the correct state lies in
              this six-state family. This is established quantum mechanics, not
              evidence for a new quantum theory.
            </p>
            <p>
              Cloud quantum execution is available in the downloadable Python
              adapter; hardware runs require an account and are queued. This
              browser mission uses a local simulator.
            </p>
          </details>
        </aside>
      </div>
      <section className="order-workbench">
        <div>
          <span className="eyebrow">SIDE EXPERIMENT / ORDER MATTERS</span>
          <h3>Build a gate sequence.</h3>
          <p>
            Start at |0⟩. Apply H and then S, or S and then H; inspect the
            X-basis outcome.
          </p>
        </div>
        <div className="gate-controls">
          <div className="button-row">
            {(['H', 'S', 'X', 'Z'] as Gate[]).map((g) => (
              <Button
                variant="outline"
                className="action"
                key={g}
                disabled={gates.length >= 8}
                onClick={() => setGates((a) => [...a, g])}
              >
                {g}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="action"
              onClick={() => setGates([])}
            >
              Clear
            </Button>
          </div>
          <output className="gate-sequence">
            |0⟩ → {gates.length ? gates.join(' → ') : 'no gates'} → measure
          </output>
          <p>
            P(+ in X) ={' '}
            <strong>{probability('0', 'X', gates, 0).toFixed(4)}</strong> · P(0
            in Z) = {pOrder.toFixed(4)}
          </p>
        </div>
      </section>
    </div>
  );
}
