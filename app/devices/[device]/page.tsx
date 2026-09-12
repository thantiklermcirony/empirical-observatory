import {notFound} from 'next/navigation';
import ScienceRoom from '@/components/observatory/ScienceRoom';
import {DEVICES,roomForDevice} from '@/lib/observatory-catalogue';
export async function generateMetadata({params}:{params:Promise<{device:string}>}){const {device}=await params;const d=DEVICES.find(d=>d.id===device);return {title:d?`${d.label} — Empirical Observatory`:'Instrument',description:d?.purpose};}
export default async function DevicePage({params}:{params:Promise<{device:string}>}){const {device}=await params;const room=roomForDevice(device);if(!room)notFound();return <ScienceRoom room={room} initialDevice={device}/>;}
