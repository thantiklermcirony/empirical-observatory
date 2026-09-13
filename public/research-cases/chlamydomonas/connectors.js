/* SPDX-License-Identifier: GPL-3.0-only */
(function(root){
 'use strict';
 const nodes=[
  {id:'V',label:'Cell volume',unit:'AV',kind:'volume',status:'published-model',equation:'dV/dt = mu × light × V',note:'Arbitrary volume, not calibrated micrometres cubed.'},
  {id:'SK',label:'Starter kinase',unit:'AU',kind:'model_amount',status:'published-model',equation:'dSK/dt = synthesis × V − (basal decay + light decay × light) × SK',note:'Generic regulator in the source model, not an identified gene assay.'},
  {id:'TF',label:'Free transcription factor',unit:'AU',kind:'model_amount',status:'published-model',equation:'Synthesis − binding + complex release − degradation',note:'Free and bound pools cannot be freely substituted.'},
  {id:'IN',label:'Free inhibitor',unit:'AU',kind:'model_amount',status:'published-model',equation:'Synthesis − binding − phosphorylation + dephosphorylation − degradation',note:'Feeds the inhibitor/TF switch.'},
  {id:'INTF',label:'Bound complex',unit:'AU',kind:'model_amount',status:'published-model',equation:'Association of TF and IN − release, phosphorylation and degradation',note:'Contains both an inhibitor and a TF contribution to their total pools.'},
  {id:'IP',label:'Phosphorylated inhibitor',unit:'AU',kind:'model_amount',status:'published-model',equation:'Phosphorylation of free/bound inhibitor − dephosphorylation − degradation',note:'A distinct chemical state, not extra total inhibitor.'},
  {id:'S',label:'S-phase regulator',unit:'AU',kind:'model_amount',status:'published-model',equation:'TF-driven synthesis inhibited by M − degradation',note:'Regulatory proxy, not a count of replicated DNA molecules.'},
  {id:'M',label:'M-phase regulator',unit:'AU',kind:'model_amount',status:'published-model',equation:'S-driven + feedback synthesis − antagonist-dependent degradation',note:'A downward concentration crossing triggers symmetric division.'}
 ];
 const edges=[['V','SK'],['V','TF'],['V','IN'],['V','INTF'],['V','IP'],['V','S'],['V','M'],
 ['SK','TF'],['SK','IN'],['SK','INTF'],['SK','IP'],['TF','IN'],['TF','INTF'],['TF','IP'],['TF','S'],
 ['IN','TF'],['IN','INTF'],['IN','IP'],['INTF','TF'],['INTF','IN'],['INTF','IP'],['IP','IN'],['S','M'],['M','S']];
 const contract={schema:'observatory.candidate-model.v1',model:'heldt-chlamydomonas-cell-cycle',
  schemaStatus:'Proposed portable adapter. Not deployed or verified against the hosted Observatory contract.',
  species:'Chlamydomonas reinhardtii',timeUnit:'min',nodes,edges,
  edgeScope:'Non-self continuous ODE dependencies. Division event dependencies are listed separately.',
  divisionEvent:{trigger:'M/V crosses CdTh downward',writes:['V','SK','TF','IN','INTF','IP','S','M'],map:'all amounts divided by 2'},
  evidenceClasses:['measured-data','published-model','algebraic-identity','simulation-only','unsupported'],
  source:'https://github.com/novakgroupoxford/2019_Heldt_et_al/tree/ab87e1314e27239d763e9cab188291e01b153574',
  supportedInputs:['binary illumination schedule','initial state','published model rate parameters'],
  unsupported:['nutrient uptake','water/osmotic flux','membrane voltage','ATP/energy','temperature response','phototaxis','damage/repair/death','sexual reproduction','evolution'],
  requiredEvidenceForNewConnector:['quantity identity','units and conversion','time convention','organism/strain and preparation','parameter provenance','joint intervention validation','failure domain']};
 function validatePort(a,b){
   for(const key of ['kind','unit','meaning','scale','timeUnit'])if(a[key]===undefined||b[key]===undefined||a[key]!==b[key])
     return {accepted:false,reason:'Missing or incompatible '+key+'. A separately justified transformation is required.'};
   return {accepted:true,reason:'Representation-compatible. This does not establish a causal relation or empirical validity.'};
 }
 const api={contract,validatePort};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Connectors=api;
})(typeof globalThis!=='undefined'?globalThis:this);
