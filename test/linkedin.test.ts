import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { linkedInResultCount, linkedInSearch } from '../src/linkedin.ts';

const labels = (texts: string[]) => ({
  querySelectorAll: () => texts.map((textContent) => ({ textContent })),
  body: { textContent: '' },
});

describe('recruiter logs a LinkedIn people search', () => {
  it('given "1,234 results" on the page, when read, then the count is 1234', () => {
    assert.equal(linkedInResultCount(labels(['1,234 results']) as never), 1234);
  });
  it('given "About 5,678 results", when read, then the count is 5678', () => {
    assert.equal(linkedInResultCount(labels(['About 5,678 results']) as never), 5678);
  });
  it('given a single result, when read, then the count is 1', () => {
    assert.equal(linkedInResultCount(labels(['1 result']) as never), 1);
  });
  it('given no count rendered, when read, then the count is unknown (null)', () => {
    assert.equal(linkedInResultCount(labels(['People', 'Jobs']) as never), null);
    assert.equal(linkedInResultCount(labels([]) as never), null);
  });
  it('given a broken page object, when read, then it yields null instead of throwing', () => {
    assert.equal(linkedInResultCount(null), null);
  });
  it('given URL filters and a count, when packaged, then the worker gets every field', () => {
    assert.deepEqual(
      linkedInSearch('https://www.linkedin.com/search/results/people/?keywords=icu%20nurse&location=Texas', 42, 1000),
      {
        platform: 'LinkedIn',
        url: 'https://www.linkedin.com/search/results/people/?keywords=icu%20nurse&location=Texas',
        keywords: 'icu nurse', title: '', company: '', location: 'Texas',
        specialty: '', state: '', city: '', jobType: '',
        resultCount: 42, observedAtMs: 1000,
      },
    );
  });
  it('given a garbage URL, when packaged, then keywords are empty but the payload still builds', () => {
    const payload = linkedInSearch('garbage', null, 5);
    assert.equal(payload.keywords, '');
    assert.equal(payload.resultCount, null);
  });
});
