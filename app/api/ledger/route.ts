import {scientificLedger} from '@/lib/scientific-ledger';
export function GET(){return Response.json(scientificLedger(),{headers:{'Cache-Control':'public, max-age=60'}});}
