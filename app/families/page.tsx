import { LabEnvironment } from '@/components/observatory/LaboratoryIdentity';
import type { Metadata } from 'next';
import FamilyWorldLab from '@/components/observatory/FamilyWorldLab';
import './families.css';

export const metadata: Metadata = {
  title: 'Two-family world — Empirical Observatory',
  description: 'Six agents learn in a bounded, editable miniature world. Inspect actual weight updates, helping, construction, and the limits of the attachment hypothesis.',
};

export default function FamiliesPage() { return <LabEnvironment id="families"><FamilyWorldLab /></LabEnvironment>; }
