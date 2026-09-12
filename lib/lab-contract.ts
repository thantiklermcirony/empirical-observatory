export type LabBranchId = 'mathematics' | 'biology' | 'quantum' | 'dynamics' | 'encyclopedia';
export type LabTerm = { text: string; role: 'noun' | 'verb' | 'context'; meaning: string; symbol?: string };
export type LabBranch = { id: LabBranchId; title: string; state: 'computed' | 'needs_input' | 'unresolved' | 'not_selected'; summary: string; results: { label: string; value: unknown; unit?: string; status?: string; resultKind?: string; scope?: string }[]; obligations: string[]; sources: { title: string; href: string }[]; href: string };
export type LabPrintout = { version: 'observatory-printout/1'; id: string; createdAt: string; prompt: string; interpretation: { status: 'declared_model' | 'needs_interpretation'; method: string; profile: string | null; terms: LabTerm[]; missing: string[] }; summary: string; inquiries: Record<string, unknown>[]; branches: LabBranch[]; encyclopedia: { id: string; title: string; relationship: string; status: string }[]; limitations: string[]; receiptSha256: string };
export type LabRequest = { prompt: string } | { inquiry: unknown; previous?: unknown };
export type SavedPrintout = { id: string; token: string; expiresAt: string };
export const LAB_EXAMPLES = [
  { id: 'order', title: 'Does order change the outcome?', prompt: 'Compare alignment then contraction with contraction then alignment in the declared bounded scalar model. x=1/4, u=1/3, c=1/2.' },
  { id: 'resource', title: 'A recovered signal, a depleted cell?', prompt: 'In the synthetic time-zero fixed-volume resource model, can GPx extent reach 0.60 mM? q=0.99, T=[0.98,1] mM, N=[9,11] uM.' },
  { id: 'quantum', title: 'What changes a quantum reaction?', prompt: 'Run the declared dimensionless four-level quantum reference protocol and compare singlet and triplet product yields.' },
  { id: 'control', title: 'Which controller actually recovers?', prompt: 'Compare TAO with conventional feedback in the Observatory synthetic reactor at gain=4.' },
];
