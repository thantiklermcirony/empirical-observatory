import test from 'node:test';
import assert from 'node:assert/strict';
import { record } from '../lib/engine/records.ts';
import { appendLocalRecord, mergeLocalRecords, readLocalRecords } from '../lib/local-records.ts';

const fixture = () => record('quantum', 'simulation', 17, {noise:0.12,budget:96,guess:'0'}, [], {}, false);
const memory = () => {
  let value: string | null = null;
  return {getItem: () => value, setItem: (_key: string, next: string) => {value = next;}};
};

void test('separate retained instruments preserve the latest shared logbook', () => {
  const storage = memory();
  const first = fixture(), second = fixture(), third = fixture();
  assert.deepEqual(readLocalRecords(storage), []);
  assert.deepEqual(readLocalRecords(storage), []); // Both instruments initially empty.
  appendLocalRecord(storage, first);
  appendLocalRecord(storage, second);
  assert.deepEqual(appendLocalRecord(storage, third).map(r => r.id), [third.id, second.id, first.id]);
  assert.deepEqual(appendLocalRecord(storage, first).map(r => r.id), [first.id, third.id, second.id]);
});

void test('unreadable history is not overwritten by a new save', () => {
  const storage = memory();
  storage.setItem('', '{broken');
  assert.throws(() => appendLocalRecord(storage, fixture()));
  assert.equal(storage.getItem(), '{broken');
});

void test('a failed save stays visible when another instrument saves or refreshes', () => {
  const storage = memory(), unsaved = fixture(), saved = fixture();
  const failing = {getItem: storage.getItem, setItem: () => {throw new Error('quota');}};
  assert.throws(() => appendLocalRecord(failing, unsaved));
  const pending = [unsaved];
  const persisted = appendLocalRecord(storage, saved);
  assert.deepEqual(mergeLocalRecords(persisted, pending).map(r => r.id), [unsaved.id, saved.id]);
  assert.deepEqual(mergeLocalRecords(readLocalRecords(storage), pending).map(r => r.id), [unsaved.id, saved.id]);
});
