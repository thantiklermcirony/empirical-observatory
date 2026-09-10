export type AtlasNode = {
  id: string;
  title: string;
  family: 'centre' | 'foundation' | 'experiment' | 'research';
  position: [number, number, number];
  question: string;
  evidence: string;
  limit: string;
  next: string;
  source: string;
  sourceLabel: string;
};
const programme = 'https://github.com/thantiklermcirony/empirical-architecture';
export const atlasNodes: AtlasNode[] = [
  {
    id: 'centre',
    title: 'Adequate description',
    family: 'centre',
    position: [0, 0, 0],
    question:
      'What must a model remember to answer its declared future questions?',
    evidence:
      'The organising question of the programme. State, action, observation and evidence are explicit research objects.',
    limit:
      'A common question is not a universal fitted equation or proof that every application succeeds.',
    next: 'Use an experiment to distinguish histories the current description treats as equivalent.',
    source: programme + '/blob/main/MANIFESTO.md',
    sourceLabel: 'Read the manifesto',
  },
  {
    id: 'state',
    title: 'State & observer',
    family: 'foundation',
    position: [-3, 2.6, -1],
    question: 'When can history be safely forgotten?',
    evidence:
      'Predictive Closure V4 develops state, action descent, cumulative and temporal branches, and predictive realization.',
    limit:
      'Manuscript results retain their stated premises. This atlas is not a fresh proof audit of every theorem.',
    next: 'Establish finite-data identification and uncertainty on untouched continuations.',
    source: 'https://ssrn.com/abstract=7427098',
    sourceLabel: 'Predictive Closure V4',
  },
  {
    id: 'uhl',
    title: 'UHL & geometry',
    family: 'foundation',
    position: [2.8, 2.6, 1.1],
    question: 'Which admitted operations justify a geometry?',
    evidence:
      'The composition line distinguishes generator coordinates, flat and curved branches under additional structure.',
    limit:
      'Boundedness alone does not select hyperbolic geometry. Kinematics alone does not establish dynamics.',
    next: 'Join state refinement, temporal diagnostics and branch selection with quantitative uncertainty.',
    source: programme + '/blob/main/research/UHL.md',
    sourceLabel: 'UHL development and conditions',
  },
  {
    id: 'cell',
    title: 'Virtual Cell',
    family: 'experiment',
    position: [-5.4, 0.1, -2.6],
    question: 'Does a response survive a change of cell context?',
    evidence:
      'Four held-out contexts, 2,052 target genes and 6,642 measured genes. The first adjustment failed its superiority gate.',
    limit:
      'Author population estimates, confounded protocols and four contexts. No demonstrated IDA advantage or VCC score.',
    next: 'Acquire destination-cell baseline measurements and reserve fresh validation.',
    source: '/cell',
    sourceLabel: 'Open the real-data explorer',
  },
  {
    id: 'ida',
    title: 'IDA & cognition',
    family: 'research',
    position: [-5.5, -1.8, 1.8],
    question:
      'Which measurement or intervention distinguishes the states that matter?',
    evidence:
      'IDA / StateAtlas is an intervention-response instrument prototype within a broader cognition and observer programme.',
    limit:
      'No validated consciousness meter, clinical instrument or trained gene-response model is established.',
    next: 'Connect specific mechanisms to observable dissociations, with calibrated instruments and declared outcomes.',
    source: 'https://github.com/thantiklermcirony/ida-stateatlas',
    sourceLabel: 'Inspect IDA / StateAtlas',
  },
  {
    id: 'tao',
    title: 'TAO & control',
    family: 'experiment',
    position: [-2.9, -2.1, 4.4],
    question:
      'How should action change as a bounded system approaches failure?',
    evidence:
      'A playable bounded reactor compares controllers with matched observations, action limits and tuning budgets.',
    limit:
      'The conventional PI controller leads the published tracking comparison. The plant is synthetic.',
    next: 'Test untouched stress families against stronger control methods.',
    source: '/#tao',
    sourceLabel: 'Enter the TAO Chamber',
  },
  {
    id: 'adaptation',
    title: 'Adaptation & redox',
    family: 'research',
    position: [-0.1, -2.2, 5.5],
    question: 'Does restored concentration mean restored capacity?',
    evidence:
      'The manuscripts separate pool, flux, regeneration capacity, induction and transmitted functional control.',
    limit:
      'Shared language does not identify a mechanism. The redox model does not already derive all hormetic behavior.',
    next: 'Predict several independent recovery responses from one declared mechanism and shared parameters.',
    source: programme + '/blob/main/research/PROGRAMME.md',
    sourceLabel: 'Read the biological research map',
  },
  {
    id: 'ecology',
    title: 'Ecology & evolution',
    family: 'research',
    position: [3, -1.3, 4.4],
    question:
      'Can identical abundance hide different circulation or selection?',
    evidence:
      'The niche–neutral line distinguishes stationary density from probability current. Selection work examines informative sampling.',
    limit:
      'A circulating diagram does not establish biological currents. Drift, forcing and measurement remain alternatives.',
    next: 'Discriminate mechanisms using time-ordered observations and suitable controls.',
    source: 'https://ssrn.com/abstract=6963360',
    sourceLabel: 'Niche–neutral manuscript',
  },
  {
    id: 'ai',
    title: 'Scientific AI',
    family: 'foundation',
    position: [5.1, 0.2, 2.3],
    question:
      'What separates a plausible proposal from a warranted conclusion?',
    evidence:
      'The programme separates generation, evidence, meaning, memory and authority to act. These become explicit software contracts.',
    limit:
      'No LLM cost reduction, new neural architecture or general intelligence advantage has been demonstrated.',
    next: 'Compare a concrete state-revision system with matched conventional agents on unseen tasks.',
    source: 'https://ssrn.com/abstract=7426838',
    sourceLabel: 'Epistemic type-safety manuscript',
  },
  {
    id: 'memory',
    title: 'Memory & timing',
    family: 'experiment',
    position: [5.6, -2, -1],
    question: 'Which history and phase must software preserve?',
    evidence:
      'Graphiti history/time repairs and a NeuroGym decision-cue repair have reproductions and submitted upstream contributions.',
    limit:
      'Scoped software correctness results. Maintainer review and scientific generalization are separate outcomes.',
    next: 'Measure whether a shared test-selection method finds useful failures on unseen projects.',
    source: '/projects#graphiti',
    sourceLabel: 'Inspect the contributions',
  },
  {
    id: 'recovery',
    title: 'Distributed recovery',
    family: 'experiment',
    position: [3.1, -0.4, -4.7],
    question: 'Does the same name still identify the same running system?',
    evidence:
      'The Ray candidate reconnects a surviving subscriber to a replacement controller and has real Linux HTTP evidence.',
    limit:
      'One CPU node and the declared recovery cases were tested; the upstream contribution remains under review.',
    next: 'Extend verified recovery contracts across deployment and failure conditions.',
    source: '/projects#ray',
    sourceLabel: 'Inspect Ray recovery',
  },
  {
    id: 'quantum',
    title: 'Quantum & physics',
    family: 'research',
    position: [0.3, 1, -5.9],
    question: 'Which effects belong to dynamics, and which to observation?',
    evidence:
      'The station includes an established quantum-measurement simulation; manuscripts address observation structure and physical constructions.',
    limit:
      'A coordinate change or finite example is not quantum advantage or a continuum physical result.',
    next: 'Close a named dynamical, representation or scale-limit obligation; distinguish apparatus alternatives.',
    source: '/#quantum',
    sourceLabel: 'Enter the Quantum Lab',
  },
  {
    id: 'earth',
    title: 'Earth & astronomy',
    family: 'experiment',
    position: [-3.2, -1, -4.8],
    question: 'What did the instrument actually observe, and when?',
    evidence:
      'Real Oslo observations preserve event clocks, missingness and replay. Exoplanet work examines coefficient identification.',
    limit:
      'Live availability is not trip demand. A fitted coordinate does not by itself identify the physical mechanism.',
    next: 'Collect prospective data and test frozen baselines on unseen stations, days or observations.',
    source: '/#expeditions',
    sourceLabel: 'Explore Earth expeditions',
  },
  {
    id: 'primes',
    title: 'Resolution & primes',
    family: 'research',
    position: [-1.7, 3.3, 3.5],
    question: 'What apparent pattern disappears when the state is refined?',
    evidence:
      'The prime-sieve line studies resolution covariance, finite consistency and residual order structure.',
    limit:
      'Retrospective pattern recovery does not establish new out-of-sample predictive power.',
    next: 'Freeze predictors, resolution choices and future test intervals.',
    source: 'https://ssrn.com/abstract=7426882',
    sourceLabel: 'Prime-sieve manuscript',
  },
  {
    id: 'action',
    title: 'Viability & consent',
    family: 'foundation',
    position: [1.5, 3.6, -2.8],
    question:
      'Which useful distinctions can be obtained, and which actions are justified?',
    evidence:
      'The programme separates predictive, action-relevant and obtainable information, and distinguishes studied from imposed interventions.',
    limit:
      'Predictive usefulness does not itself establish permission, clinical efficacy or acceptable action.',
    next: 'Declare the actual intervention, costs, access and decision outcome before drawing an action conclusion.',
    source: 'https://ssrn.com/abstract=7427100',
    sourceLabel: 'Predictive state to viable action',
  },
];
export type AtlasEdge = {
  from: string;
  to: string;
  kind: 'shared question' | 'implementation' | 'hypothesis';
  label: string;
};
export const atlasEdges: AtlasEdge[] = [
  ...atlasNodes
    .filter((n) => n.id !== 'centre')
    .map((n) => ({
      from: 'centre',
      to: n.id,
      kind: 'shared question' as const,
      label: 'Adequacy is a shared methodological question.',
    })),
  {
    from: 'state',
    to: 'cell',
    kind: 'hypothesis',
    label:
      'Destination state measurements may improve response transfer; this is the next test.',
  },
  {
    from: 'state',
    to: 'memory',
    kind: 'shared question',
    label:
      'Discarded history can change a future answer; this is a methodological link, not a theorem-derived repair.',
  },
  {
    from: 'ai',
    to: 'memory',
    kind: 'implementation',
    label:
      'Scoped memory and evidence contracts are implemented and tested in the contribution campaign.',
  },
  {
    from: 'uhl',
    to: 'tao',
    kind: 'implementation',
    label:
      'The TAO fixture implements five declared bounded flows; controller superiority is a separate test.',
  },
  {
    from: 'ida',
    to: 'cell',
    kind: 'hypothesis',
    label:
      'IDA-style measurement selection is a research direction; no IDA biological advantage is scored.',
  },
  {
    from: 'tao',
    to: 'adaptation',
    kind: 'shared question',
    label:
      'Capacity, action and recovery are shared questions requiring distinct domain mechanisms.',
  },
];
export const atlasColours = {
  centre: '#93ffe1',
  foundation: '#b6a5ff',
  experiment: '#67d9fa',
  research: '#e8b772',
};
export function projectPoint(
  p: [number, number, number],
  yaw: number,
  pitch: number,
  zoom: number,
): [number, number, number] {
  const x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw);
  const z = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
  const y = p[1] * Math.cos(pitch) - z * Math.sin(pitch);
  const depth = p[1] * Math.sin(pitch) + z * Math.cos(pitch);
  const scale = (34 * zoom * 20) / (20 + depth);
  return [350 + x * scale, 270 - y * scale, depth];
}
