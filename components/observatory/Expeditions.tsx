'use client';
import { useState } from 'react';
import {
  Globe2,
  Dna,
  BrainCircuit,
  Download,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Choice, Stat } from './Controls';
import { downloadJSON } from './Logbook';
import initial from '@/public/research/oslo-snapshot.json';
import archiveManifest from '@/public/research/oslo-snapshot.manifest.json';
import memory from '@/public/research/memory-results.json';
import {
  validateSnapshot,
  compareSnapshots,
} from '@/integrations/earth/station-feed.mjs';
type Snapshot = typeof initial & { provenance?: unknown };
const fmt = (n: number | null) => (n === null ? 'Unknown' : String(n));
const utc = (ms: number | string | null) =>
  ms === null
    ? 'Unknown'
    : new Date(ms).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
function Earth() {
  const [history, setHistory] = useState<Snapshot[]>([{...initial, provenance: archiveManifest}]),
    [cursor, setCursor] = useState(0),
    [selected, setSelected] = useState(initial.records[0].stationId),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(
      'Archived observation. Request a current capture to begin a local comparison.',
    ),
    [lastRequest, setLastRequest] = useState(0);
  const snapshot = history[cursor],
    station =
      snapshot.records.find((r) => r.stationId === selected) ??
      snapshot.records[0];
  const previous = cursor > 0 ? history[cursor - 1] : null;
  const delta = previous
    ? compareSnapshots(previous, snapshot).find(
        (r: { stationId: string }) => r.stationId === station.stationId,
      )
    : null;
  const points = snapshot.records.filter(
    (r) => r.lat !== null && r.lon !== null,
  );
  const minLat = Math.min(...points.map((r) => r.lat!)),
    maxLat = Math.max(...points.map((r) => r.lat!));
  const minLon = Math.min(...points.map((r) => r.lon!)),
    maxLon = Math.max(...points.map((r) => r.lon!));
  async function capture() {
    if (Date.now() - lastRequest < 60000) {
      setMessage(
        'Wait one minute between provider requests. The current capture remains available.',
      );
      return;
    }
    setBusy(true);
    setLastRequest(Date.now());
    try {
      const res = await fetch('/api/earth');
      const value: unknown = await res.json();
      if (!res.ok)
        throw new Error(
          value && typeof value === 'object' && 'error' in value
            ? String(value.error)
            : `Capture HTTP ${res.status}`,
        );
      const next = validateSnapshot(value) as Snapshot;
      if (
        Date.parse(next.retrievedAt) <= Date.parse(history.at(-1)!.retrievedAt)
      )
        throw new Error('Provider cache has no newer capture yet.');
      const h = [...history, next].slice(-20);
      setHistory(h);
      setCursor(h.length - 1);
      setMessage(
        'Current provider capture received. Inspect its event clock and quality flags; export to keep it.',
      );
    } catch (e) {
      setMessage(
        `${e instanceof Error ? e.message : 'Capture failed'}. Earlier evidence is retained.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="lab-grid expedition-grid">
      <section className="instrument-panel">
        <div className="panel-kicker">
          <span>OSLO / STATION OBSERVATIONS</span>
          <span className="source-badge">
            CAPTURE {cursor + 1} / {history.length}
          </span>
        </div>
        <svg
          className="earth-plot"
          viewBox="0 0 650 350"
          role="img"
          aria-label="Oslo stations by longitude and latitude; select a station below for values"
        >
          <defs>
            <pattern
              id="earth-grid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="#25454f"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            x="30"
            y="15"
            width="590"
            height="300"
            fill="url(#earth-grid)"
          />
          {points.map((r) => (
            <circle
              key={r.id}
              cx={50 + ((r.lon! - minLon) / (maxLon - minLon || 1)) * 550}
              cy={295 - ((r.lat! - minLat) / (maxLat - minLat || 1)) * 255}
              r={r.stationId === station.stationId ? 10 : 5}
              fill={
                r.quality.length
                  ? '#a8aab3'
                  : r.availabilityFraction === 0
                    ? '#f5bd77'
                    : '#79e6d5'
              }
              stroke={r.stationId === station.stationId ? '#fff' : 'none'}
            >
              <title>
                {r.name}: {fmt(r.bikesAvailable)} bikes available
              </title>
            </circle>
          ))}
          <text x="32" y="343" fill="#a9bdc7" fontSize="14">
            {minLon.toFixed(3)}° E
          </text>
          <text x="535" y="343" fill="#a9bdc7" fontSize="14">
            {maxLon.toFixed(3)}° E
          </text>
          <text x="40" y="34" fill="#a9bdc7" fontSize="14">
            N ↑
          </text>
        </svg>
        <p className="scope-note">
          Coordinate plot, north up. Points retain their measured locations;
          axes are fitted independently to this Oslo subset.
        </p>
        <div className="stats-row">
          <Stat label="Available bikes" value={fmt(station.bikesAvailable)} />
          <Stat label="Reported capacity" value={fmt(station.capacity)} />
          <Stat
            label="Available-bike fraction"
            value={
              station.availabilityFraction === null
                ? 'Unknown'
                : `${(100 * station.availabilityFraction).toFixed(1)}%`
            }
          />
        </div>
        <Choice
          label="Station"
          value={station.stationId}
          onChange={setSelected}
          options={snapshot.records.map((r) => ({
            value: r.stationId,
            label: r.name,
          }))}
        />
        <Choice
          label="Replay captured observation"
          value={String(cursor)}
          onChange={(v) => setCursor(Number(v))}
          options={history.map((s, i) => ({
            value: String(i),
            label: `${i + 1} · ${utc(s.retrievedAt)}`,
          }))}
        />
        <p className="scope-note">
          {delta?.comparable
            ? `Observed change: ${delta.observedBikeChange > 0 ? '+' : ''}${delta.observedBikeChange} available bikes over ${delta.elapsedSeconds} seconds.`
            : 'No comparable preceding station observation.'}{' '}
          A count change is not a trip count or a causal effect.
        </p>
      </section>
      <section className="mission-panel">
        <span className="eyebrow">EARTH EXPEDITION</span>
        <h1>Watch a real system.</h1>
        <p>
          Collect observations, inspect what the sensor means, then replay the
          same evidence.
        </p>
        <Button
          className="launch-button"
          disabled={busy}
          onClick={() => void capture()}
        >
          <RefreshCw />
          {busy ? 'Retrieving provider data…' : 'Capture current observations'}
        </Button>
        <p className="scope-note" role="status">
          {message}
        </p>
        <div className="evidence-clocks">
          <strong>{station.name}</strong>
          <p>Station reported: {utc(station.observedAtMs)}</p>
          <p>Retrieved: {utc(snapshot.retrievedAt)}</p>
          <p>
            Quality at retrieval:{' '}
            {station.quality.length
              ? station.quality.join(', ')
              : 'Checks passed'}
          </p>
        </div>
        <p>
          Every capture is a past observation. Its age continues to increase
          after retrieval. Unknown values stay unknown; zero available bikes is
          an actual report.
        </p>
        <div className="button-row">
          <Button
            className="action"
            variant="outline"
            onClick={() => downloadJSON(snapshot, 'oslo-observation.json')}
          >
            <Download />
            Export capture
          </Button>
          <Button
            className="action"
            variant="outline"
            onClick={() =>
              downloadJSON(
                { schema: 'earth-session/1', history },
                'oslo-session.json',
              )
            }
          >
            <Download />
            Export session
          </Button>
        </div>
        <p className="scope-note">
          Up to 20 captures stay in this page until you leave. The server caches
          public feeds for 60 seconds. No background monitoring is scheduled.
        </p>
        <details className="experiment-contract">
          <summary>What this can establish</summary>
          <p>
            God’s Eye View already displays live bikes. Our extension adds
            explicit measurement provenance, quality checks and replay. Its
            optional globe module has lifecycle tests; full-host acceptance
            remains a release gate. Forecast comparison needs a prospectively
            collected dataset with frozen held-out days. Historical trip logs
            omit staff moves and cannot reconstruct station availability.
          </p>
        </details>
        <p className="scope-note">
          Contains data from{' '}
          <a href="https://oslobysykkel.no/en/open-data">Oslo City Bike</a>{' '}
          under <a href="https://data.norge.no/nlod/en/2.0">NLOD 2.0</a>.
          Selected and normalized; no provider endorsement.
        </p>
      </section>
    </div>
  );
}
function Memory() {
  const [index, setIndex] = useState('1');
  const c = memory.cases[Number(index)];
  const names: Record<string, string> = {
    observation_table: 'Observation only',
    learned_delay_register: 'Selected history',
    independent_register_control: 'Unrelated history control',
  };
  return (
    <div className="lab-grid expedition-grid">
      <section className="instrument-panel">
        <div className="panel-kicker">
          <span>POPGYM / HELD-OUT RESULTS</span>
          <span className="source-badge amber">EXECUTED BENCHMARK</span>
        </div>
        <Choice
          label="Task"
          value={index}
          onChange={setIndex}
          options={memory.cases.map((x, i) => ({
            value: String(i),
            label: x.name,
          }))}
        />
        <div className="memory-bars">
          {c.summaries.map((s) => (
            <div key={s.method}>
              <span>{names[s.method]}</span>
              <div>
                <i style={{ width: `${s.meanAccuracy * 100}%` }} />
              </div>
              <strong>{(100 * s.meanAccuracy).toFixed(2)}%</strong>
            </div>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>95% episode interval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.summaries.map((s) => (
              <TableRow key={s.method}>
                <TableCell>{names[s.method]}</TableCell>
                <TableCell>{(100 * s.meanAccuracy).toFixed(2)}%</TableCell>
                <TableCell>
                  {s.episodeBootstrap95
                    .map((v) => (100 * v).toFixed(2))
                    .join('–')}
                  %
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="stats-row">
          <Stat
            label="Development episodes"
            value={memory.developmentSeeds.length}
          />
          <Stat
            label="Held-out episodes / task"
            value={memory.testSeeds.length}
          />
          <Stat label="Selected lag" value={c.model.selectedLag} />
        </div>
        <Button
          className="action"
          variant="outline"
          onClick={() => downloadJSON(memory, 'popgym-evidence.json')}
        >
          <Download />
          Export full results
        </Button>
      </section>
      <section className="mission-panel">
        <span className="eyebrow">AI EXPEDITION</span>
        <h1>What did the present forget?</h1>
        <p>
          A delayed-recall task can show the same observation while requiring a
          different answer. A short history can supply the missing information.
        </p>
        <p>
          These are actual runs of POPGym 1.0.7. A five-candidate lag selector
          and an observation lookup were fitted on development episodes, then
          evaluated on 200 fresh episodes per task.
        </p>
        <p>
          The current-cue control matters: both methods reach 100% when the
          visible cue contains the answer. Unrelated history stays near chance.
        </p>
        <details className="experiment-contract" open>
          <summary>Result boundary</summary>
          <p>
            This reproduces expected memory behaviour in a standard task. It
            does not test a new neural architecture, an LLM, general
            intelligence or AI cost savings. The next milestone is a learned
            state-revision model against recurrent and Transformer baselines
            with equal information and measured compute.
          </p>
        </details>
        <a
          className="text-link"
          href="https://github.com/proroklab/popgym/tree/v1.0.7"
        >
          POPGym source <ArrowUpRight size={16} />
        </a>
      </section>
    </div>
  );
}
function Genome() {
  const [position, setPosition] = useState('1295046'),
    [ref, setRef] = useState('T'),
    [alt, setAlt] = useState('G'),
    [message, setMessage] = useState('');
  function plan() {
    const n = Number(position);
    if (
      !Number.isSafeInteger(n) ||
      n < 1 ||
      !/^[ACGT]$/.test(ref) ||
      !/^[ACGT]$/.test(alt) ||
      ref === alt
    ) {
      setMessage(
        'Use a positive 1-based position and distinct A/C/G/T alleles.',
      );
      return;
    }
    downloadJSON(
      {
        schema: 'observatory-atlas-request/1',
        assembly: 'GRCh38',
        coordinateSystem: '1-based',
        organism: 'Homo sapiens',
        purpose: 'Request plan only; not a score or assay measurement',
        requestedScorers: [],
        ontologyTerms: [],
        geneIds: [],
        variants: [
          {
            chromosome: 'chr5',
            position: n,
            reference_bases: ref,
            alternate_bases: alt,
          },
        ],
      },
      'atlas-request-plan.json',
    );
    setMessage(
      'Plan exported. Inspect current scorer metadata with the local adapter, then choose compatible scorers and contexts before querying.',
    );
  }
  return (
    <div className="lab-grid expedition-grid">
      <section className="instrument-panel">
        <div className="panel-kicker">
          <span>ALPHAGENOME ATLAS / REQUEST PLANNER</span>
          <span className="source-badge violet">NO MODEL SCORE LOADED</span>
        </div>
        <div className="genome-diagram">
          <Dna size={72} />
          <span>DNA VARIANT</span>
          <ArrowUpRight />
          <span>CELL CONTEXT</span>
          <ArrowUpRight />
          <span>MEASURED RESPONSE</span>
        </div>
        <p>
          Keep sequence, predicted effect and measured assay response as
          separate layers. A prediction changes what we test; an assay
          determines what happened.
        </p>
        <label className="control-field" htmlFor="variant-position">
          <span>Chromosome 5 · GRCh38 · 1-based position</span>
          <Input
            id="variant-position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <div className="allele-fields">
          <label className="control-field" htmlFor="variant-ref">
            <span>Reference allele</span>
            <Input
              id="variant-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
            />
          </label>
          <label className="control-field" htmlFor="variant-alt">
            <span>Alternate allele</span>
            <Input
              id="variant-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value.toUpperCase())}
            />
          </label>
        </div>
        <Button className="launch-button" onClick={plan}>
          <Download />
          Export Atlas request plan
        </Button>
        <p role="status" className="scope-note">
          {message}
        </p>
        <p className="scope-note">
          The starting variant is a public literature example. Editing it does
          not verify its reference allele. Scorers and ontology terms are
          intentionally selected from current API metadata in the local adapter.
        </p>
      </section>
      <section className="mission-panel">
        <span className="eyebrow">GENOME EXPEDITION</span>
        <h1>Context is part of the experiment.</h1>
        <p>
          The integration includes an AlphaGenome Atlas adapter with an explicit
          query budget, a metadata selection step and a fixture mode. Live
          requests require your own API access and acceptance of the provider’s
          terms.
        </p>
        <details className="experiment-contract" open>
          <summary>First scientific target</summary>
          <p>
            Reproduce and audit the TERT promoter comparison in HEK293T and
            glioblastoma cells using measured Kircher MPRA data. AlphaGenome
            already discusses this benchmark; it is a reproduction target, not
            an untouched test set or a new discovery of context dependence.
          </p>
        </details>
        <p>
          The next advance must predict an additional measured outcome on a
          genuinely separate assay, beyond the established context-aware
          baseline.
        </p>
        <p className="scope-note">
          Atlas/API outputs have use restrictions separate from the SDK’s Apache
          license. This release performs no live Atlas query and does not
          include restricted outputs for model training.
        </p>
        <a
          className="text-link"
          href="https://github.com/google-deepmind/alphagenome"
        >
          AlphaGenome source <ArrowUpRight size={16} />
        </a>
      </section>
    </div>
  );
}
export default function Expeditions() {
  return (
    <div className="lab-content">
      <Tabs defaultValue="earth">
        <TabsList className="lab-tabs">
          <TabsTrigger value="earth">
            <Globe2 />
            Earth
          </TabsTrigger>
          <TabsTrigger value="memory">
            <BrainCircuit />
            AI memory
          </TabsTrigger>
          <TabsTrigger value="genome">
            <Dna />
            Genome
          </TabsTrigger>
        </TabsList>
        <TabsContent value="earth">
          <Earth />
        </TabsContent>
        <TabsContent value="memory">
          <Memory />
        </TabsContent>
        <TabsContent value="genome">
          <Genome />
        </TabsContent>
      </Tabs>
    </div>
  );
}
