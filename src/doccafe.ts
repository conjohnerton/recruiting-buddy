/**
 * DocCafe job listings. Unlike LinkedIn there are no query params — the search
 * IS the path, verified against the live site 2026-09-22:
 *   /physician-jobs/specialty/sleep-medicine/us/state/ut/city/salt-lake-city
 *   /physician-jobs/type/full-time
 * Keywords come from the title ("169 Sleep Medicine Physician jobs · DocCafe"),
 * the count from "Displaying 1 - 30 jobs out of 169". Detail pages (/job/…,
 * /company/…) have no "-jobs" segment → empty parse → the button stays hidden.
 */
import type { SearchPayload } from './types.ts';

export interface DocCafeFacets {
  keywords: string;
  specialty: string;
  state: string;
  city: string;
  jobType: string;
}

const NO_SEARCH: DocCafeFacets = { keywords: '', specialty: '', state: '', city: '', jobType: '' };

/** 'ut' → 'UT'; 'salt-lake-city' → 'Salt Lake City'. */
function humanizeFacet(raw: string): string {
  if (/^[a-zA-Z]{2}$/.test(raw)) return raw.toUpperCase();
  return raw
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** '169 Sleep Medicine Physician jobs · DocCafe' → 'Sleep Medicine Physician'. */
export function docCafeKeywordsFromTitle(pageTitle: string): string {
  return String(pageTitle || '')
    .replace(/^\s*\d[\d,]*\s+/, '')
    .replace(/\s*·\s*DocCafe\s*/i, '')
    .replace(/\s+job(s?)\s*$/i, '')
    .trim();
}

export function parseDocCafeSearch(url: string, pageTitle = ''): DocCafeFacets {
  let segments: string[];
  try {
    segments = new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .map((s) => {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      });
  } catch {
    return { ...NO_SEARCH };
  }
  if (!segments.length || !segments[0].toLowerCase().endsWith('-jobs')) return { ...NO_SEARCH };
  const facets: DocCafeFacets = { ...NO_SEARCH, keywords: docCafeKeywordsFromTitle(pageTitle) };
  for (let i = 0; i < segments.length; i++) {
    const key = segments[i].toLowerCase();
    if (key === 'specialty' && i + 1 < segments.length) facets.specialty = humanizeFacet(segments[++i]);
    else if (key === 'type' && i + 1 < segments.length) facets.jobType = humanizeFacet(segments[++i]);
    else if (key === 'us' && i + 2 < segments.length && segments[i + 1].toLowerCase() === 'state') {
      facets.state = humanizeFacet(segments[i + 2]);
      i += 2;
    } else if (key === 'city' && i + 1 < segments.length) facets.city = humanizeFacet(segments[++i]);
  }
  return facets;
}

/** "Displaying 1 - 30 jobs out of 169", else leading title number, else null. */
export function docCafeResultCount(pageText: string, pageTitle = ''): number | null {
  const inPage = /Displaying\s+\d[\d,]*\s*-\s*\d[\d,]*\s+jobs?\s+out\s+of\s+([\d,]+)/i.exec(pageText || '');
  if (inPage) {
    const n = parseInt(inPage[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n)) return n;
  }
  const inTitle = /^\s*([\d,]+)\s/.exec(pageTitle);
  if (inTitle) {
    const n = parseInt(inTitle[1].replace(/,/g, ''), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Page texts for the count scan; the content script passes document.body text. */
export function docCafeResultCountFromNodes(nodes: Array<{ textContent: string | null }>, pageTitle = ''): number | null {
  return docCafeResultCount(nodes.map((n) => n.textContent ?? '').join('\n'), pageTitle);
}

/** Assemble the worker payload; city/state join into "Salt Lake City, UT". */
export function docCafeSearch(url: string, pageTitle: string, countOrNull: number | null, observedAtMs: number): SearchPayload {
  const facets = parseDocCafeSearch(url, pageTitle);
  return {
    platform: 'DocCafe',
    url: String(url),
    keywords: facets.keywords,
    title: '',
    company: '',
    location: [facets.city, facets.state].filter(Boolean).join(', '),
    specialty: facets.specialty,
    state: facets.state,
    city: facets.city,
    jobType: facets.jobType,
    resultCount: countOrNull ?? null,
    observedAtMs: Number(observedAtMs),
  };
}
