/**
 * The brain. Content scripts and the options page send messages; this worker
 * owns the token, the already-logged list, and the retry queue. All branching
 * decisions live in src/*.ts (unit-tested) — this file is chrome.* glue.
 */
import { createHubSpotClient, HubSpotError } from '../hubspot-client.ts';
import { capArray } from '../dedupe.ts';
import { logSearchOnce } from '../log-search.ts';
import { RETRY_MAX } from '../timing.ts';
import { RETRY_QUEUE_CAP, dueRetries, firstRetry, nextRetry, parkForRetry } from '../retry-queue.ts';
import { LOGGED_SEARCHES_KEY, RETRY_ALARM, RETRY_QUEUE_KEY, TOKEN_KEY } from '../storage-keys.ts';
import type { RetryEntry, SearchPayload, WorkerMessage, WorkerReply } from '../types.ts';

const hub = createHubSpotClient();

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

interface WorkerState {
  token: string;
  loggedKeys: string[];
  queue: RetryEntry[];
}

async function loadState(): Promise<WorkerState> {
  const s = await chrome.storage.local.get({ [TOKEN_KEY]: '', [LOGGED_SEARCHES_KEY]: [], [RETRY_QUEUE_KEY]: [] });
  return { token: s[TOKEN_KEY] as string, loggedKeys: s[LOGGED_SEARCHES_KEY] as string[], queue: s[RETRY_QUEUE_KEY] as RetryEntry[] };
}

async function saveState(st: WorkerState): Promise<void> {
  await chrome.storage.local.set({ [LOGGED_SEARCHES_KEY]: st.loggedKeys, [RETRY_QUEUE_KEY]: st.queue });
}

/** Red count on the toolbar icon while logs wait for retry; blank when clear. */
async function updateBadge(): Promise<void> {
  try {
    const s = await chrome.storage.local.get({ [RETRY_QUEUE_KEY]: [] });
    const n = (s[RETRY_QUEUE_KEY] as RetryEntry[]).length;
    await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
    await chrome.action.setBadgeText({ text: n ? String(n) : '' });
  } catch {
    /* badge is best-effort */
  }
}

function wakeForEarliestRetry(queue: RetryEntry[]): void {
  if (!queue.length) return;
  try {
    chrome.alarms.create(RETRY_ALARM, { when: Math.min(...queue.map((e) => e.nextRunMs)) });
  } catch {
    /* alarms unavailable; retries run on next wake */
  }
}

async function handleLogSearchMessage(payload: SearchPayload): Promise<WorkerReply> {
  const st = await loadState();
  try {
    const outcome = await logSearchOnce(
      { token: st.token, loggedKeys: st.loggedKeys, postNote: (t, p) => hub.createNote(t, p) },
      payload,
    );
    await saveState(st);
    return { ok: true, deduped: outcome === 'duplicate' };
  } catch (e) {
    if (e instanceof HubSpotError && e.isRetryable) {
      st.queue = parkForRetry(st.queue, firstRetry(newId(), payload, Date.now(), e));
      await saveState(st);
      wakeForEarliestRetry(st.queue);
      await updateBadge();
      return { ok: false, error: e.message, queued: true };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error', queued: false };
  }
}

async function handleTestConnection(): Promise<WorkerReply> {
  const s = await chrome.storage.local.get({ [TOKEN_KEY]: '' });
  const token = s[TOKEN_KEY] as string;
  if (!token) return { ok: false, error: 'No token saved yet.' };
  try {
    await hub.testConnection(token);
    return { ok: true };
  } catch (e) {
    const hint = e instanceof HubSpotError && e.status === 403 ? ' — check the token has scope crm.objects.contacts.read.' : '';
    return { ok: false, error: `${e instanceof Error ? e.message : 'Test failed'}${hint}` };
  }
}

/** Re-post every due entry; failures re-park with doubled backoff, drops after RETRY_MAX. */
async function drainRetryQueue(): Promise<void> {
  const st = await loadState();
  const now = Date.now();
  const { due, later } = dueRetries(st.queue, now);
  const remaining: RetryEntry[] = [...later];
  for (const entry of due) {
    try {
      await logSearchOnce(
        { token: st.token, loggedKeys: st.loggedKeys, postNote: (t, p) => hub.createNote(t, p) },
        entry.payload,
      );
    } catch (e) {
      if (e instanceof HubSpotError && e.isRetryable && entry.attempt < RETRY_MAX) {
        remaining.push(nextRetry(entry, now, e));
      }
      /* non-retryable or attempts exhausted: drop */
    }
  }
  st.queue = capArray(remaining, RETRY_QUEUE_CAP);
  await saveState(st);
  wakeForEarliestRetry(st.queue);
  await updateBadge();
}

chrome.runtime.onMessage.addListener((msg: WorkerMessage, _sender, sendResponse: (r: WorkerReply) => void) => {
  (async (): Promise<WorkerReply> => {
    if (msg.type === 'RB_LOG_SEARCH') return handleLogSearchMessage(msg.payload);
    if (msg.type === 'RB_TEST_CONNECTION') return handleTestConnection();
    return { ok: false, error: 'Unknown message type', queued: false };
  })().then(sendResponse, (e: unknown) =>
    sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Worker error', queued: false }),
  );
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === RETRY_ALARM) drainRetryQueue().catch(() => {});
});
chrome.runtime.onInstalled.addListener(() => {
  updateBadge().catch(() => {});
});
