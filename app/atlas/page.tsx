import type { Metadata } from 'next';
import ResearchAtlas from '@/components/observatory/ResearchAtlas';
export const metadata: Metadata = {
  title: 'Research Atlas — The Empirical Observatory',
  description:
    'Explore the science-wide programme, inspect the evidence and follow the next discriminating test.',
};
export default function AtlasPage() {
  return <ResearchAtlas />;
}
