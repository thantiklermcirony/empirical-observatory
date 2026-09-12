import type { Metadata } from 'next';
import CentralDesk from '@/components/observatory/CentralDesk';
import '../reasoning.css';
export const metadata: Metadata = {
  title: 'Visitor Computer — The Empirical Observatory',
  description:
    'Ask about the Observatory, its projects, evidence, living body and growing scientific framework.',
};
export default function Page() {
  return <CentralDesk />;
}
