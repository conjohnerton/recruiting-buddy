'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/lib/util.js');
const RB = require('../extension/lib/search-note.js');

const AT = Date.UTC(2026, 8, 22, 13, 0, 0);

describe('parseLinkedInSearch', () => {
  it('extracts keywords/title/company/location', () => {
    const u = 'https://www.linkedin.com/search/results/people/?keywords=icu%20nurse&title=RN&company=HCA&location=Texas';
    assert.deepEqual(RB.parseLinkedInSearch(u), { keywords: 'icu nurse', title: 'RN', company: 'HCA', location: 'Texas' });
  });
  it('missing params default to empty string', () => {
    assert.deepEqual(RB.parseLinkedInSearch('https://www.linkedin.com/search/results/people/'), {
      keywords: '', title: '', company: '', location: '',
    });
  });
  it('garbage URL never throws', () => {
    assert.deepEqual(RB.parseLinkedInSearch('garbage'), { keywords: '', title: '', company: '', location: '' });
  });
});

describe('buildSearchNoteBody', () => {
  it('full format with count and url', () => {
    assert.equal(
      RB.buildSearchNoteBody({ platform: 'LinkedIn', url: 'https://u', keywords: 'icu nurse', resultCount: 1234, observedAtMs: AT }),
      "Searched LinkedIn at 2026-09-22T13:00:00.000Z: keywords='icu nurse' (1234 results) \u2014 https://u",
    );
  });
  it('omits count when null', () => {
    const s = RB.buildSearchNoteBody({ platform: 'DocCafe', url: 'https://d', keywords: '', resultCount: null, observedAtMs: AT });
    assert.ok(!s.includes('results)'), s);
    assert.ok(s.includes("Searched DocCafe at 2026-09-22T13:00:00.000Z: keywords='' \u2014 https://d"), s);
  });
  it('appends present title/company/location only', () => {
    const s = RB.buildSearchNoteBody({
      platform: 'LinkedIn', url: 'https://u', keywords: 'rn', title: 'RN', company: '', location: 'TX', resultCount: null, observedAtMs: AT,
    });
    assert.ok(s.includes("title='RN'"), s);
    assert.ok(s.includes("location='TX'"), s);
    assert.ok(!s.includes('company='), s);
  });
});

describe('buildNoteProperties', () => {
  it('passes observed time through as ms hs_timestamp', () => {
    const p = RB.buildNoteProperties({ platform: 'LinkedIn', url: 'https://u', keywords: 'k', resultCount: null, observedAtMs: AT });
    assert.equal(p.hs_timestamp, AT);
    assert.equal(typeof p.hs_note_body, 'string');
  });
});
