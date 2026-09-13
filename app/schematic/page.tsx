import {scientificLedger} from '@/lib/scientific-ledger';
import ScientificSchematic from '@/components/observatory/ScientificSchematic';
export const metadata={title:'The scientific schematic · Empirical Observatory',description:'Follow observations, language, scientific contracts and evidence through one inspectable Observatory.'};
export default async function Page({searchParams}:{searchParams:Promise<{room?:string}>}){const l=scientificLedger(),q=await searchParams;return <ScientificSchematic ledger={l} initialRoom={l.rooms.some(r=>r.id===q.room)?q.room!:'biology'}/>;}
