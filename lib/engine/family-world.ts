/** Two-family world 0.1. Synthetic learning experiment; no sentience claim.
 * Physics, action grammar, motives and memory updates are authored assumptions.
 * Action values and transition predictions are learned from random initialization.
 */
import { random, clamp, mean } from './random.ts';
import { GroundedDialect, type Meaning, type Utterance } from './family-language.ts';

export const FAMILY_WORLD_VERSION = 'two-family-world/0.1.0';
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-clamp(x, -35, 35)));
export const logit = (x: number) => Math.log(clamp(x, 1e-6, 1 - 1e-6) / (1 - clamp(x, 1e-6, 1 - 1e-6)));
/** Boundary-fixing real Möbius translation. The projective form is an
 * additional assumption; boundedness alone does not select this geometry. */
export function mobiusTranslate(x: number, u: number) {
  if (!Number.isFinite(x) || !Number.isFinite(u) || Math.abs(x) >= 1 || Math.abs(u) >= 1) throw new Error('Möbius coordinates must lie strictly between -1 and 1.');
  return clamp((x + u) / (1 + x * u), -1 + 1e-12, 1 - 1e-12);
}
/** Budget allocation is designed, not a conservation law of intelligence.
 * At fixed memory strengths: attention = B / (1 + (C-1)/scale).
 * Its derivative in C is negative. Raw relationship records are retained. */
export function relationshipAttention(complexity: number, budget = 1, scale = 16) {
  if (!Number.isFinite(complexity) || complexity < 1 || !Number.isFinite(budget) || budget < 0 || !Number.isFinite(scale) || scale <= 0) throw new Error('Invalid attention budget.');
  return budget / (1 + (complexity - 1) / scale);
}
export function effectiveComplexity(counts: Record<string, number>) {
  const values = Object.values(counts), total = values.reduce((a, b) => a + b, 0);
  return total ? Math.exp(-values.reduce((h, n) => h + (n / total) * Math.log(n / total), 0)) : 1;
}
export function allocateRelationships(bonds: Record<number, { value: number; count: number }>, complexity: number, adaptive = true) {
  const total = Object.values(bonds).reduce((s, b) => s + b.value, 0);
  const budget = adaptive ? relationshipAttention(complexity) : 1;
  return Object.fromEntries(Object.entries(bonds).map(([id, b]) => [id, total ? budget * b.value / total : 0]));
}
export const VERBS = ['forage', 'drink', 'rest', 'gather', 'build', 'plant', 'study', 'help', 'teach', 'welcome'] as const;
export type Verb = typeof VERBS[number];
export type KnowledgePacket = { id: string; noun: string; verb: Verb; text: string; source: string; status: 'hypothesis' };
export const ENCYCLOPEDIA: KnowledgePacket[] = [
  ['food', 'forage', 'Foraging may replenish nutrition. Availability and gardens may matter.'],
  ['water', 'drink', 'Drinking may restore hydration. Drought may reduce available water.'],
  ['body', 'rest', 'Rest may restore energy; shelter may improve its effect.'],
  ['timber', 'gather', 'Gathering may supply materials for a household.'],
  ['shelter', 'build', 'Building consumes materials and may reduce exposure.'],
  ['garden', 'plant', 'Planting consumes materials and may supply food over time.'],
  ['encyclopedia', 'study', 'Studying adds a noun–verb packet to remembered vocabulary.'],
  ['companion', 'help', 'Helping transfers nutrition at a cost to the giver. Observe who benefited.'],
  ['experience', 'teach', 'Teaching can pass one observed transition to another learner.'],
  ['household', 'welcome', 'A provisioned household can add one novice with a fresh network.'],
].map((p, i) => ({ id: `seed-${i}`, noun: p[0], verb: p[1] as Verb, text: p[2], source: 'Authored miniature-world encyclopedia v1; not external evidence', status: 'hypothesis' }));

/** Text is data. This parser cannot introduce a new executable verb or authority. */
export function parseKnowledge(text: string): KnowledgePacket[] {
  if (text.length > 1_000_000) throw new Error('Packet import exceeds 1 MB.');
  const rows: unknown = JSON.parse(text);
  if (!Array.isArray(rows) || rows.length > 200) throw new Error('Use an array of at most 200 packets.');
  const seen = new Set<string>();
  return rows.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Each packet must be an object.');
    const v = value as Record<string, unknown>;
    for (const key of ['id', 'noun', 'verb', 'text', 'source']) {
      if (typeof v[key] !== 'string' || !(v[key] as string).trim() || (v[key] as string).length > (key === 'text' ? 4000 : 200)) throw new Error(`Invalid ${key}.`);
    }
    if (!VERBS.includes(v.verb as Verb)) throw new Error('Unknown verb: imports cannot change physics.');
    if (seen.has(v.id as string)) throw new Error('Packet IDs must be unique.');
    seen.add(v.id as string);
    return { id: v.id as string, noun: v.noun as string, verb: v.verb as Verb, text: v.text as string, source: v.source as string, status: 'hypothesis' };
  });
}

type Example = { x: number[]; y: number[] };
/** Two centered sigmoid hidden layers and a sigmoid output, online SGD.
 * d/dz mean binary cross entropy with bounded soft targets is (p-y)/outputs.
 * Soft targets are normalized effects/utility, not categorical probabilities.
 */
export class SigmoidLearner {
  sizes: number[];
  weights: number[][][];
  updates = 0;
  constructor(inputs: number, rng: () => number, outputs = 4, hidden = [20, 12]) {
    this.sizes = [inputs, ...hidden, outputs];
    this.weights = this.sizes.slice(1).map((n, l) => Array.from({ length: n }, () => Array.from({ length: this.sizes[l] + 1 }, () => (rng() * 2 - 1) * Math.sqrt(3 / this.sizes[l]))));
  }
  forward(x: number[]) {
    if (x.length !== this.sizes[0] || x.some(v => !Number.isFinite(v))) throw new Error('Invalid model input.');
    const activations = [x];
    this.weights.forEach((layer, l) => {
      const prior = activations[l];
      activations.push(layer.map(w => {
        let z = w[prior.length];
        for (let j = 0; j < prior.length; j++) z += w[j] * prior[j];
        const s = sigmoid(z);
        return l === this.weights.length - 1 ? s : 2 * s - 1;
      }));
    });
    return activations;
  }
  predict(x: number[]) { return this.forward(x).at(-1)!; }
  train(x: number[], y: number[], rate = 0.22) {
    const a = this.forward(x);
    let delta = a.at(-1)!.map((p, i) => (p - y[i]) / y.length);
    for (let l = this.weights.length - 1; l >= 0; l--) {
      const prior = a[l];
      const previous = prior.map((h, j) => {
        let sum = 0;
        for (let k = 0; k < delta.length; k++) sum += this.weights[l][k][j] * delta[k];
        return sum * (1 - h * h) / 2;
      });
      for (let k = 0; k < delta.length; k++) {
        const w = this.weights[l][k];
        for (let j = 0; j < prior.length; j++) w[j] -= rate * delta[k] * prior[j];
        w[prior.length] -= rate * delta[k];
      }
      delta = previous;
    }
    this.updates++;
  }
}

export type Agent = {
  id: number; name: string; family: number; role: 'founder' | 'novice'; needs: number[];
  slow: number[]; surprise: number; relief: number; known: string[];
  bonds: Record<number, { value: number; count: number }>; brain: SigmoidLearner;
  replay: Example[]; experiences: number; last: string; x: number; y: number;
  contexts: Record<string, number>; wordCodes: Partial<Record<Verb, number>>;
  rings: { tick: number; noun: string; verb: Verb; target: string; code: number; word: string }[];
  language: GroundedDialect; lastMessage: Utterance | null; lastMeaning: Meaning | null; journal: Event[];
};
type Household = { name: string; materials: number; shelters: number; gardens: number; welcomed: boolean };
export type Action = { verb: Verb; target?: number };
export type WorldOptions = { learning?: boolean; memory?: boolean; policy?: 'learned' | 'random'; training?: boolean; adaptiveAttention?: boolean; architecture?: 'stacked' | 'linear' };
export type Event = { tick: number; actor: string; action: Verb; target: string | null; status: 'observed-in-simulation'; detail: string; reward: number; language: Utterance; succeeded: boolean };
export type WorldSnapshot = ReturnType<FamilyWorld['snapshot']>;
export const drive = (needs: number[]) => mean(needs.map(v => Math.max(0, 0.8 - v) ** 2));
const cover = (n: number) => 1 - Math.exp(-n / 2);

export class FamilyWorld {
  seed: number; rng: () => number; modelRng: () => number; weatherRng: () => number; replayRng: () => number;
  streams: Record<'policy' | 'model' | 'weather' | 'replay', number>;
  tick = 0; drought = false; agents: Agent[] = [];
  homes: Household[] = ['Aster', 'Birch'].map(name => ({ name, materials: 0.3, shelters: 0, gardens: 0, welcomed: false }));
  resources = [0.9, 0.9, 0.9]; packets = ENCYCLOPEDIA.map(p => ({ ...p })); events: Event[] = [];
  interpreter = new GroundedDialect('a999', 1);
  stats = { actions: 0, help: 0, taught: 0, built: 0, welcomed: 0, reward: 0, predictionSSE: 0 };
  options: Required<WorldOptions>;
  constructor(seed = 20260911, options: WorldOptions = {}) {
    this.seed = seed;
    random(seed); // validate the external seed using the shared contract
    this.streams = { policy: seed, model: (seed ^ 0x53a7) >>> 0, weather: (seed ^ 0xbeef) >>> 0, replay: (seed ^ 0x7143) >>> 0 };
    this.rng = () => this.draw('policy'); this.modelRng = () => this.draw('model'); this.weatherRng = () => this.draw('weather'); this.replayRng = () => this.draw('replay');
    this.options = { learning: true, memory: true, policy: 'learned', training: true, adaptiveAttention: true, architecture: 'linear', ...options };
    ['Ada', 'Sol', 'Pip', 'Ivo', 'Ren', 'Kit'].forEach((name, id) => this.addAgent(name, Math.floor(id / 3), id % 3 === 2 ? 'novice' : 'founder'));
  }
  draw(stream: keyof FamilyWorld['streams']) {
    const value = random(this.streams[stream])();
    this.streams[stream] = (this.streams[stream] + 0x6d2b79f5) >>> 0;
    return value;
  }
  addAgent(name: string, family: number, role: Agent['role']) {
    const id = this.agents.length;
    this.agents.push({ id, name, family, role, needs: [0.64, 0.64, 0.64], slow: [0.64, 0.64, 0.64], surprise: 0, relief: 0.5, known: [], bonds: {}, brain: new SigmoidLearner(34, this.modelRng, 4, this.options.architecture === 'linear' ? [] : [20, 12]), replay: [], experiences: 0, last: 'arrived', x: family ? 9 : 2, y: 2 + id % 3, contexts: {}, wordCodes: {}, rings: [], language: new GroundedDialect(`a${id}`, (this.seed + id * 137) >>> 0), lastMessage: null, lastMeaning: null, journal: [] });
  }
  candidates(a: Agent): Action[] {
    const out: Action[] = VERBS.filter(v => v !== 'help' && v !== 'teach' && v !== 'welcome').map(verb => ({ verb }));
    for (const b of this.agents) if (b.id !== a.id) { out.push({ verb: 'help', target: b.id }); out.push({ verb: 'teach', target: b.id }); }
    if (!this.homes[a.family].welcomed) out.push({ verb: 'welcome' });
    return out;
  }
  features(a: Agent, action: Action) {
    const h = this.homes[a.family], b = action.target === undefined ? a : this.agents[action.target];
    const bond = this.options.memory ? (allocateRelationships(a.bonds, effectiveComplexity(a.contexts), this.options.adaptiveAttention)[b.id] ?? 0) : 0;
    const recentVerb = this.options.memory && a.rings.length ? (VERBS.indexOf(a.rings.at(-1)!.verb) + 1) / VERBS.length : 0;
    const x = [...a.needs, h.materials, cover(h.shelters), cover(h.gardens), a.known.length / Math.max(1, this.packets.length), ...this.resources, this.drought ? 1 : 0, ...b.needs, bond, recentVerb,
      ...(this.options.memory ? a.slow : [0.5, 0.5, 0.5]), this.options.memory ? a.surprise : 0.5, this.options.memory ? a.relief : 0.5,
      this.options.memory ? (1 + (a.wordCodes[action.verb] ?? 0)) / 2 : 0.5,
      h.welcomed ? 1 : 0, this.options.adaptiveAttention ? relationshipAttention(effectiveComplexity(a.contexts)) : 1,
      ...VERBS.map(v => v === action.verb ? 1 : 0)];
    return x.map(v => clamp(v) * 2 - 1);
  }
  choose(a: Agent): Action {
    const candidates = this.candidates(a);
    const epsilon = this.options.training ? Math.max(0.10, 0.8 * Math.exp(-a.experiences / 260)) : 0;
    if (this.options.policy === 'random' || this.rng() < epsilon) {
      // Choose a verb first: having several recipients must not silently make
      // social actions five times likelier than drinking or resting.
      const verbs = [...new Set(candidates.map(c => c.verb))];
      const verb = verbs[Math.floor(this.rng() * verbs.length)];
      const targets = candidates.filter(c => c.verb === verb);
      return targets[Math.floor(this.rng() * targets.length)];
    }
    let best = -Infinity, selected = candidates[0];
    // Random tie order is policy randomness, never privileged access to physics.
    const offset = Math.floor(this.rng() * candidates.length);
    for (let j = 0; j < candidates.length; j++) {
      const action = candidates[(j + offset) % candidates.length];
      const prediction = a.brain.predict(this.features(a, action));
      // Re-evaluate learned physical effects against CURRENT needs. A reward
      // regressor alone failed transfer in development; keep that failure.
      const nextNeeds = a.needs.map((v, i) => (1 + mobiusTranslate(2 * clamp(v, 1e-6, 1 - 1e-6) - 1, Math.tanh(1.5 * (prediction[i + 1] - 0.5)))) / 2);
      const value = drive(a.needs) - drive(nextNeeds) + 0.15 * (prediction[0] - 0.5) / 2;
      if (value > best) { best = value; selected = action; }
    }
    return selected;
  }
  act(a: Agent, action: Action) {
    if (!VERBS.includes(action.verb)) throw new Error('Unknown action.');
    if ((action.verb === 'help' || action.verb === 'teach') && (action.target === undefined || !this.agents[action.target] || action.target === a.id)) throw new Error('A distinct observed recipient is required.');
    const meaning: Meaning = { subject: `agent:${a.id}`, verb: `verb:${action.verb}`, object: action.target === undefined ? `noun:${ENCYCLOPEDIA.find(p => p.verb === action.verb)!.noun}` : `agent:${action.target}` };
    const message = a.language.speak(meaning);
    // A pointing/affordance witness grounds the coined labels. Reading a text
    // packet cannot create this witness. Every action traverses this decoder.
    this.interpreter.learnFromDemonstration(message, meaning);
    action = this.interpretCommand(a, message);
    const h = this.homes[a.family], before = [...a.needs];
    const b = action.target === undefined ? undefined : this.agents[action.target];
    const otherBefore = b ? drive(b.needs) : 0;
    const x = this.features(a, action), prediction = a.brain.predict(x);
    let bonus = 0, detail = action.verb as string, valid = true;
    const alter = (who: Agent, k: number, dz: number) => { who.needs[k] = (1 + mobiusTranslate(2 * clamp(who.needs[k], 1e-6, 1 - 1e-6) - 1, Math.tanh(dz / 2))) / 2; };
    alter(a, 2, -0.07);
    switch (action.verb) {
      case 'forage':
        alter(a, 0, 1.05 * this.resources[0] + 0.25 * cover(h.gardens)); this.resources[0] = clamp(this.resources[0] - 0.035);
        a.x = 5; a.y = 2; break;
      case 'drink':
        alter(a, 1, 1.15 * this.resources[1]); this.resources[1] = clamp(this.resources[1] - 0.03); a.x = 6; a.y = 5; break;
      case 'rest': alter(a, 2, 1.1 + 0.25 * cover(h.shelters)); a.x = a.family ? 9 : 2; a.y = 3; break;
      case 'gather': h.materials = clamp(h.materials + 0.25 * this.resources[2]); this.resources[2] = clamp(this.resources[2] - 0.018); bonus = 0.04 * (1 - h.materials); a.x = 6; a.y = 1; break;
      case 'build':
      case 'plant': {
        const key = action.verb === 'build' ? 'shelters' : 'gardens';
        if (h.materials >= 0.3 && h[key] < 5) { h.materials -= 0.3; h[key]++; bonus = 0.12 / Math.sqrt(h[key]); this.stats.built++; detail = `added ${key === 'shelters' ? 'shelter' : 'garden'} ${h[key]}`; }
        else valid = false;
        a.x = (a.family ? 9 : 2) + h[key] % 2; a.y = key === 'shelters' ? 2 : 5;
        break;
      }
      case 'study': {
        const packet = this.packets.find(p => !a.known.includes(p.id));
        if (packet) { a.known.push(packet.id); bonus = 0.045; detail = `read ${packet.noun} → ${packet.verb} (hypothesis)`; } else valid = false;
        a.x = 6; a.y = 3; break;
      }
      case 'help':
        if (b && a.needs[0] > 0.35 && b.needs[0] < 0.85) {
          const amount = Math.min(0.12, a.needs[0] - 0.2, 1 - b.needs[0]);
          a.needs[0] -= amount; b.needs[0] += amount; this.stats.help++;
          const recovery = Math.max(0, otherBefore - drive(b.needs));
          if (this.options.memory) {
            const old = b.bonds[a.id] ?? { value: 0.5, count: 0 };
            b.bonds[a.id] = { value: 0.9 * old.value + 0.1 * sigmoid(25 * recovery), count: old.count + 1 };
          }
          detail = `shared with ${b.name}`; a.x = b.x; a.y = b.y;
        } else valid = false;
        break;
      case 'teach': {
        const packet = b && a.known.find(id => !b.known.includes(id));
        const example = a.replay.at(-1);
        if (b && (packet || example)) {
          if (packet) { b.known.push(packet); bonus += 0.035; }
          if (example && this.options.learning && this.options.training) b.brain.train(example.x, example.y);
          if (a.lastMessage && a.lastMeaning) b.language.learnFromDemonstration(a.lastMessage, a.lastMeaning);
          this.stats.taught++; detail = `taught ${b.name}`;
        } else valid = false;
        break;
      }
      case 'welcome':
        if (!h.welcomed && h.shelters >= 2 && h.gardens >= 2 && h.materials >= 0.4 && mean(a.needs) > 0.55) {
          h.materials -= 0.4; h.welcomed = true; this.addAgent(a.family ? 'Elm' : 'Ash', a.family, 'novice'); this.stats.welcomed++; bonus = 0.12; detail = 'welcomed a new learner';
        } else valid = false;
        break;
    }
    if (!valid) detail = `${action.verb}: conditions unmet`;
    // Care and infrastructure are explicit motives. They are NOT emergent emotion.
    // Identical care coefficient for every recipient, independent of family label.
    const careShare = this.options.adaptiveAttention ? relationshipAttention(effectiveComplexity(a.contexts)) : 1;
    const reward = clamp(drive(before) - drive(a.needs) + (b ? 0.9 * careShare * (otherBefore - drive(b.needs)) : 0) + bonus - (valid ? 0 : 0.05), -0.24, 0.24);
    const y = [0.5 + 2 * reward, ...a.needs.map((v, j) => clamp(0.5 + (logit(v) - logit(before[j])) / 3))];
    this.stats.predictionSSE += mean(y.map((v, j) => (v - prediction[j]) ** 2));
    if (this.options.training && this.options.learning) {
      a.brain.train(x, y);
      for (let k = 0; k < 3 && a.replay.length; k++) { const e = a.replay[Math.floor(this.replayRng() * a.replay.length)]; a.brain.train(e.x, e.y); }
    }
    a.replay.push({ x, y }); if (a.replay.length > 256) a.replay.shift();
    a.experiences++; a.last = detail;
    if (this.options.memory) {
      a.slow = a.slow.map((v, j) => 0.97 * v + 0.03 * a.needs[j]);
      a.surprise = 0.9 * a.surprise + 0.1 * clamp(Math.abs(y[0] - prediction[0]) * 5);
      a.relief = 0.9 * a.relief + 0.1 * sigmoid(20 * reward);
      const context = before.map(v => Math.min(2, Math.floor(v * 3))).join('') + ':' + action.verb;
      a.contexts[context] = (a.contexts[context] ?? 0) + 1;
      // Sequence lives in a circular history; scalar code is only an encoding
      // of accumulated utility, not a sufficient state or a meaning claim.
      const code = mobiusTranslate(a.wordCodes[action.verb] ?? 0, Math.tanh(0.2 * reward));
      a.wordCodes[action.verb] = code;
      a.rings.push({ tick: this.tick, noun: this.packets.find(p => p.verb === action.verb)?.noun ?? 'unknown', verb: action.verb, target: b?.name ?? this.homes[a.family].name, code, word: a.language.lexicon.get(meaning.object)! });
      if (a.rings.length > 32) a.rings.shift();
    }
    this.stats.actions++; this.stats.reward += reward;
    const event: Event = { tick: this.tick, actor: a.name, action: action.verb, target: b?.name ?? null, status: 'observed-in-simulation', detail, reward, language: message, succeeded: valid };
    this.events.push(event); a.journal.push(event); if (a.journal.length > 256) a.journal.shift();
    if (b && valid) { b.journal.push(event); if (b.journal.length > 256) b.journal.shift(); }
    a.lastMessage = message; a.lastMeaning = meaning;
    if (this.events.length > 1000) this.events.shift();
    return { x, y, prediction, reward };
  }
  interpretCommand(a: Agent, message: Utterance): Action {
    const meaning = this.interpreter.understand(message);
    if (meaning.subject !== `agent:${a.id}` || message.dialect !== a.language.id) throw new Error('A command cannot impersonate another agent.');
    const verb = meaning.verb.slice(5) as Verb;
    if (!VERBS.includes(verb)) throw new Error('Language cannot invent executable physics.');
    if (verb === 'help' || verb === 'teach') {
      const target = Number(meaning.object.slice(6));
      if (!meaning.object.startsWith('agent:') || !Number.isInteger(target) || !this.agents[target] || target === a.id) throw new Error('Unknown recipient.');
      return { verb, target };
    }
    if (meaning.object !== `noun:${ENCYCLOPEDIA.find(p => p.verb === verb)!.noun}`) throw new Error('This verb is not grounded for that object.');
    return { verb };
  }
  describeAgent(id: number) {
    const a = this.agents[id]; if (!a) throw new Error('Unknown observer.');
    const h = this.homes[a.family], helpers = Object.entries(a.bonds).map(([key, value]) => `${this.agents[Number(key)]?.name ?? 'unknown'} (${value.count} times)`);
    const own = a.journal.filter(e => e.actor === a.name && e.succeeded);
    return { status: 'record-backed simulator description', tick: this.tick, observer: a.name,
      text: `I am ${a.name} in ${h.name}. At step ${this.tick}, I can observe ${h.shelters} shelters and ${h.gardens} gardens in my household. My nutrition, hydration and energy are ${a.needs.map(v => `${Math.round(v * 100)}%`).join(', ')}. I have experienced ${a.experiences} actions and coined ${a.language.lexicon.size} words. In my retained journal I completed ${own.filter(e => e.action === 'build' || e.action === 'plant').length} construction actions. I remember receiving help from ${helpers.length ? helpers.join('; ') : 'nobody yet'}. My latest command is ${a.lastMessage ? a.lastMessage.words.join(' ') : 'not yet written'}.`,
      evidence: { journalRecords: a.journal.length, firstRetainedTick: a.journal[0]?.tick ?? null, currentObservationTick: this.tick, lifetimeActions: a.experiences },
      unknown: ['Events outside my observations or retained record.', 'Whether an imported reading claim is true beyond this simulator.', 'What another agent privately experiences.'],
    };
  }
  step(count = 1) {
    if (!Number.isInteger(count) || count < 1 || count > 5000) throw new Error('Step count must be 1–5000.');
    for (let k = 0; k < count; k++) {
      this.tick++;
      // Exogenous streams have fixed draws per tick, independent of actions.
      const weather = this.weatherRng();
      const wet = this.drought ? 0.28 : 0.82 + 0.12 * Math.sin(this.tick / 43);
      this.resources = this.resources.map((v, i) => clamp(v + (i === 1 ? 0.065 * wet : 0.05) + 0.003 * (weather - 0.5)));
      for (const a of this.agents) {
        const h = this.homes[a.family];
        const decay = [-0.08 + 0.065 * cover(h.gardens), -0.095 * (this.drought ? 1.4 : 1), -0.035 * (1 - 0.55 * cover(h.shelters))];
        a.needs = a.needs.map((v, i) => (1 + mobiusTranslate(2 * clamp(v, 1e-6, 1 - 1e-6) - 1, Math.tanh(decay[i] / 2))) / 2);
      }
      const order = [...this.agents];
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      for (const a of order) this.act(a, this.choose(a));
    }
    return this.snapshot();
  }
  forgetRelationships() { for (const a of this.agents) a.bonds = {}; }
  importPackets(text: string) {
    const packets = parseKnowledge(text);
    const existing = new Set(this.packets.map(p => p.id));
    if (packets.some(p => existing.has(p.id))) throw new Error('A packet ID already exists.');
    if (this.packets.length + packets.length > 200) throw new Error('The experiment supports 200 packets.');
    this.packets.push(...packets);
  }
  checkpoint() {
    return { version: FAMILY_WORLD_VERSION, seed: this.seed, streams: { ...this.streams }, tick: this.tick, drought: this.drought,
      options: { ...this.options }, homes: structuredClone(this.homes), resources: [...this.resources], packets: structuredClone(this.packets), events: structuredClone(this.events), stats: { ...this.stats }, interpreter: this.interpreter.checkpoint(),
      agents: this.agents.map(a => ({ ...structuredClone({ ...a, brain: undefined, language: undefined }), brain: { sizes: [...a.brain.sizes], weights: structuredClone(a.brain.weights), updates: a.brain.updates }, language: a.language.checkpoint() })) };
  }
  static restore(raw: unknown) {
    // Restore local simulation data, not attested evidence about an external world.
    const serialized = JSON.stringify(raw);
    if (serialized.length > 5_000_000) throw new Error('World checkpoint exceeds 5 MB.');
    const d = JSON.parse(serialized) as ReturnType<FamilyWorld['checkpoint']>;
    const inRange = (n: unknown, lo: number, hi: number) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
    const bounded = (xs: unknown, size: number) => Array.isArray(xs) && xs.length === size && xs.every(x => inRange(x, 0, 1));
    const inspect = (v: unknown, depth = 0): void => { if (depth > 12) throw new Error('Invalid checkpoint nesting.'); if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Nonfinite checkpoint value.'); if (v && typeof v === 'object') for (const x of Object.values(v)) inspect(x, depth + 1); };
    inspect(d);
    if (!d || d.version !== FAMILY_WORLD_VERSION || !Number.isInteger(d.tick) || d.tick < 0 || d.tick > 1e9 || typeof d.drought !== 'boolean' || !d.options || !Array.isArray(d.agents) || d.agents.length < 6 || d.agents.length > 8 || !bounded(d.resources, 3) || !Array.isArray(d.homes) || d.homes.length !== 2 || !Array.isArray(d.events) || d.events.length > 1000) throw new Error('Invalid world checkpoint.');
    if (!['stacked', 'linear'].includes(d.options.architecture) || !['learned', 'random'].includes(d.options.policy) || ['learning', 'memory', 'training', 'adaptiveAttention'].some(k => typeof d.options[k as keyof WorldOptions] !== 'boolean')) throw new Error('Invalid saved world options.');
    if (!d.streams || ['policy', 'model', 'weather', 'replay'].some(k => !Number.isInteger(d.streams[k as keyof typeof d.streams]) || !inRange(d.streams[k as keyof typeof d.streams], 0, 0xffffffff))) throw new Error('Invalid random streams.');
    for (const h of d.homes) if (!inRange(h.materials, 0, 1) || !Number.isInteger(h.shelters) || !inRange(h.shelters, 0, 5) || !Number.isInteger(h.gardens) || !inRange(h.gardens, 0, 5) || typeof h.welcomed !== 'boolean') throw new Error('Invalid household.');
    const out = new FamilyWorld(d.seed, d.options);
    out.agents = d.agents.map((a, id) => {
      if (a.id !== id || ![0, 1].includes(a.family) || typeof a.name !== 'string' || a.name.length > 40 || !bounded(a.needs, 3) || !bounded(a.slow, 3) || !inRange(a.surprise, 0, 1) || !inRange(a.relief, 0, 1) || !Array.isArray(a.replay) || a.replay.length > 256 || !Array.isArray(a.rings) || a.rings.length > 32 || !Array.isArray(a.journal) || a.journal.length > 256) throw new Error('Invalid saved agent.');
      const brain = new SigmoidLearner(34, random(1), 4, d.options.architecture === 'linear' ? [] : [20, 12]);
      if (JSON.stringify(a.brain.sizes) !== JSON.stringify(brain.sizes) || !Array.isArray(a.brain.weights) || a.brain.weights.length !== brain.weights.length || a.brain.weights.some((layer, l) => !Array.isArray(layer) || layer.length !== brain.weights[l].length || layer.some(w => !Array.isArray(w) || w.length !== brain.sizes[l] + 1 || w.some(v => !inRange(v, -1e6, 1e6))))) throw new Error('Invalid learned parameters.');
      if (a.replay.some(e => !Array.isArray(e.x) || e.x.length !== 34 || e.x.some(v => !inRange(v, -1, 1)) || !bounded(e.y, 4))) throw new Error('Invalid experience memory.');
      if (!a.contexts || Object.values(a.contexts).some(v => !Number.isInteger(v) || !inRange(v, 1, 1e9)) || !a.wordCodes || Object.values(a.wordCodes).some(v => !inRange(v, -1 + 1e-12, 1 - 1e-12))) throw new Error('Invalid bounded history.');
      if (!a.bonds || Object.entries(a.bonds).some(([key, b]) => !d.agents[Number(key)] || !inRange(b.value, 0, 1) || !Number.isInteger(b.count) || b.count < 0)) throw new Error('Invalid relationship history.');
      brain.weights = a.brain.weights; brain.updates = a.brain.updates;
      return { ...a, brain, language: GroundedDialect.restore(a.language) } as Agent;
    });
    Object.assign(out, { streams: d.streams, tick: d.tick, drought: d.drought, homes: d.homes, resources: d.resources, packets: parseKnowledge(JSON.stringify(d.packets)), events: d.events, stats: d.stats, interpreter: GroundedDialect.restore(d.interpreter) });
    if (ENCYCLOPEDIA.some(p => !out.packets.some(q => q.id === p.id && q.noun === p.noun && q.verb === p.verb))) throw new Error('Missing world ontology.');
    for (const a of out.agents) { out.features(a, { verb: 'rest' }); if (a.lastMessage) out.interpretCommand(a, a.lastMessage); }
    return out;
  }
  snapshot() {
    return { version: FAMILY_WORLD_VERSION, seed: this.seed, tick: this.tick, drought: this.drought, options: { ...this.options },
      homes: this.homes.map(h => ({ ...h })), resources: [...this.resources],
      agents: this.agents.map(a => ({ id: a.id, name: a.name, family: a.family, role: a.role, needs: [...a.needs], slow: [...a.slow], surprise: a.surprise, relief: a.relief, known: a.known.length, experiences: a.experiences, updates: a.brain.updates, last: a.last, x: a.x, y: a.y, complexity: effectiveComplexity(a.contexts), careShare: this.options.adaptiveAttention ? relationshipAttention(effectiveComplexity(a.contexts)) : 1, wordCodes: { ...a.wordCodes }, rings: a.rings.slice(-12), language: a.language.snapshot(), lastMessage: a.lastMessage, journalCount: a.journal.length, bonds: Object.entries(a.bonds).map(([id, b]) => ({ id: Number(id), ...b, weight: allocateRelationships(a.bonds, effectiveComplexity(a.contexts), this.options.adaptiveAttention)[id] })) })),
      metrics: { meanDeficit: mean(this.agents.map(a => drive(a.needs))), ...this.stats }, events: this.events.slice(-8) };
  }
}

/** Controlled partner probe, SEPARATE from the household simulation.
 * Equal current observations, different experienced partner reliability.
 * A Beta(1,1) predictor and an identity-blind pooled control receive the same data.
 * Utility of requesting help is .4*p - cost. No kinship bonus exists.
 */
export function partnerProbe(seed: number, equalPartners = false, cost = 0.08) {
  const rng = random(seed), p = equalPartners ? [0.55, 0.55] : [0.9, 0.2];
  if (rng() < 0.5) p.reverse();
  const counts = [[1, 1], [1, 1]];
  for (let t = 0; t < 160; t++) { const j = t % 2, y = rng() < p[j] ? 1 : 0; counts[j][0] += y; counts[j][1] += 1 - y; }
  const estimates = counts.map(([a, b]) => a / (a + b));
  const pooled = (counts[0][0] + counts[1][0] - 1) / (counts.flat().reduce((a, b) => a + b) - 2);
  let remembered = 0, erased = 0;
  for (let t = 0; t < 400; t++) { const j = t % 2, y = rng() < p[j] ? 1 : 0; remembered += (estimates[j] - y) ** 2; erased += (pooled - y) ** 2; }
  const good = p[0] >= p[1] ? 0 : 1;
  const preference = sigmoid(20 * 0.4 * (estimates[good] - estimates[1 - good]));
  return { trueReliability: p, estimates, brierRemembered: remembered / 400, brierErased: erased / 400, preference, requestValue: 0.4 * estimates[good] - cost, request: 0.4 * estimates[good] > cost, cost };
}
