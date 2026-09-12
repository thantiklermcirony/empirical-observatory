import {notFound} from 'next/navigation';
import StandaloneWorkbench from '@/components/observatory/StandaloneWorkbench';
import '../../reasoning.css';
export default async function Workbench({params}:{params:Promise<{kind:string}>}){const {kind}=await params;if(!['reasoning','learning','statistics','forecast'].includes(kind))notFound();return <StandaloneWorkbench kind={kind}/>;}
