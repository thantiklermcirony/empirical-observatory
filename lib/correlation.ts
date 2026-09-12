export type Pair = { key: string; label: string; x: number; y: number; year: number };
export type Association = { n: number; pearson: number | null; spearman: number | null; slope: number | null; intercept: number | null; rSquared: number | null; leaveOneOut: [number, number] | null; logX: number | null; firstDifferences: { n: number; pearson: number | null; spearman: number | null } | null; robustnessFlags: string[]; warnings: string[] };

function mean(values: number[]) { return values.reduce((sum, value) => sum + value / values.length, 0); }
export function pearson(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3 || ![...x, ...y].every(Number.isFinite)) return null;
  const mx = mean(x), my = mean(y), dx = x.map(v => v - mx), dy = y.map(v => v - my);
  const sx = Math.max(...dx.map(Math.abs)), sy = Math.max(...dy.map(Math.abs));
  if (!sx || !sy || !Number.isFinite(sx) || !Number.isFinite(sy)) return null;
  let xy = 0, xx = 0, yy = 0;
  for (let i = 0; i < x.length; i++) { const a = dx[i] / sx, b = dy[i] / sy; xy += a * b; xx += a * a; yy += b * b; }
  return Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy)));
}
export function ranks(values: number[]) {
  const ordered = values.map((value, i) => ({ value, i })).sort((a, b) => a.value - b.value), result = values.map(() => 0);
  for (let i = 0; i < ordered.length;) { let j = i + 1; while (j < ordered.length && ordered[j].value === ordered[i].value) j++; for (let k = i; k < j; k++) result[ordered[k].i] = (i + j + 1) / 2; i = j; }
  return result;
}
export function spearman(x: number[], y: number[]) { return pearson(ranks(x), ranks(y)); }
export function analyzePairs(pairs: Pair[], timeSeries: boolean): Association {
  if (pairs.length > 400 || pairs.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Invalid or oversized paired dataset.');
  if (new Set(pairs.map(p => p.key)).size !== pairs.length) throw new Error('Duplicate observation keys are not permitted.');
  const x = pairs.map(p => p.x), y = pairs.map(p => p.y), r = pearson(x, y);
  const mx = mean(x), my = mean(y), xx = x.reduce((s, v) => s + (v - mx) ** 2, 0), xy = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
  const candidateSlope = xx > 0 ? xy / xx : null;
  const slope = candidateSlope !== null && Number.isFinite(candidateSlope) ? candidateSlope : null;
  const sensitivity = pairs.length > 3 ? pairs.map((_, index) => pearson(x.filter((_, i) => i !== index), y.filter((_, i) => i !== index))).filter((v): v is number => v !== null) : [];
  let firstDifferences: Association['firstDifferences'] = null;
  if (timeSeries) {
    const sorted = [...pairs].sort((a, b) => a.year - b.year), dx: number[] = [], dy: number[] = [];
    for (let i = 1; i < sorted.length; i++) if (sorted[i].year === sorted[i - 1].year + 1) { dx.push(sorted[i].x - sorted[i - 1].x); dy.push(sorted[i].y - sorted[i - 1].y); }
    firstDifferences = { n: dx.length, pearson: pearson(dx, dy), spearman: spearman(dx, dy) };
  }
  const warnings = [
    'These are descriptive associations in the paired observations. They do not identify a causal force or establish the probability that a hypothesis is true.',
    'No population confidence interval or p-value is reported: these observational series do not establish independent random sampling. Revisions, measurement error and unobserved confounding are not quantified.',
    'Pairwise deletion can select a different population when values are missing. No values are imputed.',
    'The linear slope depends on units and is descriptive, not a causal effect. Pearson measures linear association; Spearman measures rank association.',
    'Sensitivity checks were declared before fetching: ranks, leave-one-out Pearson, positive-X logarithm, and adjacent-year changes for a time series. They are diagnostic, not independent confirmations.',
    'No lag search, automatic outlier removal or search across many variable pairs was performed. Repeated user searches are exploratory and require independent confirmation.',
  ];
  if (timeSeries) warnings.push('Annual values can share trends and serial dependence. Compare levels with adjacent-year changes; differencing does not by itself remove all confounding or dependence.');
  else warnings.push('Each country or economy has equal weight. Country-level association does not establish the same association between individuals; geographical dependence is possible.');
  if (r === null) warnings.push('Correlation is undefined with fewer than three pairs or a constant variable. Undefined is not zero.');
  if (pairs.length < 20) warnings.push('Fewer than 20 complete pairs: this small set is especially sensitive to individual observations.');
  const rank = spearman(x, y), robustnessFlags: string[] = [];
  if (r !== null && rank !== null && r * rank < -1e-8) robustnessFlags.push('Linear and rank associations have opposite signs. The positive/negative story is not stable across relationship shapes.');
  if (r !== null && sensitivity.some(v => r * v < -1e-8)) robustnessFlags.push('Omitting one observation can reverse the sign. The overall coefficient is sensitive to a single row.');
  if (r !== null && firstDifferences?.pearson != null && r * firstDifferences.pearson < -1e-8) robustnessFlags.push('Levels and consecutive-year changes have opposite signs. Shared trends may be driving the level association.');
  return { n: pairs.length, pearson: r, spearman: rank, slope, intercept: slope === null ? null : my - slope * mx, rSquared: r === null ? null : r * r, leaveOneOut: sensitivity.length ? [Math.min(...sensitivity), Math.max(...sensitivity)] : null, logX: x.every(v => v > 0) ? pearson(x.map(Math.log), y) : null, firstDifferences, robustnessFlags, warnings };
}
