import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeSnapshot } from './station-feed.mjs';

/** One bounded capture. Schedule outside this script; honor provider TTL and identify the app. */
export async function captureOslo({ fetchImpl = fetch, now = () => new Date().toISOString() } = {}) {
  const documents = {}, rawDocuments = {}, manifest = [];
  for (const name of ['system_information', 'station_information', 'station_status']) {
    const url = `https://gbfs.urbansharing.com/oslobysykkel.no/${name}.json`;
    const response = await fetchImpl(url, { headers: { 'Client-Identifier': 'empiricalarchitecture-observatory' }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(`Oslo ${name}: HTTP ${response.status}`);
    if (Number(response.headers.get('content-length')) > 5000000) throw new Error('Feed exceeds size limit');
    // Incremental cap also applies when Content-Length is omitted or compressed.
    let bytes = 0; const chunks = [];
    for await (const chunk of response.body) { bytes += chunk.byteLength; if (bytes > 5000000) throw new Error('Feed exceeds size limit'); chunks.push(chunk); }
    const raw = Buffer.concat(chunks), retrievedAt = now();
    rawDocuments[name] = raw;
    documents[name] = JSON.parse(raw.toString('utf8'));
    manifest.push({ name, url, retrievedAt, sha256: createHash('sha256').update(raw).digest('hex'), bytes });
  }
  if (documents.system_information?.data?.system_id !== 'oslobysykkel') throw new Error('Unexpected source system');
  const snapshot = normalizeSnapshot(documents.station_information, documents.station_status, { retrievedAt: manifest.at(-1).retrievedAt });
  return { documents, rawDocuments, manifest, snapshot };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = resolve(process.argv[2] || 'oslo-capture');
  const result = await captureOslo();
  await mkdir(directory, { recursive: true });
  for (const [name, body] of Object.entries(result.rawDocuments)) await writeFile(join(directory, `${name}.json`), body);
  const normalized = JSON.stringify(result.snapshot, null, 2) + '\n';
  await writeFile(join(directory, 'snapshot.json'), normalized);
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({ schema: 'earth-capture-manifest/1', capture: 'single-observation', downloads: result.manifest, normalizedSha256: createHash('sha256').update(normalized).digest('hex'), source: result.snapshot.source, changes: 'Downloaded bytes retained; normalized records preserve missing values; no interpolation or forecast.' }, null, 2) + '\n');
  process.stdout.write(`${result.snapshot.records.length} station records saved to ${directory}\n`);
}
