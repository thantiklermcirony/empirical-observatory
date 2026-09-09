import { mean, random, shuffle } from './random.ts';
import { logistic, logit } from './tao.ts';
export type Condition = 'fixed' | 'adaptive';
export interface TrialSpec {
  index: number;
  target: number;
  delayMs: number;
  condition: Condition;
}
export interface Trial {
  index: number;
  target: number;
  condition: Condition;
  windowMs: number;
  delayMs: number;
  response: number | null;
  reactionMs: number | null;
  correct: boolean;
  falseStarts: number;
  onsetMs: number;
  responseMs: number | null;
  forecastCurrent: number;
  forecastHistory: number;
}
export function trialPlan(seed: number, n = 24): TrialSpec[] {
  if (n < 4 || n > 120 || n % 2 !== 0)
    throw new Error('Use an even number of trials from 4 to 120.');
  const r = random(seed);
  const conditions = shuffle(
    Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'fixed' : 'adaptive')),
    seed ^ 0xabc123,
  ) as Condition[];
  return conditions.map((condition, index) => ({
    index,
    target: Math.floor(r() * 4),
    delayMs: 650 + Math.floor(r() * 700),
    condition,
  }));
}
/** Forecasts are frozen before the target appears and consume only completed trials. */
export function forecasts(history: Trial[]) {
  const last = history.at(-1);
  return {
    current: last ? (last.correct ? 0.75 : 0.25) : 0.5,
    history:
      (2 + history.slice(-6).filter((t) => t.correct).length) /
      (4 + Math.min(history.length, 6)),
  };
}
export function responseWindow(history: Trial[], condition: Condition) {
  if (condition === 'fixed') return 1400;
  const successes = forecasts(history).history;
  const desired = logit(0.75) - logit(successes);
  return Math.round(700 + 1500 * logistic(desired));
}
export function makeTrial(
  spec: TrialSpec,
  history: Trial[],
  onsetMs: number,
  response: number | null,
  responseMs: number | null,
  falseStarts = 0,
): Trial {
  const windowMs = responseWindow(history, spec.condition),
    f = forecasts(history);
  if (
    !Number.isFinite(onsetMs) ||
    onsetMs < 0 ||
    (response !== null &&
      (!Number.isInteger(response) || response < 0 || response > 3))
  )
    throw new Error('Invalid trial event.');
  if (
    responseMs !== null &&
    (!Number.isFinite(responseMs) || responseMs < onsetMs)
  )
    throw new Error('Response precedes stimulus.');
  if ((response === null) !== (responseMs === null))
    throw new Error('Response and timestamp must both be present or absent.');
  const reactionMs = responseMs === null ? null : responseMs - onsetMs,
    correct =
      response === spec.target && reactionMs !== null && reactionMs <= windowMs;
  return {
    ...spec,
    windowMs,
    response,
    responseMs,
    reactionMs,
    correct,
    falseStarts,
    onsetMs,
    forecastCurrent: f.current,
    forecastHistory: f.history,
  };
}
export function analyseBehaviour(trials: Trial[]) {
  const groups = (['fixed', 'adaptive'] as Condition[]).map((condition) => {
    const ts = trials.filter((t) => t.condition === condition),
      correct = ts.filter((t) => t.correct);
    return {
      condition,
      n: ts.length,
      accuracy: ts.length ? correct.length / ts.length : 0,
      meanCorrectReactionMs: correct.length
        ? mean(correct.map((t) => t.reactionMs!))
        : null,
      meanWindowMs: mean(ts.map((t) => t.windowMs)),
    };
  });
  return {
    n: trials.length,
    groups,
    brierCurrent: mean(
      trials.map((t) => (t.forecastCurrent - Number(t.correct)) ** 2),
    ),
    brierHistory: mean(
      trials.map((t) => (t.forecastHistory - Number(t.correct)) ** 2),
    ),
    falseStarts: trials.reduce((a, t) => a + t.falseStarts, 0),
    interpretation:
      'Exploratory description of one session. Conditions have different response windows; success rates alone do not establish improved learning. These fixed illustrative forecasts are not a trained AI model. No EEG or consciousness inference.',
  };
}
