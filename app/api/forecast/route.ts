import initial from '@/lib/data/grid-summary.json';
import { parseForecastFeed } from '@/lib/forecast-feed';
const url =
  'https://raw.githubusercontent.com/thantiklermcirony/empirical-observatory/observatory-data/grid/summary.json';
let cache:
  | { at: number; value: ReturnType<typeof parseForecastFeed> }
  | undefined;
export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > 300000) {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('Published collection is unavailable');
      const reader = r.body?.getReader();
      if (!reader) throw new Error('Empty record');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.byteLength;
          if (size > 500000) throw new Error('Record exceeds limit');
          chunks.push(next.value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      cache = {
        at: Date.now(),
        value: parseForecastFeed(JSON.parse(new TextDecoder().decode(bytes))),
      };
    }
    const stale = cache.value.capturedAt !== null && Date.now() - Date.parse(cache.value.capturedAt) > 90 * 60000;
    return Response.json(stale ? {
      ...cache.value,
      status: 'Stale collection · check automatic collector',
      detail: `${cache.value.detail} The latest recorded capture is more than 90 minutes old. Counts are as of that capture, not a current scheduler health check.`,
    } : cache.value, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    const fallback = parseForecastFeed(initial);
    return Response.json(
      {
        ...fallback,
        status: 'Archived capture · live refresh unavailable',
        detail: `${fallback.detail} Live publication could not be refreshed; the timestamp below is the archived receipt time.`,
      },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  }
}
