/**
 * DocCafe candidate search (recruiter side), verified against a live logged-in
 * page 2026-09-22. She filters candidates at
 *   /company/candidate/search?occupation=9600&specialties[0]=420&countries[0]=228&…
 * where the ids are opaque; the page renders every applied filter as a chip
 * in .filter-tag-list with a readable label ("Nurse Practitioner",
 * "Family Practice/Primary Care", "United States", "Last activity within 1 Year")
 * and the match count as .total-jobs ("Displaying 1 - 50 profiles out of 13,891").
 * This module never parses job listings — that was the wrong product.
 */
import type { SearchPayload } from './types.ts';

export function isDocCafeCandidateSearch(url: string): boolean {
  try {
    return new URL(url).pathname.includes('/candidate/search');
  } catch {
    return false;
  }
}

export interface DocCafeChip {
  /** data-filter-name: occupations | countries | specialties | lastActivityWithinPeriod | sponsorshipStatus */
  name: string;
  /** readable label, e.g. "Nurse Practitioner" */
  text: string;
}

export interface DocCafeCandidateFacets {
  occupation: string;
  specialties: string;
  country: string;
  lastActivity: string;
  other: string;
}

/** Group chips by data-filter-name into their semantic slots. */
export function docCafeChipFacets(chips: DocCafeChip[]): DocCafeCandidateFacets {
  const pick = (name: string) => chips.filter((c) => c.name === name).map((c) => c.text.trim()).filter(Boolean).join(', ');
  return {
    occupation: pick('occupations'),
    specialties: pick('specialties'),
    country: pick('countries'),
    lastActivity: pick('lastActivityWithinPeriod'),
    other: pick('sponsorshipStatus'),
  };
}

/** Candidate-search payload: every chip becomes note keywords, so her HubSpot
 *  timeline shows exactly which filters found those candidates. */
export function docCafeCandidateSearch(
  url: string,
  countOrNull: number | null,
  observedAtMs: number,
  chips: DocCafeChip[],
): SearchPayload {
  const facets = docCafeChipFacets(chips);
  const keywords = [facets.occupation, facets.specialties, facets.country, facets.lastActivity, facets.other]
    .filter(Boolean)
    .join(', ');
  return {
    platform: 'DocCafe',
    url: String(url),
    keywords,
    title: '',
    company: '',
    location: facets.country,
    specialty: facets.specialties,
    state: '',
    city: '',
    jobType: '',
    resultCount: countOrNull ?? null,
    observedAtMs: Number(observedAtMs),
  };
}

/** "Displaying 1 - 50 profiles out of 13,891"; null when no count rendered. */
export function docCafeResultCount(pageText: string): number | null {
  const m = /Displaying\s+\d[\d,]*\s*-\s*\d[\d,]*\s+profiles?\s+out\s+of\s+([\d,]+)/i.exec(pageText || '');
  if (m) {
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Page texts for the count scan; the content script passes document.body text. */
export function docCafeResultCountFromNodes(nodes: Array<{ textContent: string | null }>): number | null {
  return docCafeResultCount(nodes.map((n) => n.textContent ?? '').join('\n'));
}