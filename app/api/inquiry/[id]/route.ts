import { interestDatabase } from '@/lib/interest-db';
import { readPrintout, deletePrintout, bearer } from '@/lib/lab-storage';
import { labJson, labError, PUBLIC_HEADERS } from '@/lib/lab-http';
type Context = { params: Promise<{ id: string }> };
export function OPTIONS() { return new Response(null, { status: 204, headers: { ...PUBLIC_HEADERS, 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS' } }); }
export async function GET(request: Request, context: Context) { try { const row = await readPrintout(interestDatabase(), (await context.params).id, bearer(request)); return row ? labJson({ printout: JSON.parse(row.printout_json), expiresAt: row.expires_at }) : labJson({ error: 'Printout not found, expired, or private link incomplete.' }, 404); } catch (error) { return labError(error); } }
export async function DELETE(request: Request, context: Context) { try { const deleted = await deletePrintout(interestDatabase(), (await context.params).id, bearer(request)); return labJson(deleted ? { deleted: true } : { error: 'Printout not found.' }, deleted ? 200 : 404); } catch (error) { return labError(error); } }
