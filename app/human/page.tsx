import type { Metadata } from 'next';
import HumanConditionLab from '@/components/observatory/HumanConditionLab';
import '../worldline.css';
import '../worldline-complexity.css';
import '../temporal-state.css';

export const metadata: Metadata = {
  title: 'Human Condition Laboratory — The Empirical Observatory',
  description:
    'Explore a strict multiscale map of a human body embedded in Earth systems, with mechanisms, evidence grades, units and timescales.',
};

export default function HumanPage() {
  return <HumanConditionLab />;
}
