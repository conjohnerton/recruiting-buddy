import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { hashStr, normalizeUrl, searchDedupeKey, capArray } from '../src/dedupe.ts';
import { backoffMs } from '../src/timing.ts';

const NOON = Date.UTC(2026, 8, 22, 13, 0, 0);

describe('recruiter avoids double-logging the same search', () => {
  it('given the same URL twice in one minute, when fingerprinted, then the keys match', () => {
    assert.equal(searchDedupeKey('https://a.com/s', NOON), searchDedupeKey('https://a.com/s', NOON + 59000));
  });
  it('given the same search re-run an hour later, when fingerprinted, then the keys differ', () => {
    assert.notEqual(searchDedupeKey('https://a.com/s', NOON), searchDedupeKey('https://a.com/s', NOON + 3600000));
  });
  it('given a URL with a page anchor, when fingerprinted, then the anchor is ignored', () => {
    assert.equal(searchDedupeKey('https://a.com/s#x', NOON), searchDedupeKey('https://a.com/s#y', NOON));
  });
  it('given different searches, when fingerprinted, then the keys differ', () => {
    assert.notEqual(searchDedupeKey('https://a.com/1', NOON), searchDedupeKey('https://a.com/2', NOON));
  });
  it('given garbage input, when normalized, then it passes through instead of throwing', () => {
    assert.equal(normalizeUrl('not a url'), 'not a url');
  });
});

describe('fingerprints stay stable and distinct', () => {
  it('given the same text, when hashed, then the hash is deterministic 8-hex', () => {
    assert.equal(hashStr('abc'), hashStr('abc'));
    assert.match(hashStr('x'), /^[0-9a-f]{8}$/);
  });
  it('given different text, when hashed, then the hashes differ', () => {
    assert.notEqual(hashStr('abc'), hashStr('abd'));
  });
});

describe('remembered searches stay bounded', () => {
  it('given more than the cap, when recorded, then oldest are forgotten', () => {
    assert.deepEqual(capArray([1, 2, 3, 4], 2), [3, 4]);
  });
  it('given fewer than the cap, when recorded, then nothing is dropped', () => {
    assert.deepEqual(capArray([1], 1000), [1]);
  });
});

describe('retries back off without hammering HubSpot', () => {
  it('given attempts 1-5+, when scheduled, then waits double 5s→60s and cap', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(backoffMs), [5000, 10000, 20000, 40000, 60000, 60000, 60000]);
  });
});
