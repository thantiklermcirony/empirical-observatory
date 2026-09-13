export type ScientificTerm={id:string;label:string;aliases:string[];kind:'entity'|'quantity'|'state'|'process'|'method'|'relation'|'formal';definition:string;source:string;rooms:string[];verbs:string[];scope:string};
const vim='https://jcgm.bipm.org/vim/en/';
const source={linguistics:'https://glossary.sil.org/',metrology:vim+'2.3.html',quantity:vim+'1.1.html',measurement:vim+'2.1.html',uncertainty:vim+'2.26.html',calibration:vim+'2.39.html',model:vim+'2.48.html',units:vim+'1.9.html',language:'https://www.w3.org/TR/skos-reference/',provenance:'https://www.w3.org/TR/prov-o/',biology:'https://obofoundry.org/',physics:'https://www.feynmanlectures.caltech.edu/I_09.html',quantum:'https://www.feynmanlectures.caltech.edu/III_03.html',chemistry:'https://goldbook.iupac.org/',information:'https://onlinelibrary.wiley.com/doi/abs/10.1002/j.1538-7305.1948.tb00917.x',programme:'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7427098'};
const t=(id:string,label:string,kind:ScientificTerm['kind'],definition:string,rooms:string[],verbs:string[],src:keyof typeof source,aliases:string[]=[],scope='Authored operational definition; reference context is not an asserted ontology equivalence. Application requires a specified system and observation model.'):ScientificTerm=>({id,label,kind,definition,rooms,verbs,source:source[src],aliases,scope});
export const SCIENTIFIC_TERMS:ScientificTerm[]=[
 t('system','System','entity','The selected object or collection, with an explicit boundary and environment.',['physics','biology','engineering'],['observe','perturb','model'],'programme'),
 t('observer','Observer','entity','The agent or apparatus associated with an observation protocol.',['archive','physics'],['observe','calibrate'],'metrology'),
 t('specimen','Specimen','entity','An identified material sample or organism instance.',['biology','chemistry','medicine','agriculture'],['sample','measure','perturb'],'biology'),
 t('instrument','Measuring instrument','entity','An identified apparatus participating in measurement.',['engineering','biology'],['calibrate','measure'],'measurement',['sensor']),
 t('quantity','Quantity','quantity','A property expressed quantitatively with a declared reference.',['mathematics','physics','chemistry'],['measure','compare'],'quantity'),
 t('measurand','Measurand','quantity','The particular quantity targeted by the measurement specification.',['archive','engineering'],['define','measure'],'metrology'),
 t('measurement-result','Measurement result','formal','A reported value or values with the information needed to interpret them.',['archive'],['record','compare'],'measurement'),
 t('uncertainty','Measurement uncertainty','quantity','A quantified characterisation of dispersion assigned to the measurand.',['mathematics','engineering'],['estimate','propagate'],'uncertainty'),
 t('calibration','Calibration','method','Relating indications to reference values under stated conditions.',['engineering','chemistry'],['calibrate'],'calibration'),
 t('measurement-model','Measurement model','formal','A declared relation between the measured output and its relevant inputs.',['mathematics','engineering'],['predict','calibrate'],'model'),
 t('unit','Measurement unit','formal','The declared reference used to express a quantity value.',['mathematics','physics'],['convert','compare'],'units'),
 t('time','Time','quantity','A time coordinate or duration with clock, origin and unit declared.',['physics','earth','biology'],['order','measure','differentiate'],'quantity'),
 t('length','Length','quantity','A spatial extent with geometry and reference specified.',['physics','engineering'],['measure','compare'],'quantity'),
 t('mass','Mass','quantity','The mass quantity of a specified system.',['physics','chemistry'],['measure','balance'],'quantity'),
 t('temperature','Thermodynamic temperature','quantity','Thermodynamic temperature for a specified system and state.',['physics','chemistry','earth'],['measure','heat'],'quantity',['temperature']),
 t('current','Electric current','quantity','Rate of electric-charge transport across a specified boundary.',['physics','engineering','biology'],['measure','integrate'],'quantity',['current']),
 t('voltage','Electric potential difference','quantity','Potential difference between specified electrical references.',['physics','engineering','biology'],['measure','perturb'],'quantity',['voltage']),
 t('concentration','Amount concentration','quantity','Amount of a specified species per declared volume.',['chemistry','biology','medicine'],['measure','dilute','balance'],'chemistry',['concentration']),
 t('force','Force','quantity','A vector entering the specified momentum-balance model.',['physics','engineering'],['apply','balance'],'physics'),
 t('energy','Energy','quantity','Energy of a declared system under the selected physical model.',['physics','chemistry','biology'],['transfer','balance'],'physics'),
 t('torque','Torque','quantity','Moment of a force about a specified point or axis.',['physics','engineering'],['apply','balance'],'physics'),
 t('probability','Probability','quantity','A normalised measure on a declared event space.',['mathematics','computing','physics'],['condition','marginalise'],'information'),
 t('shannon-entropy','Shannon entropy','quantity','Expected information content under a specified probability distribution and logarithm base.',['computing','mathematics','language'],['estimate','compare'],'information',['entropy']),
 t('thermodynamic-entropy','Thermodynamic entropy','quantity','The thermodynamic state quantity; its definition and use require the physical ensemble or process conditions.',['physics','chemistry'],['measure','balance'],'chemistry',['entropy']),
 t('quantum-state','Quantum state','state','A quantum state specification used with a declared measurement and evolution model.',['physics'],['prepare','evolve','measure'],'quantum',['state']),
 t('predictive-state','Predictive state','state','A retained representation relative to specified future tests and actions.',['computing','mathematics','biology'],['predict','refine','compare'],'programme',['state']),
 t('thermodynamic-state','Thermodynamic state','state','A macroscopic state defined by a suitable specified set of thermodynamic variables.',['physics','chemistry'],['prepare','perturb'],'chemistry',['state']),
 t('signal','Measured signal','quantity','An instrument indication indexed by a declared independent variable and acquisition protocol.',['engineering','biology','psychology'],['sample','filter','calibrate'],'measurement',['signal']),
 t('information-signal','Communication signal','formal','A signal in a specified communication channel and representation.',['computing','language'],['encode','transmit','decode'],'information',['signal']),
 t('cell','Cell','entity','A biological cell identified by organism, preparation and relevant type.',['biology','medicine'],['observe','perturb','sample'],'biology'),
 t('organism','Organism','entity','An identified living organism in a specified biological context.',['biology','agriculture','medicine'],['observe','sample'],'biology'),
 t('population','Population','entity','The explicitly delimited collection to which an analysis refers.',['biology','social','medicine'],['sample','compare'],'programme'),
 t('tissue','Tissue','entity','A specified biological tissue with organism and anatomical context.',['biology','medicine'],['sample','measure'],'biology'),
 t('molecule','Molecule','entity','A molecular entity with a specified chemical identity.',['chemistry','biology'],['identify','react'],'chemistry'),
 t('reaction','Chemical reaction','process','A specified chemical transformation with reactants, products and conditions.',['chemistry','biology'],['react','measure','balance'],'chemistry'),
 t('transport','Transport','process','Movement of a specified conserved quantity or species across a stated boundary.',['physics','chemistry','biology','earth'],['measure','balance'],'physics'),
 t('selection','Selection','process','Differential contributions of specified types under a defined inheritance and population model.',['biology','agriculture'],['compare','decompose'],'programme'),
 t('adaptation','Adaptation','process','A change evaluated relative to perturbation, objective, timescale and comparator; mechanism must be specified.',['biology','computing','psychology'],['perturb','compare','test'],'programme'),
 t('intervention','Intervention','method','A specified action that changes a system or its treatment assignment.',['biology','medicine','social'],['perturb','randomise'],'programme'),
 t('correlation','Correlation','relation','Association between specified variables under a declared statistic and sample.',['mathematics','social','earth'],['estimate','compare'],'programme'),
 t('causal-effect','Causal effect','relation','A contrast between specified interventions and outcomes under identification assumptions.',['medicine','social','biology'],['identify','estimate'],'programme'),
 t('bound','Bound','formal','An explicitly stated limit on a set, quantity, resource or inference; these senses must be distinguished.',['mathematics','physics','biology'],['bound','test'],'programme',['ceiling','boundedness']),
 t('resource-bound','Resource bound','formal','A necessary limit derived from specified available resources and accounting rules.',['biology','engineering'],['balance','bound'],'programme',['ceiling']),
 t('sensor-ceiling','Instrument saturation ceiling','quantity','A limit of the instrument response under specified operating and calibration conditions.',['engineering','biology'],['calibrate','measure'],'calibration',['ceiling']),
 t('sample-maximum','Sample maximum','quantity','The largest recorded value in an explicitly selected finite sample.',['mathematics','earth'],['calculate','compare'],'programme',['maximum']),
 t('hypothesis','Scientific hypothesis','formal','A proposition with explicit scope and potential discriminating observations.',['archive'],['propose','test','revise'],'programme'),
 t('theorem','Theorem','formal','A mathematical conclusion established from explicitly stated premises in a specified formal setting.',['mathematics'],['prove','apply'],'programme'),
 t('proof','Proof','formal','A derivation whose steps and admitted premises establish a stated mathematical implication.',['mathematics','computing'],['check','verify'],'programme'),
 t('model','Model','formal','A specified representation with assumptions, variables and intended predictions or decisions.',['mathematics','computing','physics'],['fit','test','compare'],'programme'),
 t('counterexample','Counterexample','formal','An admissible instance violating the conclusion of a proposed general statement.',['mathematics','computing'],['construct','verify'],'programme'),
 t('replication','Replication','method','A new execution or study intended to assess a previous finding under specified conditions.',['archive','medicine'],['repeat','compare'],'programme'),
 t('provenance','Provenance','formal','The recorded entities, activities and agents relevant to the origin of a result.',['archive','computing'],['record','trace'],'provenance'),
 t('dependency','Dependency','relation','A declared requirement connecting a result to its inputs, assumptions or supporting records.',['archive','computing'],['trace','invalidate'],'provenance'),
 t('revision','Revision','formal','A new identified record related to an earlier version without erasing its provenance.',['archive','computing'],['revise','supersede'],'provenance'),
 t('scientific-term','Scientific term','formal','A controlled label attached to an explicitly scoped scientific concept.',['language','archive'],['define','resolve'],'language'),
 t('synonym','Synonym','relation','An alternate label for the same intended concept within a specified vocabulary.',['language'],['resolve','map'],'language',['alias']),
 t('homonym','Homonym','relation','A shared linguistic form whose meanings require disambiguation.',['language'],['disambiguate'],'linguistics'),
 t('corpus','Language corpus','entity','An identified collection of language observations with sampling and annotation provenance.',['language','social'],['sample','annotate','analyse'],'linguistics'),
 t('phoneme','Phoneme','formal','A contrastive sound category in a specified linguistic analysis and language.',['language'],['annotate','compare'],'linguistics'),
 t('syntax','Syntax','formal','Rules or patterns governing structured expressions in a specified language.',['language','computing'],['parse','validate'],'linguistics'),
 t('semantics','Semantics','formal','The specified interpretation of expressions relative to a language or model.',['language','computing'],['interpret','resolve'],'linguistics'),
];
export function resolveScientificTerm(text:string,room?:string){const key=text.normalize('NFKC').trim().toLocaleLowerCase('en');const candidates=SCIENTIFIC_TERMS.filter(t=>(!room||t.rooms.includes(room))&&[t.id,t.label,...t.aliases].some(x=>x.toLocaleLowerCase('en')===key));return {input:text,status:candidates.length===1?'resolved':candidates.length?'ambiguous':'unregistered',candidates,authorisesCalculation:false};}
export const UNIT_REGISTRY=[
 {id:'1',dimension:'1',scale:1}, {id:'s',dimension:'T',scale:1},{id:'min',dimension:'T',scale:60},{id:'h',dimension:'T',scale:3600},
 {id:'m',dimension:'L',scale:1},{id:'mm',dimension:'L',scale:.001},{id:'kg',dimension:'M',scale:1},
 {id:'K',dimension:'Θ',scale:1},{id:'A',dimension:'I',scale:1},{id:'V',dimension:'M L² T⁻³ I⁻¹',scale:1},{id:'mV',dimension:'M L² T⁻³ I⁻¹',scale:.001},
 {id:'mM',dimension:'N L⁻³',scale:1},{id:'uM',dimension:'N L⁻³',scale:.001},
 {id:'J',dimension:'M L² T⁻²',scale:1},{id:'N*m',dimension:'M L² T⁻²',scale:1},
 {id:'model_time',dimension:'declared model clock',scale:1},
] as const;
export type QuantityIdentity={meaning:string;unit:string;preparation:string;clock:string;domain:string};
const quantityUnits:Record<string,string[]>={time:['s','min','h'],length:['m','mm'],mass:['kg'],temperature:['K'],current:['A'],voltage:['V','mV'],concentration:['mM','uM'],energy:['J'],torque:['N*m'],probability:['1']};
export function inspectTransfer(from:QuantityIdentity,to:QuantityIdentity){
 const reasons:string[]=[];
 for(const k of ['meaning','preparation','clock','domain'] as const)if(!from[k]||from[k]!==to[k])reasons.push(`Different or missing ${k}`);
 for(const q of [from,to])if(!Object.hasOwn(quantityUnits,q.meaning)||!quantityUnits[q.meaning].includes(q.unit))reasons.push('Unregistered quantity/unit pairing');
 const a=UNIT_REGISTRY.find(u=>u.id===from.unit),b=UNIT_REGISTRY.find(u=>u.id===to.unit);
 if(!a||!b)reasons.push('Unregistered unit');else if(a.dimension!==b.dimension)reasons.push('Incompatible dimensions');
 return{admitted:reasons.length===0,reasons,scale:reasons.length===0&&a&&b?a.scale/b.scale:null,scope:'Identity and linear unit compatibility only; not empirical calibration, causal transfer or proof.'};
}
