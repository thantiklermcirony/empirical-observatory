'use client';
/* oxlint-disable react/react-compiler -- These imperative engine/browser effects synchronize external state; this app does not enable React Compiler. */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlaskConical,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Choice, Range, Stat, Trace } from './Controls';
import {
  CONTROLLERS,
  CONTROLLER_LABELS,
  STRESSES,
  TAO_CONTRACT,
  compareControllers,
  controllerAction,
  flow,
  initialControl,
  initialPlant,
  metrics,
  observe,
  stepPlant,
  targetAt,
} from '@/lib/engine/tao';
import type {
  Controller,
  Observation,
  Primitive,
  Sample,
  Stress,
} from '@/lib/engine/tao';
import { random } from '@/lib/engine/random';
import { record } from '@/lib/engine/records';
import type { ExperimentRecord } from '@/lib/engine/records';
const stressNames = {
  endpoint: 'Reserve collapse',
  repeated: 'Repeated disturbances',
  stale: 'Sensor blackout',
  switching: 'Changing target',
};
export default function TaoLab({
  onRecord,
  active: visible = true,
}: {
  onRecord: (r: ExperimentRecord) => void;
  active?: boolean;
}) {
  const [controller, setController] = useState<Controller>('manual'),
    [stress, setStress] = useState<Stress>('endpoint'),
    [gain, setGain] = useState(8),
    [manual, setManual] = useState(0),
    [seed, setSeed] = useState(7),
    [running, setRunning] = useState(false),
    [samples, setSamples] = useState<Sample[]>([]),
    [done, setDone] = useState(false),
    [message, setMessage] = useState(
      'Hold reserve near the amber target. A disturbance arrives at 5 seconds.',
    ),
    [comparison, setComparison] = useState<ReturnType<
      typeof compareControllers
    > | null>(null),
    [comparing, setComparing] = useState(false),
    [primitive, setPrimitive] = useState<Primitive>('growth'),
    [duration, setDuration] = useState(1.5);
  const engine = useRef({
    p: initialPlant(),
    m: initialControl(),
    r: random(seed),
    last: undefined as Observation | undefined,
    samples: [] as Sample[],
    actions: [] as number[],
  });
  const input = useRef({ controller, stress, gain, manual, seed, onRecord });
  useEffect(() => {
    input.current = { controller, stress, gain, manual, seed, onRecord };
  }, [controller, stress, gain, manual, seed, onRecord]);
  const active = samples.length > 0 && !done;
  const tail = samples.at(-1),
    reserve = tail?.x ?? 0.62,
    score = samples.length ? metrics(samples, 0.05) : null;
  useEffect(() => {
    if (!visible) setRunning(false);
  }, [visible]);
  function reset() {
    setRunning(false);
    engine.current = {
      p: initialPlant(),
      m: initialControl(),
      r: random(seed),
      last: undefined,
      samples: [],
      actions: [],
    };
    setSamples([]);
    setDone(false);
    setMessage(
      'Hold reserve near the amber target. A disturbance arrives at 5 seconds.',
    );
  }
  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        setRunning(false);
        setMessage(
          'Paused while the station is out of view. Resume when ready.',
        );
      }
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const e = engine.current,
        c = input.current,
        o = observe(e.p, c.stress, (e.r() - 0.5) * 0.008, e.last);
      e.last = o;
      const target = targetAt(e.p.t, c.stress),
        action = controllerAction(
          c.controller,
          o,
          target,
          c.gain,
          0.05,
          e.p.t,
          e.m,
          c.manual,
        );
      e.m = action.memory;
      e.p = stepPlant(e.p, action.u, 0.05, c.stress, c.seed);
      e.actions.push(action.u);
      e.samples.push({
        t: e.p.t,
        x: e.p.x,
        memory: e.p.memory,
        u: action.u,
        observed: o.x,
        confidence: o.confidence,
        age: o.age,
        target,
        fallback: action.fallback,
        boundary: e.p.x < 0.05 || e.p.x > 0.95,
      });
      setSamples([...e.samples]);
      if (e.samples.length >= 600) {
        setRunning(false);
        setDone(true);
        const m = metrics(e.samples, 0.05);
        setMessage(
          m.corridorFraction > 0.55
            ? 'System recovered. Your complete experiment is in the logbook.'
            : 'Experiment complete. Try another control strategy and compare the evidence.',
        );
        c.onRecord(
          record(
            'tao',
            'simulation',
            c.seed,
            {
              seed: c.seed,
              controller: c.controller,
              stress: c.stress,
              gain: c.gain,
              dt: 0.05,
              duration: 30,
              contract: TAO_CONTRACT,
            },
            { actions: e.actions },
            m,
          ),
        );
      }
    }, 50);
    return () => clearInterval(timer);
  }, [running]);
  const flowData = useMemo(
    () =>
      Array.from({ length: 61 }, (_, i) => ({
        t: i / 20,
        e: flow(primitive, 0.35, i / 20),
      })),
    [primitive],
  );
  function compare() {
    setComparing(true);
    setTimeout(() => {
      try {
        setComparison(compareControllers());
      } finally {
        setComparing(false);
      }
    }, 30);
  }
  return (
    <div className="lab-content">
      <Tabs defaultValue="mission">
        <TabsList className="lab-tabs">
          <TabsTrigger value="mission">Recovery mission</TabsTrigger>
          <TabsTrigger value="flows" disabled={running}>
            Flow workbench
          </TabsTrigger>
          <TabsTrigger value="benchmark" disabled={running}>
            Controller comparison
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mission">
          <div className="lab-grid">
            <section className="instrument-panel">
              <div className="panel-kicker">
                <span>REACTOR / RESERVE CONTROL</span>
                <span className="source-badge">SIMULATION</span>
              </div>
              <div
                className={`reactor-gauge ${reserve < 0.1 ? 'critical' : ''}`}
                style={
                  { '--reserve': `${reserve * 100}%` } as React.CSSProperties
                }
              >
                <div className="gauge-orbit" />
                <div className="gauge-core">
                  <span>RESERVE</span>
                  <strong>
                    {(reserve * 100).toFixed(1)}
                    <small>%</small>
                  </strong>
                  <span>
                    TARGET {Math.round((tail?.target ?? 0.62) * 100)}%
                  </span>
                </div>
              </div>
              <div className="stats-row">
                <Stat
                  label="Experiment time"
                  value={(tail?.t ?? 0).toFixed(1)}
                  unit=" / 30 s"
                />
                <Stat label="Actuation" value={(tail?.u ?? 0).toFixed(2)} />
                <Stat
                  label="Sensor"
                  value={tail?.fallback ? 'FALLBACK' : 'AVAILABLE'}
                />
              </div>
              {samples.length > 0 && (
                <Trace
                  data={
                    (samples.length
                      ? samples
                      : [{ t: 0, x: 0.62, target: 0.62 }]) as unknown as Record<
                      string,
                      unknown
                    >[]
                  }
                  keys={[
                    { key: 'x', label: 'Reserve', color: '#79e6d5' },
                    { key: 'target', label: 'Target', color: '#f5bd77' },
                  ]}
                />
              )}
            </section>
            <aside className="control-panel">
              <span className="eyebrow">YOUR OBJECTIVE</span>
              <h2>
                Keep the station
                <br />
                in balance.
              </h2>
              <p>
                Recover from a loss of reserve. Learn how the controller behaves
                near its limits.
              </p>
              <Choice
                label="Controller"
                value={controller}
                onChange={(v) => setController(v as Controller)}
                options={(['manual', ...CONTROLLERS] as Controller[]).map(
                  (value) => ({ value, label: CONTROLLER_LABELS[value] }),
                )}
                disabled={active || running}
              />
              <Choice
                label="Disturbance"
                value={stress}
                onChange={(v) => setStress(v as Stress)}
                options={STRESSES.map((value) => ({
                  value,
                  label: stressNames[value],
                }))}
                disabled={active || running}
              />
              {controller === 'manual' ? (
                <Range
                  label="Release ← actuation → replenish"
                  value={manual}
                  min={-1}
                  max={1}
                  step={0.02}
                  onChange={setManual}
                  disabled={done}
                />
              ) : (
                <Range
                  label="Controller gain"
                  value={gain}
                  min={1}
                  max={18}
                  step={1}
                  onChange={setGain}
                  disabled={active || running}
                />
              )}
              <div className="button-row">
                <Button
                  className="action"
                  disabled={done}
                  onClick={() => setRunning((v) => !v)}
                >
                  {running ? <Pause /> : <Play />}
                  {running ? 'Pause' : active ? 'Resume' : 'Start mission'}
                </Button>
                <Button
                  variant="outline"
                  className="action"
                  onClick={reset}
                  aria-label="Reset recovery mission"
                >
                  <RotateCcw />
                </Button>
              </div>
              <div className="mission-message" role="status">
                {done && <CheckCircle2 size={18} />}
                <p>{message}</p>
              </div>
              <Progress
                value={samples.length / 6}
                aria-label="Recovery mission progress"
              />
              {done && score && (
                <div className="result-note">
                  <strong>
                    {Math.round(score.corridorFraction * 100)}% inside the
                    corridor
                  </strong>
                  <p>
                    After the first disturbance. Recovery:{' '}
                    {score.recoverySeconds === null
                      ? 'not reached'
                      : `${score.recoverySeconds.toFixed(2)} s`}
                    .
                  </p>
                  <Button
                    variant="outline"
                    className="action"
                    onClick={() => {
                      setSeed((s) => s + 1);
                      reset();
                      engine.current.r = random(seed + 1);
                    }}
                  >
                    Next seed
                  </Button>
                </div>
              )}
              <details className="method">
                <summary>Experiment contract</summary>
                <p>
                  A bounded two-variable synthetic plant with hidden actuator
                  history. All automated controllers receive the same reserve
                  reading, noise and sensor-quality rule. Physical limits are
                  preserved by the exact plant update. Simulation time pauses
                  with this view.
                </p>
                <p>
                  Seed {seed}; 50 ms steps; target corridor ±0.08. This is a new
                  implementation study of TAO, not the manuscript’s original
                  benchmark.
                </p>
              </details>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="flows">
          <div className="lab-grid">
            <section className="instrument-panel">
              <div className="panel-kicker">
                <span>FIVE TYPED FLOWS</span>
                <span className="source-badge">MATHEMATICAL MODEL</span>
              </div>
              <div className="formula-readout">
                {flow(primitive, 0.35, duration).toFixed(4)}
                <small>
                  state after {duration.toFixed(2)} units of intervention
                </small>
              </div>
              <Trace
                data={flowData}
                keys={[{ key: 'e', label: primitive, color: '#79e6d5' }]}
              />
            </section>
            <aside className="control-panel">
              <h2>
                Change the kind
                <br />
                of intervention.
              </h2>
              <p>
                Every experiment begins at 0.35. These five exact flows approach
                their boundaries in different ways.
              </p>
              <Choice
                label="Flow primitive"
                value={primitive}
                onChange={(v) => setPrimitive(v as Primitive)}
                options={[
                  { value: 'growth', label: 'Saturating growth' },
                  { value: 'suppression', label: 'Inhibitory suppression' },
                  { value: 'alignment', label: 'Log-odds alignment' },
                  { value: 'threat', label: 'Independent threat' },
                  { value: 'gate', label: 'Multiplicative gate' },
                ]}
              />
              <Range
                label="Intervention duration"
                value={duration}
                min={0}
                max={3}
                step={0.05}
                onChange={setDuration}
              />
              <p className="scope-note">
                The geometry is computed from the declared equations. It does
                not validate a biological or psychological interpretation.
              </p>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="benchmark">
          <section className="instrument-panel benchmark-panel">
            <div className="panel-kicker">
              <span>BOUNDED ADAPTIVE STRESS TESTING / FIRST FIXTURE</span>
              <span className="source-badge">SIMULATION</span>
            </div>
            <h2>
              Give every controller
              <br />
              the same test.
            </h2>
            <p>
              Six gains per controller, four development seeds, twelve untouched
              test seeds. Test cases include loss, repeated disturbances, stale
              sensors and target changes.
            </p>
            <Button className="action" disabled={comparing} onClick={compare}>
              <FlaskConical />
              {comparing
                ? 'Running experiments…'
                : comparison
                  ? 'Run again'
                  : 'Run matched comparison'}
            </Button>
            {comparison && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Controller</TableHead>
                      <TableHead>Gain</TableHead>
                      <TableHead>Tracking error ↓</TableHead>
                      <TableHead>Near boundary ↓</TableHead>
                      <TableHead>Actuation effort ↓</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.rows.map((r) => (
                      <TableRow key={r.controller}>
                        <TableCell>{CONTROLLER_LABELS[r.controller]}</TableCell>
                        <TableCell>{r.gain}</TableCell>
                        <TableCell>{r.mae.toFixed(4)}</TableCell>
                        <TableCell>
                          {(r.boundaryFraction * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell>{r.actuatorEffort.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="scope-note">
                  {comparison.notes} Gain selection score: {comparison.score}.
                </p>
                <a
                  className="text-link"
                  href="/research/benchmark.json"
                  download
                >
                  Download the reference comparison
                </a>
              </>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
