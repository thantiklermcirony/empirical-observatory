import {
  actions,
  chooseAction,
  keyedUniform,
  measure,
  replay,
  validateNotebookEntry,
} from './discovery.ts';
import type { NotebookEntry, Observation } from './discovery.ts';

/** Checks deterministic simulation consistency, not authorship or real-world truth. */
export async function verifyNotebookEntry(
  value: unknown,
): Promise<NotebookEntry> {
  const record = validateNotebookEntry(value);
  const history: Observation[] = [];
  for (const event of record.history) {
    const action = actions.find((a) => a.id === event.action)!;
    if (record.policy !== 'manual') {
      const state = replay(history);
      const draw = await keyedUniform(
        'adaptive-v1|' +
          record.seed +
          '|policy|' +
          record.policy +
          '|' +
          history.length,
      );
      const expected = chooseAction(
        record.policy,
        state.belief,
        state.remaining,
        draw,
      );
      if (expected?.id !== event.action)
        throw new Error(
          'Record does not follow its declared exploration rule.',
        );
    }
    const outcome = await measure(
      record.seed,
      action,
      history.filter((e) => e.action === action.id).length,
    );
    if (outcome !== event.outcome)
      throw new Error('Record does not match the declared simulation seed.');
    history.push(event);
  }
  return record;
}
