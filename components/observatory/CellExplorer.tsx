'use client';
/* oxlint-disable react/react-compiler -- Compiler is not enabled; its analysis crashes on the plotting expression. */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Orbit,
  Radio,
  RotateCcw,
  ScanLine,
} from 'lucide-react';
import source from '../../public/research/cell-flight01.json';

type Model =
  | 'zero'
  | 'global_template'
  | 'target_mean'
  | 'global_shrink'
  | 'heterogeneity_shrink';
type Example = {
  actual: (number | null)[];
  predictions: Record<Model, (number | null)[]>;
  scores: Record<Model, number>;
  scoredGenes: number;
  geometry: { a: number; b: number; c: number; cosine: number | null };
};
type Flight = {
  targets: string[];
  genes: string[];
  shape: number[];
  contexts: Record<string, { examples: Record<string, Example> }>;
  summary: Record<string, Record<Model, number>>;
};
const data = source as unknown as Flight;
const labels: Record<Model, string> = {
  zero: 'No change',
  global_template: 'Shared response',
  target_mean: 'Mean transfer',
  global_shrink: 'Global shrinkage',
  heterogeneity_shrink: 'Disagreement adjustment',
};
const models = Object.keys(labels) as Model[];
const contexts = Object.keys(data.contexts);
const github =
  'https://github.com/thantiklermcirony/empirical-observatory/tree/main/research/virtual-cell';
const number = (n: number | null) => (n === null ? 'undefined' : n.toFixed(4));

function trace(values: (number | null)[], limit: number): string {
  let previous = false;
  return values
    .map((value, i) => {
      if (value === null) {
        previous = false;
        return '';
      }
      const x = 42 + (i * 716) / (values.length - 1),
        y = 126 - (value / limit) * 92;
      const segment = `${previous ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
      previous = true;
      return segment;
    })
    .join(' ');
}

export default function CellExplorer() {
  const [context, setContext] = useState('K562');
  const [target, setTarget] = useState(data.targets[0]);
  const [model, setModel] = useState<Model>('heterogeneity_shrink');
  const [revealed, setRevealed] = useState(false);
  const [scale, setScale] = useState(1);
  const example = data.contexts[context].examples[target];
  const prediction = example.predictions[model];
  const plotted = [...prediction, ...(revealed ? example.actual : [])].filter(
    (x): x is number => x !== null,
  );
  const limit = Math.max(
    0.5,
    Math.ceil(Math.max(...plotted.map(Math.abs)) * 2) / 2,
  );
  const g = example.geometry;
  const scaledError = Math.max(0, scale * scale * g.a - 2 * scale * g.b + g.c);
  const direction = scale === 0 ? null : g.cosine;
  const reset = () => {
    setRevealed(false);
    setScale(1);
  };
  return (
    <main className="cell-page">
      <header className="cell-nav">
        <Link href="/" className="cell-brand">
          <Orbit size={28} />
          <span>
            EMPIRICAL
            <br />
            <strong>OBSERVATORY</strong>
          </span>
        </Link>
        <Link href="/atlas">Research Atlas</Link>
        <Link href="/projects">
          <ArrowLeft size={15} /> Current projects
        </Link>
      </header>
      <section className="cell-hero">
        <div>
          <p className="cell-kicker">
            <Radio size={14} /> VIRTUAL CELL / FLIGHT 01
          </p>
          <h1>
            Predict.
            <br />
            <em>Reveal.</em> Challenge.
          </h1>
          <p className="cell-lede">
            What survives when a gene response moves to another cell context?
            Inspect the prediction, reveal the experiment, and test what the
            score really means.
          </p>
        </div>
        <div className="cell-orbit" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            STATE
            <br />
            <b>→</b>
            <br />
            RESPONSE
          </span>
        </div>
      </section>
      <div className="cell-ribbon">
        <span>
          <i /> REAL DATA / RECORDED REPLAY
        </span>
        <span>4 CONTEXTS</span>
        <span>2,052 TARGET GENES</span>
        <span>6,642 MEASURED GENES</span>
      </div>
      <section className="cell-console" aria-labelledby="cell-console-title">
        <div className="cell-console-head">
          <div>
            <p className="cell-kicker">01 / PREDICTION BEFORE REVEAL</p>
            <h2 id="cell-console-title">Enter a different cell.</h2>
          </div>
          <span className="cell-status">
            {revealed ? 'MEASUREMENT REVEALED' : 'PREDICTION LOADED'}
          </span>
        </div>
        <div className="cell-controls">
          <label>
            Destination context
            <select
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                reset();
              }}
            >
              {contexts.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Gene intervention
            <select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                reset();
              }}
            >
              {data.targets.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Prediction rule
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as Model)}
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {labels[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="cell-train">
          Training responses:{' '}
          {contexts.filter((c) => c !== context).join(' · ')} <span>→</span>{' '}
          Held-out responses: <strong>{context}</strong>
        </p>
        <div className="cell-chart">
          <svg
            viewBox="0 0 800 250"
            role="img"
            aria-label={`Predicted gene-response fingerprint for ${target} in ${context}${revealed ? ', with measured response overlaid' : ''}`}
          >
            {[34, 80, 126, 172, 218].map((y) => (
              <line
                key={y}
                x1="42"
                x2="758"
                y1={y}
                y2={y}
                stroke="#22394b"
                strokeDasharray={y === 126 ? undefined : '3 6'}
              />
            ))}
            <text x="4" y="38">
              +{limit}
            </text>
            <text x="18" y="130">
              0
            </text>
            <text x="4" y="222">
              −{limit}
            </text>
            <path
              d={trace(prediction, limit)}
              fill="none"
              stroke="#77f1d9"
              strokeWidth="2"
            />
            {revealed && (
              <path
                d={trace(example.actual, limit)}
                fill="none"
                stroke="#ffc583"
                strokeWidth="2"
              />
            )}
            <text x="42" y="245">
              96 FIXED DISPLAY GENES / LOG₂ FOLD CHANGE
            </text>
          </svg>
          {!revealed && (
            <div className="cell-locked">
              <ScanLine size={20} />
              <span>Measured response hidden</span>
            </div>
          )}
        </div>
        <div className="cell-chart-key">
          <span>
            <i /> Prediction
          </span>
          <span className="cell-actual-key">
            <i />{' '}
            {revealed
              ? 'Published measured estimate'
              : 'Measured estimate hidden'}
          </span>
        </div>
        <div className="cell-reveal-row">
          <button
            className="cell-reveal"
            onClick={() => setRevealed(true)}
            disabled={revealed}
          >
            <ScanLine size={18} />
            {revealed ? 'Measurement revealed' : 'Reveal measured response'}
          </button>
          <button className="cell-reset" onClick={reset}>
            <RotateCcw size={16} /> Reset
          </button>
          <span>
            Replay of published population estimates. No live cell experiment
            runs here.
          </span>
        </div>
        <div className="cell-score-row" aria-live="polite">
          <div>
            <span>Prediction error / lower is better</span>
            <strong>
              {revealed ? number(example.scores[model]) : '— — —'}
            </strong>
          </div>
          <div>
            <span>No-change error</span>
            <strong>{revealed ? number(example.scores.zero) : '— — —'}</strong>
          </div>
          <div>
            <span>Scored measured genes</span>
            <strong>
              {revealed ? example.scoredGenes.toLocaleString() : 'Hidden'}
            </strong>
          </div>
        </div>
        <p className="cell-note">
          Eight examples and 96 display genes were selected by a fixed hash of
          their names. Scores use every available estimate in the full gene
          panel. Gaps represent missing measurements. The complete target table
          is downloadable below.
        </p>
      </section>
      <section className="cell-geometry">
        <div>
          <p className="cell-kicker">02 / A PATTERN HIDING IN THE SCORE</p>
          <h2>
            Smaller error.
            <br />
            Same direction.
          </h2>
          <p>
            A positive multiplier changes the length of a prediction vector. It
            cannot rotate that vector toward the measured response. Move the
            slider to see the distinction on this target.
          </p>
          <p className="cell-equation">
            cos(αp, y) = cos(p, y) &nbsp; for α &gt; 0
          </p>
          <p className="cell-note">
            This is standard geometry. In our run, a higher average cosine came
            from zero predictions becoming undefined and leaving the average—not
            improved directions.
          </p>
        </div>
        <div className="cell-geometry-control">
          <label htmlFor="cell-scale">
            Scale the mean-transfer prediction <b>{scale.toFixed(2)}×</b>
          </label>
          <input
            id="cell-scale"
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
          <div className="cell-geometry-values">
            <div>
              <span>Full-panel error</span>
              <strong>{revealed ? number(scaledError) : 'Reveal first'}</strong>
            </div>
            <div>
              <span>Direction similarity</span>
              <strong>{revealed ? number(direction) : 'Reveal first'}</strong>
            </div>
          </div>
          <p>
            {scale === 0
              ? 'At zero, the prediction has no direction. Its cosine is undefined; treating this as an ordinary scored prediction changes the comparison.'
              : 'Error can change while direction similarity stays fixed. The calculation uses all finite measured genes for the selected target.'}
          </p>
        </div>
      </section>
      <section className="cell-findings">
        <p className="cell-kicker">03 / THE COMPLETE FIRST FLIGHT</p>
        <h2>The hypothesis has to earn its place.</h2>
        <p className="cell-result">
          The disagreement adjustment did not meet the frozen success threshold.
          Its overall error was about 0.11% below global shrinkage, and it lost
          to the strongest conventional method in every context.
        </p>
        <div className="cell-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Held-out context</th>
                {models.map((m) => (
                  <th key={m}>{labels[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contexts.map((c) => (
                <tr key={c}>
                  <th>{c}</th>
                  {models.map((m) => (
                    <td
                      key={m}
                      className={
                        data.summary[c][m] ===
                        Math.min(...models.map((x) => data.summary[c][x]))
                          ? 'cell-best'
                          : ''
                      }
                    >
                      {data.summary[c][m].toFixed(4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cell-note">
          Macro mean squared error; lower is better. Bold cells mark the lowest
          error shown. Four selected contexts, differing protocols and noisy
          published estimates limit generalization. This is not an official
          Virtual Cell Challenge score.
        </p>
      </section>
      <section className="cell-next">
        <div>
          <p className="cell-kicker">04 / NEXT FLIGHT</p>
          <h2>
            Give the prediction
            <br />a destination.
          </h2>
          <p>
            The next experiment asks whether baseline cell measurements can
            identify when a transferred response should be retained, reduced or
            rejected. These four contexts are now development data; a stronger
            claim needs a new independent test.
          </p>
        </div>
        <div className="cell-evidence-links">
          <a href={github}>
            Inspect code, protocol and every result <ArrowUpRight size={17} />
          </a>
          <a href="/research/Virtual_Cell_Flight01.zip" download>
            Download the reproduction package <ArrowUpRight size={17} />
          </a>
          <Link href="/research/Cell_Flight01_Report.md">
            Read the first-flight report <ArrowUpRight size={17} />
          </Link>
          <a href="https://doi.org/10.6084/m9.figshare.29498366">
            Original author data / CC BY 4.0 <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <footer className="cell-footer">
        <span>
          THE EMPIRICAL ARCHITECTURE / OPEN EXPERIMENTS, INSPECTABLE CLAIMS
        </span>
        <Link href="/projects">
          Explore the programme <ArrowUpRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
