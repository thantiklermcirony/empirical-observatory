import { redirect } from 'next/navigation';
export const metadata={title:'IDA EEG Laboratory — Empirical Observatory',description:'Local signal geometry, calibration, experiments and session records.'};
export default function IdaPage(){redirect('/ida/workbench/index.html');}
