'use client';
/* oxlint-disable next/no-html-link-for-pages, next/no-img-element -- Existing navigation and authored room artwork. */
import { useEffect, useRef, useState } from 'react';
import { Monitor, Printer, FolderOpen, Volume2, VolumeX, X, Radio } from 'lucide-react';

const files = [
  { name: 'Mathematics & UHL', href: '/labs/mathematics', note: 'Exact bounded actions, composition and the premises each result needs.' },
  { name: 'Biology & adaptation', href: '/labs/biology', note: 'Resource ceilings and measurement context. Biological calibration remains a separate question.' },
  { name: 'Quantum mechanisms', href: '/labs/quantum', note: 'Dimensionless reaction reference. Optical evidence and larger mechanisms remain under review.' },
  { name: 'Dynamics & control', href: '/labs/dynamics', note: 'Seeded controller comparisons, including where conventional baselines win.' },
  { name: 'Temporal grammar', href: '/agents', note: 'Preserve quantities, units, preparation and the order of actions in one inquiry.' },
  { name: 'Living encyclopedia', href: '/encyclopedia', note: 'Source-pinned research entries and the evidence still needed to change them.' },
  { name: 'Two-family world', href: '/families', note: 'A synthetic world with learning and language. Learned control did not beat random.' },
];
export default function ObservatoryOffice({ busy, reportReady, enter, openReport, sound, toggleSound }: { busy: boolean; reportReady: boolean; enter: () => void; openReport: () => void; sound: boolean; toggleSound: () => void }) {
  const [panel, setPanel] = useState<'files' | 'tv' | 'uap' | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (panel) dialog.current?.showModal(); else dialog.current?.close(); }, [panel]);
  return <>
    <section className="office-scene" aria-label="Interactive observatory office">
      <img className="office-art" src="/images/observatory-1980s.png" alt="A moonlit observatory with a telescope, an old computer, research files, a desk printer and an E.T. poster." />
      <div className="office-caption"><span>NIGHT SHIFT / OBSERVATORY 01</span><h1>A question worth staying up for.</h1></div>
      <button className="office-hotspot office-terminal" onClick={enter} aria-label="Sit at the computer terminal"><span className="office-mini-screen">EMPIRICAL OS<br />{busy ? 'PROCESSING…' : 'C:\\OBSERVATORY>'}<i>▌</i></span><span className="office-object-label"><Monitor size={17} /> Enter terminal</span></button>
      <button className={`office-hotspot office-printer ${busy ? 'is-printing' : ''} ${reportReady ? 'has-report' : ''}`} onClick={openReport} disabled={!reportReady || busy} aria-label={busy ? 'Printer processing inquiry' : reportReady ? 'Collect completed laboratory report' : 'Printer waiting for a question'}><span className="office-object-label"><Printer size={17} />{busy ? 'Printing your inquiry…' : reportReady ? 'Your report is ready · collect' : 'Printer · awaiting inquiry'}</span>{reportReady && !busy && <span className="office-paper-ready">PRINTOUT READY<br />OPEN REPORT ↗</span>}</button>
      <button className="office-hotspot office-file office-file-left" onClick={() => setPanel('files')}><span className="office-object-label"><FolderOpen size={17} /> Mathematics / biology<br /><small>Open research files</small></span></button>
      <button className="office-hotspot office-file office-file-middle" onClick={() => setPanel('files')}><span className="office-object-label"><FolderOpen size={17} /> Temporal grammar / dynamics</span></button>
      <button className="office-hotspot office-file office-file-right" onClick={() => setPanel('files')}><span className="office-object-label"><FolderOpen size={17} /> Quantum / encyclopedia</span></button>
      <button className="office-hotspot office-poster" onClick={() => setPanel('uap')} aria-label="E.T. poster: UAP research under construction"><span className="office-object-label">UAP RESEARCH<br /><small>Under construction · open dossier</small></span></button>
      <div className="office-tv"><iframe className="office-tv-live" title="Muted Carl Sagan archival television" src="https://www.youtube-nocookie.com/embed/rWnA4XLrMWA?autoplay=1&mute=1&controls=0&loop=1&playlist=rWnA4XLrMWA&rel=0" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1} /><button className="office-tv-tune" onClick={() => setPanel('tv')} aria-label="Watch Carl Sagan archival broadcast with sound"><span>CARL SAGAN · TUNE IN ↗</span></button></div>
      <div className="office-status" role="status">{busy ? 'The laboratory is checking the inquiry. The printer will stop when the report is ready.' : reportReady ? 'Inquiry complete. Collect your report from the printer.' : 'Click the computer to begin. Explore the objects on the desk.'}</div>
    </section>
    <nav className="office-controls" aria-label="Office controls"><button onClick={enter}><Monitor size={17} /> Terminal</button><button onClick={() => setPanel('files')}><FolderOpen size={17} /> Project files</button><button disabled={!reportReady || busy} onClick={openReport}><Printer size={17} /> {busy ? 'Processing…' : 'Collect report'}</button><button onClick={() => setPanel('tv')}><Radio size={17} /> Sagan broadcast</button><button onClick={toggleSound} aria-pressed={sound}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />} Sound {sound ? 'on' : 'off'}</button></nav>
    <dialog className={`office-dialog office-dialog-${panel}`} ref={dialog} onCancel={() => setPanel(null)} onClose={() => setPanel(null)}><button className="office-dialog-close" aria-label="Close and return to office" onClick={() => setPanel(null)}><X size={23} /></button>
      {panel === 'files' && <><span className="cd-label">THE FILES ON THE DESK</span><h2>Work in progress. Evidence intact.</h2><div className="office-projects">{files.map((file, index) => <a href={file.href} key={file.name}><span>FILE {String(index + 1).padStart(2, '0')}</span><h3>{file.name}</h3><p>{file.note}</p><strong>Open project ↗</strong></a>)}</div><a href="/projects">Browse all investigations and contributions ↗</a></>}
      {panel === 'tv' && <><span className="cd-label">ARCHIVAL BROADCAST / CARL SAGAN</span><h2>“We are a way for the cosmos to know itself.”</h2><iframe title="Carl Sagan — We are a way for the Cosmos to know itself" src="https://www.youtube-nocookie.com/embed/rWnA4XLrMWA?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><p>Original voice from <em>Cosmos</em>. Playback is hosted by YouTube. <a href="https://www.youtube.com/watch?v=rWnA4XLrMWA" target="_blank" rel="noreferrer">Open the archival clip ↗</a></p></>}
      {panel === 'uap' && <><span className="cd-label">UNIDENTIFIED / OPEN QUESTIONS</span><h2>The sky still has questions.</h2><p className="office-uap-stamp">UNDER CONSTRUCTION</p><p>A future UAP investigation desk: sensor records, calibration, timing, competing explanations and observations that could distinguish them.</p><p>No solved cases or extraterrestrial findings are claimed. This room is being prepared for questions that can survive a serious test.</p><button onClick={() => { setPanel(null); enter(); }}>Bring a question to the terminal ↗</button></>}
    </dialog>
  </>;
}
