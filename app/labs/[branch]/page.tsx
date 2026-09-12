import CentralDesk from '@/components/observatory/CentralDesk';
import { notFound } from 'next/navigation';
export default async function Laboratory({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  if (!['mathematics', 'biology', 'quantum', 'dynamics', 'encyclopedia'].includes(branch)) notFound();
  return <CentralDesk initialBranch={branch} />;
}
