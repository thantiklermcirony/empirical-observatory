import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reason } from '../lib/engine/reasoning.ts';
import type { Need } from '../lib/engine/reasoning.ts';
import { REASONING_EXAMPLES } from '../lib/engine/reasoning-examples.ts';
const tree = (n: Need | null): Need[] => n ? [n, ...n.children.flatMap(tree)] : [];
const carry = 'Rule: ?x | inside | ?box & ?box | at | ?place -> ?x | at | ?place';

void test('answers changed nouns and locations from supplied premises, with a proof', () => {
  for (const [object, container, place] of [['orb', 'capsule', 'hangar'], ['letter', 'satchel', 'boat'], ['violet triangle', 'green box', 'laboratory']]) {
    const r = reason({prompt: `The ${object} is inside the ${container}. The ${container} is at the ${place}.\n${carry}\nWhere is the ${object}?`});
    assert.equal(r.status, 'answered');
    assert.deepEqual(r.answers.map(x => x.statement), [[object, 'at', place]]);
    assert.equal(r.answers[0].parents.length, 2);
    assert.equal(r.answers[0].source, 'derived');
  }
});
void test('recursion agrees with an independent reachability oracle on all three-node directed graphs', () => {
  const pairs = [[0,1],[0,2],[1,0],[1,2],[2,0],[2,1]];
  for (let mask = 0; mask < 64; mask++) {
    const edges = pairs.filter((_, i) => mask & (1 << i));
    const reached = new Set<number>();
    const queue = [0];
    for (let i = 0; i < queue.length; i++) for (const [a,b] of edges) if (a === queue[i] && !reached.has(b)) { reached.add(b); queue.push(b); }
    const prompt = [...edges.map(([a,b]) => `Fact: n${a} | reaches | n${b}`), 'Rule: ?x | reaches | ?y & ?y | reaches | ?z -> ?x | reaches | ?z', 'Ask: n0 | reaches | ?target'].join('\n');
    const r = reason({ prompt });
    assert.notEqual(r.status, 'budget');
    assert.deepEqual(r.answers.map(a => a.statement[2]).sort(), [...reached].map(x => `n${x}`).sort());
  }
});
void test('a later observation closes the specific gap using session memory', () => {
  const first = reason({ prompt: REASONING_EXAMPLES[1].prompt });
  assert.equal(first.status, 'gap');
  assert.deepEqual(tree(first.needs).filter(n => n.state === 'missing').map(n => n.statement), [['van', 'at', '?where']]);
  const next = reason({ prompt: 'The van is at the depot. Where is the parcel?', notebook: first.notebook });
  assert.deepEqual(next.answers.map(a => a.statement), [['parcel', 'at', 'depot']]);
});
void test('retraction removes stale deductions without erasing unrelated facts', () => {
  const before = reason({ prompt: REASONING_EXAMPLES[0].prompt });
  const after = reason({ notebook: before.notebook, prompt: 'Forget: box | at | shelf\nThe box is at the floor. Where is the ball?' });
  assert.deepEqual(after.answers.map(a => a.statement), [['ball', 'at', 'floor']]);
  assert.ok(after.notebook.facts.some(f => f[1] === 'inside'));
  const removed = reason({ notebook: after.notebook, prompt: 'Forget: ball | inside | box\nWhere is the ball?' });
  assert.equal(removed.status, 'gap');
  assert.equal(removed.answers.length, 0);
});
void test('unknown language, negation, modal statements and unsupported questions save nothing', () => {
  for (const clause of ['The ball is not red.', 'The ball might be red.', 'Why is the hammer red?', 'How can we invent an AI?', 'The ball is red or blue.']) {
    const r = reason({ prompt: `The box is blue. ${clause}` });
    assert.equal(r.status, 'interpretation-needed', clause);
    assert.equal(r.notebook.facts.length, 0);
    assert.equal(r.proofs.length, 0);
  }
});
void test('multiple questions and unbound rule outputs cannot silently run', () => {
  assert.equal(reason({prompt: 'Where is the ball? What is the ball?'}).status, 'interpretation-needed');
  assert.equal(reason({prompt: 'Rule: ?x | is | red -> ?y | is | blue\nAsk: ball | is | blue'}).status, 'interpretation-needed');
});
void test('duplicate evidence and repeated queries do not fabricate new support', () => {
  const r = reason({ prompt: 'The ball is red. The ball is red. What is the ball?' });
  const again = reason({ prompt: 'What is the ball?', notebook: r.notebook });
  assert.equal(r.proofs.length, 1);
  assert.deepEqual(r.answers, again.answers);
});
void test('alternatives remain explicit and a cyclic rule does not prove itself', () => {
  const r = reason({ prompt: 'Rule: x | has | a -> x | has | goal\nRule: x | has | b -> x | has | goal\nAsk: x | has | goal' });
  assert.equal(r.status, 'gap');
  assert.equal(r.needs!.children.length, 2);
  assert.deepEqual(r.needs!.children.map(n => n.rule), [1,2]);
  const cycle = reason({ prompt: 'Rule: x | has | a -> x | has | b\nRule: x | has | b -> x | has | a\nAsk: x | has | a' });
  assert.equal(cycle.answers.length, 0);
  assert.ok(tree(cycle.needs).some(n => n.state === 'cycle'));
});
void test('multiple locations are returned without inventing functional uniqueness', () => {
  const r = reason({prompt: 'The ball is at the shelf. The ball is at the floor. Where is the ball?'});
  assert.equal(r.answers.length, 2);
});
void test('budget exhaustion is incomplete, with no rule or fact fabrication', () => {
  const r = reason({ prompt: REASONING_EXAMPLES[0].prompt, maxOperations: 1 });
  assert.equal(r.status, 'budget');
  assert.equal(r.operations, 1);
  assert.equal(r.answers.length, 0);
  assert.throws(() => reason({prompt: 'x', maxOperations: Infinity}));
  assert.throws(() => reason({prompt: 'x'.repeat(8001)}));
  assert.throws(() => reason({prompt: 'What is x?', notebook: {facts: [['?x', 'is', 'red']], rules: []}}));
});
void test('AI-design run exposes authored dependencies; it does not announce invented AI', () => {
  const r = reason({ prompt: REASONING_EXAMPLES[2].prompt });
  assert.equal(r.status, 'gap');
  assert.ok(r.proofs.some(p => p.statement[2] === 'answer supported questions'));
  assert.deepEqual(tree(r.needs).filter(n => n.state === 'missing').map(n => n.statement[2]).sort(), ['grounded feedback', 'candidate rule generator', 'held-out evaluation', 'revision and rollback', 'persistent learned world model'].sort());
  assert.equal(r.answers.length, 0);
});
