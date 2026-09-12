import {
  actionCover,
  boundedComposition,
  predictivePartition,
  refineJurisdiction,
  stateLawWitness,
  storageCount,
} from './engine/paper-checks.ts';
export type Challenge = {
  id: string;
  title: string;
  question: string;
  paper: string;
  location: string;
  source: 'Foundations' | 'Applications';
  scope: string;
  assumptions: string[];
  visual: string;
  missing?: string[];
  expected: string;
  kill: string;
};
export const CHALLENGES: Challenge[] = [
  {
    id: 'selector',
    title: 'Does boundedness choose UHL?',
    question:
      'Can two associative laws share the same bounds but compose differently?',
    paper:
      'Einstein Velocity Addition from Associativity and Boundary-Fixing Möbius Translations',
    location: 'PDF p.1, Theorem 1.1; pp.2–4, scope and proof',
    source: 'Foundations',
    scope:
      'A finite numerical witness of non-uniqueness; the proof uses additive conjugacy. This does not test whether nature selects the Möbius law.',
    assumptions: [
      'States in (−1,1); identity 0; odd increasing onto additive charts.',
      'Compare rapidity and tangent charts in the same measured coordinate.',
    ],
    visual: 'Two rulers, same endpoints, different composed states.',
    expected:
      'The results differ at x = y = 0.5. Möbius translations are an extra selector.',
    kill: 'One valid alternative law is enough to refute selection by boundedness and associativity alone.',
  },
  {
    id: 'quotient',
    title: 'How much history can we forget?',
    question:
      'Which histories can share one state without changing either declared future law?',
    paper:
      'Predictive Closure: State, action, and the experimental compression of history',
    location: 'PDF p.7, §2.2 predictive quotient module',
    source: 'Foundations',
    scope:
      'Exact compression of this finite Bernoulli table, using equality of all admitted columns; no claim about unmeasured future tests.',
    assumptions: [
      'Four histories; two admitted binary future tests u and v.',
      'Table probabilities are stipulated exact, not noisy estimates.',
    ],
    visual:
      'Equal future-response rows merge; different rows retain separate colours.',
    expected: 'Four histories reduce to three states: {h1,h2}, {h3}, {h4}.',
    kill: 'Merging any two unequal rows makes this exact representation insufficient.',
  },
  {
    id: 'descent',
    title: 'Can a smarter model repair lost history?',
    question:
      'If h3 and h4 receive the same present label, can a function of that label recover their different futures?',
    paper:
      'The Observer and the World: Predictive state, lawful forgetting, and the geometry of empirical reality',
    location: 'PDF pp.4–5, Theorem 1, state-law descent',
    source: 'Foundations',
    scope:
      'An explicit fibre-constancy counterexample for a fixed declared future family.',
    assumptions: [
      'The candidate labels are A,A,B,B.',
      'Every later predictor receives only the label, not the original history.',
    ],
    visual:
      'Highlight the merged histories and the first future test that separates them.',
    expected:
      'No. The shared B label would require P(Y=1|u) to equal both 0.2 and 0.9.',
    kill: 'One matched-label pair with unequal admitted future laws rules out exact descent.',
  },
  {
    id: 'refinement',
    title: 'What changes when we add a lens?',
    question: 'Add test v while retaining u: do old states merge or split?',
    paper: 'The Observer and the World',
    location: 'PDF p.6, Proposition 2, jurisdiction refinement',
    source: 'Foundations',
    scope:
      'An exact comparison on the same history domain with nested test sets.',
    assumptions: [
      'The new repertoire contains every old test.',
      'No tolerance, history domain or old measurement is changed.',
    ],
    visual:
      'Show old groups beside the finer new groups with membership preserved.',
    expected:
      'Two old states become three. Replacing u with v fails the nesting premise.',
    kill: 'A claimed refinement that drops an old test is inapplicable, not evidence against the theorem.',
  },
  {
    id: 'action',
    title: 'Pairwise agreement can fail as a whole',
    question:
      'Every pair of states shares an acceptable action. Can all three share one action code?',
    paper:
      'From Predictive State to Viable Action: Action Sufficiency, Safe Diagnosis, and the Operational Recoverability Bound',
    location: 'PDF pp.3–4, Theorems 1–2',
    source: 'Foundations',
    scope:
      'Exact finite deterministic action cover, not an adaptive or randomised policy.',
    assumptions: [
      'Three states; primitive actions a,b,c.',
      'An action is acceptable at success probability ≥0.9.',
    ],
    visual:
      'A state-by-action grid makes the missing three-way intersection visible.',
    expected:
      'No common action. The minimum action cover/code has size 2, despite every pair overlapping.',
    kill: 'Any one-code policy must pick an action acceptable to all three, which this library lacks.',
  },
  {
    id: 'storage',
    title: 'Can factual bits disappear?',
    question:
      'Can all tables of four independent two-bit facts fit into a fixed six-bit description with exact recall?',
    paper: 'Epistemic Type Safety for Generative AI',
    location: 'PDF p.8, Proposition 1, factual-storage counting bound',
    source: 'Foundations',
    scope:
      'Counting for all arbitrary fact tables and a fixed decoder. It does not set the necessary size of an AI proposer.',
    assumptions: [
      'All 256 fact tables are possible.',
      'Fixed deterministic decoder; every indexed fact must be recalled exactly.',
    ],
    visual:
      'Compare the number of possible fact tables with the number of descriptions.',
    expected:
      '256 tables but only 64 descriptions. At least eight fact-dependent bits are required.',
    kill: 'A restricted or correlated table family changes the premise rather than breaking the counting bound.',
  },
  {
    id: 'hormesis',
    title: 'Where must the hormetic peak occur?',
    question:
      'Can we recover the quoted 1.69–2.43 peak-to-activation ratio from the extracted model specification?',
    paper:
      'Hormesis as a Geometric Necessity of Bounded Adaptive Systems: Quantitative Predictions from First Principles',
    location: 'PDF pp.4–5, §§3.1–3.4; p.8, §5.1; p.14, Appendix A.1–A.2',
    source: 'Applications',
    scope:
      'Parameter-completeness check. No invented dose curve and no clinical prediction.',
    assumptions: [
      'Repair and damage sigmoid forms and amplitudes must be independently specified.',
      'Same observable, assay and exposure schedule.',
    ],
    visual:
      'Show missing model inputs at the point where they block a peak calculation.',
    expected:
      'Underdetermined from this extract; do not turn the quoted ratio into a computed result.',
    missing: [
      'Repair and damage steepnesses sₐ and sₜ',
      'Baseline rapidity ρbase',
      'Damage amplitude Bρ and the complete numerical grid',
    ],
    kill: 'Independently frozen parameters that miss held-out peaks would weaken the specific empirical prediction.',
  },
  {
    id: 'ida',
    title: 'Does return history add predictive power?',
    question:
      'Do IDA return features improve prediction on entirely held-out subjects beyond equally sized static features?',
    paper:
      'IDA and the Boundedness Engine: A Typed-Residue Research Programme for Bounded Domains, Return Geometry, and Awareness-Gated Control',
    location: 'PDF pp.8–10, §§6–6.3; pp.13–15, §§9.4–10.1',
    source: 'Applications',
    scope:
      'Prospective Gate 0 experiment. Synthetic return behaviour is not biological validation.',
    assumptions: [
      'Freeze embedding, baseline, decay, outcomes and folds.',
      'No judged future enters the baseline.',
    ],
    visual:
      'Subject-separated validation and performance with uncertainty, once records exist.',
    expected: 'No empirical answer without the declared data and comparator.',
    missing: [
      'Subject/session-level perturbation and recovery records',
      'Frozen baseline and outcome labels',
      'Held-out static and dynamic comparator predictions',
    ],
    kill: 'No held-out improvement, or future leakage, defeats this instance of Gate 0.',
  },
  {
    id: 'tao',
    title: 'Does TAO win after fair tuning?',
    question:
      'Does TAO improve held-out boundary cost and recovery with an equal optimisation budget for every controller?',
    paper:
      'Thresholded Adaptive Orchestration: Typed Bounded-State Interfaces and Boundary-Stress Testing for Generative Interactive Worlds',
    location: 'PDF pp.21–22, synthetic oracle; pp.28–29, hypotheses',
    source: 'Applications',
    scope:
      'The desk’s equal-gain fixture is an illustration, not this paper benchmark.',
    assumptions: [
      'Same replay trajectories, action limits and observations.',
      'Freeze tuning budget, held-out stress families and separate cost metrics.',
    ],
    visual:
      'Held-out recovery versus boundary-cost frontier with every controller shown.',
    expected:
      'The four default desk traces cannot establish the paper’s superiority hypothesis.',
    missing: [
      'Frozen tuning search and all baseline search logs',
      'Held-out boundary trajectories',
      'Overshoot, pinning, recovery and semantic-work endpoints',
    ],
    kill: 'An equally tuned baseline dominates, or the advantage vanishes with admitted estimator noise.',
  },
  {
    id: 'amplitude',
    title: 'Can network structure predict benefit?',
    question:
      'Does independently measured ΣCᵢεᵢ predict held-out hormetic peak amplitude?',
    paper: 'Response-Coefficient Attenuation Predicts Hormetic Peak Amplitude',
    location: 'Extracted PDF p.6, §§3.3–4.1; p.11, §§10.2–10.4',
    source: 'Applications',
    scope:
      'The first-order identity is inherited from metabolic control analysis; the phenotype link is an empirical prediction.',
    assumptions: [
      'Common stable operating point and compatible fractional units.',
      'Retain signs, interactions and coefficient uncertainty.',
    ],
    visual:
      'Signed contributions leading to observed versus predicted amplitude.',
    expected:
      'An identity alone does not establish its same-system phenotype prediction.',
    missing: [
      'Independently measured Cᵢ and εᵢ with uncertainty',
      'Matched-system peak amplitude and validation split',
    ],
    kill: 'No out-of-sample gain or a wrong signed association after frozen covariates.',
  },
];
export const FUTURES = [
  [0.2, 0.8],
  [0.2, 0.8],
  [0.2, 0.6],
  [0.9, 0.8],
];
export const ACTIONS = [
  [0.95, 0.93, 0.1],
  [0.1, 0.91, 0.94],
  [0.92, 0.2, 0.96],
];
export type CheckResult = {
  status: 'witness' | 'missing-inputs';
  headline: string;
  details: string[];
  groups?: number[][];
  otherGroups?: number[][];
  witness?: ReturnType<typeof stateLawWitness>;
  actions?: ReturnType<typeof actionCover>;
  numbers?: { label: string; value: number }[];
};
export function runPaperCheck(id: string): CheckResult {
  const c = CHALLENGES.find((c) => c.id === id);
  if (!c) throw new Error('Unknown paper challenge.');
  if (c.missing)
    return {
      status: 'missing-inputs',
      headline: 'This question needs more information.',
      details: c.missing,
    };
  switch (id) {
    case 'selector': {
      const rapidity = boundedComposition(0.5, 0.5, 'rapidity'),
        tangent = boundedComposition(0.5, 0.5, 'tangent');
      return {
        status: 'witness',
        headline: `The same bounded inputs give ${rapidity.toFixed(6)} or ${tangent.toFixed(6)}.`,
        details: [
          'Both laws are f⁻¹(f(x)+f(y)) for an odd increasing onto chart, so their associativity follows algebraically.',
          'The tangent chart is an explicit alternative; boundedness alone has not selected the measured-coordinate law.',
        ],
        numbers: [
          { label: 'Rapidity / Möbius', value: rapidity },
          { label: 'Tangent / different chart', value: tangent },
        ],
      };
    }
    case 'quotient': {
      const groups = predictivePartition(FUTURES, [0, 1]);
      return {
        status: 'witness',
        headline: `Four histories need ${groups.length} exact predictive states.`,
        details: [
          'Only identical future-response rows can merge for the declared tests.',
        ],
        groups,
      };
    }
    case 'descent': {
      const witness = stateLawWitness(FUTURES, [0, 1], ['A', 'A', 'B', 'B']);
      return {
        status: 'witness',
        headline: witness
          ? 'The merged present loses a future distinction.'
          : 'No conflict found.',
        details: witness
          ? [
              `h${witness.histories[0] + 1} and h${witness.histories[1] + 1}: the same label demands probabilities ${witness.probabilities.join(' and ')} for test ${['u', 'v'][witness.test]}.`,
            ]
          : [],
        witness,
        groups: [
          [0, 1],
          [2, 3],
        ],
      };
    }
    case 'refinement': {
      const r = refineJurisdiction(FUTURES, [0], [0, 1]);
      return {
        status: 'witness',
        headline: `Adding v changes ${r.coarse.length} states into ${r.fine.length}.`,
        details: [
          `Dropping u instead: ${refineJurisdiction(FUTURES, [0], [1]).status}. The nesting assumption matters.`,
        ],
        groups: r.coarse,
        otherGroups: r.fine,
      };
    }
    case 'action': {
      const actions = actionCover(ACTIONS, 0.9);
      return {
        status: 'witness',
        headline: `Every pair overlaps; the full set needs ${actions.codes} action codes.`,
        details: [
          `Common acceptable actions: ${actions.common.length}. Minimum covering library: ${actions.cover.map((a) => ['a', 'b', 'c'][a]).join(', ')}.`,
          'Prediction and action can require different amounts of retained information.',
        ],
        actions,
      };
    }
    case 'storage': {
      const r = storageCount(4, 2, 6);
      return {
        status: 'witness',
        headline: `${r.tables} possible tables; ${r.descriptions} descriptions.`,
        details: [
          `Minimum fact-dependent storage: ${r.needed} bits. A fixed decoder cannot distinguish all tables with six bits.`,
        ],
        numbers: [
          { label: 'Possible fact tables', value: Number(r.tables) },
          { label: 'Available descriptions', value: Number(r.descriptions) },
        ],
      };
    }
    default:
      throw new Error('No registered calculation.');
  }
}
