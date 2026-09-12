import { evaluateLabRequest } from './lab-engine.ts';
import { hashTemporalJson, TemporalInputError } from './engine/temporal-router.ts';
export const PRINT_RETENTION_MS = 30 * 86400000;
type StoredRow = { printout_json: string; expires_at: string };
export function bearer(request: Request): string | null {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') ?? '');
  return match?.[1] ?? null;
}
function validId(id: string): boolean { return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id); }
export async function readPrintout(database: D1Database, id: string, token: string | null, now = new Date()): Promise<StoredRow | null> {
  if (!validId(id) || !token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return database.prepare('SELECT printout_json, expires_at FROM lab_printouts WHERE id = ? AND token_hash = ? AND expires_at > ?').bind(id, await hashTemporalJson(token), now.toISOString()).first<StoredRow>();
}
export async function deletePrintout(database: D1Database, id: string, token: string | null): Promise<boolean> {
  if (!validId(id) || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const result = await database.prepare('DELETE FROM lab_printouts WHERE id = ? AND token_hash = ?').bind(id, await hashTemporalJson(token)).run();
  return (result.meta.changes ?? 0) > 0;
}
export async function savePrintout(database: D1Database, body: unknown, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'request')) throw new TemporalInputError('invalid_save', 'Save accepts only the original request. Submitted result objects are never admitted.');
  // Always calculate again on this server. Never trust a client-generated seal or finding.
  const printout = await evaluateLabRequest((body as { request: unknown }).request);
  const json = JSON.stringify(printout);
  if (new TextEncoder().encode(json).byteLength > 1000000) throw new TemporalInputError('record_limit', 'This printout exceeds the storage limit; download it instead.');
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(now.getTime() + PRINT_RETENTION_MS).toISOString();
  const day = now.toISOString().slice(0, 10);
  const results = await database.batch([
    database.prepare('DELETE FROM lab_printouts WHERE expires_at <= ?').bind(now.toISOString()),
    database.prepare('INSERT INTO lab_printouts (id, token_hash, created_day, expires_at, printout_json) SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM lab_printouts WHERE created_day = ?) < 200').bind(printout.id, await hashTemporalJson(token), day, expiresAt, json, day),
  ]);
  if ((results[1].meta.changes ?? 0) !== 1) throw new TemporalInputError('storage_quota', 'Today’s shared storage limit is reached. The calculation is available to download; try saving another day.');
  return { id: printout.id, token, expiresAt, printout };
}
