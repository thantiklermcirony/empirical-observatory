import CaseWorkbench from '@/components/observatory/CaseWorkbench';
import data from '@/public/research-cases/paired-damage/data.json';
import './case.css';
export const metadata={title:'Cell damage case · Biology · Empirical Observatory',description:'Replay a corrected E. coli damage study, inspect the evidence, and follow its questions across the Observatory.'};
export default function Page(){return <CaseWorkbench recorded={data.referenceSummaries['7']} audit={data.audit}/>;}
