export type RecoveryCase = {
  id: string;
  cohort: string;
  cutoffDay: number;
  targetDay: number;
  observedDay: number | null;
  observed: string;
  visits: { day: number; severe: number; assessed: number }[];
  probabilities: { model: string; values: number[] }[];
};
export type RecoveryEvidence = {
  status: string;
  updatedAt: string;
  question: string;
  verdict: string;
  scope: string;
  gate: { passed: boolean | null; detail: string };
  counts: { label: string; value: string | number }[];
  classes: string[];
  methods: { name: string; score: number | null; role: string }[];
  metric: string;
  cases: RecoveryCase[];
  limitations: string[];
  links: { label: string; href: string }[];
  steps: { name: string; status: string; detail: string }[];
};
