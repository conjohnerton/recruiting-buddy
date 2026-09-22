import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { RETRY_QUEUE_CAP, dueRetries, firstRetry, markLogged, alreadyLogged, nextRetry, parkForRetry } from '../src/retry-queue.ts';
import type { RetryEntry } from '../src/types.ts';

describe('recruiter never sees the same search logged twice', () => {
  it('given a fresh key, when marked, then it is found afterwards', () => {
    const logged: string[] = [];
    assert.equal(alreadyLogged(logged, 'k'), false);
    markLogged(logged, 'k');
    assert.equal(alreadyLogged(logged, 'k'), true);
  });
  it('given a thousand remembered searches, when one more arrives, then the oldest is forgotten', () => {
    const logged: string[] = [];
    for (let i = 0; i < 1005; i++) markLogged(logged, `k${i}`);
    assert.equal(logged.length, 1000);
    assert.equal(alreadyLogged(logged, 'k0'), false);
    assert.equal(alreadyLogged(logged, 'k1004'), true);
  });
});

describe('failed logs wait their turn instead of being lost', () => {
  it('given a park overflow, when queued, then oldest entries are dropped at 200', () => {
    const queue: RetryEntry[] = [];
    for (let i = 0; i < 205; i++) parkForRetry(queue, firstRetry(String(i), { url: `${i}`, observedAtMs: 0 } as never, 0, 'x'));
    assert.equal(queue.length, RETRY_QUEUE_CAP);
    assert.equal(queue[0].id, '5');
  });
  it('given mixed due times, when split, then only due-now (<= now) entries run', () => {
    const at = (id: string, nextRunMs: number) => firstRetry(id, { url: id, observedAtMs: 0 } as never, 0, 'x');
    const q = [at('a', 0), at('b', 0), at('c', 0)].map((e, i) => ({ ...e, nextRunMs: [100, 200, 300][i] }));
    const { due, later } = dueRetries(q, 200);
    assert.deepEqual(due.map((e) => e.id), ['a', 'b']);
    assert.deepEqual(later.map((e) => e.id), ['c']);
  });
  it('given a first failure, when parked, then it waits 5s carrying the error', () => {
    const e = firstRetry('id1', { url: 'u', observedAtMs: 0 } as never, 100000, new Error('boom'));
    assert.equal(e.attempt, 1);
    assert.equal(e.nextRunMs, 105000);
    assert.match(e.lastError, /boom/);
  });
  it('given another failure, when rescheduled, then the attempt rises and the wait doubles', () => {
    const retry = nextRetry(firstRetry('id1', { url: 'u', observedAtMs: 0 } as never, 100000, 'x'), 100000, 'y');
    assert.equal(retry.attempt, 2);
    assert.equal(retry.nextRunMs, 110000);
  });
});
