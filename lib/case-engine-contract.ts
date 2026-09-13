export type CaseRequest={experiment:'timing'|'state'|'artifact'|'empirical';hours:48|96;slots:6|8};
export type CaseGate={id:string;label:string;status:'pass'|'fail'|'unresolved';detail:string};
export type CaseTrace={minutes:number;volume:number;totalVolume:number;descendants:number;regulator:number};
export type CaseRun={
 schema:string;engineVersion:string;caseId:string;createdAt:string;request:CaseRequest;evidenceClass:string;classification:string;finding:string;gates:CaseGate[];
 runs:{label:string;dtMinutes:number;lightMinutes:number;descendants:number;totalVolume:number;firstDivisionMinutes:number|null;state:number[];events:number[];trace:CaseTrace[];diagnostics:Record<string,number>}[];
 details:{overall?:{n:number;baseline:number;candidate:number};folds?:{hours:number;n:number;baseline:number;candidate:number}[];method?:string;uncertainty?:string;levels?:{dtMinutes:number;first:number[];differenceMinutes:number;counts:number[]}[];candidates?:{feature:string;trainingBrier:number;testN:number;testBrier:number;threshold:number|null}[];witness?:{histories:string[];checkpointStates:number[][];futureCounts:number[];firstDivisionMinutes:(number|null)[];selection:string}|null;rows?:{history:string;split:string;lightMinutes:number;checkpointGeneration:number;checkpointState:number[];descendantsDuringFuture:number;firstDivisionMinutes:number|null;target:number;features:Record<string,number>}[];search?:{histories:number;limits:string;split:string;predictor:string};};
 limitations:string[];provenance:{source:string;sourceCommit:string;archiveSha256:string;sourceArchive:string;assetsUsed:Record<string,string>;runtimeAssets?:Record<string,string>};receiptSha256:string;ai:{calls:number;role:string};
};
export const CASE_EXPERIMENTS=[
 {id:'state',number:'01',title:'Find missing state',description:'Try equal-light histories. Match the visible state. Give every lineage the same dark future and search for a split.',label:'Search histories'},
 {id:'timing',number:'02',title:'Same light, different lives',description:'Replay the verified light-timing contrast and compare it with an independent solver.',label:'Run comparison'},
 {id:'artifact',number:'03',title:'Kill a false discovery',description:'Watch a promising hidden-state effect disappear when the solver is refined.',label:'Stress-test claim'},
 {id:'empirical',number:'04',title:'Make a dial earn its place',description:'Re-score 3,679 held-out cell records. Does adding growth history improve prediction?',label:'Replay real-data scores'},
] as const;
export const CHLAM_STATE_LEDGER=[
 {noun:'Light L',unit:'0 or 1',bound:'Binary forcing; no photon/energy scale',verb:'Drive growth; accelerate SK decay',equation:'dV/dt = mu V L; dSK/dt = kSySk V − (kDeSk + kDeSkLi L) SK'},
 {noun:'Volume V',unit:'AV',bound:'V > 0; finite-horizon bound from fixed mu and light duration',verb:'Grow; halve at division',equation:'Lineage volume = V0 exp(mu ∫L dt), under symmetric partition'},
 {noun:'SK',unit:'AU',bound:'Nonnegative amount',verb:'Synthesize; decay; phosphorylate inhibitor',equation:'Light-dependent regulator; inspect all 8 source ODEs'},
 {noun:'TF, IN, INTF, IP',unit:'AU',bound:'Nonnegative amounts; coupled binding and phosphorylation',verb:'Bind; dissociate; phosphorylate; dephosphorylate',equation:'Free and bound pools are distinct state variables; no arbitrary area → amount conversion'},
 {noun:'S and M',unit:'AU',bound:'Nonnegative amounts',verb:'Activate feedback; trigger division',equation:'A downward crossing of M/V = CdTh triggers the declared division event'},
 {noun:'Division / lineage',unit:'count',bound:'2^generation, synchronous identical daughters',verb:'Halve all 8 amounts',equation:'parent[i] = 2 × daughter[i]; concentrations preserved at division'},
 {noun:'Elapsed darkness',unit:'hours',bound:'0–24 at this checkpoint',verb:'Summarize the recent input history',equation:'Time since the most recent light segment ended; a baseline competing with hidden-state predictors'},
 {noun:'Observed area',unit:'source pixels',bound:'Nonnegative area, distinct from model volume',verb:'Measure; predict held-out division occurrence',equation:'Brier = mean((observed event − predicted probability)^2)'},
];
