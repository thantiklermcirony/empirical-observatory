import { LabEnvironment } from '@/components/observatory/LaboratoryIdentity';
import Encyclopedia from '@/components/observatory/Encyclopedia';
import index from '@/public/research-index/entries.json';
export const metadata = { title: 'Living Encyclopedia | Empirical Observatory' };
export default function Page() { return <LabEnvironment id="encyclopedia"><Encyclopedia entries={index.entries} /></LabEnvironment>; }
