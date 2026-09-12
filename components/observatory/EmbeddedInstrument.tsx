'use client';
import {useEffect} from 'react';
export default function EmbeddedInstrument(){useEffect(()=>{if(window.parent!==window&&new URLSearchParams(location.search).get('embedded')==='1')document.documentElement.classList.add('embedded-instrument');return()=>document.documentElement.classList.remove('embedded-instrument');},[]);return null;}
