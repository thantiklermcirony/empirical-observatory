import test from 'node:test';
import assert from 'node:assert/strict';
import {
  interestColumns,
  interestSql,
  parseInterest,
  referralCategory,
} from '../lib/interest.ts';

void test('usage payload refuses identity, experiment data, URLs and malformed enums', () => {
  for (const payload of [
    null,
    [],
    {},
    { event: ['page'], page: 'home', entry: 'direct' },
    { event: 'page', page: 'home', entry: 'direct', ip: 'example' },
    { event: 'page', page: 'home', entry: 'direct', results: [1, 2] },
    { event: 'page', page: '/private-query', entry: 'direct' },
    { event: 'source', page: 'home', entry: 'github' },
    {
      event: 'page',
      page: 'home',
      entry: 'github_entries); DROP TABLE daily_interest',
    },
  ]) {
    assert.equal(parseInterest(payload), null);
  }
});

void test('verification events stay outside traffic totals', () => {
  const event = parseInterest({
    event: 'verification',
    page: 'home',
    entry: 'internal',
  });
  assert.ok(event);
  assert.deepEqual(interestColumns(event), ['verification_events']);
  assert.ok(!interestSql(event).includes('page_views'));
});

void test('project entry counts and internal navigation have distinct totals', () => {
  assert.deepEqual(
    interestColumns({ event: 'page', page: 'projects', entry: 'github' }),
    ['page_views', 'project_views', 'github_entries'],
  );
  assert.deepEqual(
    interestColumns({ event: 'page', page: 'home', entry: 'internal' }),
    ['page_views'],
  );
  assert.deepEqual(
    interestColumns({ event: 'lab', page: 'home', entry: 'internal' }),
    ['lab_opens'],
  );
});

void test('only broad referral categories leave the browser', () => {
  const origin = 'https://observatory.example';
  assert.equal(referralCategory('', origin), 'direct');
  assert.equal(
    referralCategory(origin + '/projects?private=value', origin),
    'internal',
  );
  assert.equal(
    referralCategory('https://github.com/a/private?token=secret', origin),
    'github',
  );
  assert.equal(
    referralCategory('https://github.com.attacker.example/', origin),
    'other',
  );
  assert.equal(
    referralCategory('https://www.google.com/search?q=private', origin),
    'search',
  );
  assert.equal(
    referralCategory('https://www.reddit.com/r/science/', origin),
    'social',
  );
  assert.equal(referralCategory('not a URL', origin), 'other');
  for (const host of [
    'google.attacker.example',
    'bingXcom',
    'redditXcom',
    'google.com.attacker.example',
  ]) {
    assert.equal(referralCategory(`https://${host}/`, origin), 'other');
  }
});
