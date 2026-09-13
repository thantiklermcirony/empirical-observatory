import {resolveScientificTerm} from '@/lib/scientific-vocabulary';
export function GET(request:Request){const u=new URL(request.url),term=u.searchParams.get('term')??'',room=u.searchParams.get('room')??undefined;if(!term.trim()||term.length>120)return Response.json({error:'Supply a scientific term of 1–120 characters.'},{status:400});return Response.json(resolveScientificTerm(term,room));}
