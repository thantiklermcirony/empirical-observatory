import { env } from 'cloudflare:workers';
import { interestDatabase } from '@/lib/interest-db';
import { labJson, labError, readLabBody, PUBLIC_HEADERS } from '@/lib/lab-http';
import { parseLabRequest } from '@/lib/lab-engine';
import { runResearchQuestion } from '@/lib/research-engine';
import { reserveAiCall } from '@/lib/ai-research-transport';
import { signPrintout } from '@/lib/report-signature';
export function OPTIONS() { return new Response(null, { status: 204, headers: PUBLIC_HEADERS }); }
export async function POST(request: Request) {
  try {
    const input = parseLabRequest(await readLabBody(request));
    if (!('prompt' in input)) return labJson({ error: 'Investigation accepts a question in prompt.' }, 400);
    const values = env as { OPENAI_API_KEY?: string; OBSERVATORY_AI_MODEL?: string; OBSERVATORY_AI_DAILY_CALL_LIMIT?: string };
    const config = { apiKey: values.OPENAI_API_KEY, model: values.OBSERVATORY_AI_MODEL, dailyCallLimit: values.OBSERVATORY_AI_DAILY_CALL_LIMIT };
    const printout = await runResearchQuestion(input.prompt, config, () => reserveAiCall(interestDatabase(), Number(config.dailyCallLimit)));
    return labJson({ printout, ...(config.apiKey ? { signedReport: await signPrintout(printout, config.apiKey) } : {}) });
  } catch (error) { return labError(error); }
}
