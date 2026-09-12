import { evaluateLabRequest, labCatalogue } from '@/lib/lab-engine';
import { labJson, labError, readLabBody, PUBLIC_HEADERS } from '@/lib/lab-http';
export function GET() { return labJson(labCatalogue()); }
export function OPTIONS() { return new Response(null, { status: 204, headers: PUBLIC_HEADERS }); }
export async function POST(request: Request) { try { return labJson({ printout: await evaluateLabRequest(await readLabBody(request)) }); } catch (error) { return labError(error); } }
