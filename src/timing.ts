/** Retry pacing. HubSpot answers in ms when healthy; when it 429s/5xxs we back
 *  off 5s → 10s → 20s → 40s → 60s so a flaky afternoon can't hammer the API. */

/** Give up after this many attempts; the entry is dropped, never retried forever. */
export const RETRY_MAX = 5;

/** 1-based attempt → ms to wait. Caps at 60s. */
export function backoffMs(attempt: number): number {
  return Math.min(60000, 5000 * 2 ** (Math.max(1, attempt) - 1));
}
