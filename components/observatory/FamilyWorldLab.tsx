'use client';
/* oxlint-disable next/no-html-link-for-pages -- Existing Observatory native navigation contract. */
/* oxlint-disable react/react-compiler -- Mutable numerical engine is synchronized explicitly with the browser view. */
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Download, Droplets, Home, Leaf, Orbit, Pause, Play, RotateCcw, Save, Trees, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FamilyWorld, partnerProbe, type WorldSnapshot } from '@/lib/engine/family-world';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const savedWorldKey = 'observatory-two-family-world-v1';
export default function FamilyWorldLab() {
  const engine = useRef<FamilyWorld | null>(null);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [running, setRunning] = useState(false), [selected, setSelected] = useState(0), [notice, setNotice] = useState('');
  const [probe, setProbe] = useState<ReturnType<typeof partnerProbe> | null>(null);
  const [description, setDescription] = useState<ReturnType<FamilyWorld['describeAgent']> | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    engine.current = new FamilyWorld();
    try { const saved = localStorage.getItem(savedWorldKey); if (saved) { engine.current = FamilyWorld.restore(JSON.parse(saved)); setSavedAt(engine.current.tick); setNotice('Resumed the world saved on this device, including its language and learned memories.'); } }
    catch { setNotice('The saved world could not be restored. Started a fresh world.'); }
    setSnapshot(engine.current.snapshot());
    const preserve = () => { try { if (engine.current) localStorage.setItem(savedWorldKey, JSON.stringify(engine.current.checkpoint())); } catch { /* Manual export remains available if storage is full. */ } };
    window.addEventListener('pagehide', preserve); return () => window.removeEventListener('pagehide', preserve);
  }, []);
  const update = () => { if (engine.current) setSnapshot(engine.current.snapshot()); };
  const step = (n = 1) => { if (engine.current) setSnapshot(engine.current.step(n)); };
  const saveWorld = () => { if (!engine.current) return; try { localStorage.setItem(savedWorldKey, JSON.stringify(engine.current.checkpoint())); setSavedAt(engine.current.tick); } catch { setNotice('Device storage is unavailable or full. Export the world to preserve it.'); } };
  useEffect(() => { if (snapshot && snapshot.tick > 0 && (snapshot.tick % 100 === 0 || !running)) { try { if (engine.current) { localStorage.setItem(savedWorldKey, JSON.stringify(engine.current.checkpoint())); setSavedAt(engine.current.tick); } } catch { setNotice('Automatic save failed. Export the world to preserve it.'); } } }, [snapshot, running]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => { if (engine.current) setSnapshot(engine.current.step(2)); }, 180);
    return () => window.clearInterval(timer);
  }, [running]);
  const exportRun = () => {
    if (!engine.current) return;
    const w = engine.current;
    const record = w.checkpoint();
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `two-family-world-${w.seed}-${w.tick}.json`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Exported a resumable world: parameters, language, journals and random streams.');
  };
  const importPackets = async (file?: File) => {
    if (!file || !engine.current) return;
    if (file.size > 1_000_000) { setNotice('Use a packet file smaller than 1 MB.'); return; }
    try { engine.current.importPackets(await file.text()); update(); setNotice('Added reading packets as hypotheses. The agents can encounter them through study.'); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'The packet file could not be read.'); }
  };
  const restoreWorld = async (file?: File) => {
    if (!file) return; if (file.size > 5_000_000) { setNotice('Use a saved world smaller than 5 MB.'); return; }
    try { const restored = FamilyWorld.restore(JSON.parse(await file.text())); setRunning(false); engine.current = restored; setSelected(0); setDescription(null); update(); setNotice('Restored the saved simulation. Its records describe this model world, not external measurements.'); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Could not restore that world.'); }
  };
  const newWorld = (architecture: 'linear' | 'stacked' = snapshot?.options.architecture ?? 'linear') => { setRunning(false); engine.current = new FamilyWorld(20260911, { architecture }); update(); setSelected(0); setDescription(null); setSavedAt(null); try { localStorage.removeItem(savedWorldKey); } catch { /* Optional device storage. */ } setNotice(`Started a fresh ${architecture === 'linear' ? '140' : '1,004'}-parameter world.`); };
  const agent = snapshot?.agents.find(a => a.id === selected);
  return (
    <main className="families-page">
      <header className="families-header">
        <a href="/" className="families-brand"><Orbit aria-hidden="true" /><span>EMPIRICAL OBSERVATORY<strong>TWO-FAMILY WORLD / 0.1</strong></span></a>
        <nav aria-label="World navigation"><a href="/projects">Projects</a><a href="/research/Two_Family_World_0.1.zip">Code & results</a></nav>
      </header>
      <div className="families-intro"><div><span className="families-eyebrow">LIVE SYNTHETIC EXPERIMENT</span><h1>A world they learn to maintain.</h1></div><p>Two households. Six independent learners. Start the world and inspect what experience changes.</p></div>
      <div className="families-toolbar">
        <Button onClick={() => setRunning(!running)} disabled={!snapshot}>{running ? <Pause /> : <Play />}{running ? 'Pause' : 'Run world'}</Button>
        <Button variant="outline" onClick={() => step(10)} disabled={running || !snapshot}>10 steps</Button>
        <Button variant="outline" onClick={() => step(200)} disabled={running || !snapshot}>200 steps</Button>
        <Button variant="ghost" onClick={() => newWorld()}><RotateCcw />New world</Button>
        <span className="families-clock">STEP <strong>{snapshot?.tick ?? 0}</strong></span>
      </div>
      <div className="families-switches">
        <label htmlFor="family-drought"><Switch id="family-drought" checked={snapshot?.drought ?? false} onCheckedChange={value => { if (engine.current) { engine.current.drought = value; update(); } }} />Drought</label>
        <label htmlFor="family-learning"><Switch id="family-learning" checked={snapshot?.options.learning ?? true} onCheckedChange={value => { if (engine.current) { engine.current.options.learning = value; update(); } }} />Update weights</label>
        <label htmlFor="family-attention"><Switch id="family-attention" checked={snapshot?.options.adaptiveAttention ?? true} onCheckedChange={value => { if (engine.current) { engine.current.options.adaptiveAttention = value; update(); } }} />Complexity adjusts attention</label>
        <span>{snapshot?.options.architecture === 'stacked' ? '1,004' : '140'} parameters / agent · Saved {savedAt === null ? 'when you run' : `at step ${savedAt}`}</span>
      </div>
      {!snapshot && <p role="status">Preparing six fresh networks…</p>}
      {snapshot && <>
        <section className="families-world" aria-label="Two households and their shared resources">
          <div className="families-resource-strip">
            <span><Leaf aria-hidden="true" />Food <strong>{pct(snapshot.resources[0])}</strong></span>
            <span><Droplets aria-hidden="true" />Water <strong>{pct(snapshot.resources[1])}</strong></span>
            <span><Trees aria-hidden="true" />Timber <strong>{pct(snapshot.resources[2])}</strong></span>
            <span><BookOpen aria-hidden="true" />Reading <strong>{engine.current?.packets.length ?? 10} packets</strong></span>
          </div>
          <div className="families-households">{snapshot.homes.map((home, family) => <section className={`families-household family-${family}`} key={home.name} aria-label={`${home.name} household`}>
            <div className="families-home-title"><h2>{home.name}</h2><span><Users aria-hidden="true" />{snapshot.agents.filter(a => a.family === family).length} learners</span></div>
            <div className="families-buildings"><span><Home aria-hidden="true" />{home.shelters} shelters</span><span><Leaf aria-hidden="true" />{home.gardens} gardens</span><span>Materials <strong>{pct(home.materials)}</strong></span></div>
            <div className="families-people">{snapshot.agents.filter(a => a.family === family).map(a => <button className="families-person" key={a.id} onClick={() => { setSelected(a.id); setDescription(null); }} aria-pressed={selected === a.id}>
              <span className="families-avatar" aria-hidden="true">{a.name.slice(0, 1)}</span><span><strong>{a.name}</strong><small>{a.role} · {a.experiences} experiences</small><span className="families-last">{a.last}</span></span>
            </button>)}</div>
            <div className="families-plots" aria-label={`${home.shelters} shelters and ${home.gardens} gardens constructed`}>
              {Array.from({ length: 10 }, (_, i) => <div key={i} className={i < home.shelters ? 'plot-shelter' : i < home.shelters + home.gardens ? 'plot-garden' : 'plot-empty'}>{i < home.shelters ? <Home aria-label="Shelter" /> : i < home.shelters + home.gardens ? <Leaf aria-label="Garden" /> : <span aria-hidden="true">·</span>}</div>)}
            </div>
          </section>)}</div>
          <div className="families-world-foot"><span>{snapshot.metrics.help} acts of help</span><span>{snapshot.metrics.taught} teaching events</span><span>{snapshot.metrics.welcomed} new learners</span></div>
        </section>
        {agent && <section className="families-inspection" aria-label={`${agent.name}'s learned state`}>
          <div className="families-inspection-title"><h2>{agent.name}’s present state</h2><span>{agent.updates.toLocaleString()} parameter updates</span></div>
          <div className="families-needs">{['Nutrition', 'Hydration', 'Energy'].map((label, i) => <label key={label}>{label}<strong>{pct(agent.needs[i])}</strong><progress value={agent.needs[i]} max={1} aria-label={`${agent.name} ${label}`} /></label>)}</div>
          <div className="families-detail"><span>Slow history: {agent.slow.map(pct).join(' / ')}</span><span>Vocabulary: {agent.known} packets</span><span>Surprise filter: {pct(agent.surprise)}</span></div>
          <div className="families-orbit-section"><div><h2>Words in orbit</h2><WordOrbit agent={agent} /></div><div><h2>Attention has a budget</h2><dl className="families-attention"><div><dt>Experienced repertoire</dt><dd>{agent.complexity.toFixed(1)}</dd></div><div><dt>Relationship attention cap</dt><dd>{pct(agent.careShare)}</dd></div><div><dt>Recent sequence retained</dt><dd>{Math.min(32, agent.experiences)} events</dd></div></dl><p>New distinctions reduce each relationship’s immediate weight. The underlying help record remains stored. This allocation rule is a hypothesis we can switch off.</p></div></div>
          <div className="families-bonds"><strong>Remembered help</strong>{agent.bonds.length ? agent.bonds.map(b => <span key={b.id}>{snapshot.agents.find(a => a.id === b.id)?.name}: {b.count} times · attention {pct(b.weight)}</span>) : <span>No help received yet.</span>}</div>
          <p className="families-note">Attribution and surprise are designed memory variables. Neither is a measurement of felt emotion.</p>
          <div className="families-language"><h2>{agent.name}’s own language</h2><p className="families-utterance">{agent.lastMessage?.words.join(' ') ?? 'No words coined yet.'}</p><p>{agent.language.words.length} coined words · grammar {agent.language.order} · {agent.language.grammarReviews} grammar comparisons</p><details><summary>Inspect the grounded codebook</summary><div className="families-codebook">{agent.language.words.map(w => <span key={w.word}><strong>{w.word}</strong>{w.meaning.replace(':', ' · ')}</span>)}</div></details><p className="families-note">The agent chooses an order from six supplied grammars and coins labels for observed affordances. The world decodes these labels before acting.</p></div>
          <Button variant="outline" onClick={() => { if (engine.current) setDescription(engine.current.describeAgent(selected)); }}>Ask {agent.name} about its world</Button>
          {description && <div className="families-self-report" role="status"><p>{description.text}</p><p>Evidence: current observation at step {description.tick}; {description.evidence.journalRecords} retained personal records.</p><details><summary>What I cannot establish</summary><ul>{description.unknown.map(text => <li key={text}>{text}</li>)}</ul></details></div>}
        </section>}
        <div className="families-lower">
          <section><h2>Latest observations</h2><ol className="families-events">{snapshot.events.slice(-5).reverse().map((e, i) => <li key={`${e.tick}-${e.actor}-${i}`}><span>{e.tick}</span><strong>{e.actor}</strong><span>{e.detail}</span></li>)}</ol>{!snapshot.events.length && <p>The first actions will appear here.</p>}</section>
          <section><h2>What is being tested?</h2><p>The networks learn action values and immediate effects. Care, construction and curiosity rewards are supplied by us. Buildings change later conditions; the agents choose among ten permitted verbs.</p><p>The separate partner test asks whether remembering reliability improves predictions when current appearances are identical.</p><Button variant="outline" onClick={() => setProbe(partnerProbe(20260911))}>Run partner-memory test</Button>
            {probe && <p role="status">Prediction error: {probe.brierRemembered.toFixed(3)} with partner history; {probe.brierErased.toFixed(3)} after pooling histories. This controlled test uses a Bayesian predictor, separately from the household networks.</p>}
          </section>
        </div>
        <section className="families-library"><h2>Feed their reading</h2><p>Import up to 200 structured noun–verb packets. Imported text remains a hypothesis and cannot execute commands or rewrite the world’s rules. This is a miniature vocabulary interface, not general language understanding.</p><div><label htmlFor="family-packet-file">Knowledge packets (.json)</label><input id="family-packet-file" type="file" accept="application/json,.json" onChange={e => { void importPackets(e.target.files?.[0]); e.target.value = ''; }} /></div><a href="/research/two-family-world/encyclopedia.json">Download the example packet format</a></section>
        <div className="families-toolbar"><Button variant="outline" onClick={() => { saveWorld(); }}><Save />Save world</Button><Button variant="outline" onClick={exportRun}><Download />Export world</Button><Button variant="ghost" onClick={() => { engine.current?.forgetRelationships(); update(); setNotice('Cleared the attribution records. Learned network weights still retain experience.'); }}>Clear remembered help</Button><Button variant="ghost" onClick={() => newWorld(snapshot.options.architecture === 'linear' ? 'stacked' : 'linear')}>New {snapshot.options.architecture === 'linear' ? '1,004-weight' : '140-weight'} world</Button></div>
        <div className="families-library"><label htmlFor="family-world-file">Resume an exported world (.json)</label><input id="family-world-file" type="file" accept="application/json,.json" onChange={e => { void restoreWorld(e.target.files?.[0]); e.target.value = ''; }} /><p><a href="/research/two-family-world/README.md">Methods, assumptions and measured results</a></p></div>
      </>}
      <p className="families-notice" role="status">{notice}</p>
      <footer className="families-footer">This world saves on this device. Export it to move it or preserve another version. Felt attachment, consciousness, general language competence and autonomous invention of physical laws are untested.</footer>
    </main>
  );
}

function WordOrbit({ agent }: { agent: WorldSnapshot['agents'][number] }) {
  const records = agent.rings.slice(-6);
  return <div className="families-word-orbit"><svg viewBox="0 0 420 310" role="img" aria-label={`${agent.name}'s six most recent noun and verb experiences. Ring position shows sequence, not learned semantic distance.`}>
    <circle cx="210" cy="151" r="87" fill="#102832" stroke="#345665" />
    <ellipse cx="210" cy="151" rx="87" ry="32" fill="none" stroke="#345665" />
    <ellipse cx="210" cy="151" rx="32" ry="87" fill="none" stroke="#345665" />
    {[0, 1, 2].map(i => <ellipse key={i} cx="210" cy="151" rx={105 + i * 24} ry={49 + i * 24} transform={`rotate(${i * 55 - 55} 210 151)`} fill="none" stroke="#5d8395" strokeDasharray={i === 2 ? '3 5' : undefined} />)}
    <text x="210" y="149" fill="#e9f2f5" fontSize="19" textAnchor="middle">{agent.name}</text>
    <text x="210" y="174" fill="#b8d4df" fontSize="16" textAnchor="middle">{agent.experiences} events</text>
    {records.map((r, i) => { const angle = (i / 6) * 2 * Math.PI - Math.PI / 2, x = 210 + 148 * Math.cos(angle), y = 151 + 111 * Math.sin(angle); return <g key={`${r.tick}-${i}`}><circle cx={x} cy={y} r="6" fill={agent.family === 0 ? '#92dece' : '#edc689'} /><text x={x} y={y + (y < 151 ? -15 : 25)} fill="#e9f2f5" fontSize="18" textAnchor="middle">{r.word}</text><title>{`${r.word}: ${r.verb} ${r.noun}; step ${r.tick}; bounded code ${r.code.toFixed(3)}`}</title></g>; })}
  </svg><p className="families-note">Positions encode event order. Per-verb Möbius codes enter the network; the ring retains recent sequence. No semantic geography is claimed.</p></div>;
}
