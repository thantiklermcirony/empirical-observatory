import { LabEnvironment } from '@/components/observatory/LaboratoryIdentity';
import type { Metadata } from 'next';
import CellExplorer from '@/components/observatory/CellExplorer';

export const metadata: Metadata = {
  title: 'Virtual Cell / Flight 01 — The Empirical Observatory',
  description:
    'Predict, reveal and challenge. Explore a real four-context gene-response benchmark and see why a smaller error does not mean a better direction.',
  openGraph: {
    title: 'Virtual Cell: Predict. Reveal. Challenge.',
    description:
      'Four cell contexts. Real gene-response measurements. An experiment you can inspect and reproduce.',
    url: 'https://empirical-observatory.madmanmuzza.chatgpt.site/cell',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Virtual Cell: Predict. Reveal. Challenge.',
    description:
      'Explore the real-data first flight and challenge its prediction rules.',
  },
};

export default function CellPage() {
  return <LabEnvironment id="cell"><CellExplorer /></LabEnvironment>;
}
