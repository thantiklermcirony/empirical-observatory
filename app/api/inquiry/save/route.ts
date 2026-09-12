import { interestDatabase } from '@/lib/interest-db';
import { savePrintout } from '@/lib/lab-storage';
import { labJson, labError, readLabBody, PUBLIC_HEADERS } from '@/lib/lab-http';
export function OPTIONS() { return new Response(null, { status: 204, headers: PUBLIC_HEADERS }); }
export async function POST(request: Request) { try { return labJson(await savePrintout(interestDatabase(), await readLabBody(request)), 201); } catch (error) { return labError(error); } }
