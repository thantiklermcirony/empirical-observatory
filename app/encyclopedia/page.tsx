import Encyclopedia from '@/components/observatory/Encyclopedia';
import index from '@/public/research-index/entries.json';
export const metadata = { title: 'Living Encyclopedia | Empirical Observatory' };
export default function Page() { return <Encyclopedia entries={index.entries} />; }
