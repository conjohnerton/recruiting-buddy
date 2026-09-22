/**
 * How a search becomes a HubSpot note. The wording is the product contract —
 * her HubSpot timeline reads these — so the format lives here, tested.
 *
 * Example: "Searched LinkedIn at 2026-09-22T13:00:00.000Z:
 *            keywords='icu nurse' location='Texas' (1234 results) — <url>"
 */
import type { NoteProperties, SearchPayload } from './types.ts';

/** Pull named query params; missing or garbage URL → empty strings (never throws). */
function readQueryParams(url: string, names: string[]): Record<string, string> {
  const found: Record<string, string> = {};
  for (const n of names) found[n] = '';
  try {
    const q = new URL(url).searchParams;
    for (const n of names) found[n] = (q.get(n) ?? '').trim();
  } catch {
    /* keep defaults */
  }
  return found;
}

/** LinkedIn people search: `?keywords=…&title=…&company=…&location=…`. */
export function linkedInSearchTerms(url: string): { keywords: string; title: string; company: string; location: string } {
  const p = readQueryParams(url, ['keywords', 'title', 'company', 'location']);
  return { keywords: p.keywords, title: p.title, company: p.company, location: p.location };
}

/** Render the note body; extra filters appended only when present, count only when seen. */
export function searchNoteBody(search: SearchPayload): string {
  const at = new Date(Number(search.observedAtMs)).toISOString();
  let line = `Searched ${search.platform} at ${at}: keywords='${search.keywords || ''}'`;
  const filters: string[] = [];
  if (search.title) filters.push(`title='${search.title}'`);
  if (search.company) filters.push(`company='${search.company}'`);
  if (search.location) filters.push(`location='${search.location}'`);
  if (filters.length) line += ' ' + filters.join(' ');
  if (search.resultCount != null) line += ` (${search.resultCount} results)`;
  return line + ` — ${search.url}`;
}

/** HubSpot properties for POST /crm/v3/objects/notes. */
export function searchNoteProperties(search: SearchPayload): NoteProperties {
  return {
    hs_note_body: searchNoteBody(search),
    hs_timestamp: Number(search.observedAtMs),
  };
}
