import { TemporalInputError } from './engine/temporal-router.ts';
import { parseStrictJson, StrictJsonError } from './strict-json.ts';
export const PUBLIC_HEADERS = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'X-Content-Type-Options': 'nosniff' };
export function labJson(value: unknown, status = 200): Response { return Response.json(value, { status, headers: PUBLIC_HEADERS }); }
export async function readLabBody(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new TemporalInputError('content_type', 'Send application/json.');
  const reader = request.body?.getReader(); if (!reader) throw new TemporalInputError('empty_body', 'Send a JSON request.');
  let text = '', bytes = 0; const decoder = new TextDecoder('utf-8', { fatal: true });
  while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 65536) { await reader.cancel(); throw new TemporalInputError('body_limit', 'Request exceeds 65,536 bytes.'); } text += decoder.decode(chunk.value, { stream: true }); }
  text += decoder.decode();
  return parseStrictJson(text);
}
export function labError(error: unknown): Response {
  if (error instanceof TemporalInputError) return labJson({ error: error.message, code: error.code }, error.code === 'body_limit' ? 413 : 400);
  if (error instanceof SyntaxError || error instanceof TypeError || error instanceof StrictJsonError) return labJson({ error: 'Invalid JSON request: use unique object keys, finite numbers and bounded nesting.', code: 'invalid_json' }, 400);
  return labJson({ error: 'This inquiry could not be completed. No result was saved or promoted.', code: 'execution_failure' }, 503);
}
