'use client';
/* oxlint-disable react/react-compiler -- These imperative engine/browser effects synchronize external state; this app does not enable React Compiler. */
import { useEffect, useRef, useState } from 'react';
import { Cable, Download, Radio, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stat, Trace } from './Controls';
import { record } from '@/lib/engine/records';
import type { ExperimentRecord } from '@/lib/engine/records';
import { validatePacket } from '@/lib/engine/instrument-packet';
import type { Frame, Packet } from '@/lib/engine/instrument-packet';
export default function InstrumentDock({
  onRecord,
  active = true,
}: {
  onRecord: (r: ExperimentRecord) => void;
  active?: boolean;
}) {
  const [endpoint, setEndpoint] = useState('http://127.0.0.1:8768'),
    [token, setToken] = useState(''),
    [connected, setConnected] = useState(false),
    [packet, setPacket] = useState<Packet | null>(null),
    [frames, setFrames] = useState<Frame[]>([]),
    [frameCount, setFrameCount] = useState(0),
    [message, setMessage] = useState(
      'Connect the local adapter to view a BrainFlow stream. Hardware and replay sources are labelled separately.',
    );
  const raw = useRef<Frame[]>([]),
    last = useRef(0),
    meta = useRef<Packet | null>(null);
  useEffect(() => {
    if (!active) setConnected(false);
  }, [active]);
  useEffect(() => {
    if (!connected) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    async function poll() {
      try {
        const u = new URL(endpoint);
        if (
          !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) ||
          !['http:', 'https:'].includes(u.protocol) ||
          u.username ||
          u.password
        )
          throw new Error('Use a local adapter on localhost or 127.0.0.1.');
        u.pathname = '/v1/samples';
        u.search = `since=${last.current}`;
        const res = await fetch(u, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abort.signal,
          cache: 'no-store',
        });
        if (!res.ok)
          throw new Error(
            `Adapter returned ${res.status}. Check its token and allowed origin.`,
          );
        const p = validatePacket(await res.json());
        if (
          meta.current &&
          JSON.stringify([
            p.source,
            p.device,
            p.unit,
            p.sampleRate,
            p.channels,
          ]) !==
            JSON.stringify([
              meta.current.source,
              meta.current.device,
              meta.current.unit,
              meta.current.sampleRate,
              meta.current.channels,
            ])
        )
          throw new Error(
            'Instrument identity changed. Reconnect to start a separate capture.',
          );
        const fresh = p.frames
          .filter((f) => f.timestamp > last.current)
          .sort((a, b) => a.timestamp - b.timestamp);
        if (fresh.length) last.current = fresh.at(-1)!.timestamp;
        raw.current = [...raw.current, ...fresh].slice(-10000);
        meta.current = p;
        if (!stopped) {
          setPacket(p);
          setFrames(raw.current.slice(-500));
          setFrameCount(raw.current.length);
          setMessage(
            fresh.length
              ? `${p.device}: receiving ${p.source.replaceAll('-', ' ')}.`
              : 'Connected; waiting for new samples.',
          );
          timer = setTimeout(poll, 500);
        }
      } catch (e) {
        if (!stopped) {
          setConnected(false);
          setMessage(
            e instanceof Error
              ? e.message
              : 'Connection failed. Use the local station if this browser blocks device access.',
          );
        }
      }
    }
    void poll();
    return () => {
      stopped = true;
      abort.abort();
      clearTimeout(timer);
    };
  }, [connected, endpoint, token]);
  function start() {
    meta.current = null;
    setPacket(null);
    raw.current = [];
    last.current = 0;
    setFrames([]);
    setFrameCount(0);
    setConnected(true);
  }
  function save() {
    if (!meta.current || !raw.current.length) return;
    const p = meta.current;
    onRecord(
      record(
        'instrument',
        p.source,
        0,
        {
          device: p.device,
          sampleRate: p.sampleRate,
          channels: p.channels,
          unit: p.unit,
          clock: 'device acquisition timestamp',
          adapter: 'brainflow-bridge-0.1',
        },
        raw.current,
        {
          frames: raw.current.length,
          durationSeconds:
            raw.current.at(-1)!.timestamp - raw.current[0].timestamp,
        },
        false,
      ),
    );
    setMessage('The available signal window is saved in the logbook.');
  }
  const values = frames.map((f) => f.channels[0]),
    rms = values.length
      ? Math.sqrt(values.reduce((a, x) => a + x * x, 0) / values.length)
      : 0,
    trace = frames.map((f) => ({
      t: f.timestamp - (frames[0]?.timestamp ?? 0),
      e: f.channels[0],
    })),
    max = Math.max(1, ...values.map(Math.abs));
  return (
    <div className="lab-content">
      <div className="lab-grid">
        <section className="instrument-panel">
          <div className="panel-kicker">
            <span>INSTRUMENT DOCK / LOCAL STREAM</span>
            <span className="source-badge">
              {packet ? packet.source.toUpperCase() : 'DISCONNECTED'}
            </span>
          </div>
          <div className="instrument-heading">
            <Radio size={38} />
            <h2>{packet?.device ?? 'Awaiting an instrument'}</h2>
            <p>
              The game and the instrument keep their own clocks. The adapter
              supplies acquisition timestamps for inspection and replay.
            </p>
          </div>
          {frames.length && active ? (
            <Trace
              data={trace}
              domain={[-max, max]}
              keys={[
                {
                  key: 'e',
                  label: packet?.channels[0] ?? 'Channel 1',
                  color: '#f5bd77',
                },
              ]}
            />
          ) : (
            <div className="empty-signal">
              <Cable size={40} />
              <p>No signal is being measured.</p>
            </div>
          )}
          <div className="stats-row">
            <Stat label="Received" value={frameCount} unit=" samples" />
            <Stat
              label="Sampling rate"
              value={packet?.sampleRate ?? '—'}
              unit=" Hz"
            />
            <Stat
              label="Channel RMS"
              value={frames.length ? rms.toFixed(2) : '—'}
              unit={` ${packet?.unit ?? ''}`}
            />
          </div>
          <p className="scope-note">
            RMS is a signal-amplitude summary. This view does not infer
            attention, emotion or consciousness, and it does not control game
            difficulty.
          </p>
        </section>
        <aside className="control-panel">
          <span className="eyebrow">CONNECT AN INSTRUMENT</span>
          <h2>
            Bring a real signal
            <br />
            aboard.
          </h2>
          <p>
            The downloadable adapter supports BrainFlow’s synthetic board,
            recorded playback and compatible EEG hardware. Hardware acquisition
            requires your device to be connected locally.
          </p>
          <label className="control-field" htmlFor="adapter-address">
            <span>Local adapter address</span>
            <Input
              id="adapter-address"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              disabled={connected}
            />
          </label>
          <label className="control-field" htmlFor="adapter-token">
            <span>Adapter token</span>
            <Input
              id="adapter-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={connected}
              autoComplete="off"
              placeholder="Shown by your local adapter"
            />
          </label>
          <div className="button-row">
            <Button
              className="action"
              disabled={!token}
              onClick={() => (connected ? setConnected(false) : start())}
            >
              {connected ? <Square /> : <Cable />}
              {connected ? 'Disconnect' : 'Connect'}
            </Button>
            <Button
              className="action"
              variant="outline"
              disabled={!frames.length}
              onClick={save}
            >
              <Download />
              Keep capture
            </Button>
          </div>
          <p className="scope-note" role="status">
            {message}
          </p>
          <a
            className="text-link"
            href="/downloads/observatory-adapters.zip"
            download
          >
            Download adapters and setup guide <Download size={16} />
          </a>
          <details className="method">
            <summary>Local setup and quantum access</summary>
            <p>
              Follow the included README. The adapter binds only to this
              computer and uses a session token. It does not send recordings to
              a cloud service. Browser restrictions may require running the
              downloadable station locally.
            </p>
            <p>
              The separate Qiskit adapter runs the beacon experiments on Aer.
              IBM hardware execution is opt-in, uses your own account and enters
              its provider’s queue.
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}
