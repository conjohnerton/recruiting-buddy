'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/lib/util.js');
const RB = require('../extension/lib/store.js');

describe('hasHash/recordHash', () => {
  it('records then finds', () => {
    const logged = [];
    assert.equal(RB.hasHash(logged, 'k'), false);
    RB.recordHash(logged, 'k');
    assert.equal(RB.hasHash(logged, 'k'), true);
  });
  it('caps at 1000, oldest dropped', () => {
    const logged = [];
    for (let i = 0; i < 1005; i++) RB.recordHash(logged, 'k' + i);
    assert.equal(logged.length, 1000);
    assert.equal(RB.hasHash(logged, 'k0'), false);
    assert.equal(RB.hasHash(logged, 'k1004'), true);
  });
});

describe('enqueue', () => {
  it('caps queue at 200', () => {
    const q = [];
    for (let i = 0; i < 205; i++) RB.enqueue(q, { id: String(i) });
    assert.equal(q.length, 200);
    assert.equal(q[0].id, '5');
  });
});

describe('dequeueDue', () => {
  it('splits due (<= now) from future', () => {
    const q = [{ id: 'a', nextRunMs: 100 }, { id: 'b', nextRunMs: 200 }, { id: 'c', nextRunMs: 300 }];
    const { due, rest } = RB.dequeueDue(q, 200);
    assert.deepEqual(due.map((e) => e.id), ['a', 'b']);
    assert.deepEqual(rest.map((e) => e.id), ['c']);
  });
});

describe('makeRetryEntry/scheduleRetry', () => {
  it('first attempt schedules +5s', () => {
    const e = RB.makeRetryEntry('id1', { x: 1 }, 100000, new Error('boom'));
    assert.equal(e.attempt, 1);
    assert.equal(e.nextRunMs, 105000);
    assert.match(e.lastError, /boom/);
  });
  it('retry bumps attempt and doubles backoff', () => {
    const e = RB.makeRetryEntry('id1', {}, 100000, 'x');
    const n = RB.scheduleRetry(e, 100000);
    assert.equal(n.attempt, 2);
    assert.equal(n.nextRunMs, 110000);
    assert.equal(e.attempt, 1);
  });
});
