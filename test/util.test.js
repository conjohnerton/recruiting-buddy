'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const RB = require('../extension/lib/util.js');

describe('hashStr', () => {
  it('is deterministic', () => {
    assert.equal(RB.hashStr('abc'), RB.hashStr('abc'));
  });
  it('differs across inputs', () => {
    assert.notEqual(RB.hashStr('abc'), RB.hashStr('abd'));
  });
  it('returns 8-hex lowercase', () => {
    assert.match(RB.hashStr('x'), /^[0-9a-f]{8}$/);
  });
});

describe('normalizeUrl', () => {
  it('strips fragments', () => {
    assert.equal(RB.normalizeUrl('https://a.com/p?q=1#frag'), 'https://a.com/p?q=1');
  });
  it('returns garbage unchanged, never throws', () => {
    assert.equal(RB.normalizeUrl('not a url'), 'not a url');
  });
});

describe('searchDedupeKey', () => {
  const base = Date.UTC(2026, 8, 22, 13, 0, 0);
  it('equal within same UTC minute', () => {
    assert.equal(RB.searchDedupeKey('https://a.com/s', base), RB.searchDedupeKey('https://a.com/s', base + 59000));
  });
  it('differs across minute boundary', () => {
    assert.notEqual(RB.searchDedupeKey('https://a.com/s', base), RB.searchDedupeKey('https://a.com/s', base + 60000));
  });
  it('ignores fragments', () => {
    assert.equal(RB.searchDedupeKey('https://a.com/s#x', base), RB.searchDedupeKey('https://a.com/s#y', base));
  });
  it('differs across URLs', () => {
    assert.notEqual(RB.searchDedupeKey('https://a.com/1', base), RB.searchDedupeKey('https://a.com/2', base));
  });
});

describe('capArray', () => {
  it('drops oldest beyond cap', () => {
    assert.deepEqual(RB.capArray([1, 2, 3, 4], 2), [3, 4]);
  });
  it('leaves short arrays alone', () => {
    assert.deepEqual(RB.capArray([1], 1000), [1]);
  });
});

describe('backoffMs', () => {
  it('doubles from 5s and caps at 60s', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(RB.backoffMs), [5000, 10000, 20000, 40000, 60000, 60000, 60000]);
  });
});
