/* oxlint-disable react/react-compiler -- Synchronize browser-only URL state after hydration; React Compiler is not enabled. */
'use client';
import {useEffect,useState} from 'react';
import ScienceRoom from './ScienceRoom';
import CentralDesk from './CentralDesk';
import type {ScienceRoom as Room} from '@/lib/observatory-catalogue';
export default function RoomEntrance({room,branch}:{room:Room;branch:string}){
 const [saved,setSaved]=useState(false);
 useEffect(()=>{const f=new URLSearchParams(window.location.hash.slice(1));setSaved(Boolean(f.get('run')&&f.get('key')));},[]);
 return saved?<CentralDesk initialBranch={branch} instrumentMode/>:<ScienceRoom room={room}/>;
}
