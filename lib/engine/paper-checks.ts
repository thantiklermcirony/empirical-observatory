// Finite witnesses of conditional manuscript claims. No expected answers enter these solvers.
// Inputs are exact declared Bernoulli probabilities, not estimates of unknown real-world laws.
export function predictivePartition(rows: number[][], columns: number[]) {
  if (
    !rows.length ||
    rows.length > 32 ||
    !columns.length ||
    columns.length > 16 ||
    new Set(columns).size !== columns.length
  )
    throw new Error('Use 1–32 histories and 1–16 distinct tests.');
  const width = rows[0].length;
  if (
    rows.some(
      (r) =>
        r.length !== width ||
        r.some((p) => !Number.isFinite(p) || p < 0 || p > 1),
    ) ||
    columns.some((c) => !Number.isInteger(c) || c < 0 || c >= width)
  )
    throw new Error('Invalid exact Bernoulli table or test index.');
  const groups: number[][] = [];
  for (let i = 0; i < rows.length; i++) {
    const g = groups.find((g) =>
      columns.every((c) => rows[g[0]][c] === rows[i][c]),
    );
    if (g) g.push(i);
    else groups.push([i]);
  }
  return groups;
}
export function stateLawWitness(
  rows: number[][],
  columns: number[],
  labels: string[],
) {
  predictivePartition(rows, columns);
  if (labels.length !== rows.length)
    throw new Error('Every history needs one state label.');
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++)
      if (labels[i] === labels[j])
        for (const c of columns)
          if (rows[i][c] !== rows[j][c])
            return {
              histories: [i, j],
              test: c,
              probabilities: [rows[i][c], rows[j][c]],
            };
  return null;
}
export function refineJurisdiction(
  rows: number[][],
  before: number[],
  after: number[],
) {
  const coarse = predictivePartition(rows, before),
    fine = predictivePartition(rows, after);
  if (before.some((c) => !after.includes(c)))
    return { status: 'not-applicable' as const, coarse, fine };
  return {
    status: 'nested' as const,
    coarse,
    fine,
    map: fine.map((g) =>
      coarse.findIndex((old) => g.every((i) => old.includes(i))),
    ),
  };
}
export function actionCover(success: number[][], threshold: number) {
  predictivePartition(success, [0]);
  const n = success[0].length;
  if (
    n < 1 ||
    n > 12 ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1
  )
    throw new Error('Use 1–12 primitive actions and a probability threshold.');
  const acceptable = success.map((row) =>
    row.flatMap((p, i) => (p >= threshold ? [i] : [])),
  );
  if (acceptable.some((a) => !a.length))
    return {
      status: 'infeasible' as const,
      acceptable,
      common: [],
      cover: [],
      codes: null,
    };
  const common = acceptable[0].filter((a) =>
    acceptable.every((s) => s.includes(a)),
  );
  let cover: number[] | null = null;
  for (let mask = 1; mask < 1 << n; mask++) {
    const chosen = Array.from({ length: n }, (_, i) => i).filter(
      (i) => mask & (1 << i),
    );
    if (cover && chosen.length >= cover.length) continue;
    if (acceptable.every((s) => s.some((a) => chosen.includes(a))))
      cover = chosen;
  }
  return {
    status: 'solved' as const,
    acceptable,
    common,
    cover: cover!,
    codes: cover!.length,
  };
}
export function boundedComposition(
  x: number,
  y: number,
  chart: 'rapidity' | 'tangent',
) {
  if (![x, y].every((v) => Number.isFinite(v) && Math.abs(v) < 1))
    throw new Error('States must lie strictly inside (−1,1).');
  if (!['rapidity', 'tangent'].includes(chart))
    throw new Error('Unknown additive chart.');
  const result =
    chart === 'rapidity'
      ? (x + y) / (1 + x * y)
      : (2 / Math.PI) *
        Math.atan(Math.tan((Math.PI * x) / 2) + Math.tan((Math.PI * y) / 2));
  if (!Number.isFinite(result) || Math.abs(result) >= 1)
    throw new Error('Numerical precision cannot resolve this interior state.');
  return result;
}
export function storageCount(
  facts: number,
  bitsEach: number,
  descriptionBits: number,
) {
  if (
    ![facts, bitsEach, descriptionBits].every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 32,
    ) ||
    facts * bitsEach > 1024
  )
    throw new Error('Finite counting fixture out of range.');
  const needed = facts * bitsEach;
  return {
    needed,
    tables: (BigInt(1) << BigInt(needed)).toString(),
    descriptions: (BigInt(1) << BigInt(descriptionBits)).toString(),
    enough: descriptionBits >= needed,
  };
}
