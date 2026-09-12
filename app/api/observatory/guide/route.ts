import {env} from 'cloudflare:workers';
import {interestDatabase} from '@/lib/interest-db';
import {labJson,labError,readLabBody} from '@/lib/lab-http';
import {parseLabRequest} from '@/lib/lab-engine';
import {observatoryGuide} from '@/lib/observatory-guide';
import {reserveAiCall} from '@/lib/ai-research-transport';
import {signPrintout} from '@/lib/report-signature';
export async function POST(request:Request){try{const input=parseLabRequest(await readLabBody(request));if(!('prompt'in input))return labJson({error:'Ask a visitor question.'},400);const e=env as {OPENAI_API_KEY?:string;OBSERVATORY_AI_MODEL?:string;OBSERVATORY_AI_DAILY_CALL_LIMIT?:string};const config={apiKey:e.OPENAI_API_KEY,model:e.OBSERVATORY_AI_MODEL,dailyCallLimit:e.OBSERVATORY_AI_DAILY_CALL_LIMIT};const printout=await observatoryGuide(input.prompt,config,()=>reserveAiCall(interestDatabase(),Number(config.dailyCallLimit)));return labJson({printout,...(config.apiKey?{signedReport:await signPrintout(printout,config.apiKey)}:{})});}catch(e){return labError(e);}}
