'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/lib/util.js');
require('../extension/lib/search-note.js');
const RB = require('../extension/lib/doccafe-parse.js');

const stub = (texts) => ({
  querySelectorAll: () => texts.map((t) => ({ textContent: t })),
  body: { textContent: '' },
});
const T = '169 Sleep Medicine Physician jobs · DocCafe';

describe('parseDocCafeSearch', () => {
  it('specialty path', () => {
    const p = RB.parseDocCafeSearch('https://www.doccafe.com/physician-jobs/specialty/sleep-medicine', T);
    assert.equal(p.specialty, 'Sleep Medicine');
    assert.equal(p.keywords, 'Sleep Medicine Physician');
    assert.equal(p.state, '');
  });
  it('state+city path', () => {
    const p = RB.parseDocCafeSearch(
      'https://www.doccafe.com/physician-jobs/specialty/sleep-medicine/us/state/ut/city/salt-lake-city', T);
    assert.equal(p.state, 'UT');
    assert.equal(p.city, 'Salt Lake City');
  });
  it('type path', () => {
    const p = RB.parseDocCafeSearch('https://www.doccafe.com/physician-jobs/type/full-time', '300 Full-Time Physician jobs');
    assert.equal(p.jobType, 'Full Time');
  });
  it('job detail page parses empty (no button)', () => {
    const p = RB.parseDocCafeSearch('https://www.doccafe.com/job/physician/sleep-medicine/20415238/x', 'Some Job · DocCafe');
    assert.deepEqual(p, { keywords: '', specialty: '', state: '', city: '', jobType: '' });
  });
  it('garbage URL never throws', () => {
    assert.deepEqual(RB.parseDocCafeSearch('garbage'), { keywords: '', specialty: '', state: '', city: '', jobType: '' });
  });
});

describe('docCafeKeywordsFromTitle', () => {
  it('strips count and jobs suffix', () => {
    assert.equal(RB.docCafeKeywordsFromTitle(T), 'Sleep Medicine Physician');
    assert.equal(RB.docCafeKeywordsFromTitle('1 ICU Nurse job'), 'ICU Nurse');
    assert.equal(RB.docCafeKeywordsFromTitle('DocCafe'), 'DocCafe');
  });
});

describe('extractDocCafeCount', () => {
  it('Displaying-out-of text', () => {
    assert.equal(RB.extractDocCafeCount(stub(['Displaying 1 - 30 jobs out of 169']), T), 169);
  });
  it('title fallback', () => {
    assert.equal(RB.extractDocCafeCount(stub(['nothing']), T), 169);
  });
  it('null when nowhere', () => {
    assert.equal(RB.extractDocCafeCount(stub(['nothing']), 'Physician jobs'), null);
  });
});

describe('buildDocCafePayload', () => {
  it('joins city, state location', () => {
    const p = RB.buildDocCafePayload(
      'https://www.doccafe.com/physician-jobs/specialty/sleep-medicine/us/state/ut/city/salt-lake-city',
      T, 169, 1000);
    assert.equal(p.platform, 'DocCafe');
    assert.equal(p.location, 'Salt Lake City, UT');
    assert.equal(p.specialty, 'Sleep Medicine');
    assert.equal(p.keywords, 'Sleep Medicine Physician');
    assert.equal(p.resultCount, 169);
    assert.equal(p.title, '');
    assert.equal(p.company, '');
  });
});
