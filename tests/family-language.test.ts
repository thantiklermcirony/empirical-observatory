import test from 'node:test';
import assert from 'node:assert/strict';
import { GroundedDialect, languageProbe } from '../lib/engine/family-language.ts';
import { FamilyWorld } from '../lib/engine/family-world.ts';

void test('coined words remain one-to-one across the complete 512-word vocabulary budget', () => {
  const d = new GroundedDialect('a0', 42);
  const words = Array.from({ length: 512 }, (_, i) => d.coin(`noun:${i}`));
  assert.equal(new Set(words).size, 512); assert.throws(() => d.coin('noun:overflow'));
});
void test('an independent listener understands novel compositions only after grounding', () => {
  const result = languageProbe(); assert.ok(result.unknownBlocked); assert.equal(result.correct, result.total);
});
void test('contradictory demonstrations fail without partially changing the dictionary', () => {
  const a = new GroundedDialect('a0', 3), b = new GroundedDialect('a1', 4);
  const meaning = { subject: 'agent:0', verb: 'verb:drink', object: 'noun:water' };
  const message = a.speak(meaning); b.learnFromDemonstration(message, meaning);
  const before = [...b.bindings];
  assert.throws(() => b.learnFromDemonstration(message, { ...meaning, object: 'noun:fire' }));
  assert.deepEqual([...b.bindings], before);
});
void test('finite grammar search reduces or preserves its declared coding score', () => {
  const d = new GroundedDialect('a0', 4); d.order = 'VSO';
  for (let i = 0; i < 7; i++) d.speak({ subject: 'agent:0', verb: `verb:v${i % 3}`, object: `noun:n${i % 3}` });
  const before = d.grammarCost(d.order); d.chooseGrammar();
  assert.ok(d.grammarCost(d.order) <= before); assert.notEqual(d.order, 'VSO');
});
void test('coined language controls a world action and cannot impersonate another actor', () => {
  const w = new FamilyWorld(1), [a, b] = w.agents; w.act(a, { verb: 'drink' });
  assert.ok(a.lastMessage); assert.deepEqual(w.interpretCommand(a, a.lastMessage!), { verb: 'drink' });
  assert.throws(() => w.interpretCommand(b, a.lastMessage!));
});
void test('first-person reports cite recorded events and preserve unknowns', () => {
  const w = new FamilyWorld(1); w.step(12); const report = w.describeAgent(0);
  assert.equal(report.evidence.lifetimeActions, 12); assert.ok(report.unknown.length >= 1); assert.equal(report.tick, 12);
});
