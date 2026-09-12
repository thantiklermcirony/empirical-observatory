'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the reproduced vinext production Link runtime failure. */
/* oxlint-disable react/react-compiler -- These imperative engine/browser effects synchronize external state; this app does not enable React Compiler. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Atom,
  BookOpen,
  Cable,
  Orbit,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import LaboratoryIdentity, { ObservatoryHeader } from '@/components/observatory/LaboratoryIdentity';
import LaboratoryDirectory from '@/components/observatory/LaboratoryDirectory';
import { LAB_IDENTITIES } from '@/lib/lab-presentation';
import CentralDesk from '@/components/observatory/CentralDesk';
import TaoLab from '@/components/observatory/TaoLab';
import QuantumLab from '@/components/observatory/QuantumLab';
import BehaviourLab from '@/components/observatory/BehaviourLab';
import Logbook from '@/components/observatory/Logbook';
import InstrumentDock from '@/components/observatory/InstrumentDock';
import Expeditions from '@/components/observatory/Expeditions';
import { appendLocalRecord, mergeLocalRecords, readLocalRecords, RECORDS_KEY } from '@/lib/local-records';
import type { ExperimentRecord } from '@/lib/engine/records';
import { useStationTools } from '@/lib/webmcp';
import { useInstrumentActivity } from '@/lib/instrument-activity';
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
  const unsavedRecords = useRef(new Map<string, ExperimentRecord>());
  const instrumentActive=useInstrumentActivity();
  const [selected, setSelected] = useState('tao'),
    [view, setView] = useState('question'),
    [records, setRecords] = useState<ExperimentRecord[]>([]),
    [motion, setMotion] = useState(false),
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
    const refresh = () => {
      try { setRecords(mergeLocalRecords(readLocalRecords(localStorage), [...unsavedRecords.current.values()].reverse())); }
      catch { setNotice('Local history could not be read. You can still run and export experiments.'); }
    };
    const changed = (event: StorageEvent) => {
      if (event.key === RECORDS_KEY || event.key === null) refresh();
    };
    refresh();
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  const onRecord = useCallback((r: ExperimentRecord) => {
    unsavedRecords.current.set(r.id, r);
    setRecords((prev) =>
      [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 30),
    );
    const save = () => {
      const persisted = appendLocalRecord(localStorage, r);
      unsavedRecords.current.delete(r.id);
      setRecords(mergeLocalRecords(persisted, [...unsavedRecords.current.values()].reverse()));
      setNotice(unsavedRecords.current.size
        ? 'This experiment was saved. Earlier unsaved records remain in memory; export them before leaving.'
        : 'Experiment added to your local logbook.');
    };
    // Serialize saves across tabs where supported; same-origin room frames also
    // read and write synchronously so a stale React snapshot is never persisted.
    void (async () => {
      try {
        if (navigator.locks) await navigator.locks.request(RECORDS_KEY, save);
        else save();
      } catch {
        setNotice('Browser storage is full or unavailable. Export your records before leaving.');
      }
    })();
  }, []);
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
  return <>
    <div hidden={view !== 'question'}><CentralDesk active={view === 'question' && instrumentActive} /></div>
    <main hidden={view === 'question'} className={`observatory vintage-observatory ${motion ? 'reduce-motion' : ''}`} data-selected={selected} style={{'--lab-accent':current.color} as React.CSSProperties}>
      <ObservatoryHeader />
      <nav className="lab-navigation" aria-label="Station navigation">
        <Button variant="ghost" onClick={() => navigate('question')}><ArrowLeft />Night office</Button>
        <Button variant="ghost" onClick={() => navigate('deck')}>All laboratories</Button>
        <Button variant="ghost" onClick={() => navigate('logbook')}><BookOpen />Logbook <span>{records.length}</span></Button>
        <Button variant="ghost" onClick={() => navigate('instrument')}><Cable />Instruments</Button>
      </nav>
      {view === 'deck' && <LaboratoryDirectory />}
      {view !== 'deck' && view !== 'question' && <LaboratoryIdentity lab={LAB_IDENTITIES[view === 'quantum' ? 'beacon' : view] ?? LAB_IDENTITIES.tao} compact />}
      <div hidden={view !== 'tao'}><TaoLab onRecord={onRecord} active={view === 'tao' && instrumentActive} /></div>
      <div hidden={view !== 'behaviour'}><BehaviourLab onRecord={onRecord} active={view === 'behaviour' && instrumentActive} /></div>
      <div hidden={view !== 'quantum'}><QuantumLab onRecord={onRecord} /></div>
      <div hidden={view !== 'instrument'}><InstrumentDock onRecord={onRecord} active={view === 'instrument' && instrumentActive} /></div>
      {view === 'logbook' && <Logbook records={records} onRecord={onRecord} />}
      {view === 'expeditions' && <Expeditions />}
      <footer className="station-footer"><span><Radio size={16} />{completeRooms.size} primary laboratories in your local record</span><label className="motion-toggle" htmlFor="reduce-motion"><Switch id="reduce-motion" checked={motion} onCheckedChange={v=>setMotion(Boolean(v))} aria-label="Reduce station motion" />Reduce motion</label><a href="/projects">All projects ↗</a></footer>
      {notice && <div className="save-notice" role="status"><span>{notice}</span><Button variant="ghost" onClick={()=>setNotice('')} aria-label="Dismiss status">×</Button></div>}
    </main>
  </>;
}
