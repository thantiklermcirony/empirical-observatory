/** Structural revision checks. No evidence-class promotion, authentication or persistence. */
export type EvidenceClass='observation'|'conditional-mathematics'|'simulation'|'hypothesis'|'empirical-finding';
export type LedgerRecord={id:string;revision:number;statement:string;evidenceClass:EvidenceClass;scope:string;dependencies:string[];sources:string[];checks:string[];supersedes?:{id:string;revision:number}};
const classes:EvidenceClass[]=['observation','conditional-mathematics','simulation','hypothesis','empirical-finding'];
export function validateLedgerRecords(records:LedgerRecord[]):string[]{
 const errors:string[]=[],ids=new Set<string>();
 if(records.length>10000)return ['Ledger exceeds structural validation limit'];
 for(const r of records){if(!r.id||ids.has(r.id))errors.push(`Missing or duplicate ID: ${r.id}`);ids.add(r.id);if(!Number.isSafeInteger(r.revision)||r.revision<1||!r.statement.trim()||!r.scope.trim()||!classes.includes(r.evidenceClass))errors.push(`Invalid record: ${r.id}`);if(!r.sources.length||!r.checks.length)errors.push(`Missing source or check: ${r.id}`);}
 for(const r of records)for(const d of r.dependencies)if(!ids.has(d))errors.push(`Unknown dependency ${d} for ${r.id}`);
 // Iterative removal avoids recursive stack exhaustion on long dependency chains.
 const remaining=new Map(records.map(r=>[r.id,new Set(r.dependencies)]));
 let changed=true;while(changed){changed=false;for(const [id,deps]of remaining)if(!deps.size){remaining.delete(id);for(const other of remaining.values())other.delete(id);changed=true;}}
 if(remaining.size)errors.push('Cyclic dependency graph');return errors;
}
export function revisionImpact(records:LedgerRecord[],changedIds:string[]){
 const errors=validateLedgerRecords(records);for(const id of changedIds)if(!records.some(r=>r.id===id))errors.push(`Unknown changed record: ${id}`);if(errors.length)return {valid:false,errors,needsReassessment:[] as string[]};
 const affected=new Set(changedIds);let changed=true;while(changed){changed=false;for(const r of records)if(!affected.has(r.id)&&r.dependencies.some(d=>affected.has(d))){affected.add(r.id);changed=true;}}
 return{valid:true,errors,needsReassessment:records.filter(r=>affected.has(r.id)).map(r=>r.id)};
}
export function proposeLedgerRevision(records:LedgerRecord[],candidate:LedgerRecord){
 const old=records.find(r=>r.id===candidate.id),errors:string[]=[];
 if(old){if(candidate.revision!==old.revision+1||candidate.supersedes?.id!==old.id||candidate.supersedes.revision!==old.revision)errors.push('Revision must explicitly supersede the previous record');if(candidate.evidenceClass!==old.evidenceClass)errors.push('Evidence-class changes require a separate reviewed admission');}
 else if(candidate.revision!==1||candidate.supersedes)errors.push('A new record starts at revision one');
 errors.push(...validateLedgerRecords([...records.filter(r=>r.id!==candidate.id),candidate]));
 return {structurallyValid:errors.length===0,errors,status:'proposal-only' as const,admitted:false as const,candidate:structuredClone(candidate),prior:old?structuredClone(old):null};
}
