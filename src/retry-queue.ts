/**
 * Already-logged list + pending-retry queue. Plain arrays the worker persists
 * to chrome.storage.local; all decisions here are pure so tests own them.
 */
import { DEDUPE_CAP, capArray } from './dedupe.ts';
import { backoffMs } from './timing.ts';
import type { RetryEntry, SearchPayload } from './types.ts';

/** How many failed logs we park before forgetting oldest. */
export const RETRY_QUEUE_CAP = 200;

export function alreadyLogged(loggedKeys: string[], key: string): boolean {
  return loggedKeys.includes(key);
}

export function markLogged(loggedKeys: string[], key: string): string[] {
  loggedKeys.push(key);
  return capArray(loggedKeys, DEDUPE_CAP);
}

export function parkForRetry(queue: RetryEntry[], entry: RetryEntry): RetryEntry[] {
  queue.push(entry);
  return capArray(queue, RETRY_QUEUE_CAP);
}

/** Split the queue into due-now vs still-waiting. Caller persists `later`. */
export function dueRetries(queue: RetryEntry[], nowMs: number): { due: RetryEntry[]; later: RetryEntry[] } {
  const due: RetryEntry[] = [];
  const later: RetryEntry[] = [];
  for (const e of queue) (e.nextRunMs <= nowMs ? due : later).push(e);
  return { due, later };
}

export function firstRetry(id: string, payload: SearchPayload, nowMs: number, error: unknown): RetryEntry {
  const detail = error instanceof Error ? error.message : String(error);
  return { id, payload, attempt: 1, nextRunMs: nowMs + backoffMs(1), lastError: detail };
}

export function nextRetry(entry: RetryEntry, nowMs: number, error: unknown): RetryEntry {
  const attempt = entry.attempt + 1;
  const detail = error instanceof Error ? error.message : String(error);
  return { ...entry, attempt, nextRunMs: nowMs + backoffMs(attempt), lastError: detail };
}
