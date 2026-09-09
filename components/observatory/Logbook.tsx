'use client';
import { useRef, useState } from 'react';
import { Download, FileUp, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { simulate } from '@/lib/engine/tao';
import type { RunConfig } from '@/lib/engine/tao';
import { quantumReplay } from '@/lib/engine/quantum';
import type { Measurement } from '@/lib/engine/quantum';
import { analyseBehaviour } from '@/lib/engine/behaviour';
import type { Trial } from '@/lib/engine/behaviour';
import { validateRecord } from '@/lib/engine/records';
import type { ExperimentRecord } from '@/lib/engine/records';
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Logbook({
  records,
  onRecord,
}: {
  records: ExperimentRecord[];
  onRecord: (r: ExperimentRecord) => void;
}) {
  const file = useRef<HTMLInputElement>(null),
    [message, setMessage] = useState(''),
    [analysis, setAnalysis] = useState<unknown>(null),
    [analysed, setAnalysed] = useState<string | null>(null);
  async function importFile(f: File) {
    try {
      if (f.size > 2_000_000)
        throw new Error('Use a record smaller than 2 MB.');
      const r = validateRecord(JSON.parse(await f.text()));
      onRecord(r);
      setMessage(
        'Record imported. Its source label is supplied by the file; use replay to verify a simulation.',
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Unable to import this record.',
      );
    }
  }
  function replay(r: ExperimentRecord) {
    try {
      validateRecord(r);
      let result: unknown;
      if (r.room === 'tao') {
        const config = { ...r.config, seed: r.seed } as unknown as RunConfig;
        const run = simulate(config, (r.data as { actions: number[] }).actions);
        const savedActions = (r.data as { actions: number[] }).actions;
        if (run.samples.some((s, i) => Math.abs(s.u - savedActions[i]) > 1e-12))
          throw new Error(
            'Saved actions do not match the configured controller and seed.',
          );
        result = run.metrics;
      } else if (r.room === 'quantum')
        result = quantumReplay(
          r.seed,
          r.data as Measurement[],
          r.engineVersion,
        );
      else if (r.room === 'behaviour')
        result = analyseBehaviour(r.data as Trial[]);
      else
        result = {
          source: r.source,
          frames: (r.data as unknown[]).length,
          note: 'Recorded instrument data can be inspected, but this file alone does not attest hardware provenance.',
        };
      setAnalysis(result);
      setAnalysed(r.id);
      setMessage(
        r.source === 'simulation'
          ? 'Simulation recomputed from the saved experiment.'
          : 'Recorded measurements summarised; physical events cannot be rerun from a file.',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Replay failed.');
      setAnalysis(null);
    }
  }
  return (
    <div className="lab-content">
      <section className="logbook-header">
        <div>
          <span className="eyebrow">EXPEDITION RECORD</span>
          <h1>Keep the evidence.</h1>
          <p>
            Experiments are saved on this device. Export a record to share its
            settings and data.
          </p>
        </div>
        <Button
          className="action"
          variant="outline"
          onClick={() => file.current?.click()}
        >
          <FileUp />
          Import experiment
        </Button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = '';
          }}
        />
      </section>
      <p role="status" className="scope-note">
        {message}
      </p>
      {records.length === 0 ? (
        <div className="empty-log">
          <BookOpen size={36} />
          <h2>Your first discovery belongs here.</h2>
          <p>Complete a laboratory mission to create a record.</p>
        </div>
      ) : (
        <div className="record-list">
          {records.map((r) => (
            <article className="record-card" key={r.id}>
              <span
                className={`source-badge ${r.room === 'quantum' ? 'violet' : r.room === 'behaviour' ? 'amber' : ''}`}
              >
                {r.source.toUpperCase()}
              </span>
              <h3>
                {r.room === 'tao'
                  ? 'TAO recovery'
                  : r.room === 'quantum'
                    ? 'Quantum beacon'
                    : r.room === 'behaviour'
                      ? 'Signal response'
                      : 'Instrument capture'}
              </h3>
              <p>
                {new Date(r.createdAt).toLocaleString()} · Seed {r.seed}
              </p>
              <small>
                {r.completed ? 'Complete record' : 'Partial record'} · v
                {r.engineVersion}
              </small>
              <div className="button-row">
                <Button
                  className="action"
                  variant="outline"
                  onClick={() => replay(r)}
                >
                  <Play />
                  {r.source === 'simulation' ? 'Replay' : 'Inspect'}
                </Button>
                <Button
                  className="action"
                  variant="outline"
                  onClick={() =>
                    downloadJSON(r, `observatory-${r.room}-${r.seed}.json`)
                  }
                >
                  <Download />
                  Export
                </Button>
              </div>
              {analysed === r.id && analysis !== null && (
                <pre className="record-analysis">
                  {JSON.stringify(analysis, null, 2)}
                </pre>
              )}
            </article>
          ))}
        </div>
      )}
      <p className="scope-note">
        Local history retains the latest 30 records. Exports preserve the full
        selected record. Imported files are data only; their summary fields are
        not treated as verified results.
      </p>
    </div>
  );
}
