import {RESEARCH_CASES} from '@/lib/research-cases';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const record=RESEARCH_CASES.find(c=>c.id===id);return record?Response.json(record):Response.json({error:'Case not found'},{status:404});}
