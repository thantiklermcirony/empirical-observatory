export function parseForecastFeed(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid record');
  const d = value as Record<string, unknown>;
  const time = (s: unknown): s is string =>
    typeof s === 'string' && Number.isFinite(Date.parse(s));
  const nonnegative = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (
    typeof d.status !== 'string' ||
    typeof d.detail !== 'string' ||
    !(d.capturedAt === null || time(d.capturedAt)) ||
    !Array.isArray(d.records) ||
    !Number.isInteger(d.resolved) ||
    !Number.isInteger(d.missed) ||
    !nonnegative(d.resolved) ||
    !nonnegative(d.missed)
  )
    throw new Error('Invalid summary');
  const records = d.records.slice(-192).map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid forecast');
    const r = raw as Record<string, unknown>;
    if (
      !time(r.issuedAt) ||
      !time(r.start) ||
      !time(r.end) ||
      !nonnegative(r.forecast) ||
      !(r.actual === null || nonnegative(r.actual)) ||
      !nonnegative(r.leadHours) ||
      Date.parse(r.end) <= Date.parse(r.start) ||
      Date.parse(r.start) <= Date.parse(r.issuedAt)
    )
      throw new Error('Invalid forecast values');
    const lead = (Date.parse(r.start) - Date.parse(r.issuedAt)) / 3600000;
    if (Math.abs(lead - r.leadHours) > 0.001 || lead < 24 || lead > 24.501)
      throw new Error('Invalid forecast lead');
    return {
      issuedAt: r.issuedAt,
      start: r.start,
      end: r.end,
      forecast: r.forecast,
      actual: r.actual,
      leadHours: r.leadHours,
    };
  });
  records.sort((a,b) => Date.parse(b.start)-Date.parse(a.start));
  return {
    status: d.status.slice(0, 160),
    detail: d.detail.slice(0, 1800),
    capturedAt: d.capturedAt,
    records,
    resolved: d.resolved,
    missed: d.missed,
  };
}
