import data from '@/public/research-cases/paired-damage/data.json';
import {PAIRED_DAMAGE_CASE as record} from '@/lib/research-cases';
import {replayPairedDamage} from '@/lib/paired-damage';
import {hashTemporalJson} from '@/lib/engine/temporal-router';
import {readLabBody,labJson,labError} from '@/lib/lab-http';
export function OPTIONS(){return labJson({});}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(id!==record.id)return labJson({error:'Case not found'},404);
  try{const input=await readLabBody(request,256) as {leadHours?:unknown};if(!input||Object.keys(input).join(',')!=='leadHours'||typeof input.leadHours!=='number'||![0,3.5,7].includes(input.leadHours))return labJson({error:'Supply only leadHours: 0, 3.5 or 7.'},400);
    const results=replayPairedDamage(data.rows,input.leadHours);
    const packet={schema:'observatory-case-replay/1',caseId:record.id,revision:record.revision,classification:record.classification,admission:record.admission,dataSha256:record.provenance.dataSha256,inputs:{leadHours:input.leadHours},results,method:record.verbs,limitations:record.limits,connections:record.connections,next:record.next,aiCalls:0,execution:'Deterministic reaggregation of archived source-derived rows; no new acquisition, model fit or biological experiment.'};
    return labJson({...packet,receiptSha256:await hashTemporalJson(packet)});
  }catch(error){return labError(error);}
}
