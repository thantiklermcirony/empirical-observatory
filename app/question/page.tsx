import type { Metadata } from 'next';
import CentralDesk from '@/components/observatory/CentralDesk';
import '../reasoning.css';
export const metadata: Metadata = {
  title: 'Question Desk — The Empirical Observatory',
  description:
    'Turn a question into a visible, reproducible investigation. Inspect entities, actions, model assumptions, calculations and the next unanswered question.',
};
export default function Page() {
  return <CentralDesk />;
}
