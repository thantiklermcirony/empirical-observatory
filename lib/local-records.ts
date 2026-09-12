import { validateRecord, type ExperimentRecord } from './engine/records.ts';

export const RECORDS_KEY = 'observatory-records-v1';
type RecordStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function mergeLocalRecords(persisted: ExperimentRecord[], pending: ExperimentRecord[]): ExperimentRecord[] {
  const pendingIds = new Set(pending.map(record => record.id));
  return [...pending, ...persisted.filter(record => !pendingIds.has(record.id))].slice(0, 30);
}

export function readLocalRecords(storage: RecordStorage): ExperimentRecord[] {
  const raw: unknown = JSON.parse(storage.getItem(RECORDS_KEY) ?? '[]');
  if (!Array.isArray(raw)) throw new Error('Invalid local logbook.');
  return raw.slice(0, 30).flatMap(value => {
    try { return [validateRecord(value)]; } catch { return []; }
  });
}

/** Call inside the shared browser lock; read immediately before writing. */
export function appendLocalRecord(storage: RecordStorage, value: ExperimentRecord): ExperimentRecord[] {
  const record = validateRecord(value);
  const records = [record, ...readLocalRecords(storage).filter(item => item.id !== record.id)].slice(0, 30);
  storage.setItem(RECORDS_KEY, JSON.stringify(records));
  return records;
}
