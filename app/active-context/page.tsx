import { LabEnvironment } from '@/components/observatory/LaboratoryIdentity';
import type { Metadata } from 'next';
import ActiveContext from '@/components/observatory/ActiveContext';
import demo from '@/lib/data/active-context-demo.json';
import result from '@/lib/data/active-context-result.json';

export const metadata: Metadata = {
  title: 'Active Context — Resume with evidence',
  description:
    'A local tool for coding agents: inspect which recorded checks still apply, preserve failed results and plan relevant rechecks. Explore an actual command replay.',
};

export default function ActiveContextPage() {
  return <LabEnvironment id="context"><ActiveContext demo={demo} result={result} /></LabEnvironment>;
}
