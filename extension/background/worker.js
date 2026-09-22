/* Thin chrome wiring. All decisions live in lib/ (tested); this file is glue. */
importScripts('lib/util.js', 'lib/search-note.js', 'lib/hubspot.js', 'lib/store.js', 'lib/search-flow.js');

const hub = RB.createHubSpot({});
const K_TOKEN = 'rb.token';
const K_LOGGED = 'rb.loggedSearches';
const K_QUEUE = 'rb.retryQueue';
const ALARM = 'rb-retry';

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return String(Date.now()) + '-' + Math.floor(Math.random() * 1e9);
  }
}

async function loadState() {
  const s = await chrome.storage.local.get({ [K_TOKEN]: '', [K_LOGGED]: [], [K_QUEUE]: [] });
  return { token: s[K_TOKEN], logged: s[K_LOGGED], queue: s[K_QUEUE] };
}

async function saveState(st) {
  await chrome.storage.local.set({ [K_LOGGED]: st.logged, [K_QUEUE]: st.queue });
}

async function updateBadge() {
  try {
    const s = await chrome.storage.local.get({ [K_QUEUE]: [] });
    const n = s[K_QUEUE].length;
    await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
    await chrome.action.setBadgeText({ text: n ? String(n) : '' });
  } catch {
    /* badge is best-effort */
  }
}

function scheduleAlarm(queue) {
  if (!queue.length) return;
  const earliest = Math.min.apply(null, queue.map((e) => e.nextRunMs));
  try {
    chrome.alarms.create(ALARM, { when: earliest });
  } catch {
    /* alarms unavailable; retries run on next wake */
  }
}

async function onLogSearch(payload) {
  const st = await loadState();
  const now = Date.now();
  const deps = { token: st.token, logged: st.logged, createNote: (t, p) => hub.createNote(t, p), nowMs: now };
  try {
    const r = await RB.handleLogSearch(deps, payload);
    await saveState(st);
    return { ok: true, deduped: r.action === 'duplicate' };
  } catch (e) {
    if (e && e.name === 'RB.HubError' && e.retryable) {
      st.queue = RB.enqueue(st.queue, RB.makeRetryEntry(newId(), payload, now, e));
      await saveState(st);
      scheduleAlarm(st.queue);
      await updateBadge();
      return { ok: false, error: e.message, queued: true };
    }
    return { ok: false, error: (e && e.message) || 'Unknown error', queued: false };
  }
}

async function onTestConnection() {
  const s = await chrome.storage.local.get({ [K_TOKEN]: '' });
  if (!s[K_TOKEN]) return { ok: false, error: 'No token saved yet.' };
  try {
    await hub.testConnection(s[K_TOKEN]);
    return { ok: true };
  } catch (e) {
    let m = (e && e.message) || 'Test failed';
    if (e && e.status === 403) m += ' — check the token has scope crm.objects.contacts.read.';
    return { ok: false, error: m };
  }
}

async function drainQueue() {
  const st = await loadState();
  const now = Date.now();
  const split = RB.dequeueDue(st.queue, now);
  const rest = split.rest;
  for (const entry of split.due) {
    const deps = { token: st.token, logged: st.logged, createNote: (t, p) => hub.createNote(t, p), nowMs: now };
    try {
      await RB.handleLogSearch(deps, entry.payload);
    } catch (e) {
      if (e && e.name === 'RB.HubError' && e.retryable && entry.attempt < RB.RETRY_MAX) {
        rest.push(Object.assign({}, RB.scheduleRetry(entry, now), { lastError: e.message }));
      }
      /* non-retryable or attempts exhausted: drop */
    }
  }
  st.queue = RB.capArray(rest, RB.RETRY_QUEUE_CAP);
  await saveState(st);
  scheduleAlarm(st.queue);
  await updateBadge();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (!msg || typeof msg.type !== 'string') return { ok: false, error: 'Bad message', queued: false };
    if (msg.type === 'RB_LOG_SEARCH') return onLogSearch(msg.payload);
    if (msg.type === 'RB_TEST_CONNECTION') return onTestConnection();
    return { ok: false, error: 'Unknown message type', queued: false };
  })().then(sendResponse, (e) => sendResponse({ ok: false, error: (e && e.message) || 'Worker error', queued: false }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === ALARM) drainQueue().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge().catch(() => {});
});
