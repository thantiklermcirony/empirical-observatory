/** Grounded symbolic language, v1. Vocabulary is coined online. Grammar is
 * selected from six supplied three-role orders by an explicit compression
 * score. This is not language learned from unstructured text or perception. */
export type Meaning = { subject: string; verb: string; object: string };
export const ORDERS = ['SVO', 'SOV', 'VSO', 'VOS', 'OSV', 'OVS'] as const;
export type Order = typeof ORDERS[number];
export type Utterance = { dialect: string; order: Order; words: [string, string, string] };
const roles = { S: 'subject', V: 'verb', O: 'object' } as const;
export class UnknownWord extends Error {}

export class GroundedDialect {
  id: string; salt: number; serial = 0; order: Order = 'SVO'; grammarReviews = 0; utterances = 0;
  lexicon = new Map<string, string>();
  bindings = new Map<string, string>();
  examples: Meaning[] = [];
  constructor(id: string, salt: number) { this.id = id; this.salt = salt >>> 0; }
  coin(referent: string) {
    if (this.lexicon.has(referent)) return this.lexicon.get(referent)!;
    if (this.serial >= 512) throw new Error('This dialect has reached its 512-word budget.');
    // A seeded permutation makes a reversible, collision-free invented label.
    let n = (Math.imul(this.serial++, 4051) + this.salt) & 4095;
    const consonants = 'bdfgklmnprstvzxy', vowels = 'aeiou';
    let token = '';
    for (let k = 0; k < 2; k++) { token += consonants[n % 15]; n = Math.floor(n / 15); token += vowels[n % 5]; n = Math.floor(n / 5); }
    const key = `${this.id}:${token}`;
    if (this.bindings.has(key)) throw new Error('Coinage collision.');
    this.lexicon.set(referent, token); this.bindings.set(key, referent);
    return token;
  }
  speak(meaning: Meaning): Utterance {
    for (const value of Object.values(meaning)) this.coin(value);
    this.examples.push({ ...meaning }); if (this.examples.length > 64) this.examples.shift();
    this.utterances++; if (this.utterances % 8 === 0) this.chooseGrammar();
    const words = this.order.split('').map(role => this.lexicon.get(meaning[roles[role as keyof typeof roles]])!) as Utterance['words'];
    return { dialect: this.id, order: this.order, words };
  }
  /** Score a first-order token model, resetting at message boundaries. This
   * finite grammar search can preserve verb-object dependence; six candidates
   * and the three semantic roles are supplied, not discovered universally. */
  grammarCost(order: Order) {
    const counts = new Map<string, number>(), contexts = new Map<string, number>();
    for (const e of this.examples) {
      let previous = '^';
      for (const role of order) {
        const next = e[roles[role as keyof typeof roles]], key = `${previous}\u0000${next}`;
        counts.set(key, (counts.get(key) ?? 0) + 1); contexts.set(previous, (contexts.get(previous) ?? 0) + 1); previous = next;
      }
    }
    let bits = Math.log2(6);
    for (const [key, n] of counts) bits -= n * Math.log2(n / contexts.get(key.split('\u0000')[0])!);
    return bits;
  }
  chooseGrammar() {
    let best = this.order, cost = this.grammarCost(best);
    for (const order of ORDERS) { const candidate = this.grammarCost(order); if (candidate < cost - 1e-9) { best = order; cost = candidate; } }
    this.order = best; this.grammarReviews++;
  }
  /** The caller must provide a jointly observed meaning. Merely receiving
   * someone else's asserted translation is not a grounding witness. */
  learnFromDemonstration(message: Utterance, observed: Meaning) {
    validateUtterance(message);
    const pending = message.order.split('').map((role, i) => {
      const key = `${message.dialect}:${message.words[i]}`, meaning = observed[roles[role as keyof typeof roles]];
      const old = this.bindings.get(key);
      if (old && old !== meaning) throw new Error('A word conflicts with an observed binding.');
      return [key, meaning] as const;
    });
    const within = new Map<string, string>();
    for (const [key, meaning] of pending) { if (within.has(key) && within.get(key) !== meaning) throw new Error('Ambiguous word in one message.'); within.set(key, meaning); }
    if (new Set([...this.bindings.keys(), ...pending.map(([k]) => k)]).size > 2048) throw new Error('Translation memory is full.');
    for (const [key, meaning] of pending) this.bindings.set(key, meaning);
  }
  understand(message: Utterance): Meaning {
    validateUtterance(message);
    const result = {} as Meaning;
    for (let i = 0; i < 3; i++) {
      const word = message.words[i], meaning = this.bindings.get(`${message.dialect}:${word}`);
      if (!meaning) throw new UnknownWord(`Unknown word: ${word}`);
      result[roles[message.order[i] as keyof typeof roles]] = meaning;
    }
    if (!result.subject.startsWith('agent:') || !result.verb.startsWith('verb:') || !(result.object.startsWith('noun:') || result.object.startsWith('agent:') || result.object.startsWith('household:'))) throw new Error('Word roles do not bind a world command.');
    return result;
  }
  snapshot() { return { dialect: this.id, order: this.order, grammarReviews: this.grammarReviews, words: [...this.lexicon].map(([meaning, word]) => ({ word, meaning })), translations: this.bindings.size }; }
  checkpoint() { return { id: this.id, salt: this.salt, serial: this.serial, order: this.order, grammarReviews: this.grammarReviews, utterances: this.utterances, lexicon: [...this.lexicon], bindings: [...this.bindings], examples: this.examples }; }
  static restore(d: ReturnType<GroundedDialect['checkpoint']>) {
    if (!/^a[0-9]{1,3}$/.test(d.id) || !ORDERS.includes(d.order) || !Number.isInteger(d.serial) || d.serial < 0 || d.serial > 512 || !Array.isArray(d.lexicon) || d.lexicon.length > 512 || !Array.isArray(d.bindings) || d.bindings.length > 2048 || !Array.isArray(d.examples) || d.examples.length > 64) throw new Error('Invalid language checkpoint.');
    if (d.lexicon.some(p => !Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || !/^[a-z]{4}$/.test(p[1])) || d.bindings.some(p => !Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || typeof p[1] !== 'string')) throw new Error('Invalid language dictionary.');
    const out = new GroundedDialect(d.id, d.salt);
    out.serial = d.serial; out.order = d.order; out.grammarReviews = d.grammarReviews; out.utterances = d.utterances;
    out.lexicon = new Map(d.lexicon); out.bindings = new Map(d.bindings); out.examples = structuredClone(d.examples);
    for (const [meaning, word] of out.lexicon) if (out.bindings.get(`${out.id}:${word}`) !== meaning) throw new Error('Language binding mismatch.');
    return out;
  }
}
function validateUtterance(m: Utterance) {
  if (!m || typeof m.dialect !== 'string' || !/^a[0-9]{1,3}$/.test(m.dialect) || !ORDERS.includes(m.order) || !Array.isArray(m.words) || m.words.length !== 3 || m.words.some(w => typeof w !== 'string' || !/^[a-z]{4}$/.test(w))) throw new Error('Invalid world-language packet.');
}

export function languageProbe() {
  const speaker = new GroundedDialect('a0', 178), listener = new GroundedDialect('a1', 291);
  const training: Meaning[] = [
    { subject: 'agent:0', verb: 'verb:forage', object: 'noun:food' },
    { subject: 'agent:1', verb: 'verb:drink', object: 'noun:water' },
    { subject: 'agent:0', verb: 'verb:rest', object: 'noun:body' },
  ];
  const messages = training.map(m => speaker.speak(m));
  let unknownBlocked = false;
  try { listener.understand(messages[0]); } catch (e) { unknownBlocked = e instanceof UnknownWord; }
  training.forEach((m, i) => listener.learnFromDemonstration(messages[i], m));
  // Each subject/action combination is new, but each individual word was grounded.
  const heldout: Meaning[] = [
    { subject: 'agent:1', verb: 'verb:forage', object: 'noun:food' },
    { subject: 'agent:0', verb: 'verb:drink', object: 'noun:water' },
    { subject: 'agent:1', verb: 'verb:rest', object: 'noun:body' },
  ];
  const rows = heldout.map(meaning => { const message = speaker.speak(meaning), decoded = listener.understand(message); return { meaning, message, decoded, correct: Object.keys(meaning).every(k => meaning[k as keyof Meaning] === decoded[k as keyof Meaning]) }; });
  return { type: 'finite compositional protocol check; no general language claim', unknownBlocked, trainingMessages: messages, heldout: rows, correct: rows.filter(r => r.correct).length, total: rows.length, speaker: speaker.snapshot(), listener: listener.snapshot() };
}
