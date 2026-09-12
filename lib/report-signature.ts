import { hashTemporalJson, TemporalInputError } from './engine/temporal-router.ts';
import type { SignedPrintout } from './research-contract.ts';
import type { LabPrintout, LabRequest } from './lab-contract.ts';
// Purpose-separated signing material; never send it to clients or store it.
// This attests a server-issued report, not the truth of its scientific claims.
async function signingKey(secret: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('empirical-observatory/report-signing/v1'), info: new TextEncoder().encode('private-printout-save') }, material, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign', 'verify']);
}
export async function signPrintout(printout: LabPrintout & { request: LabRequest }, secret: string, now = new Date()): Promise<SignedPrintout> {
  const expiresAt = new Date(now.getTime() + 3600000).toISOString();
  const message = await hashTemporalJson({ printout, expiresAt });
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(message));
  return { printout, expiresAt, signature: Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('') };
}
export async function verifySignedPrintout(value: unknown, secret: string | undefined, now = new Date()) {
  if (!secret || !value || typeof value !== 'object' || Array.isArray(value)) throw new TemporalInputError('invalid_signed_report', 'This server-issued report cannot be verified.');
  const signed = value as SignedPrintout;
  if (Object.keys(signed).sort().join(',') !== 'expiresAt,printout,signature' || !/^[a-f0-9]{64}$/.test(signed.signature) || typeof signed.expiresAt !== 'string' || !Number.isFinite(Date.parse(signed.expiresAt)) || Date.parse(signed.expiresAt) <= now.getTime() || Date.parse(signed.expiresAt) > now.getTime() + 3600000) throw new TemporalInputError('invalid_signed_report', 'The report save receipt has expired or is invalid. Download the report or run a new inquiry.');
  const signature = Uint8Array.from(signed.signature.match(/../g)!, part => parseInt(part, 16));
  const verified = await crypto.subtle.verify('HMAC', await signingKey(secret), signature, new TextEncoder().encode(await hashTemporalJson({ printout: signed.printout, expiresAt: signed.expiresAt })));
  if (!verified) throw new TemporalInputError('invalid_signed_report', 'The report was changed after the server issued it.');
  return signed.printout;
}
