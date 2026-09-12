/* oxlint-disable react/react-compiler -- Synchronize browser-only URL state after hydration; React Compiler is not enabled. */
'use client';
import ReasoningWorkspace from './ReasoningWorkspace';
import LearningWorkspace from './LearningWorkspace';
import ForecastLedger from './ForecastLedger';
import DataExplorer from './DataExplorer';
import CentralDesk from './CentralDesk';
import {useEffect,useState} from 'react';
import {returnToRoom,useInstrumentActivity} from '@/lib/instrument-activity';
export default function StandaloneWorkbench({kind}:{kind:string}){const [prompt,setPrompt]=useState(''),[saved,setSaved]=useState(false);const active=useInstrumentActivity();useEffect(()=>{const f=new URLSearchParams(location.hash.slice(1));setSaved(Boolean(f.get('run')&&f.get('key')));},[]);const back=()=>returnToRoom('/labs/computing');if(kind==='reasoning')return <ReasoningWorkspace onBack={back}/>;if(kind==='learning')return <LearningWorkspace onBack={back}/>;if(kind==='forecast')return <ForecastLedger/>;return <div style={{padding:'20px'}}>{!prompt&&!saved?<DataExplorer busy={false} onRun={setPrompt} prepareOnly/>:<CentralDesk instrumentMode active={active} initialPrompt={prompt} onRoomReturn={()=>returnToRoom('/labs/social')}/>}</div>;}
