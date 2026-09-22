import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import {
  docCafeCandidateSearch,
  docCafeChipFacets,
  docCafeResultCount,
  docCafeResultCountFromNodes,
  isDocCafeCandidateSearch,
} from '../src/doccafe.ts';

// Her real search, captured 2026-09-22: Nurse Practitioners, Family
// Practice/Primary Care, United States, active within 1 year.
const CANDIDATE_URL =
  'https://www.doccafe.com/company/candidate/search?token=bkz2DM7m0kqoW5BQ&occupation=9600&specialties%5B0%5D=420' +
  '&countries%5B0%5D=228&registeredWithinType=preformatted&lastActivityWithinType=preformatted' +
  '&lastActivityWithin=1y&showProfiles=not_hidden&sponsorshipStatus=visa_sponsorship_exclude';

const HER_CHIPS = [
  { name: 'occupations', text: 'Nurse Practitioner' },
  { name: 'countries', text: 'United States' },
  { name: 'specialties', text: 'Family Practice/Primary Care' },
  { name: 'lastActivityWithinPeriod', text: 'Last activity within 1 Year' },
  { name: 'sponsorshipStatus', text: 'Exclude Visa Sponsorship Candidates' },
];

describe('recruiter logs a DocCafe candidate search', () => {
  it('given the candidate search URL, when checked, then it is a search page', () => {
    assert.equal(isDocCafeCandidateSearch(CANDIDATE_URL), true);
  });
  it('given a dashboard or detail URL, when checked, then it is not a search page', () => {
    assert.equal(isDocCafeCandidateSearch('https://www.doccafe.com/company'), false);
    assert.equal(isDocCafeCandidateSearch('https://www.doccafe.com/company/employee/1573933/edit'), false);
    assert.equal(isDocCafeCandidateSearch('garbage'), false);
  });

  it('given her applied filters, when chips are grouped, then each slot holds its labels', () => {
    const facets = docCafeChipFacets(HER_CHIPS);
    assert.equal(facets.occupation, 'Nurse Practitioner');
    assert.equal(facets.specialties, 'Family Practice/Primary Care');
    assert.equal(facets.country, 'United States');
    assert.equal(facets.lastActivity, 'Last activity within 1 Year');
    assert.equal(facets.other, 'Exclude Visa Sponsorship Candidates');
  });

  it('given her search and 13,891 matches, when packaged, then every filter shows in the note keywords', () => {
    const p = docCafeCandidateSearch(CANDIDATE_URL, 13891, 1000, HER_CHIPS);
    assert.equal(p.platform, 'DocCafe');
    assert.equal(
      p.keywords,
      'Nurse Practitioner, Family Practice/Primary Care, United States, Last activity within 1 Year, Exclude Visa Sponsorship Candidates',
    );
    assert.equal(p.location, 'United States');
    assert.equal(p.specialty, 'Family Practice/Primary Care');
    assert.equal(p.resultCount, 13891);
    assert.equal(p.url, CANDIDATE_URL);
    assert.equal(p.observedAtMs, 1000);
  });

  it('given no chips, when packaged, then keywords stay empty but the payload still builds', () => {
    const p = docCafeCandidateSearch(CANDIDATE_URL, null, 1, []);
    assert.equal(p.keywords, '');
    assert.equal(p.resultCount, null);
  });
});

describe('recruiter sees how many DocCafe candidates matched', () => {
  it('given "Displaying 1 - 50 profiles out of 13,891", when read, then the count is 13891', () => {
    assert.equal(docCafeResultCount('Displaying 1 - 50 profiles out of 13,891'), 13891);
  });
  it('given node texts, when read, then the count comes out the same way', () => {
    assert.equal(
      docCafeResultCountFromNodes([{ textContent: 'Displaying 1 - 50 profiles out of 13,891' }, { textContent: 'x' }]),
      13891,
    );
  });
  it('given no count rendered, when read, then the count is unknown (null)', () => {
    assert.equal(docCafeResultCount('nothing here'), null);
    assert.equal(docCafeResultCount(''), null);
  });
});