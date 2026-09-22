import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { docCafeKeywordsFromTitle, docCafeResultCountFromNodes, docCafeSearch, parseDocCafeSearch } from '../src/doccafe.ts';

const TITLE = '169 Sleep Medicine Physician jobs · DocCafe';
const nodes = (texts: string[]) => texts.map((textContent) => ({ textContent }));

describe('recruiter logs a DocCafe specialty search', () => {
  it('given a specialty path, when parsed, then specialty and title keywords come out', () => {
    const f = parseDocCafeSearch('https://www.doccafe.com/physician-jobs/specialty/sleep-medicine', TITLE);
    assert.equal(f.specialty, 'Sleep Medicine');
    assert.equal(f.keywords, 'Sleep Medicine Physician');
  });
  it('given state+city segments, when parsed, then "UT" and "Salt Lake City" come out', () => {
    const f = parseDocCafeSearch('https://www.doccafe.com/physician-jobs/specialty/sleep-medicine/us/state/ut/city/salt-lake-city', TITLE);
    assert.equal(f.state, 'UT');
    assert.equal(f.city, 'Salt Lake City');
  });
  it('given a type segment, when parsed, then the job type is humanized', () => {
    assert.equal(parseDocCafeSearch('https://www.doccafe.com/physician-jobs/type/full-time', '300 Full-Time Physician jobs').jobType, 'Full Time');
  });
  it('given a job detail page, when parsed, then everything is empty so no button appears', () => {
    assert.deepEqual(parseDocCafeSearch('https://www.doccafe.com/job/physician/sleep-medicine/20415238/x', 'Some Job · DocCafe'), {
      keywords: '', specialty: '', state: '', city: '', jobType: '',
    });
  });
  it('given a garbage URL, when parsed, then it yields empties instead of throwing', () => {
    assert.deepEqual(parseDocCafeSearch('garbage'), { keywords: '', specialty: '', state: '', city: '', jobType: '' });
  });
});

describe('recruiter reads the DocCafe title back as keywords', () => {
  it('given a listing title, when stripped, then count, "jobs", and brand fall away', () => {
    assert.equal(docCafeKeywordsFromTitle(TITLE), 'Sleep Medicine Physician');
    assert.equal(docCafeKeywordsFromTitle('1 ICU Nurse job'), 'ICU Nurse');
  });
});

describe('recruiter sees how many DocCafe jobs matched', () => {
  it('given "Displaying 1 - 30 jobs out of 169", when read, then the count is 169', () => {
    assert.equal(docCafeResultCountFromNodes(nodes(['Displaying 1 - 30 jobs out of 169']), TITLE), 169);
  });
  it('given no count text, when read, then the title number is the fallback', () => {
    assert.equal(docCafeResultCountFromNodes(nodes(['nothing']), TITLE), 169);
  });
  it('given neither text nor title number, when read, then the count is unknown (null)', () => {
    assert.equal(docCafeResultCountFromNodes(nodes(['nothing']), 'Physician jobs'), null);
  });
  it('given facets and a count, when packaged, then city/state join into "Salt Lake City, UT"', () => {
    const p = docCafeSearch(
      'https://www.doccafe.com/physician-jobs/specialty/sleep-medicine/us/state/ut/city/salt-lake-city', TITLE, 169, 1000);
    assert.equal(p.platform, 'DocCafe');
    assert.equal(p.location, 'Salt Lake City, UT');
    assert.equal(p.specialty, 'Sleep Medicine');
    assert.equal(p.keywords, 'Sleep Medicine Physician');
    assert.equal(p.resultCount, 169);
  });
});
