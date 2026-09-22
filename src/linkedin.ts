/**
 * LinkedIn people search. She runs queries like
 * /search/results/people/?keywords=icu+nurse&location=Texas and the result
 * count renders somewhere in the page ("1,234 results").
 */
import { linkedInSearchTerms } from './search-note.ts';
import type { SearchPayload } from './types.ts';

/** Page texts short enough to be a count label (skips job descriptions etc).
 *  Accepts stub roots in tests: any object with querySelectorAll/body. */
function candidateLabels(root: unknown): string[] {
  const labels: string[] = [];
  try {
    const scope = root as { querySelectorAll?: (sel: string) => ArrayLike<{ textContent?: string | null }>; body?: { textContent?: string | null } | null } | null | undefined;
    const nodes = scope?.querySelectorAll?.('div,span,h1,h2,p') ?? [];
    for (const n of Array.from(nodes)) {
      if (n?.textContent && n.textContent.length < 200) labels.push(n.textContent);
    }
    if (scope?.body?.textContent) labels.push(scope.body.textContent);
  } catch {
    /* hostile DOM; count stays unknown */
  }
  return labels;
}

/** First "N result(s)" on the page, or null when LinkedIn renders no count. */
export function linkedInResultCount(root: unknown): number | null {
  for (const label of candidateLabels(root)) {
    const m = /([\d,]+)\s+results?/i.exec(label);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Assemble the worker payload: terms from the URL, count from the page. */
export function linkedInSearch(url: string, countOrNull: number | null, observedAtMs: number): SearchPayload {
  const terms = linkedInSearchTerms(url);
  return {
    platform: 'LinkedIn',
    url,
    keywords: terms.keywords,
    title: terms.title,
    company: terms.company,
    location: terms.location,
    specialty: '',
    state: '',
    city: '',
    jobType: '',
    resultCount: countOrNull ?? null,
    observedAtMs: Number(observedAtMs),
  };
}
