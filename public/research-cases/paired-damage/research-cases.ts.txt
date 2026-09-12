import manifest from '../public/research-cases/paired-damage/manifest.json' with {type:'json'};

/** One evidence record, many laboratory questions. Links never grant evidential transfer. */
export const PAIRED_DAMAGE_CASE = {
  schema: 'observatory-research-case/1', id: 'BIO-PD-001', revision: 2,
  slug: 'paired-damage', title: 'When does cell damage become informative?',
  owner: 'biology', deviceId: 'paired-damage', href: '/cases/paired-damage',
  classification: 'exploratory-reanalysis', admission: 'candidate_requires_independent_validation',
  question: 'Among filename-matched H/T cell pairs, how does the ordering of measured PI uptake relate to the ordering of later death times?',
  finding: 'The direction is correct in 45/90 pairs at 24.5 hours and 63/88 at 66.5 hours when both recorded deaths lie more than seven hours ahead. This is a retrospective association in selected observed-death pairs. The age-dependent sets differ; it is not a validated decision horizon or evidence of a new force.',
  provenance: manifest,
  nouns: [
    {name:'System',definition:'Carbon-starved wildtype E. coli in the published microfluidic experiment; no human or organ inference.'},
    {name:'Pair',definition:'Matching filename prefixes with terminal H and T. This is a candidate sister pairing; daughter-role semantics and independent experiment identities remain unverified.'},
    {name:'Measured quantity',definition:'Source-table X is the exported PI uptake / damage proxy, in source-normalized units. It is not an absolute burden, repair capacity or energy reserve; do not silently equate it with log-damage X(t).'},
    {name:'Clock and outcome',definition:'Age and recorded death endpoint in hours. Both source status flags must be 1 (observed death); status 2 is right-censoring and excluded from this descriptive cohort.'},
  ],
  verbs: ['Join by exact normalized cell identity and age.', 'Exclude equal damage or equal endpoint pairs.', 'Require both endpoints strictly later than age plus the selected margin.', 'Count opposite signs of damage difference and death-time difference.', 'Retain source hashes, exclusions, margin and revision with the result.'],
  limits: [
    'Later association was already a theme of Yang et al. (2023). Novelty of this paired statistic has not been established.',
    'The same pairs recur across ages and filename strata may share an experiment. Counts are not independent replications; no confirmatory p-values or population confidence intervals are supplied.',
    'Both-deaths-only selection and changing cohorts can bias the curve. A lead-margin restriction also selects on future outcome and cannot validate a deployable forecast.',
    'The source uses seven-hour windows and processed fluorescence. Exact smoothing, window alignment and saturation calibration are unresolved; a time margin does not remove all future-information leakage.',
    'The previous model overlay used a provisional threshold of 20 on exp[X]. The supplement’s Xc=20 example does not establish that threshold on the exported coordinate. Model agreement is held pending coordinate, endpoint and cohort reconciliation.',
    'A shifted curve cannot identify repair saturation, reserve capacity or noise amplification on its own. Each mechanism needs independent measurements and a discriminating comparison.',
  ],
  corrections: [
    {revision:'pre-integration',status:'withdrawn',detail:'A name-only join overwrote early measurements with later ages. The strong initial-condition claim was withdrawn; the 24.5h directional count is 45/90.'},
    {revision:'1 → 2',status:'superseded',detail:'The original sweep did not enforce alive-at-measurement eligibility. Revision 2 excludes endpoints at or before the selected margin, records ties and counts, and holds the provisional model overlay.'},
  ],
  connections: [
    {room:'biology',device:'cell-responses',role:'Observation and mechanism',status:'descriptive evidence available',question:'Does membrane deterioration retain predictive information after observation timing, dye behavior and censoring are resolved?',requires:['Verified H/T lineage roles','Exact PI observation pipeline','Independent experiment identities']},
    {room:'mathematics',device:'temporal-grammar',role:'Temporal grammar',status:'shared eligibility rule',question:'Which observations were available before the prediction time?',requires:['Explicit window start/end','Past-only preprocessing','Matching measurement and endpoint clocks']},
    {room:'mathematics',device:'ordered-model',role:'Boundedness and measurement ceilings',status:'hypothesis to test',question:'How much apparent acceleration is produced by estimating a saturation ceiling from the same trajectory?',requires:['Independently calibrated fluorescence ceiling','Constant-permeability baseline with matching noise','No claim that boundedness selects UHL']},
    {room:'engineering',device:'controller-comparison',role:'Dynamics and competing models',status:'model comparison held',question:'Can a reconciled first-passage model reproduce the same paired statistic with the same cohort rules?',requires:['Verified X versus exp[X] convention','Verified death threshold and censoring','Independent simulation replicas, not extra biological samples']},
    {room:'computing',device:'motion-learning',role:'Adaptation and prediction',status:'prospective test needed',question:'Does damage history improve a frozen out-of-experiment forecast over age and current damage?',requires:['Independent development/test experiments','Equal information and fitting budgets','Fixed prediction horizon and calibration gates']},
    {room:'physics',device:'quantum-reference',role:'Quantum transfer boundary',status:'no licensed transfer',question:'Is there a measured molecular mechanism requiring a quantum model here?',requires:['Specific molecular species and instrument','Physical units and preparation','Prediction distinguishing coherent and incoherent alternatives']},
    {room:'archive',device:'encyclopedia',role:'Encyclopedia and provenance',status:'candidate case only',question:'What was measured, what was corrected, and what would change this record?',requires:['Source-pinned revision','Reproduction receipt','Independent validation before promotion']},
  ],
  next: {
    title:'Separate a biological warning signal from the observation process',
    state:'protocol defined; empirical execution gated',
    baseline:'Reproduce the published observation pipeline, then compare a constant-permeability fluorescence baseline and the published damage model under identical sampling, noise, censoring and pair rules.',
    readiness:['Recover exact background, saturation, smoothing and window conventions.','Reproduce every matched source uptake value to its recorded precision or document each exclusion.','Verify H/T roles, independent experiment identities and exported model threshold coordinates.','Reserve a genuinely independent experiment; the current data have already been explored.'],
    success:'On an independent experiment, a frozen age-and-current-damage forecast augmented with past damage history must reduce pair-weighted Brier score by at least 5%, with a 95% experiment-cluster bootstrap interval for improvement entirely above zero, and calibration intercept within ±0.1 and slope within 0.8–1.2. All gates must pass. These are proposed future gates, not claims of external preregistration.',
    failure:'An evaluable miss on any performance gate rejects the claimed predictive advantage. Missing calibration, unresolved pipeline or insufficient independent experiments is inconclusive. Even passing cannot uniquely identify a hidden biological mechanism.',
    beforeFitting:'Freeze horizon, label and censoring rule, cohort eligibility, model formulas, tuning budget, split, power/sample size and bootstrap procedure before new empirical fitting. Do not retune on this explored dataset.',
  },
} as const;
export const RESEARCH_CASES = [PAIRED_DAMAGE_CASE];
export function casesForRoom(room:string){return RESEARCH_CASES.filter(c=>c.connections.some(x=>x.room===room));}
export const PAIRED_DAMAGE_BRIEF={id:'S-PAIRED-DAMAGE',branch:'biology',title:PAIRED_DAMAGE_CASE.title,evidence:'Exploratory published-data reanalysis; corrected revision 2; no new law admitted',href:PAIRED_DAMAGE_CASE.href,finding:PAIRED_DAMAGE_CASE.finding+' '+PAIRED_DAMAGE_CASE.limits[3]+' '+PAIRED_DAMAGE_CASE.limits[4]+' The case has a deterministic replay endpoint and cross-laboratory obligations. Reading this brief does not execute that replay.'};
