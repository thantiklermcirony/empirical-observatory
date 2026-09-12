'use client';
import { useMemo, useState } from 'react';
import { Activity, Clock3, ShieldCheck } from 'lucide-react';
import { ExposureScenarioId, referenceRepairRate, simulateTemporalExposure } from '@/lib/engine/temporal-state';

const scenarioIds: ExposureScenarioId[] = ['acute', 'spaced', 'uniform', 'late'];

function linePath(values: number[], width: number, height: number, max: number) {
  return values.map((value, index) => {
    const x = index * width / Math.max(1, values.length - 1);
    const y = height - value * height / Math.max(max, Number.EPSILON);
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

export default function TemporalStateLab() {
  const [scenario, setScenario] = useState<ExposureScenarioId>('acute');
  const [repairRate, setRepairRate] = useState(referenceRepairRate);
  const [day, setDay] = useState(10);
  const runs = useMemo(() => scenarioIds.map(id => simulateTemporalExposure(id, { repairRate })), [repairRate]);
  const run = runs.find(item => item.id === scenario) ?? runs[0];
  const index = Math.min(run.points.length - 1, Math.round(day / 10 * (run.points.length - 1)));
  const current = run.points[index];
  const maxDamage = Math.max(...runs.flatMap(item => item.points.map(point => point.undoneDamage)));
  const maxMortality = Math.max(...runs.map(item => item.finalMortality));
  const width = 700;
  const height = 220;
  const damagePath = linePath(run.points.map(point => point.undoneDamage), width, height, maxDamage);
  const mortalityPath = linePath(run.points.map(point => point.mortality), width, height, maxMortality);

  return <section className="temporal-lab" aria-label="Continuous SNT time-state laboratory">
    <div className="temporal-main">
      <header><span>CONTINUOUS SNT · SAME TOTAL DOSE, DIFFERENT HISTORIES</span><h2>Time changes the state before it changes the outcome.</h2><p>Each trajectory delivers 100 mSv over ten days. The model remembers undone damage and repairs it continuously, so dose order and spacing remain visible.</p></header>
      <div className="temporal-chart">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${run.label}: undone damage and cumulative harm through time`}>
          {[0,1,2,3,4].map(i=><line key={i} x1="0" x2={width} y1={i*height/4} y2={i*height/4}/>) }
          <path className="damage-line" d={damagePath}/><path className="harm-line" d={mortalityPath}/>
          <line className="time-cursor" x1={day/10*width} x2={day/10*width} y1="0" y2={height}/>
        </svg>
        <div className="chart-key"><span><i className="damage"/>UNDONE DAMAGE</span><span><i className="harm"/>CUMULATIVE HARM</span><b>DAY {day.toFixed(1)}</b></div>
      </div>
      <label className="temporal-time"><Clock3 size={15}/>MOVE THROUGH TIME<input type="range" min="0" max="10" step="0.1" value={day} onChange={event=>setDay(Number(event.target.value))}/></label>
      <div className="temporal-readout"><div><small>DOSE RATE</small><b>{current.doseRate.toFixed(1)}</b><span>mSv / day</span></div><div><small>UNDONE DAMAGE</small><b>{current.undoneDamage.toFixed(2)}</b><span>mSv-equivalent</span></div><div><small>EXCESS MODEL MORTALITY</small><b>{(current.mortality*1e6).toFixed(1)}</b><span>per million</span></div></div>
    </div>
    <aside className="temporal-console">
      <div className="console-title"><Activity size={16}/><span>HISTORY SELECTOR</span></div>
      <div className="scenario-list">{runs.map(item=><button key={item.id} className={scenario===item.id?'active':''} onClick={()=>{setScenario(item.id);setDay(10)}}><b>{item.label}</b><span>{item.totalDose.toFixed(0)} mSv total</span><em>{item.peakDamage.toFixed(1)} peak undone</em></button>)}</div>
      <label>REPAIR RATE <output>{repairRate.toFixed(4)} / day</output><input type="range" min="0.2" max="4" step="any" value={repairRate} onChange={event=>setRepairRate(Number(event.target.value))}/><small>Mean repair time: {(1/repairRate).toFixed(4)} days. The printed code uses 0.517 days.</small></label>
      <button className="temporal-reference-reset" onClick={()=>setRepairRate(referenceRepairRate)}>Restore paper-code reference</button>
      <div className="mechanism-ledger"><small>DECLARED VERBS</small><span><b>dose</b>adds undone damage</span><span><b>repair</b>removes current damage</span><span><b>hazard</b>maps state + dose rate to conditional harm</span><span><b>survival</b>compounds conditional harm through time</span></div>
      <div className="temporal-caution"><ShieldCheck size={15}/><p><b>EXPLORATORY MODEL · ASSUMPTIONS VISIBLE</b>The paper describes its five-parameter curve as an eyeball fit. Repair time is a model assumption. The graph accumulates modeled risk over exposure time; it does not predict when cancer occurs. These outputs have no individual risk calibration. <a href="https://gordianknotbook.com/wp-content/uploads/2026/08/hazard_snt_welsh_m3.pdf" target="_blank" rel="noreferrer">Read the reference paper</a>.</p></div>
    </aside>
    <footer><b>Why this matters beyond radiation:</b> this is the Observatory’s reusable pattern for narrative through time. An input changes a latent state; the state retains or repairs history; a declared observation law produces the visible outcome. Competing laws can then be tested on the same event stream.</footer>
  </section>;
}
