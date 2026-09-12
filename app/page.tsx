'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the reproduced vinext production Link runtime failure. */
/* oxlint-disable react/react-compiler -- These imperative engine/browser effects synchronize external state; this app does not enable React Compiler. */
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Atom,
  BookOpen,
  Cable,
  CheckCircle2,
  Orbit,
  Radio,
  ShieldCheck,
  Globe2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Station from '@/components/observatory/Station';
import CentralDesk from '@/components/observatory/CentralDesk';
import TaoLab from '@/components/observatory/TaoLab';
import QuantumLab from '@/components/observatory/QuantumLab';
import BehaviourLab from '@/components/observatory/BehaviourLab';
import Logbook from '@/components/observatory/Logbook';
import InstrumentDock from '@/components/observatory/InstrumentDock';
import Expeditions from '@/components/observatory/Expeditions';
import { validateRecord } from '@/lib/engine/records';
import type { ExperimentRecord } from '@/lib/engine/records';
import { useStationTools } from '@/lib/webmcp';
const rooms = [
  {
    id: 'tao',
    number: '01',
    name: 'TAO Chamber',
    subtitle: 'Restore a system under pressure.',
    icon: Orbit,
    color: '#79e6d5',
  },
  {
    id: 'behaviour',
    number: '02',
    name: 'Signal Bay',
    subtitle: 'Discover how you adapt.',
    icon: Activity,
    color: '#f5bd77',
  },
  {
    id: 'quantum',
    number: '03',
    name: 'Quantum Lab',
    subtitle: 'Choose what to measure.',
    icon: Atom,
    color: '#b4a5fa',
  },
];
export default function Home() {
  const [selected, setSelected] = useState('tao'),
    [view, setView] = useState('question'),
    [records, setRecords] = useState<ExperimentRecord[]>([]),
    [motion, setMotion] = useState(false),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState('');
  const current = rooms.find((r) => r.id === selected)!;
  useEffect(() => {
    const restoreView = () => {
      const target = window.location.hash.slice(1);
      const allowed = [
        'question',
        'deck',
        'tao',
        'behaviour',
        'quantum',
        'instrument',
        'expeditions',
        'logbook',
      ];
      const next = allowed.includes(target) ? target : 'question';
      setView(next);
      if (rooms.some((r) => r.id === next)) setSelected(next);
    };
    restoreView();
    window.addEventListener('hashchange', restoreView);
    return () => window.removeEventListener('hashchange', restoreView);
  }, []);
  useEffect(() => {
    setMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    try {
      const raw = JSON.parse(
        localStorage.getItem('observatory-records-v1') ?? '[]',
      );
      if (Array.isArray(raw))
        setRecords(
          raw.slice(0, 30).flatMap((r) => {
            try {
              return [validateRecord(r)];
            } catch {
              return [];
            }
          }),
        );
    } catch {
      setNotice(
        'Local history could not be read. You can still run and export experiments.',
      );
    }
    setReady(true);
  }, []);
  const onRecord = useCallback((r: ExperimentRecord) => {
    setRecords((prev) =>
      [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 30),
    );
    setNotice('Experiment added to your local logbook.');
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('observatory-records-v1', JSON.stringify(records));
    } catch {
      setNotice(
        'Browser storage is full or unavailable. Export your records before leaving.',
      );
    }
  }, [records, ready]);
  const navigate = useCallback((v: string) => {
    setView(v);
    if (rooms.some((r) => r.id === v)) setSelected(v);
    window.location.hash = v;
  }, []);
  useStationTools({ view, records, navigate });
  const completeRooms = new Set(
    records
      .filter(
        (r) => r.completed && ['tao', 'behaviour', 'quantum'].includes(r.room),
      )
      .map((r) => r.room),
  );
  if (view === 'question') return <CentralDesk />;
  return (
    <main className="observatory">
      <header className="station-header">
        <button
          className="brand"
          onClick={() => navigate('deck')}
          aria-label="Return to station deck"
        >
          <Orbit size={30} />
          <div>
            <span className="eyebrow">THE EMPIRICAL ARCHITECTURE</span>
            <strong>OBSERVATORY</strong>
          </div>
        </button>
        <div className="station-status">
          <span className="status-light" /> EXPEDITION 001{' '}
          <span className="muted">/ FIRST CONTACT</span>
        </div>
        <div className="header-actions">
          <a className="projects-link" href="/projects">
            Current projects <ArrowUpRight size={18} />
          </a>
          <Button
            variant="ghost"
            className={view === 'expeditions' ? 'nav-active' : ''}
            onClick={() => navigate('expeditions')}
          >
            <Globe2 />
            <span>Expeditions</span>
          </Button>
          <Button
            variant="ghost"
            className={view === 'instrument' ? 'nav-active' : ''}
            onClick={() => navigate('instrument')}
          >
            <Cable />
            <span>Instruments</span>
          </Button>
          <Button
            variant="ghost"
            className={view === 'logbook' ? 'nav-active' : ''}
            onClick={() => navigate('logbook')}
          >
            <BookOpen />
            <span>Logbook</span>
            <b>{records.length}</b>
          </Button>
        </div>
      </header>
      {view === 'deck' && (
        <>
          <section
            className="station-viewport"
            aria-label="Orbital research station"
          >
            <Station
              selected={selected}
              onSelect={setSelected}
              reducedMotion={motion}
            />
            <div className="viewport-title">
              <span className="eyebrow">RESEARCH DECK / 3 LABORATORIES</span>
              <h1>
                Your next discovery
                <br />
                starts here.
              </h1>
              <p>
                Enter a laboratory. Make a prediction.
                <br />
                Find out what your instruments missed.
              </p>
              <a className="projects-cta" href="/projects">
                Current projects <ArrowUpRight size={22} />
              </a>
              <a className="latest-project human-entry" href="/question">
                Question Desk — turn a question into a visible investigation
              </a>
              <a className="latest-project" href="/active-context">
                Active Context — help your agent resume with evidence
              </a>
              <a className="latest-project" href="/atlas">
                New: Research Atlas — explore the whole programme
              </a>
              <a className="latest-project human-entry" href="/human">
                Enter the Human Condition Lab — body, mind and Earth
              </a>
            </div>
            <div className="flight-label">
              <span className="status-light" /> {completeRooms.size}/3
              LABORATORIES INVESTIGATED
              <br />
              <span className="muted">Drag to orbit · select a laboratory</span>
            </div>
            <aside
              className="mission-card"
              style={{ '--room-color': current.color } as React.CSSProperties}
            >
              <span className="eyebrow">MISSION {current.number}</span>
              <current.icon size={32} />
              <h2>{current.name}</h2>
              <p>{current.subtitle}</p>
              <div className="mission-rule">
                <ShieldCheck size={18} />
                <span>Every experiment keeps its evidence.</span>
              </div>
              <Button
                className="launch-button"
                onClick={() => navigate(selected)}
              >
                Enter laboratory <ArrowUpRight />
              </Button>
            </aside>
          </section>
          <nav className="room-dock" aria-label="Laboratories">
            {rooms.map((r) => (
              <button
                key={r.id}
                className={`room-button ${selected === r.id ? 'selected' : ''}`}
                onClick={() => {
                  if (selected === r.id) navigate(r.id);
                  else setSelected(r.id);
                }}
                style={{ '--room-color': r.color } as React.CSSProperties}
              >
                <span className="room-number">{r.number}</span>
                <r.icon size={24} />
                <span>
                  <strong>
                    {r.name}{' '}
                    {completeRooms.has(r.id as ExperimentRecord['room']) && (
                      <CheckCircle2 size={14} />
                    )}
                  </strong>
                  <small>{r.subtitle}</small>
                </span>
                <ArrowUpRight className="dock-arrow" size={20} />
              </button>
            ))}
          </nav>
        </>
      )}
      {view !== 'deck' && (
        <nav className="lab-navigation" aria-label="Station navigation">
          <Button variant="ghost" onClick={() => navigate('deck')}>
            <ArrowLeft />
            Research deck
          </Button>
          <span className="eyebrow">
            {rooms.find((r) => r.id === view)?.name ??
              (view === 'logbook'
                ? 'EXPEDITION LOGBOOK'
                : view === 'expeditions'
                  ? 'EARTH · AI · GENOME'
                  : 'INSTRUMENT DOCK')}
          </span>
          <span className="eyebrow">FIRST CONTACT / 0.2</span>
        </nav>
      )}
      <div hidden={view !== 'tao'}>
        <TaoLab onRecord={onRecord} active={view === 'tao'} />
      </div>
      <div hidden={view !== 'behaviour'}>
        <BehaviourLab onRecord={onRecord} active={view === 'behaviour'} />
      </div>
      <div hidden={view !== 'quantum'}>
        <QuantumLab onRecord={onRecord} />
      </div>
      <div hidden={view !== 'instrument'}>
        <InstrumentDock onRecord={onRecord} active={view === 'instrument'} />
      </div>
      {view === 'logbook' && <Logbook records={records} onRecord={onRecord} />}
      {view === 'expeditions' && <Expeditions />}
      <footer className="station-footer">
        <span>
          <Radio size={16} /> LOCAL EXPERIMENT RECORDS
        </span>
        <label className="motion-toggle" htmlFor="reduce-motion">
          <Switch
            id="reduce-motion"
            checked={motion}
            onCheckedChange={(v) => setMotion(Boolean(v))}
            aria-label="Reduce station motion"
          />
          Reduce motion
        </label>
        <a
          className="text-link"
          href="https://github.com/thantiklermcirony/empirical-architecture"
          target="_blank"
          rel="noreferrer"
        >
          The programme <ArrowUpRight size={14} />
        </a>
        <a className="text-link" href="/projects">
          Current projects <ArrowUpRight size={14} />
        </a>
      </footer>
      {notice && (
        <div className="save-notice" role="status">
          <span>{notice}</span>
          <Button
            variant="ghost"
            onClick={() => setNotice('')}
            aria-label="Dismiss status"
          >
            ×
          </Button>
        </div>
      )}
    </main>
  );
}
