import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { linkedInSearchTerms, searchNoteBody, searchNoteProperties } from '../src/search-note.ts';
import type { SearchPayload } from '../src/types.ts';

const NOON = Date.UTC(2026, 8, 22, 13, 0, 0);
const base: SearchPayload = {
  platform: 'LinkedIn', url: 'https://u', keywords: 'icu nurse', title: '', company: '', location: '',
  specialty: '', state: '', city: '', jobType: '', resultCount: null, observedAtMs: NOON,
};

describe('recruiter reads her search terms back in the HubSpot note', () => {
  it('given a LinkedIn URL with filters, when parsed, then keywords/title/company/location come out', () => {
    assert.deepEqual(
      linkedInSearchTerms('https://www.linkedin.com/search/results/people/?keywords=icu%20nurse&title=RN&company=HCA&location=Texas'),
      { keywords: 'icu nurse', title: 'RN', company: 'HCA', location: 'Texas' },
    );
  });
  it('given a bare results URL, when parsed, then every field is empty', () => {
    assert.deepEqual(linkedInSearchTerms('https://www.linkedin.com/search/results/people/'), {
      keywords: '', title: '', company: '', location: '',
    });
  });
  it('given a garbage URL, when parsed, then it yields empties instead of throwing', () => {
    assert.deepEqual(linkedInSearchTerms('garbage'), { keywords: '', title: '', company: '', location: '' });
  });
});

describe('recruiter recognizes her note in the HubSpot timeline', () => {
  it('given keywords and a count, when worded, then the body matches the timeline format', () => {
    assert.equal(
      searchNoteBody({ ...base, resultCount: 1234 }),
      "Searched LinkedIn at 2026-09-22T13:00:00.000Z: keywords='icu nurse' (1234 results) — https://u",
    );
  });
  it('given no count was visible, when worded, then the count clause is omitted', () => {
    assert.equal(
      searchNoteBody({ ...base, platform: 'DocCafe', keywords: '' }),
      "Searched DocCafe at 2026-09-22T13:00:00.000Z: keywords='' — https://u",
    );
  });
  it('given extra filters, when worded, then only the present ones appear', () => {
    const body = searchNoteBody({ ...base, keywords: 'rn', title: 'RN', location: 'TX' });
    assert.ok(body.includes("title='RN'") && body.includes("location='TX'") && !body.includes('company='), body);
  });
  it('given a search, when packaged for HubSpot, then the observed time becomes hs_timestamp', () => {
    const props = searchNoteProperties(base);
    assert.equal(props.hs_timestamp, NOON);
    assert.equal(typeof props.hs_note_body, 'string');
  });
});
