import type { Metadata } from 'next';
import RecoveryLab from '@/components/observatory/RecoveryLab';
import evidence from '@/lib/data/recovery-lab.json';
export const metadata: Metadata = {
  title: 'Recovery Lab — The Empirical Observatory',
  description:
    'Replay held-out recovery predictions, inspect the evidence and follow the Observatory’s automated research loop.',
};
export default function RecoveryPage() {
  return <RecoveryLab evidence={evidence} />;
}
