export type DamagePair={pair:string;h:string;t:string;age:number;damageH:number;damageT:number;endH:number;endT:number};
export const LEAD_MARGINS=[0,3.5,7] as const;
export function replayPairedDamage(rows:DamagePair[],leadHours:number){
  if(!LEAD_MARGINS.some(x=>x===leadHours))throw new Error('Choose a supported margin: 0, 3.5 or 7 hours.');
  const seen=new Set<string>();
  for(const r of rows){const key=`${r.pair}@${r.age}`;if(seen.has(key)||![r.age,r.damageH,r.damageT,r.endH,r.endT].every(Number.isFinite))throw new Error('Invalid or duplicate paired observation.');seen.add(key);}
  return [...new Set(rows.map(r=>r.age))].sort((a,b)=>a-b).map(age=>{
    const joined=rows.filter(r=>r.age===age);
    const nonTies=joined.filter(r=>r.damageH!==r.damageT&&r.endH!==r.endT);
    const eligible=nonTies.filter(r=>Math.min(r.endH,r.endT)>age+leadHours);
    const k=eligible.filter(r=>(r.damageH-r.damageT)*(r.endH-r.endT)<0).length;
    return {age,joined:joined.length,ties:joined.length-nonTies.length,excludedByLead:nonTies.length-eligible.length,n:eligible.length,k,fraction:eligible.length?k/eligible.length:null};
  });
}
