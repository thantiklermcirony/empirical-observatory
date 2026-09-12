import { createTemporalExample, runTemporalInquiry, temporalCatalogue, hashTemporalJson, TemporalInputError } from './engine/temporal-router.ts';
import type { Inquiry, TemporalReport, TemporalRuntimeOptions } from './engine/temporal-router.ts';
import { evaluateQuantumReference } from './engine/quantum-reference.ts';
import { investigate } from './engine/question.ts';
import { LAB_EXAMPLES } from './lab-contract.ts';
import type { LabPrintout, LabBranch, LabRequest, LabTerm } from './lab-contract.ts';

export const RUNTIME: TemporalRuntimeOptions = {
  implementationIdentity: { id: 'temporal-router-ts/0.1.0', source_sha256: 'e430925cc2d4a1bf5c6665043a645697236afc111b95ce0c3e6c432d4d0c3c29' },
  quantumReference: { execute: evaluateQuantumReference, identity: { id: 'quantum-reference-ts/0.1.0', source_sha256: '3ecb62e0c834c50dc197b7e8b2196dc38ba9b1ea3345c2ed995386b319ebbabc' } },
};
const SOURCE = 'https://github.com/thantiklermcirony/empirical-observatory';
export function labCatalogue() {
  return { version: 'observatory-inquiry/1', input: 'Exactly one of {prompt} or {inquiry, previous?}. previous is an untrusted comparison snapshot, not authenticated history.', capabilities: temporalCatalogue(RUNTIME),
    examples: LAB_EXAMPLES, structuredExamples: Object.fromEntries(['actions-ab', 'actions-ba', 'resource', 'resource-corrected', 'quantum'].map(kind => [kind, createTemporalExample(kind as Parameters<typeof createTemporalExample>[0])])),
    limits: { requestBytes: 65536, promptCharacters: 2000, storageDays: 30 },
    scope: 'Declared-model calculations and explicit gaps. Human prose uses exact documented templates; arbitrary prose is not silently converted into a model. No automatic theorem admission or autonomous code changes.' };
}
export function parseLabRequest(value: unknown): LabRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TemporalInputError('invalid_request', 'Send a JSON question object.');
  const v = value as Record<string, unknown>;
  if (Object.hasOwn(v, 'prompt')) {
    if (Object.keys(v).length !== 1 || typeof v.prompt !== 'string' || !v.prompt.trim() || v.prompt.length > 2000) throw new TemporalInputError('invalid_request', 'Send only prompt, containing 1–2,000 characters.');
    return { prompt: v.prompt.trim() };
  }
  if (!Object.hasOwn(v, 'inquiry') || Object.keys(v).some(k => !['inquiry', 'previous'].includes(k))) throw new TemporalInputError('invalid_request', 'Send only inquiry and optionally previous. Runtime configuration cannot be supplied by a question.');
  return { inquiry: v.inquiry, ...(v.previous !== undefined ? { previous: v.previous } : {}) };
}
function branches(): LabBranch[] {
  return [['mathematics', 'Mathematics'], ['biology', 'Biology'], ['quantum', 'Quantum'], ['dynamics', 'Dynamics'], ['encyclopedia', 'Encyclopedia']].map(([id, title]) => ({ id: id as LabBranch['id'], title, state: 'not_selected', summary: 'No admitted operation in this question requires this branch.', results: [], obligations: [], sources: [{ title: 'Programme and source', href: SOURCE }], href: `/labs/${id}` }));
}
function namedTerms(q: Inquiry): LabTerm[] {
  return [...q.quantities.map(v => ({ text: v.id, role: 'noun' as const, meaning: `${v.meaning} · ${v.role} · ${v.unit} · ${JSON.stringify(v.value)}`, symbol: v.id })), ...q.operations.map(v => ({ text: v.verb, role: 'verb' as const, meaning: `${v.kind}; ordered inputs ${JSON.stringify(v.inputs)}`, symbol: v.id })), { text: q.system.jurisdiction, role: 'context' as const, meaning: `Preparation ${q.observer.preparation_id}; ${q.observer.clock.kind}, ${q.observer.clock.unit}` }];
}
// Full-string templates deliberately reject extra qualifiers and unsupported units.
// A match declares a model; keyword overlap alone never authorizes a calculation.
function interpret(prompt: string): { profile: string | null; inquiries: Inquiry[]; terms: LabTerm[]; gain?: number } {
  const exact = LAB_EXAMPLES.find(x => x.prompt.toLowerCase() === prompt.toLowerCase());
  const order = /^Compare alignment then contraction with contraction then alignment in the declared bounded scalar model\. x=([^, ]+), u=([^, ]+), c=([^, .]+(?:\.[0-9]+)?)\.?$/i.exec(prompt);
  const resource = /^In the synthetic time-zero fixed-volume resource model, can GPx extent reach ([0-9.]+) mM\? q=([0-9.]+), T=\[([0-9.]+),([0-9.]+)\] mM, N=\[([0-9.]+),([0-9.]+)\] uM\.$/i.exec(prompt);
  const control = /^Compare TAO with conventional feedback in the Observatory synthetic reactor at gain=([0-9.]+)\.$/i.exec(prompt);
  let inquiries: Inquiry[] = [], profile: string | null = null, gain: number | undefined;
  if (order) { profile = 'order'; inquiries = [createTemporalExample('actions-ab'), createTemporalExample('actions-ba')]; for (const q of inquiries) q.quantities.forEach((v, i) => { v.value = order[i + 1]; }); }
  else if (resource) { profile = 'resource'; const q = createTemporalExample('resource'); [q.quantities[0].value, q.quantities[1].value, q.quantities[2].value, q.quantities[3].value] = [resource[2], [resource[3], resource[4]], [resource[5], resource[6]], resource[1]]; inquiries = [q]; }
  else if (exact?.id === 'quantum') { profile = 'quantum'; inquiries = [createTemporalExample('quantum')]; }
  else if (control) { gain = Number(control[1]); if (Number.isFinite(gain) && gain >= 1 && gain <= 18) profile = 'control'; }
  for (const q of inquiries) q.question.original = prompt;
  const terms = inquiries.flatMap(namedTerms);
  if (profile === 'control') terms.push({ text: 'reactor', role: 'noun', meaning: 'The existing seeded synthetic reactor fixture' }, { text: 'compare', role: 'verb', meaning: 'Compare tracking error for controllers under the same gain, disturbances and limits' }, { text: 'gain', role: 'context', meaning: `${gain}; no claim of optimality outside this fixture` });
  if (!profile) {
    const vocabulary: [RegExp, string, LabTerm['role'], string][] = [[/\b(uhl|boundedness|bound|bounded|state)\b/gi, 'bounded state', 'noun', 'Needs observable, units, domain and a declared composition law'], [/\b(cell|biology|redox|gpx|hormesis)\b/gi, 'biological system', 'noun', 'Needs preparation, time, measured quantities and mechanism'], [/\b(quantum|electron|tunnel|tunneling)\b/gi, 'quantum system', 'noun', 'Needs a specified state, Hamiltonian and observation protocol'], [/\b(time|history|future)\b/gi, 'time/history', 'context', 'Needs a clock and ordered observations or interventions'], [/\b(compare|predict|explain|derive|prove|measure)\b/gi, 'requested operation', 'verb', 'Meaning recognized; no registered computation selected from this word alone']];
    for (const [pattern, , role, meaning] of vocabulary) for (const match of prompt.matchAll(pattern)) terms.push({ text: match[0], role, meaning });
  }
  return { profile, inquiries, terms, gain };
}
export async function evaluateLabRequest(raw: unknown): Promise<LabPrintout & { request: LabRequest }> {
  const request = parseLabRequest(raw);
  let prompt: string, profile: string | null, terms: LabTerm[], reports: TemporalReport[] = [], gain: number | undefined;
  if ('inquiry' in request) {
    const report = await runTemporalInquiry(request.inquiry, request.previous, RUNTIME);
    prompt = typeof report.question.original === 'string' ? report.question.original : 'Declared structured inquiry';
    profile = 'structured'; terms = namedTerms(report); reports = [report];
  } else {
    prompt = request.prompt;
    const parsed = interpret(prompt); ({ profile, terms, gain } = parsed);
    reports = await Promise.all(parsed.inquiries.map(q => runTemporalInquiry(q, undefined, RUNTIME)));
  }
  const rooms = branches(), related: LabPrintout['encyclopedia'] = [];
  for (const report of reports) for (const result of report.results) {
    const cap = result.capability_id ?? report.execution.plan.steps.find(x => x.id === result.id)?.candidate_capability_id ?? '';
    const id = cap.startsWith('biology.') ? 'biology' : cap.startsWith('quantum.') ? 'quantum' : cap.startsWith('math.') ? 'mathematics' : 'encyclopedia';
    const branch = rooms.find(b => b.id === id)!;
    branch.state = result.status === 'established_in_scope' ? (branch.state === 'unresolved' ? 'unresolved' : 'computed') : 'unresolved';
    branch.summary = result.interpretation || 'The declared step could not be completed with these inputs.';
    branch.results.push({ label: `${report.identity.id} / ${report.operations.map(x => x.verb).join(' → ')} / ${result.id}`, value: result.value, status: result.status, resultKind: result.result_kind, scope: result.scope, ...(result.unit ? { unit: result.unit } : {}) });
    branch.obligations.push(...result.issues.map(x => x.message));
    branch.sources = [{ title: 'Temporal grammar and source review', href: `${SOURCE}/tree/main/automation/temporal-grammar` }];
    if (id === 'biology' && result.status === 'established_in_scope') {
      branch.obligations.push('This necessary resource ceiling excludes some targets; it does not demonstrate that an allowed target is attained.', 'Transfer to a real specimen requires independent calibration, volume, supply and accounting evidence.');
      related.push({ id: 'E04', title: 'Recovery and reserve', relationship: 'This time-zero synthetic resource result is relevant to the distinction. It is not the Garden’s different time-30 evidence packet.', status: 'candidate entry; private result does not change its admission' });
    }
    if (cap.startsWith('math.') && result.status === 'established_in_scope') related.push({ id: 'E01', title: 'Bounded operations', relationship: 'Ordered calculations test this declared model. They do not establish closure for other actions or all future experiments.', status: 'candidate entry; private result does not change its admission' });
    if (id === 'quantum' && result.status === 'established_in_scope') { branch.obligations.push('The reference model uses dimensionless time. No species, physical clock or biological transfer is calibrated.'); related.push({ id: 'E03', title: 'Hidden quantum phase', relationship: 'Thematic connection only: this reaction model is different from the entry’s six-phase scattering family. These yields do not update that entry.', status: 'candidate entry; distinct model, no evidential transfer' }); }
  }
  if (profile === 'control') {
    const run = investigate({ prompt, model: 'tao', parameter: gain, objective: 'tracking', maxPasses: 3, confirmed: true });
    const branch = rooms.find(b => b.id === 'dynamics')!;
    branch.state = run.passes.length ? 'computed' : 'unresolved'; branch.summary = run.passes.at(-1)?.answer ?? run.reason;
    branch.results = run.passes.map(pass => ({ label: pass.operation, value: { answer: pass.answer, values: pass.values, frame: pass.frame } }));
    branch.obligations = ['Synthetic seeded reactor only; compare effort separately and validate on an independent plant before transfer.'];
    branch.sources = [{ title: 'Controller source and comparisons', href: `${SOURCE}/tree/main/lib/engine` }];
    // Retain the legacy controller artifact as such, never counterfeit a fourteen-field receipt.
    branch.results.push({ label: 'Controller execution record', value: run });
  }
  const missing = profile ? reports.flatMap(r => [...r.execution.plan.issues.map(x => x.message), ...(r.operations.length ? [] : ['No operation was declared, so no branch calculation could run.'])]) : ['Choose an explicit system and observable with units.', 'Supply ordered actions, preparation and time; state assumptions and the competing explanation.', 'Use a declared-model example or submit a fourteen-field inquiry. General-language model selection is not yet implemented.'];
  if (!profile) {
    for (const b of rooms.filter(b => b.id !== 'encyclopedia')) { b.state = 'needs_input'; b.summary = 'No calculation was licensed by this question alone.'; b.obligations = [...missing]; }
  }
  const book = rooms.find(b => b.id === 'encyclopedia')!;
  book.state = book.state === 'unresolved' || missing.length ? 'unresolved' : related.length ? 'computed' : 'unresolved';
  book.summary = related.length ? 'The scoped findings are linked to relevant open entries. Links are relevance mappings, not proofs or automatic updates to accepted science.' : 'No established result can be attached yet. This question remains an explicit gap.';
  book.results.push(...related.map(e => ({ label: e.title, value: e.relationship, status: 'relevance_mapping', resultKind: 'editorial_link' })));
  book.obligations.push(...missing, 'Promoting a finding requires reviewed evidence, compatible scope and a recorded decision. A private inquiry does not modify public entries.');
  const computed = rooms.filter(b => b.state === 'computed' && b.id !== 'encyclopedia').length;
  const report: LabPrintout & { request: LabRequest } = { version: 'observatory-printout/1', id: crypto.randomUUID(), createdAt: new Date().toISOString(), prompt, request,
    interpretation: { status: profile ? 'declared_model' : 'needs_interpretation', method: profile === 'structured' ? 'Explicit quantities and ordered operations supplied through the fourteen-field inquiry contract.' : profile ? 'Complete documented prompt template matched. Every parameter is supplied or declared by that fixture; no extra qualifier is ignored.' : 'Recognized concept terms are displayed for inspection. They have not been converted into unsupported mathematics.', profile, terms, missing },
    summary: computed ? `${computed} laboratory ${computed === 1 ? 'branch returned a scoped result' : 'branches returned scoped results'}.` : 'The next step is a missing definition, not a guessed answer.',
    inquiries: reports as unknown as Record<string, unknown>[], branches: rooms, encyclopedia: related.filter((v, i) => related.findIndex(x => x.id === v.id) === i),
    limitations: ['A content hash detects changes; it is not proof, authentication or a probability that a theory is true.', 'Synthetic and mathematical model results are not empirical validation.', 'The hosted runtime executes reviewed fixed operations. It does not invent arbitrary models, write its own code or access undeclared live feeds.', 'A caller-supplied previous snapshot is a declared comparison, not independently verified history.'], receiptSha256: '' };
  const { receiptSha256: _seal, ...content } = report;
  report.receiptSha256 = await hashTemporalJson(content);
  return report;
}
