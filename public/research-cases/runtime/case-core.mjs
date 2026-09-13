// SPDX-License-Identifier: MIT
// Shared receipt and gate protocol. It does not certify truth or grant model transfer.
export function canonical(value) {
  if (typeof value === 'number' && !Number.isFinite(value)) throw Error('Nonfinite receipt value');
  if (value === null || typeof value !== 'object') {
    const s = JSON.stringify(value); if (s === undefined) throw Error('Unserializable receipt'); return s;
  }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
export const gate = (id, label, passed, detail) => ({id, label, status: passed === null ? 'unresolved' : passed ? 'pass' : 'fail', detail});
export async function seal(record) { return {...record, receiptSha256: await sha256(canonical(record))}; }
export async function verifyReceipt(record) { const {receiptSha256, ...body} = record; return receiptSha256 === await sha256(canonical(body)); }
export async function readVerified(path, expected, read) {
  const bytes = await read(path);
  if (await sha256(bytes) !== expected) throw Error('Source integrity mismatch: ' + path);
  return JSON.parse(new TextDecoder().decode(bytes));
}
