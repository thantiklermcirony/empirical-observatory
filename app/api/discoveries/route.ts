import {CONTRIBUTIONS,ENGINE_STAGES} from '@/lib/discovery-ledger';
import corpus from '@/lib/discovery-corpus.json';
export function GET(){return Response.json({schema:'observatory-contributions/1',classification:'Contribution inventory; no automatic scientific admission',contributions:CONTRIBUTIONS,engineStages:ENGINE_STAGES,corpus});}
