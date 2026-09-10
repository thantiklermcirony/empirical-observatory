import test from 'node:test';
import assert from 'node:assert/strict';
import { parseForecastFeed } from '../lib/forecast-feed.ts';
const record = {
  status: 'Collecting',
  detail: 'Official provider forecasts',
  capturedAt: '2026-09-10T12:10:00Z',
  records: [
    {
      issuedAt: '2026-09-10T12:10:00Z',
      start: '2026-09-11T12:30:00Z',
      end: '2026-09-11T13:00:00Z',
      forecast: 120,
      actual: null,
      leadHours: 24 + 1 / 3,
    },
  ],
  resolved: 0,
  missed: 0,
};
void test('preserves an unresolved official forecast and precise lead', () => {
  assert.equal(parseForecastFeed(record).records[0].actual, null);
});
void test('rejects mismatched lead and nonfinite or malformed values', () => {
  for (const patch of [
    { leadHours: 24 },
    { forecast: Infinity },
    { actual: -1 },
    { start: 'yesterday' },
    { issuedAt: '2026-09-12T00:00:00Z' },
  ])
    assert.throws(() =>
      parseForecastFeed({
        ...record,
        records: [{ ...record.records[0], ...patch }],
      }),
    );
});
void test('rejects invalid counters and accepts no captures honestly', () => {
  assert.throws(() => parseForecastFeed({ ...record, missed: -1 }));
  assert.equal(
    parseForecastFeed({ ...record, capturedAt: null, records: [] }).capturedAt,
    null,
  );
});
