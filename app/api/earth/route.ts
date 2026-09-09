import {
  normalizeSnapshot,
  OSLO_SOURCE,
} from '@/integrations/earth/station-feed.mjs';
import fixture from '@/public/research/oslo-snapshot.json';

// Fixed public endpoints, bounded bodies and a shared 60-second cache. No user URLs or keys.
let cached: { at: number; value: unknown } | undefined;
let pending: Promise<unknown> | undefined;
async function load() {
  const captures = [];
  for (const url of [OSLO_SOURCE.informationUrl, OSLO_SOURCE.statusUrl]) {
    const response = await fetch(url, {
      headers: { 'Client-Identifier': 'empiricalarchitecture-observatory' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty provider response');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 2000000) throw new Error('Provider response exceeds 2 MB');
        chunks.push(next.value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const sha256 = [
      ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    ]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
    captures.push({
      url,
      retrievedAt: new Date().toISOString(),
      sha256,
      data: JSON.parse(new TextDecoder().decode(bytes)),
    });
  }
  const snapshot = normalizeSnapshot(captures[0].data, captures[1].data, {
    retrievedAt: captures[1].retrievedAt,
    stationIds: fixture.records.map((r) => r.stationId),
  });
  return {
    ...snapshot,
    provenance: captures.map(({ url, retrievedAt, sha256 }) => ({
      url,
      retrievedAt,
      sha256,
    })),
    selection: 'Same fixed 24 station IDs as the archived release capture.',
  };
}
export async function GET() {
  try {
    if (!cached || Date.now() - cached.at > 60000) {
      if (!pending)
        pending = load()
          .then((value) => {
            cached = { at: Date.now(), value };
            return value;
          })
          .finally(() => {
            pending = undefined;
          });
      await pending;
    }
    return Response.json(cached!.value, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Provider unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
