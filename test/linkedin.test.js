'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/lib/util.js');
require('../extension/lib/search-note.js');
const RB = require('../extension/lib/linkedin-extract.js');

const stub = (texts) => ({
  querySelectorAll: () => texts.map((t) => ({ textContent: t })),
  body: { textContent: '' },
});

describe('extractLinkedInCount', () => {
  it('parses comma counts', () => {
    assert.equal(RB.extractLinkedInCount(stub(['1,234 results'])), 1234);
  });
  it('parses About-N prefix', () => {
    assert.equal(RB.extractLinkedInCount(stub(['About 5,678 results'])), 5678);
  });
  it('singular result', () => {
    assert.equal(RB.extractLinkedInCount(stub(['1 result'])), 1);
  });
  it('null when absent', () => {
    assert.equal(RB.extractLinkedInCount(stub(['People', 'Jobs'])), null);
    assert.equal(RB.extractLinkedInCount(stub([])), null);
  });
  it('never throws on hostile root', () => {
    assert.equal(RB.extractLinkedInCount(null), null);
    assert.equal(RB.extractLinkedInCount({ querySelectorAll: () => { throw new Error('x'); } }), null);
  });
});

describe('buildLinkedInPayload', () => {
  it('fills all contract fields', () => {
    const p = RB.buildLinkedInPayload(
      'https://www.linkedin.com/search/results/people/?keywords=icu%20nurse&location=Texas', 42, 1000);
    assert.deepEqual(p, {
      platform: 'LinkedIn',
      url: 'https://www.linkedin.com/search/results/people/?keywords=icu%20nurse&location=Texas',
      keywords: 'icu nurse', title: '', company: '', location: 'Texas',
      specialty: '', state: '', city: '', jobType: '',
      resultCount: 42, observedAtMs: 1000,
    });
  });
  it('null count, garbage URL', () => {
    const p = RB.buildLinkedInPayload('garbage', null, 5);
    assert.equal(p.keywords, '');
    assert.equal(p.resultCount, null);
    assert.equal(p.platform, 'LinkedIn');
  });
});
