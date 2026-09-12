'use client';
import {useEffect,useState} from 'react';
/** Only the same-origin room which owns this frame may suspend its instruments. */
export function useInstrumentActivity(){const [active,setActive]=useState(true);useEffect(()=>{if(window.parent===window)return;const receive=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==='observatory/instrument-visibility'&&typeof e.data.active==='boolean')setActive(e.data.active);};window.addEventListener('message',receive);window.parent.postMessage({type:'observatory/instrument-ready'},location.origin);return()=>window.removeEventListener('message',receive);},[]);return active;}
export function returnToRoom(fallback:string){if(window.parent!==window&&new URLSearchParams(location.search).get('embedded')==='1')window.parent.postMessage({type:'observatory/return-to-room'},location.origin);else window.location.assign(fallback);}
