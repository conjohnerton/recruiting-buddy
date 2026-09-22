/**
 * Duplicate detection. A search is "the same" when the URL matches within the
 * same UTC minute — so reloads and double-clicks collapse, but a genuinely
 * re-run search an hour later logs again.
 */

/** How many logged-search fingerprints we remember before forgetting oldest. */
export const DEDUPE_CAP = 1000;

/** FNV-1a 32-bit hex. Deterministic, dependency-free. */
export function hashStr(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
}

/** Strip fragment; unparseable input returned unchanged (never throws). */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return String(url);
  }
}

/** Fingerprint: hash(normalized URL + UTC minute bucket). */
export function searchDedupeKey(url: string, observedAtMs: number): string {
  const minute = Math.floor(Number(observedAtMs) / 60000);
  return hashStr(normalizeUrl(url) + '|' + minute);
}

/** Drop oldest items beyond `max`. Mutates and returns the same array. */
export function capArray<T>(arr: T[], max: number): T[] {
  if (arr.length > max) arr.splice(0, arr.length - max);
  return arr;
}
