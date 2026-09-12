import { interestDatabase } from '@/lib/interest-db';
import { savePrintout, saveSignedPrintout } from '@/lib/lab-storage';
import { env } from 'cloudflare:workers';
import { labJson, labError, readLabBody, PUBLIC_HEADERS } from '@/lib/lab-http';
export function OPTIONS() { return new Response(null, { status: 204, headers: PUBLIC_HEADERS }); }
export async function POST(request: Request) {
  try {
    const body = await readLabBody(request, 1050000);
    const signed = body && typeof body === 'object' && Object.hasOwn(body, 'signedReport');
    return labJson(await (signed ? saveSignedPrintout(interestDatabase(), body, (env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY) : savePrintout(interestDatabase(), body)), 201);
  } catch (error) { return labError(error); }
}
