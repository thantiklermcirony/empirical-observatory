/** A finite, explicit rule system. It learns no rules and makes no closed-world assumptions. */
export type Triple = [string, string, string];
export type Rule = { premises: Triple[]; conclusion: Triple };
export type Notebook = { facts: Triple[]; rules: Rule[] };
export type Proof = { id: string; statement: Triple; source: 'given' | 'derived'; rule?: number; parents: string[] };
export type Need = { statement: Triple; state: 'supported' | 'missing' | 'expand' | 'option' | 'cycle' | 'limit'; rule?: number; evidence: string[]; children: Need[] };
export type ReasoningResult = {
  version: 'observatory-reasoning-1'; prompt: string;
  status: 'answered' | 'gap' | 'budget' | 'interpretation-needed';
  reason: string; query: Triple | null; answers: Proof[]; proofs: Proof[];
  needs: Need | null; diagnostics: string[]; notebook: Notebook;
  mapping: { word: string; role: 'entity' | 'relation' | 'variable' }[];
  operations: number; rounds: number;
};
type Bindings = Map<string, string>;
const variable = (s: string) => /^\?[a-z][a-z0-9_]*$/i.test(s);
const key = (t: Triple) => JSON.stringify(t);
const clean = (s: string) => s.trim().replace(/^the\s+/i, '').toLowerCase();
const validAtom = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 100 && !/[|\n\r&<>]/.test(s) && (!s.includes('?') || variable(s));
function triple(raw: unknown, variables = false): Triple {
  if (!Array.isArray(raw) || raw.length !== 3 || !raw.every(validAtom)) throw new Error('Each statement needs three nonempty labels of at most 100 characters.');
  const t = raw.map(clean) as Triple;
  if (t.some(x => !x) || (!variables && t.some(variable))) throw new Error('Facts must name specific things; variables belong in rules and questions.');
  return t;
}
function parseTriple(s: string, variables = false): Triple { return triple(s.split('|').map(x => x.trim()), variables); }
function rule(raw: unknown): Rule {
  const r = raw as Rule;
  if (!r || !Array.isArray(r.premises) || !r.premises.length || r.premises.length > 6) throw new Error('A rule needs one to six premises.');
  const premises = r.premises.map(p => triple(p, true));
  const conclusion = triple(r.conclusion, true);
  const bound = new Set(premises.flat().filter(variable));
  if (conclusion.some(x => variable(x) && !bound.has(x))) throw new Error('Every output variable must occur in a premise.');
  return { premises, conclusion };
}
function parseRule(s: string): Rule {
  const parts = s.split('->');
  if (parts.length !== 2) throw new Error('Use Rule: premise & premise -> conclusion.');
  return rule({ premises: parts[0].split('&').map(p => parseTriple(p, true)), conclusion: parseTriple(parts[1], true) });
}
function notebook(raw: unknown): Notebook {
  if (raw === undefined) return { facts: [], rules: [] };
  const n = raw as Notebook;
  if (!n || !Array.isArray(n.facts) || !Array.isArray(n.rules) || n.facts.length > 128 || n.rules.length > 48) throw new Error('A notebook holds at most 128 stated facts and 48 rules.');
  return { facts: n.facts.map(f => triple(f)), rules: n.rules.map(rule) };
}
function resolve(s: string, b: Bindings): string {
  const seen = new Set<string>();
  while (variable(s) && b.has(s) && !seen.has(s)) { seen.add(s); s = b.get(s)!; }
  return s;
}
function bind(a: Triple, c: Triple, prior: Bindings = new Map()): Bindings | null {
  const b = new Map(prior);
  for (let i = 0; i < 3; i++) {
    const x = resolve(a[i], b), y = resolve(c[i], b);
    if (x === y) continue;
    if (variable(x)) b.set(x, y);
    else if (variable(y)) b.set(y, x);
    else return null;
  }
  return b;
}
const apply = (t: Triple, b: Bindings) => t.map(x => resolve(x, b)) as Triple;

export function reason(raw: unknown): ReasoningResult {
  if (!raw || typeof raw !== 'object') throw new Error('Supply a prompt and an optional notebook.');
  const req = raw as { prompt?: unknown; notebook?: unknown; maxOperations?: unknown };
  if (typeof req.prompt !== 'string' || !req.prompt.trim() || req.prompt.length > 8000) throw new Error('Use a prompt between 1 and 8000 characters.');
  const maximum = req.maxOperations ?? 20000;
  if (typeof maximum !== 'number' || !Number.isInteger(maximum) || maximum < 1 || maximum > 20000) throw new Error('The operation budget must be an integer from 1 to 20000.');
  const budget: number = maximum;
  const saved = notebook(req.notebook);
  const working = { facts: [...saved.facts], rules: [...saved.rules] };
  const diagnostics: string[] = [];
  let query: Triple | null = null;
  // Explicit line syntax can contain punctuation. The small English grammar uses sentences.
  const clauses = req.prompt.split(/\r?\n/).flatMap(line => /^(Fact|Rule|Ask|Forget):/i.test(line.trim()) ? [line.trim()] : line.split(/[.!?](?:\s+|$)/).map(s => s.trim())).filter(Boolean);
  for (const clause of clauses) {
    try {
      let m: RegExpMatchArray | null;
      if ((m = clause.match(/^Fact:\s*(.+)$/i))) working.facts.push(parseTriple(m[1]));
      else if ((m = clause.match(/^Forget:\s*(.+)$/i))) {
        const target = parseTriple(m[1]);
        working.facts = working.facts.filter(f => key(f) !== key(target));
      } else if ((m = clause.match(/^Rule:\s*(.+)$/i))) working.rules.push(parseRule(m[1]));
      else if ((m = clause.match(/^Ask:\s*(.+)$/i))) {
        if (query) throw new Error('Use one question per run.');
        query = parseTriple(m[1], true);
      } else if ((m = clause.match(/^where is (.+)$/i))) {
        if (query) throw new Error('Use one question per run.');
        query = triple([clean(m[1]), 'at', '?where'], true);
      } else if ((m = clause.match(/^what is (.+)$/i))) {
        if (query) throw new Error('Use one question per run.');
        query = triple([clean(m[1]), 'is', '?what'], true);
      } else if (/^(?:who|what|when|where|why|how|is|are|can|could|should|does|do|did|will|would)\b/i.test(clause)) {
        diagnostics.push(`Needs interpretation: ${clause}`);
      } else if (!/\b(?:not|never|no|if|unless|or|and|maybe|perhaps|might|could)\b/i.test(clause) && (m = clause.match(/^(.+?) is (?:at|on|inside|in) (.+)$/i))) {
        const relation = / is (inside|in) /i.test(clause) ? 'inside' : 'at';
        working.facts.push(triple([clean(m[1]), relation, clean(m[2])]));
      } else if (!/\b(?:not|never|no|if|unless|or|and|maybe|perhaps|might|could)\b/i.test(clause) && (m = clause.match(/^(.+?) is (.+)$/i))) working.facts.push(triple([clean(m[1]), 'is', clean(m[2])]));
      else diagnostics.push(`Needs interpretation: ${clause}`);
    } catch (e) { diagnostics.push(`${clause}: ${e instanceof Error ? e.message : 'Invalid statement.'}`); }
  }
  working.facts = [...new Map(working.facts.map(f => [key(f), f])).values()];
  working.rules = [...new Map(working.rules.map(r => [JSON.stringify(r), r])).values()];
  if (working.facts.length > 128 || working.rules.length > 48) throw new Error('A notebook holds at most 128 stated facts and 48 rules.');
  const mapping = [...new Map([...working.facts, ...working.rules.flatMap(r => [...r.premises, r.conclusion]), ...(query ? [query] : [])].flatMap(t => t.map((word, i) => ({word, role: variable(word) ? 'variable' as const : i === 1 ? 'relation' as const : 'entity' as const}))).map(x => [`${x.role}:${x.word}`, x])).values()];
  const result: ReasoningResult = { version: 'observatory-reasoning-1', prompt: req.prompt, status: 'gap', reason: '', query, answers: [], proofs: [], needs: null, diagnostics, notebook: saved, mapping, operations: 0, rounds: 0 };
  // Reject the whole ambiguous prompt: no partially accepted facts enter memory.
  if (diagnostics.length) return { ...result, status: 'interpretation-needed', reason: 'Some text has no supported interpretation. Nothing from this prompt was saved or inferred.' };
  result.notebook = working;
  let limited = false;
  function spend(): boolean { if (result.operations >= budget) { limited = true; return false; } result.operations++; return true; }
  const known = new Map<string, Proof>();
  for (const f of working.facts) known.set(key(f), { id: `f${known.size + 1}`, statement: f, source: 'given', parents: [] });
  let changed = true;
  while (changed && !limited) {
    changed = false;
    result.rounds++;
    for (let ri = 0; ri < working.rules.length && !limited; ri++) {
      const r = working.rules[ri];
      const snapshot = [...known.values()];
      const visit = (index: number, b: Bindings, parents: string[]) => {
        if (limited) return;
        if (index === r.premises.length) {
          const statement = apply(r.conclusion, b);
          if (!known.has(key(statement))) {
            if (known.size >= 256) { limited = true; return; }
            known.set(key(statement), { id: `f${known.size + 1}`, statement, source: 'derived', rule: ri + 1, parents: [...new Set(parents)] });
            changed = true;
          }
          return;
        }
        for (const f of snapshot) {
          if (!spend()) return;
          const next = bind(r.premises[index], f.statement, b);
          if (next) visit(index + 1, next, [...parents, f.id]);
          if (limited) return;
        }
      };
      visit(0, new Map(), []);
    }
  }
  result.proofs = [...known.values()];
  result.answers = query ? result.proofs.filter(p => Boolean(bind(query!, p.statement))) : [];
  let nodes = 0;
  function explain(goal: Triple, path: Set<string>, depth: number): Need {
    const supported = result.proofs.filter(f => Boolean(bind(goal, f.statement)));
    if (supported.length) return { statement: goal, state: 'supported', evidence: supported.map(f => f.id), children: [] };
    if (path.has(key(goal))) return { statement: goal, state: 'cycle', evidence: [], children: [] };
    if (++nodes > 64 || depth > 8 || limited) return { statement: goal, state: 'limit', evidence: [], children: [] };
    const children: Need[] = [];
    const nextPath = new Set(path).add(key(goal));
    for (let ri = 0; ri < working.rules.length; ri++) {
      if (!spend()) break;
      const r = working.rules[ri];
      // Fresh variables prevent unrelated rule applications from sharing bindings.
      const rename = (t: Triple) => t.map(x => variable(x) ? `${x}_r${depth}_${ri}` : x) as Triple;
      const b = bind(rename(r.conclusion), goal);
      if (!b) continue;
      let choices = [b];
      const premises = r.premises.map(rename);
      for (const p of premises) {
        const next: Bindings[] = [];
        for (const choice of choices) {
          const matches: Bindings[] = [];
          for (const f of result.proofs) {
            if (!spend()) break;
            const match = bind(p, f.statement, choice);
            if (match) matches.push(match);
          }
          next.push(...(matches.length ? matches : [choice]));
        }
        choices = next.slice(0, 6);
      }
      const headVariables = new Set(rename(r.conclusion).filter(variable));
      for (const choice of choices) {
        // Do not invent an unseen intermediate object to expand an existential gap.
        if (premises.flat().some(x => variable(x) && !headVariables.has(x) && variable(resolve(x, choice)))) continue;
        if (children.length >= 6 || nodes >= 64 || limited) break;
        children.push({ statement: goal, state: 'option', rule: ri + 1, evidence: [], children: premises.map(p => explain(apply(p, choice), nextPath, depth + 1)) });
      }
    }
    return { statement: goal, state: children.length ? 'expand' : limited ? 'limit' : 'missing', evidence: [], children };
  }
  if (query) result.needs = explain(query, new Set(), 0);
  result.status = limited ? 'budget' : result.answers.length ? 'answered' : 'gap';
  result.reason = limited ? 'The work budget was reached. Any listed deductions remain conditional; the search is incomplete.' : result.answers.length ? 'This follows from the stated facts and rules. Their truth in the world still requires evidence.' : query ? 'The stated facts and rules do not establish an answer. The dependency tree shows possible next questions, not facts to assume.' : 'Facts and rules were retained for this workspace. Add one Ask: line to investigate them.';
  return result;
}
