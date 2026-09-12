import CentralDesk from '@/components/observatory/CentralDesk';
import { notFound } from 'next/navigation';
import { LAB_IDENTITIES } from '@/lib/lab-presentation';
export async function generateMetadata({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const lab = LAB_IDENTITIES[branch];
  return { title: lab ? lab.title + ' — Empirical Observatory' : 'Laboratory — Empirical Observatory', description: lab?.description };
}
export default async function Laboratory({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  if (!['mathematics', 'biology', 'quantum', 'dynamics', 'temporal', 'encyclopedia'].includes(branch)) notFound();
  return <CentralDesk initialBranch={branch} />;
}
