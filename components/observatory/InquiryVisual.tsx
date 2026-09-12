import type { LabPrintout } from '@/lib/lab-contract';
import type { TemporalReport } from '@/lib/engine/temporal-router';
function number(value: unknown): number { if (typeof value === 'number') return value; if (typeof value !== 'string') return NaN; const [a, b] = value.split('/').map(Number); return b === undefined ? a : a / b; }
function Bar({ label, value, max = 1, detail }: { label: string; value: number; max?: number; detail?: string }) { return <div className="cd-result-bar"><span>{label}</span><div><i style={{ width: `${Math.min(100, Math.max(0, value / max * 100))}%` }} /></div><strong>{detail ?? Number(value.toPrecision(5))}</strong></div>; }
export default function InquiryVisual({ report }: { report: LabPrintout }) {
  const inquiries = report.inquiries as unknown as TemporalReport[];
  if (report.interpretation.profile === 'order' && inquiries.length === 2 && inquiries.every(q => q.results.at(-1)?.status === 'established_in_scope')) {
    const a = inquiries[0].results.at(-1)!, b = inquiries[1].results.at(-1)!; if (typeof a.value !== 'string' || typeof b.value !== 'string') return null;
    return <section className="cd-result-visual"><span className="cd-label">SAME START · DIFFERENT ORDER</span><h3>{a.value === b.value ? 'These two paths meet.' : 'Changing the order changes the final state.'}</h3><svg viewBox="0 0 650 190" role="img" aria-label={`Alignment then contraction ends at ${a.value}; contraction then alignment ends at ${b.value}.`}><path d="M75 95 C180 95 140 42 295 42 S430 42 550 60" fill="none" stroke="#9a4d0c" strokeWidth="3"/><path d="M75 95 C180 95 140 145 295 145 S430 145 550 145" fill="none" stroke="#156968" strokeWidth="3"/><circle cx="75" cy="95" r="9" fill="#293d3c"/><text x="28" y="125">x = {JSON.stringify(inquiries[0].quantities[0].value)}</text><text x="220" y="30">align → contract</text><text x="220" y="175">contract → align</text><circle cx="550" cy="60" r="8" fill="#9a4d0c"/><circle cx="550" cy="145" r="8" fill="#156968"/><text x="568" y="65">{String(a.value)}</text><text x="568" y="150">{String(b.value)}</text></svg><p>The paths show operation order, not a physical trajectory through space. Both results come from the same declared action laws.</p></section>;
  }
  const resource = inquiries.flatMap(q => q.results).find(r => r.capability_id === 'biology.resource.ceiling' && r.status === 'established_in_scope');
  if (resource && resource.value && typeof resource.value === 'object' && !Array.isArray(resource.value)) {
    const v = resource.value, interval = v.ceiling_interval_mM as string[], lo = number(interval[0]), hi = number(interval[1]), target = number(v.target_mM), max = Math.max(hi, target) * 1.15;
    return <section className="cd-result-visual"><span className="cd-label">RESOURCE ACCOUNTING · SYNTHETIC MODEL</span><h3>{v.target_excluded ? 'The target exceeds the entire allowed resource ceiling.' : 'This ceiling no longer excludes the target.'}</h3><Bar label="Ceiling, lower bound" value={lo} max={max} detail={`${lo.toFixed(4)} mM`}/><Bar label="Ceiling, upper bound" value={hi} max={max} detail={`${hi.toFixed(4)} mM`}/><Bar label="Requested target" value={target} max={max} detail={`${target.toFixed(4)} mM`}/><p>{v.target_excluded ? 'Even the most generous point in this declared rectangle cannot support that extent.' : 'An allowed target is not a demonstrated outcome. Mechanism and measurement remain necessary.'}</p></section>;
  }
  const quantum = inquiries.flatMap(q => q.results).find(r => r.capability_id === 'quantum.reference.evolve' && r.status === 'established_in_scope');
  if (quantum && quantum.value && typeof quantum.value === 'object' && !Array.isArray(quantum.value)) {
    const conclusions = quantum.value.conclusions as { id: string; value: unknown }[];
    const contrast = conclusions.find(c => c.id === 'Q-REFERENCE-CONTRAST')?.value as { preparation_id: string; base: number; changed: number }[] | undefined;
    return contrast ? <section className="cd-result-visual"><span className="cd-label">QUANTUM REFERENCE · SINGLET PRODUCT FRACTION</span><h3>One changed model parameter, two preparation responses.</h3>{contrast.map(c => <div key={c.preparation_id}><h4>{c.preparation_id}</h4><Bar label="Base protocol" value={c.base}/><Bar label="Changed protocol" value={c.changed}/></div>)}<p>Dimensionless reference calculation. These are product fractions in a specified model, not measured biological probabilities.</p></section> : null;
  }
  return null;
}
