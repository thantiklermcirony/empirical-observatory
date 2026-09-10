export type InterestEvent = {
  event: 'page' | 'lab' | 'source' | 'verification';
  page: 'home' | 'projects' | 'privacy';
  entry: 'internal' | 'github' | 'search' | 'social' | 'other' | 'direct';
};

export function parseInterest(value: unknown): InterestEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some((key) => !['event', 'page', 'entry'].includes(key))
  )
    return null;
  if (
    typeof record.event !== 'string' ||
    typeof record.page !== 'string' ||
    typeof record.entry !== 'string'
  )
    return null;
  if (!['page', 'lab', 'source', 'verification'].includes(String(record.event)))
    return null;
  if (!['home', 'projects', 'privacy'].includes(String(record.page)))
    return null;
  if (
    !['internal', 'github', 'search', 'social', 'other', 'direct'].includes(
      String(record.entry),
    )
  )
    return null;
  if (record.event !== 'page' && record.entry !== 'internal') return null;
  return record as InterestEvent;
}

export function referralCategory(
  referrer: string,
  origin: string,
): InterestEvent['entry'] {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    if (url.origin === origin) return 'internal';
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'github.com' || host.endsWith('.github.com')) return 'github';
    if (
      [
        'google.com',
        'google.co.uk',
        'google.com.au',
        'google.co.th',
        'google.de',
        'google.fr',
        'bing.com',
        'duckduckgo.com',
        'search.yahoo.com',
      ].includes(host)
    )
      return 'search';
    if (
      [
        'x.com',
        'twitter.com',
        't.co',
        'reddit.com',
        'linkedin.com',
        'facebook.com',
        'l.facebook.com',
        'youtube.com',
        'news.ycombinator.com',
      ].includes(host)
    )
      return 'social';
    return 'other';
  } catch {
    return 'other';
  }
}

export function interestColumns(value: InterestEvent): string[] {
  if (value.event === 'verification') return ['verification_events'];
  if (value.event === 'lab') return ['lab_opens'];
  if (value.event === 'source') return ['source_clicks'];
  const columns = ['page_views'];
  if (value.page === 'projects') columns.push('project_views');
  if (value.entry !== 'internal') columns.push(`${value.entry}_entries`);
  return columns;
}

export function interestSql(value: InterestEvent): string {
  const columns = interestColumns(value);
  return `INSERT INTO daily_interest (day, ${columns.join(', ')}) VALUES (?, ${columns.map(() => '1').join(', ')}) ON CONFLICT(day) DO UPDATE SET ${columns.map((column) => `${column} = ${column} + 1`).join(', ')}`;
}
