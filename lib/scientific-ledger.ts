/** A federated index over real contracts. Room membership never licenses inference. */
import {SCIENCE_ROOMS,DEVICES,roomForDevice,available} from './observatory-catalogue.ts';
import {SCIENTIFIC_TERMS,UNIT_REGISTRY} from './scientific-vocabulary.ts';
import {SCIENCE_FIELDS,FIELD_GROUPS,FIELD_SOURCE} from './science-fields.ts';
import {registeredScientificOperations} from './ledger-runtime.ts';
import {SCIENCE_CLAIMS,FRAMEWORK_SOURCES} from './science-registry.ts';
import {CONTRIBUTIONS} from './discovery-ledger.ts';
export const LEDGER_VERSION='scientific-ledger/1';
const bindings:Record<string,string[]>={
 'ordered-model':['math.projective.action','math.contraction.action'],
 'temporal-grammar':['math.projective.action','math.contraction.action','biology.resource.ceiling','quantum.reference.evolve'],
 'resource-ledger':['biology.resource.ceiling'],'quantum-reference':['quantum.reference.evolve'],
};
export const LEDGER_STAGES=[
 {id:'observe',title:'Observe',noun:'System · instrument · record',verb:'Measure',detail:'Identify preparation, clock, units, acquisition and uncertainty. An instrument indication is not automatically the quantity of interest.'},
 {id:'resolve',title:'Name precisely',noun:'Concept · quantity · language',verb:'Disambiguate',detail:'Resolve aliases to scoped concepts. Entropy, state and ceiling each have multiple meanings. Unknown words create an explicit gap.'},
 {id:'contract',title:'Check the contract',noun:'Inputs · premises · domain',verb:'Compile',detail:'The central inquiry engine checks registered meanings, roles, units, preparation, clocks and required premises before it permits a calculation.'},
 {id:'execute',title:'Run the laboratory',noun:'Model · baseline · operation',verb:'Calculate / test',detail:'Execute a reviewed implementation. Keep action order and comparator explicit. A mathematical implication and a measured effect are different evidence classes.'},
 {id:'record',title:'Keep the evidence',noun:'Result · source · dependencies',verb:'Record',detail:'Preserve calculations, missing inputs and source identities in the report. A content hash detects changes; it does not certify scientific truth.'},
 {id:'revise',title:'Learn without erasing',noun:'Counterexample · revision',verb:'Review / supersede',detail:'A failed premise triggers reassessment of dependent claims. New claims begin as proposals; review and versioned source changes are still required for admission.'},
];
export function scientificLedger(){
 const operations=registeredScientificOperations();
 const devices=DEVICES.map(d=>({...d,room:roomForDevice(d.id)?.id,available:available(d),operationIds:bindings[d.id]??[],governance:bindings[d.id]?'shared-execution-contract':available(d)?'source-indexed; contract migration pending':'planned; no execution'}));
 const quantities=operations.flatMap(op=>[...Object.entries(op.inputs).map(([name,port])=>({operation:op.id,port:name,direction:'input',...port})),{operation:op.id,port:'result',direction:'output',...op.output}]);
 return {schema:LEDGER_VERSION,scope:'Federated scientific seed ledger. Coverage of a classification is not complete knowledge, empirical validation or universal law.',stages:LEDGER_STAGES,
  coverage:{source:FIELD_SOURCE,classification:'OECD Revised FOS 2007, Annex 1; adapted labels',groups:FIELD_GROUPS,fields:SCIENCE_FIELDS.map(f=>({...f,status:'mapped home; detailed ontology incomplete'}))},
  rooms:SCIENCE_ROOMS.map(r=>({...r,fieldIds:SCIENCE_FIELDS.filter(f=>f.room===r.id||(r.id==='astronomy'&&f.id==='1.3')).map(f=>f.id)})),devices,terms:SCIENTIFIC_TERMS,units:UNIT_REGISTRY,operations,quantityContracts:quantities,
  contributions:CONTRIBUTIONS.map(c=>({id:c.id,title:c.title,class:c.class,premises:c.premises,source:c.source,limit:c.limit})),
  claimRecords:SCIENCE_CLAIMS,claimSources:FRAMEWORK_SOURCES,
  evidence:{claims:'/framework',claimSource:'lib/science-registry.ts',cases:'/api/cases',caseSource:'lib/research-cases.ts',corpus:'/api/discoveries',proposalWorkflow:'/framework',admission:'Editor-reviewed source revisions. AI proposals and test success cannot promote themselves to established laws.'},
  execution:{inquiry:'/api/inquiry',catalogue:'/api/inquiry',demonstration:'/api/ledger/run',runtimeSource:'lib/ledger-runtime.ts',engineSource:'lib/engine/temporal-router.ts',scope:'Four operations use shared runtime contracts. Other instruments retain existing reviewed engines; their complete contract migration is unfinished.'},
  language:{resolver:'/api/ledger/resolve',policy:'Exact controlled labels with explicit ambiguity; no keyword inference. Definitions are authored operational scopes, not imported authoritative ontology equivalences.',inspiration:['https://www.w3.org/TR/skos-reference/','https://jcgm.bipm.org/vim/en/2.3.html','https://obofoundry.org/principles/fp-006-textual-definitions.html','https://www.w3.org/TR/prov-o/']},
  growth:{revisionValidatorSource:'lib/ledger-revision.ts',revisionValidatorScope:'Structural proposal and transitive impact checks; no persistence or empirical admission.',protocol:'https://github.com/thantiklermcirony/empirical-observatory/blob/main/research/Scientific_Ledger_Protocol.md',rules:['New concept: scoped definition, scientific use, source, aliases and disambiguation.','New operation: typed ports, premises, scope, implementation and falsifying tests.','New evidence: source identity, observation model, comparator, uncertainty and dependencies.','Revision: preserve prior record, state what changed, reassess dependants.'],gaps:['No complete scientific ontology import.','No claim that all legacy devices execute through a common validator.','No automatic truth admission or Lean certificate.','No physical transfer from a shared word, dimension or bounded range alone.']}};
}
