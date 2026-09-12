'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation preserves the verified production link contract. */
import { useEffect, useMemo, useState } from 'react';
import TemporalStateLab from './TemporalStateLab';
import {resolveAnatomySystem} from '@/lib/science-registry';
import AnatomyMechanisms from './AnatomyMechanisms';
import {
  ArrowLeft,
  ArrowUpRight,
  Atom,
  CircleDot,
  Clock3,
  Dna,
  Eye,
  Filter,
  HeartPulse,
  History,
  Network,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type Evidence = 'A' | 'B' | 'C' | 'H';
type Scale = 'world' | 'person' | 'organ' | 'cell';
type Flow = 'radiative' | 'matter' | 'electrical' | 'mechanical' | 'information';

type HistoricalWorld = {
  year: number;
  era: string;
  setting: string;
  evidence: string;
  pressures: { label: string; value: number }[];
  possibilities: string[];
  arrivals: string[];
  extremes?: { domain: string; left: string; right: string }[];
};

type Node = {
  id: string;
  label: string;
  short: string;
  scale: Scale;
  system: string;
  flow: Flow;
  evidence: Evidence;
  x: number;
  y: number;
  value: string;
  unit: string;
  timescale: string;
  description: string;
  source: { label: string; href: string };
};

type Edge = {
  from: string;
  to: string;
  verb: string;
  evidence: Evidence;
  delay: string;
  path: string[];
};

const tiers: Record<Evidence, { label: string; meaning: string }> = {
  A: { label: 'A · measured', meaning: 'Directly measured or strongly replicated' },
  B: { label: 'B · mechanistic', meaning: 'Supported mechanism with bounded uncertainty' },
  C: { label: 'C · association', meaning: 'Repeatable association; causality is unresolved' },
  H: { label: 'H · hypothesis', meaning: 'A testable proposal, visibly separated from evidence' },
};

const nodes: Node[] = [
  { id:'sun', label:'Solar spectrum', short:'SUN', scale:'world', system:'environment', flow:'radiative', evidence:'A', x:50, y:8, value:'380–780', unit:'nm visible', timescale:'minutes → seasons', description:'Spectral irradiance is the external input. Time, latitude, cloud and canopy alter dose and spectrum.', source:{label:'NASA POWER',href:'https://power.larc.nasa.gov/'} },
  { id:'canopy', label:'Canopy-filtered light', short:'LEAF', scale:'world', system:'environment', flow:'radiative', evidence:'A', x:22, y:19, value:'variable', unit:'W m⁻² nm⁻¹', timescale:'seconds → hours', description:'Leaves absorb, scatter and transmit wavelengths differently. “Forest light” must be measured as a spectrum, not treated as one universal exposure.', source:{label:'USDA Forest Service',href:'https://www.fs.usda.gov/research/treesearch'} },
  { id:'weather', label:'Air, rain & temperature', short:'AIR', scale:'world', system:'environment', flow:'matter', evidence:'A', x:78, y:19, value:'local', unit:'°C · %RH · ions', timescale:'minutes → seasons', description:'Rain is water plus dissolved gases, ions, particles and microbes whose composition depends on place and weather history.', source:{label:'US EPA wet deposition',href:'https://www.epa.gov/castnet'} },
  { id:'retina', label:'Retinal light sensing', short:'RET', scale:'organ', system:'nervous', flow:'information', evidence:'A', x:42, y:31, value:'~480', unit:'nm peak melanopsin', timescale:'milliseconds → minutes', description:'Retinal photoreceptors transduce photons into neural signals. Intrinsically photosensitive ganglion cells provide a major non-image-forming light pathway.', source:{label:'NCBI Bookshelf',href:'https://www.ncbi.nlm.nih.gov/books/NBK10806/'} },
  { id:'brain', label:'Brain / central clock', short:'SCN', scale:'organ', system:'nervous', flow:'electrical', evidence:'A', x:52, y:34, value:'~24', unit:'hours', timescale:'milliseconds → days', description:'The central nervous system integrates sensory, interoceptive and learned signals. The SCN coordinates circadian timing but is not a single master cause of the person.', source:{label:'Allen Brain Atlas',href:'https://portal.brain-map.org/'} },
  { id:'emotion', label:'Affective state', short:'AFFECT', scale:'person', system:'experience', flow:'information', evidence:'B', x:64, y:38, value:'multiaxial', unit:'report + physiology', timescale:'seconds → years', description:'Emotion is a coordinated state involving appraisal, memory, action readiness, bodily regulation and subjective report. It is not a literal energy substance.', source:{label:'NIMH RDoC',href:'https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc'} },
  { id:'autonomic', label:'Autonomic network', short:'ANS', scale:'organ', system:'nervous', flow:'electrical', evidence:'A', x:47, y:47, value:'dynamic', unit:'ms · bpm · conductance', timescale:'milliseconds → hours', description:'Sympathetic, parasympathetic and enteric pathways regulate organs through distributed neural circuits and feedback.', source:{label:'NIH SPARC',href:'https://sparc.science/'} },
  { id:'heart', label:'Heart & circulation', short:'HEART', scale:'organ', system:'cardiovascular', flow:'mechanical', evidence:'A', x:38, y:51, value:'60–100', unit:'beats min⁻¹ resting', timescale:'beat → lifetime', description:'Electrical excitation drives contraction; circulation transports gases, nutrients, hormones, heat, cells and waste.', source:{label:'NIH SPARC Maps',href:'https://sparc.science/maps'} },
  { id:'lung', label:'Lung exchange', short:'LUNG', scale:'organ', system:'respiratory', flow:'matter', evidence:'A', x:60, y:51, value:'~12–20', unit:'breaths min⁻¹ resting', timescale:'seconds → lifetime', description:'Ventilation and perfusion exchange oxygen and carbon dioxide while airway surfaces continuously encounter the environment.', source:{label:'HuBMAP',href:'https://portal.hubmapconsortium.org/'} },
  { id:'gut', label:'Gut / enteric system', short:'GUT', scale:'organ', system:'digestive', flow:'matter', evidence:'A', x:45, y:64, value:'variable', unit:'pH · transit · metabolites', timescale:'seconds → days', description:'The gastrointestinal tract transforms food, absorbs matter, houses immune interfaces and exchanges neural, endocrine and metabolic signals.', source:{label:'NIH SPARC',href:'https://sparc.science/'} },
  { id:'microbiome', label:'Gut microbial ecology', short:'MICROBE', scale:'cell', system:'microbiome', flow:'matter', evidence:'B', x:62, y:68, value:'community', unit:'taxa · genes · metabolites', timescale:'hours → years', description:'Microbial communities transform substrates and interact with host immunity and metabolism. Many brain or mood claims remain associative or context dependent.', source:{label:'Human Microbiome Project',href:'https://portal.hmpdacc.org/'} },
  { id:'immune', label:'Immune surveillance', short:'IMMUNE', scale:'cell', system:'immune', flow:'information', evidence:'A', x:31, y:70, value:'distributed', unit:'cells · cytokines', timescale:'seconds → decades', description:'Barrier, innate and adaptive systems detect, tolerate, remember and respond across tissues; responses depend on dose, timing and history.', source:{label:'Human Cell Atlas',href:'https://data.humancellatlas.org/'} },
  { id:'metabolism', label:'Metabolic control', short:'MET', scale:'cell', system:'metabolic', flow:'matter', evidence:'A', x:48, y:79, value:'dynamic', unit:'mmol L⁻¹ · flux', timescale:'seconds → years', description:'Cells and organs coordinate substrate use, storage and energy transfer. The relevant quantities are fluxes and gradients, not a vague “life energy.”', source:{label:'BioModels',href:'https://www.ebi.ac.uk/biomodels/'} },
  { id:'bioelectric', label:'Bioelectric state', short:'Vm', scale:'cell', system:'cellular', flow:'electrical', evidence:'A', x:68, y:82, value:'≈ −90 to +40', unit:'mV, context-specific', timescale:'microseconds → development', description:'Ion gradients, membrane potentials and electrical coupling are measurable state variables used in neural, cardiac and many non-neural tissues.', source:{label:'CellML Physiome',href:'https://models.cellml.org/'} },
  { id:'genome', label:'Genome & regulation', short:'DNA', scale:'cell', system:'genomic', flow:'information', evidence:'A', x:29, y:86, value:'contextual', unit:'variants · expression', timescale:'minutes → generations', description:'DNA sequence, chromatin, transcription and cell state constrain biological possibilities. Lived episodes are not copied into DNA as intact memories.', source:{label:'GTEx Portal',href:'https://gtexportal.org/home/'} },
];

const edges: Edge[] = [
  {from:'sun',to:'canopy',verb:'is filtered by',evidence:'A',delay:'instantaneous',path:['light']},
  {from:'sun',to:'retina',verb:'irradiates',evidence:'A',delay:'milliseconds',path:['light']},
  {from:'canopy',to:'retina',verb:'changes spectral input to',evidence:'B',delay:'milliseconds',path:['light']},
  {from:'retina',to:'brain',verb:'signals timing to',evidence:'A',delay:'milliseconds → minutes',path:['light']},
  {from:'brain',to:'autonomic',verb:'coordinates',evidence:'A',delay:'milliseconds → minutes',path:['stress','light']},
  {from:'brain',to:'emotion',verb:'participates in',evidence:'B',delay:'milliseconds → years',path:['stress','light']},
  {from:'emotion',to:'autonomic',verb:'co-varies with and regulates',evidence:'B',delay:'seconds → hours',path:['stress']},
  {from:'autonomic',to:'heart',verb:'modulates',evidence:'A',delay:'beat-to-beat',path:['stress']},
  {from:'autonomic',to:'gut',verb:'modulates',evidence:'A',delay:'seconds → hours',path:['stress','meal']},
  {from:'lung',to:'heart',verb:'couples gas exchange to',evidence:'A',delay:'seconds',path:['stress']},
  {from:'gut',to:'microbiome',verb:'supplies habitat and substrates to',evidence:'A',delay:'hours → days',path:['meal']},
  {from:'microbiome',to:'metabolism',verb:'transforms substrates affecting',evidence:'B',delay:'hours → days',path:['meal']},
  {from:'gut',to:'immune',verb:'presents barrier signals to',evidence:'A',delay:'minutes → days',path:['meal']},
  {from:'immune',to:'brain',verb:'signals via neural and humoral routes to',evidence:'B',delay:'minutes → days',path:['stress','meal']},
  {from:'genome',to:'bioelectric',verb:'constrains channel expression in',evidence:'A',delay:'minutes → development',path:['cell']},
  {from:'bioelectric',to:'heart',verb:'enables excitation of',evidence:'A',delay:'milliseconds',path:['cell']},
  {from:'weather',to:'lung',verb:'alters inhaled exposure at',evidence:'B',delay:'seconds → seasons',path:['air']},
];

const paths = [
  {id:'all', label:'Whole crystal'},
  {id:'light', label:'Light → clock'},
  {id:'meal', label:'Meal → gut'},
  {id:'stress', label:'Stress → body'},
  {id:'cell', label:'Genome → voltage'},
  {id:'air', label:'Air → lung'},
];

const historicalWorlds: HistoricalWorld[] = [
  {year:-10000,era:'Forager reconstruction',setting:'Temperate mobile community · illustrative composite',evidence:'Archaeology + palaeoclimate; wide uncertainty',pressures:[{label:'pathogens',value:42},{label:'injury',value:72},{label:'food variance',value:76},{label:'information load',value:12}],possibilities:['walk','forage','make','share','migrate'],arrivals:['seasonal route knowledge','portable tools']},
  {year:1500,era:'Early modern reconstruction',setting:'Rural north-west Europe · one bounded example',evidence:'Historical demography + material record',pressures:[{label:'pathogens',value:82},{label:'injury',value:57},{label:'food variance',value:61},{label:'information load',value:24}],possibilities:['farm','trade','craft','worship','travel'],arrivals:['print networks','oceanic routes']},
  {year:1850,era:'Industrial transition',setting:'Urban Britain · uneven technology adoption',evidence:'Census + mortality + pollution records',pressures:[{label:'pathogens',value:78},{label:'injury',value:69},{label:'food variance',value:49},{label:'information load',value:41}],possibilities:['factory work','rail travel','mass reading','organise','emigrate'],arrivals:['rail time','telegraph','mass print']},
  {year:1950,era:'Electrified mass society',setting:'High-income urban composite · not globally typical',evidence:'Surveys + time-use + health series',pressures:[{label:'pathogens',value:38},{label:'injury',value:43},{label:'food variance',value:25},{label:'information load',value:61}],possibilities:['broadcast','drive','vaccinate','telephone','fly'],arrivals:['antibiotics','television','commercial aviation']},
  {year:2026,era:'Networked present',setting:'Connected urban adult · illustrative reference',evidence:'Exposure, health and time-use datasets',pressures:[{label:'pathogens',value:33},{label:'injury',value:29},{label:'food variance',value:18},{label:'information load',value:94}],possibilities:['search','simulate','publish','coordinate','telepresence'],arrivals:['internet','smartphone','generative AI']},
];

const complexityWorlds: HistoricalWorld[] = [
  {year:2026,era:'Connected landscape',setting:'Supportive household · outdoor access · low administrative queue',evidence:'Counterfactual preset; factors require separate evidence',pressures:[{label:'physical demand',value:55},{label:'threat',value:20},{label:'maintenance',value:18},{label:'fragmentation',value:12}],possibilities:['care','explore','rest','make','belong'],arrivals:['shared load','sensory range']},
  {year:2026,era:'Operational enclosure',setting:'Long vessel deployment · strict schedule · strong crew interdependence',evidence:'Counterfactual preset; occupation and person matter',pressures:[{label:'physical demand',value:63},{label:'threat',value:48},{label:'maintenance',value:42},{label:'fragmentation',value:35}],possibilities:['operate','coordinate','train','protect','return'],arrivals:['crew reliance','high responsibility']},
  {year:2026,era:'Institutional confinement',setting:'Restricted movement · low autonomy · future access externally controlled',evidence:'Counterfactual preset; regime and social contact declared',pressures:[{label:'physical demand',value:28},{label:'threat',value:69},{label:'maintenance',value:54},{label:'fragmentation',value:25}],possibilities:['endure','appeal','connect','learn','remember'],arrivals:['gated action','institutional schedule']},
  {year:2026,era:'Fragmented networked life',setting:'Bills · apps · accounts · messages · work systems · self-education',evidence:'Counterfactual preset; visual indices await manipulated data',pressures:[{label:'physical demand',value:20},{label:'threat',value:25},{label:'maintenance',value:91},{label:'fragmentation',value:94}],possibilities:['search','work','publish','purchase','coordinate'],arrivals:['global access','authentication burden']},
];

const lifeCourseWorlds: HistoricalWorld[] = [
  {year:0,era:'Birth',setting:'Maximum dependence · rapid physiological transition · inherited starting conditions',evidence:'Evidence-bounded scaffold; population and context must be declared',pressures:[{label:'dependency',value:100},{label:'plasticity',value:92},{label:'autonomy',value:2},{label:'reserve',value:18}],possibilities:['attach','feed','sleep','sense','regulate'],arrivals:['air breathing','microbial colonisation'],extremes:[{domain:'care',left:'neglect',right:'reliable co-regulation'},{domain:'nutrition',left:'deficiency',right:'secure appropriate supply'},{domain:'environment',left:'toxic / unsafe',right:'protected / responsive'}]},
  {year:5,era:'Early childhood',setting:'Fast learning · constrained choice · family and local environment dominate access',evidence:'Developmental scaffold; no individual outcome is implied',pressures:[{label:'dependency',value:78},{label:'plasticity',value:88},{label:'autonomy',value:18},{label:'reserve',value:32}],possibilities:['play','imitate','speak','bond','explore'],arrivals:['language','social models'],extremes:[{domain:'connection',left:'isolation / threat',right:'secure belonging'},{domain:'learning',left:'deprivation',right:'rich responsive input'},{domain:'movement',left:'confinement',right:'safe exploration'}]},
  {year:15,era:'Adolescence',setting:'Expanding possibility space · peer evaluation · biological and social transition',evidence:'Life-stage scaffold; culture and individual variation are large',pressures:[{label:'dependency',value:49},{label:'plasticity',value:72},{label:'autonomy',value:46},{label:'reserve',value:54}],possibilities:['identify','affiliate','learn','compete','depart'],arrivals:['abstract futures','peer networks'],extremes:[{domain:'identity',left:'coercion / exclusion',right:'supported exploration'},{domain:'risk',left:'unbuffered exposure',right:'bounded experimentation'},{domain:'future',left:'blocked routes',right:'credible routes'}]},
  {year:30,era:'Early adulthood',setting:'High productive capacity · care, work and institutional commitments accumulate',evidence:'Illustrative reference; household and labour systems must be measured',pressures:[{label:'dependency',value:20},{label:'plasticity',value:55},{label:'autonomy',value:72},{label:'reserve',value:66}],possibilities:['work','love','parent','migrate','create'],arrivals:['independent contracts','long commitments'],extremes:[{domain:'work',left:'danger / precarity',right:'control / security'},{domain:'load',left:'fragmented overload',right:'coherent commitments'},{domain:'social',left:'isolation',right:'reciprocal support'}]},
  {year:50,era:'Midlife',setting:'Accumulated exposures meet responsibility, expertise and unequal material reserve',evidence:'Life-course scaffold; trajectories cannot be inferred from age alone',pressures:[{label:'dependency',value:27},{label:'plasticity',value:42},{label:'autonomy',value:65},{label:'reserve',value:58}],possibilities:['lead','care','teach','adapt','consolidate'],arrivals:['deep expertise','intergenerational load'],extremes:[{domain:'reserve',left:'debt / volatility',right:'shock capacity'},{domain:'care',left:'unsupported burden',right:'shared provision'},{domain:'health',left:'compounding damage',right:'prevention / recovery'}]},
  {year:75,era:'Later life',setting:'Past exposures, material reserve, function and social structure increasingly separate lives',evidence:'Heterogeneity is central; chronological age is not a mechanism',pressures:[{label:'dependency',value:58},{label:'plasticity',value:30},{label:'autonomy',value:48},{label:'reserve',value:39}],possibilities:['mentor','remember','adapt','receive care','belong'],arrivals:['retirement transitions','care systems'],extremes:[{domain:'function',left:'rapid loss',right:'maintained capacity'},{domain:'status',left:'exclusion',right:'valued participation'},{domain:'care',left:'inaccessible',right:'timely and autonomous'}]},
  {year:95,era:'End of life',setting:'Fragility, meaning, care and agency become the central measurable constraints',evidence:'Ethical and clinical context required; this is not a prognosis',pressures:[{label:'dependency',value:91},{label:'plasticity',value:16},{label:'autonomy',value:31},{label:'reserve',value:12}],possibilities:['choose','connect','reconcile','relieve','be accompanied'],arrivals:['care decisions','legacy'],extremes:[{domain:'symptoms',left:'unrelieved distress',right:'effective palliation'},{domain:'agency',left:'decisions imposed',right:'preferences honoured'},{domain:'connection',left:'abandonment',right:'presence / dignity'}]},
];

function humanState(hour: number) {
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const alertness = Math.max(0.08, 0.55 + 0.3 * Math.sin(((hour - 8) / 24) * Math.PI * 2));
  const meal = [8, 13, 19].reduce((m, t) => Math.max(m, Math.exp(-Math.pow(hour - t, 2) / 2.4)), 0);
  return { daylight, alertness, meal };
}

export default function HumanConditionLab() {
  const [viewMode, setViewMode] = useState<'anatomy' | 'connections' | 'worldline' | 'time'>('anatomy');
  const [anatomySelection, setAnatomySelection] = useState<{id:string;name:string;system:string} | null>(null);
  const [selected, setSelected] = useState('brain');
  const [activePath, setActivePath] = useState('all');
  const [evidence, setEvidence] = useState<Evidence | 'all'>('all');
  const [hour, setHour] = useState(10);
  const [worldIndex, setWorldIndex] = useState(historicalWorlds.length - 1);
  const [worldLens, setWorldLens] = useState<'history' | 'complexity' | 'lifecourse'>('history');
  const worldOptions = worldLens === 'history' ? historicalWorlds : worldLens === 'complexity' ? complexityWorlds : lifeCourseWorlds;
  const world = worldOptions[Math.min(worldIndex, worldOptions.length - 1)];
  const focus = nodes.find((node) => node.id === selected) ?? {...nodes[0],id:'unmapped',label:'No selected connection',short:'GAP',value:'unmapped',unit:'',description:'Select a graph node explicitly. The anatomical selection has no mapped connection.',source:{label:'Living framework',href:'/framework'},system:'unmapped'};
  const state = humanState(hour);
  const visibleEdges = useMemo(() => edges.filter((edge) =>
    (activePath === 'all' || edge.path.includes(activePath)) &&
    (evidence === 'all' || edge.evidence === evidence)), [activePath, evidence]);
  const activeIds = new Set(visibleEdges.flatMap((edge) => [edge.from, edge.to]));
  const linked = visibleEdges.filter((edge) => edge.from === focus.id || edge.to === focus.id);
  useEffect(() => {
    const systemNode: Record<string,string> = {cardiac:'heart',arterial:'heart',venous:'heart',respiratory:'lung',digestive:'gut',nervous:'brain',sensory:'retina',immune:'immune',lymphatic:'immune',integumentary:'weather'};
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== document.querySelector<HTMLIFrameElement>('iframe[title="Exploded 3D Human Atlas"]')?.contentWindow) return;
      if(event.data?.type==='observatory:anatomy-clear'){setAnatomySelection(null);setSelected('');return;}
      if(event.data?.type!=='observatory:anatomy-select')return;
      const next = {systems:Array.isArray(event.data.systems)?event.data.systems:[],meshIds:Array.isArray(event.data.meshIds)?event.data.meshIds:[],id:String(event.data.id),name:String(event.data.name),system:resolveAnatomySystem(String(event.data.id),Array.isArray(event.data.systems)?event.data.systems:[],String(event.data.system))};
      setAnatomySelection(next);
      setSelected(systemNode[next.system] ?? '');
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  return (
    <main className="human-lab">
      <header className="human-header">
        <a className="human-brand" href="/"><CircleDot size={25}/><span><b>EMPIRICAL OBSERVATORY</b><small>HUMAN CONDITION LAB / BETA</small></span></a>
        <nav aria-label="Human Condition Laboratory"><a href="/atlas">Research Atlas</a><a href="/projects">Current projects</a><a href="/"><ArrowLeft size={15}/> Station</a></nav>
      </header>

      <section className="human-intro">
        <div><span className="eyebrow">A HUMAN INSIDE EARTH · 24-HOUR REFERENCE SLICE</span><h1>The body is a nested system,<br/><em>not an isolated object.</em></h1></div>
        <p>Trace measured matter, energy, electrical state, mechanics and information from environment to experience. Every arrow carries a verb, evidence grade and timescale.</p>
      </section>

      <div className="human-mode" role="tablist" aria-label="Human laboratory view">
        <button role="tab" aria-selected={viewMode === 'anatomy'} className={viewMode === 'anatomy' ? 'active' : ''} onClick={() => setViewMode('anatomy')}>01 · EXPLODED BODY</button>
        <button role="tab" aria-selected={viewMode === 'connections'} className={viewMode === 'connections' ? 'active' : ''} onClick={() => setViewMode('connections')}>02 · CONNECTION CRYSTAL</button>
        <button role="tab" aria-selected={viewMode === 'worldline'} className={viewMode === 'worldline' ? 'active' : ''} onClick={() => setViewMode('worldline')}>03 · HUMAN WORLDLINE</button>
        <button role="tab" aria-selected={viewMode === 'time'} className={viewMode === 'time' ? 'active' : ''} onClick={() => setViewMode('time')}>04 · TIME-STATE ENGINE</button>
      </div>

      {viewMode === 'anatomy' ? (
        <section className="anatomy-frame" aria-label="Exploded three-dimensional human anatomy">
          <div className="anatomy-frame-head"><span><b>ANATOMICAL COORDINATE SYSTEM</b>2,234 selectable structures · 15 systems · adult male reference</span><span>Drag · zoom · isolate · explode</span></div>
          <iframe title="Exploded 3D Human Atlas" src="/anatomy/index.html" allow="fullscreen" />
          {anatomySelection && <div className="anatomy-port"><small>SELECTED STRUCTURE / {anatomySelection.id}</small><b>{anatomySelection.name}</b><span>Inspect its mapped mechanisms below</span></div>}
          <AnatomyMechanisms selection={anatomySelection}/>
          <div className="anatomy-credit">BodyParts3D 4.0 © Database Center for Life Science, CC BY 4.0. Viewer adapted from <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">Human Atlas</a>, MIT. Educational reference; not diagnostic or surgical.</div>
        </section>
      ) : viewMode === 'time' ? <TemporalStateLab/> : viewMode === 'worldline' ? (
        <section className="worldline-lab" aria-label="Historical human worldline explorer">
          <div className="worldline-stage" key={world.year}>
            <div className="world-sky"><span className="world-sun"/><span className="world-rain">⋮ ⋮ ⋮</span></div>
            <div className="world-rings" aria-hidden="true"><i/><i/><i/><i/></div>
            <div className="world-person" aria-hidden="true"><span/><i/><b/></div>
            <div className="possibility-field">{world.possibilities.map((item,index)=><span key={item} style={{'--orbit':index} as React.CSSProperties}>{item}</span>)}</div>
            <div className="world-caption"><small>{worldLens === 'lifecourse' ? `AGE ${world.year}` : world.year < 0 ? `${Math.abs(world.year).toLocaleString()} BCE` : world.year}</small><h2>{world.era}</h2><p>{world.setting}</p></div>
          </div>
          <aside className="worldline-panel">
            <div className="console-title"><History size={16}/><span>HISTORICAL WORLD LENS</span></div>
            <div className="world-lens-toggle"><button className={worldLens==='history'?'active':''} onClick={()=>{setWorldLens('history');setWorldIndex(historicalWorlds.length-1)}}>HISTORY</button><button className={worldLens==='complexity'?'active':''} onClick={()=>{setWorldLens('complexity');setWorldIndex(0)}}>LIVED COMPLEXITY</button><button className={worldLens==='lifecourse'?'active':''} onClick={()=>{setWorldLens('lifecourse');setWorldIndex(0)}}>LIFE COURSE EXTREMES</button></div>
            <p>{worldLens === 'history' ? 'The person is held conceptually constant while the reconstructed world changes. This separates environmental and cultural change from genetic evolution.' : worldLens === 'complexity' ? 'The same person enters contrasting bundles of connection, autonomy, enclosure, responsibility and fragmented obligation. Change one factor at a time before drawing a causal conclusion.' : 'Move from birth to death and inspect feasible opposing edges of care, exposure, autonomy, reserve and reachable futures. The display preserves components instead of collapsing a life into one score.'}</p>
            <label className="world-slider">{worldLens === 'lifecourse' ? 'AGE / LIFE STAGE' : 'SCENARIO'}<input type="range" min="0" max={worldOptions.length-1} step="1" value={Math.min(worldIndex,worldOptions.length-1)} onChange={(event)=>setWorldIndex(Number(event.target.value))}/><span>{worldOptions.map((item,index)=><b key={`${item.era}-${index}`} className={index===worldIndex?'active':''}>{worldLens==='history'?(item.year<0?'10k BCE':item.year):worldLens==='lifecourse'?item.year:String(index+1).padStart(2,'0')}</b>)}</span></label>
            <div className="pressure-grid">{world.pressures.map(item=><div key={item.label}><span>{item.label}</span><i><b style={{width:`${item.value}%`}}/></i><output>{item.value}</output></div>)}</div>
            {world.extremes && <div className="extreme-ledger"><small>FEASIBLE OPPOSING EDGES</small>{world.extremes.map(item=><div key={item.domain}><b>{item.left}</b><span><i/>{item.domain}<i/></span><b>{item.right}</b></div>)}</div>}
            <div className="world-arrivals"><small>NEWLY REACHABLE / REPRESENTABLE</small>{world.arrivals.map(item=><span key={item}>{item}</span>)}</div>
            <div className="world-evidence"><ShieldCheck size={15}/><span><b>RECONSTRUCTION BASIS</b>{world.evidence}. Values are visual indices, not measured personal stress scores.</span></div>
          </aside>
          <footer className="worldline-note"><b>{worldLens === 'history' ? 'A transition is a testable changepoint.' : worldLens === 'complexity' ? 'A preset is a factor bundle, not a verdict.' : 'An extreme is a boundary for comparison, not a person.'}</b>{worldLens === 'history' ? 'The instrument asks whether a new tool or institution changes the actions a person can represent and reach, and whether that change persists after the input disappears. It does not rank eras as primitive or advanced.' : worldLens === 'complexity' ? 'The proposed experiment holds task time and difficulty constant, then manipulates fragmentation and control. These illustrative indices are replaced only by admitted data.' : 'Every edge must be tied to a declared population, time, mechanism and outcome. War, migration and economic policy enter later as dated shocks and distributions of gains and losses.'}</footer>
        </section>
      ) : (
      <section className="human-console" aria-label="Interactive human systems explorer">
        {!selected&&<div className="sf-empty" role="status"><b>No connection mapped for this selection.</b><p>The graph below is the general programme map. Choose a node to inspect that node explicitly.</p></div>}
        <aside className="human-controls">
          <div className="console-title"><Filter size={16}/><span>PATH FILTER</span></div>
          <div className="path-list">{paths.map((path) => <button key={path.id} className={activePath === path.id ? 'active' : ''} onClick={() => setActivePath(path.id)}>{path.label}<ArrowUpRight size={14}/></button>)}</div>
          <label className="evidence-filter">Evidence ceiling<select value={evidence} onChange={(event) => setEvidence(event.target.value as Evidence | 'all')}><option value="all">All grades</option><option value="A">A · measured</option><option value="B">B · mechanistic</option><option value="C">C · association</option><option value="H">H · hypothesis</option></select></label>
          <div className="flow-key"><span><i className="radiative"/>Radiative</span><span><i className="matter"/>Matter</span><span><i className="electrical"/>Electrical</span><span><i className="mechanical"/>Mechanical</span><span><i className="information"/>Information</span></div>
        </aside>

        <div className="crystal-stage">
          <div className="scale-labels" aria-hidden="true"><span>EARTH</span><span>PERSON</span><span>ORGANS</span><span>CELLS</span></div>
          <svg className="crystal" viewBox="0 0 100 100" role="img" aria-label="Nested map linking environment, person, organs and cells">
            <defs><filter id="glow"><feGaussianBlur stdDeviation="0.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <circle cx="50" cy="51" r="46"/><circle cx="50" cy="55" r="34"/><circle cx="50" cy="57" r="24"/><circle cx="50" cy="65" r="14"/>
            <path className="human-outline" d="M49 26c-4 0-7 3-7 7 0 3 2 6 5 7l-2 6-9 5 3 4 7-3-1 15-5 20 6 1 4-15 4 15 6-1-5-20-1-15 7 3 3-4-9-5-2-6c3-1 5-4 5-7 0-4-3-7-7-7z"/>
            {visibleEdges.map((edge) => { const a=nodes.find(n=>n.id===edge.from)!; const b=nodes.find(n=>n.id===edge.to)!; return <line key={`${edge.from}-${edge.to}`} className={`edge grade-${edge.evidence}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>; })}
            {nodes.map((node) => { const active = activePath === 'all' ? activeIds.has(node.id) : activeIds.has(node.id); const dim = evidence !== 'all' && node.evidence !== evidence; return <g key={node.id} className={`crystal-node flow-${node.flow} ${active && !dim ? 'active' : 'dim'} ${selected === node.id ? 'selected' : ''}`} transform={`translate(${node.x} ${node.y})`} onClick={() => setSelected(node.id)} role="button" tabIndex={0} aria-label={node.label} onKeyDown={(event) => {if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(node.id)}}}><circle r={selected === node.id ? 3.2 : 2.35}/><text y="-4">{node.short}</text></g>; })}
          </svg>
          <div className="time-overlay"><label htmlFor="human-hour"><Clock3 size={16}/> LOCAL TIME <output>{String(hour).padStart(2,'0')}:00</output></label><input id="human-hour" type="range" min="0" max="23" value={hour} onChange={(event)=>setHour(Number(event.target.value))}/><div className="state-bars"><span>DAYLIGHT <i style={{width:`${state.daylight*100}%`}}/></span><span>ALERTNESS <i style={{width:`${state.alertness*100}%`}}/></span><span>MEAL SIGNAL <i style={{width:`${state.meal*100}%`}}/></span></div><small>Illustrative rhythms only. These are teaching traces, not a clinical prediction.</small></div>
        </div>

        <aside className="node-dossier" aria-live="polite">
          <div className="dossier-head"><span className={`evidence grade-${focus.evidence}`}>{focus.evidence}</span><div><small>{focus.scale.toUpperCase()} / {focus.system.toUpperCase()}</small><h2>{focus.label}</h2></div></div>
          <p>{focus.description}</p>
          <dl><div><dt>REFERENCE</dt><dd>{focus.value} <small>{focus.unit}</small></dd></div><div><dt>TIMESCALE</dt><dd>{focus.timescale}</dd></div><div><dt>FLOW</dt><dd>{focus.flow}</dd></div><div><dt>EVIDENCE</dt><dd>{tiers[focus.evidence].meaning}</dd></div></dl>
          <a className="source-link" href={focus.source.href} target="_blank" rel="noreferrer"><ShieldCheck size={15}/>{focus.source.label}<ArrowUpRight size={14}/></a>
          <div className="connections"><small>VISIBLE CONNECTIONS</small>{linked.length ? linked.map((edge)=><button key={`${edge.from}-${edge.to}`} onClick={()=>setSelected(edge.from===focus.id?edge.to:edge.from)}><span>{edge.from===focus.id?edge.verb:`is ${edge.verb}`}</span><b>{nodes.find(n=>n.id===(edge.from===focus.id?edge.to:edge.from))?.label}</b><em>{edge.evidence} · {edge.delay}</em></button>) : <p>No connection under this filter.</p>}</div>
        </aside>
      </section>
      )}

      <section className="lab-principles">
        <article><Atom/><span className="eyebrow">THE LEDGER</span><h3>Nothing crosses a scale unnamed.</h3><p>Every link specifies what moves or constrains: matter, radiation, charge, force or information—plus direction, delay, units and uncertainty.</p></article>
        <article><Network/><span className="eyebrow">THE CRYSTAL</span><h3>Zoom without losing causality.</h3><p>Earth contains the person; the person contains organs; organs contain cells. The same event can be inspected at each scale without treating one vocabulary as the whole explanation.</p></article>
        <article><Eye/><span className="eyebrow">THE OBSERVER</span><h3>Experience becomes measurable.</h3><p>Reports, behaviour and physiology can be aligned in time. A feeling remains real data while its mechanism remains open to competing models.</p></article>
      </section>

      <section className="strict-boundary"><div><Sparkles/><span><b>WHAT THIS LAB IS</b>A versioned map for questions, experiments and model comparison.</span></div><div><Dna/><span><b>WHAT IT DOES NOT CLAIM</b>That memories are encoded intact in DNA, emotion is literal energy, or any organism is perfectly adapted.</span></div><div><HeartPulse/><span><b>NEXT BUILD</b>Consent-first personal measurements, atlas adapters and a preregistered light–sleep–autonomic closure test.</span></div></section>

      <section className="data-federation"><div><span className="eyebrow">FEDERATED EVIDENCE · OPEN SOURCES</span><h2>The laboratory grows by adapters,<br/>not by pretending one database is the body.</h2></div><div className="source-grid">{[
        ['HuBMAP','3D tissue and cell maps','https://portal.hubmapconsortium.org/'],['Human Cell Atlas','Cell types and states','https://data.humancellatlas.org/'],['SPARC','Autonomic and organ circuits','https://sparc.science/'],['Physiome / CellML','Executable physiological models','https://models.cellml.org/'],['GTEx','Tissue-specific gene regulation','https://gtexportal.org/home/'],['iHMP','Host–microbiome longitudinal data','https://portal.hmpdacc.org/']
      ].map(([name,desc,href])=><a key={name} href={href} target="_blank" rel="noreferrer"><b>{name}</b><span>{desc}</span><ArrowUpRight size={15}/></a>)}</div></section>
    </main>
  );
}
