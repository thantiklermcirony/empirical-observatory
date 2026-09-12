import { aiStatus, type AiConfig } from './ai-interpreter.ts';
import { TemporalInputError } from './engine/temporal-router.ts';
import { parseStrictJson } from './strict-json.ts';

export async function reserveAiCall(database: D1Database, limit: number, now = new Date()) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new TemporalInputError('ai_limit_config', 'The shared AI request limit is invalid.');
  const reserved = await database.prepare('INSERT INTO ai_daily_calls (day, calls) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET calls = calls + 1 WHERE calls < ? RETURNING calls').bind(now.toISOString().slice(0, 10), limit).first<{ calls: number }>();
  if (!reserved) throw new TemporalInputError('ai_daily_limit', 'The shared daily AI allowance is used. The laboratory results remain available.');
}

export async function researchModelCall(config: AiConfig, instructions: string, input: unknown, schema: object, reserve: () => Promise<void>, transport: typeof fetch = fetch) {
  if (!aiStatus(config).ready) throw new TemporalInputError('ai_not_configured', 'Hosted AI is not connected.');
  const encoded = JSON.stringify(input);
  if (encoded.length > 85000) throw new TemporalInputError('ai_input_limit', 'This investigation is too large for the shared explanation service.');
  await reserve();
  const response = await transport('https://api.openai.com/v1/responses', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25000), headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, store: false, max_output_tokens: 3600, instructions, input: encoded, text: { format: { type: 'json_schema', name: 'observatory_research', strict: true, schema } } }) });
  if (!response.ok) throw new TemporalInputError('ai_provider_unavailable', 'The AI service did not complete this step. Calculated results remain available.');
  const reader = response.body?.getReader();
  if (!reader) throw new TemporalInputError('ai_response', 'The AI returned no response.');
  const decoder = new TextDecoder('utf-8', { fatal: true }); let raw = '', bytes = 0;
  try {
    for (;;) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 131072) throw new TemporalInputError('ai_response_limit', 'The AI response exceeded the allowed size.'); raw += decoder.decode(chunk.value, { stream: true }); }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  raw += decoder.decode();
  const body = parseStrictJson(raw) as { status?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
  if (body.status !== 'completed' || !Array.isArray(body.output)) throw new TemporalInputError('ai_incomplete', 'The AI explanation was incomplete.');
  const content = body.output.flatMap(item => item.type === 'message' ? item.content ?? [] : []);
  if (content.some(item => item.type === 'refusal')) throw new TemporalInputError('ai_refused', 'The AI could not complete this investigation.');
  return parseStrictJson(content.filter(item => item.type === 'output_text').map(item => item.text ?? '').join(''));
}
