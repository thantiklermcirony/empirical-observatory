import { interestDatabase } from '@/lib/interest-db';
import { interestSql, parseInterest } from '@/lib/interest';

export async function POST(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return new Response(null, { status: 403, headers });
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return new Response(null, { status: 403, headers });
  if (
    request.headers.get('dnt') === '1' ||
    request.headers.get('sec-gpc') === '1'
  )
    return new Response(null, { status: 204, headers });
  if (Number(request.headers.get('content-length')) > 512)
    return new Response(null, { status: 413, headers });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400, headers });
  let text = '';
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 512) {
      await reader.cancel();
      return new Response(null, { status: 413, headers });
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  let value;
  try {
    value = parseInterest(JSON.parse(text));
  } catch {
    value = null;
  }
  if (!value) return new Response(null, { status: 400, headers });
  try {
    const database = interestDatabase();
    const today = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() - 90 * 86400000)
      .toISOString()
      .slice(0, 10);
    await database.batch([
      database.prepare(interestSql(value)).bind(today),
      database
        .prepare('DELETE FROM daily_interest WHERE day <= ?')
        .bind(cutoff),
    ]);
    return new Response(null, { status: 204, headers });
  } catch {
    // Failure is visible to checks without logging visitors or experiment data.
    return new Response(null, { status: 503, headers });
  }
}
