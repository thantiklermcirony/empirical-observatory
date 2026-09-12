import { env } from 'cloudflare:workers';
import { aiStatus, interpretQuestion } from '@/lib/ai-interpreter';
import { interestDatabase } from '@/lib/interest-db';
import { labJson, labError, readLabBody, PUBLIC_HEADERS } from '@/lib/lab-http';
import { parseLabRequest } from '@/lib/lab-engine';
function configuration() { const values = env as { OPENAI_API_KEY?: string; OBSERVATORY_AI_MODEL?: string; OBSERVATORY_AI_DAILY_CALL_LIMIT?: string }; return { apiKey: values.OPENAI_API_KEY, model: values.OBSERVATORY_AI_MODEL, dailyCallLimit: values.OBSERVATORY_AI_DAILY_CALL_LIMIT }; }
export function GET() { return labJson(aiStatus(configuration())); }
export function OPTIONS() { return new Response(null, { status: 204, headers: PUBLIC_HEADERS }); }
export async function POST(request: Request) {
  try {
    const config = configuration(), status = aiStatus(config);
    if (!status.ready) return labJson({ error: status.message, code: 'ai_not_configured' }, 503);
    const input = parseLabRequest(await readLabBody(request));
    if (!('prompt' in input)) return labJson({ error: 'Interpretation accepts only a prompt.' }, 400);
    const database = interestDatabase(), day = new Date().toISOString().slice(0, 10);
    const reserved = await database.prepare('INSERT INTO ai_daily_calls (day, calls) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET calls = calls + 1 WHERE calls < ? RETURNING calls').bind(day, status.dailyCallLimit).first<{ calls: number }>();
    if (!reserved) return labJson({ error: 'The shared daily AI limit has been reached. Fixed-model calculations remain available.', code: 'ai_daily_limit' }, 429);
    return labJson(await interpretQuestion(input.prompt, config));
  } catch (error) { return labError(error); }
}
