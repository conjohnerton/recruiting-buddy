# Recruiting Buddy — search-logger MVP contracts (Slice A, frozen)

Scope: search logging only. Call logging is deferred (branch `future/call-logger`).

## Conventions (all slices)
- Vanilla MV3, zero deps. Classic scripts (no modules): shared files attach to
  `self.RB` namespace and end with the `module.exports = RB` shim for node tests.
- No DOM or `chrome.*` in `lib/` — everything there is pure and unit-tested.
- Tests: `node --test test/` (node 18). One test file per lib/content area.
- Style: terse, boring, no dead code.

## Message protocol (content -> worker)
```js
{ type: 'RB_LOG_SEARCH',
  payload: { platform: 'LinkedIn' | 'DocCafe', url, keywords,
             title: '', company: '', location: '',
             specialty: '', state: '', city: '', jobType: '',
             resultCount: number | null, observedAtMs: number } }
```
Worker replies `{ ok: true, deduped: boolean }` or
`{ ok: false, error: string, queued: boolean }`.
Options page: `{ type: 'RB_TEST_CONNECTION' }` ->
`{ ok: true }` or `{ ok: false, error: string }`.

## Storage keys (`chrome.storage.local`)
- `rb.token`: HubSpot private-app token (string).
- `rb.loggedSearches`: array of dedupe hashes, cap 1000 (oldest dropped).
- `rb.retryQueue`: array of `{ id, payload, attempt, nextRunMs, lastError }`,
  max 5 attempts each.

## Dedupe
Key = `RB.searchDedupeKey(url, observedAtMs)` = FNV-1a of
`normalizeUrl(url) + '|' + UTC-minute`. Check-then-record in the worker only.

## HubSpot wiring
- Base `https://api.hubapi.com`, header `Authorization: Bearer <token>`.
- Test: `GET /crm/v3/objects/contacts?limit=1` (2xx = ok).
- Log: `POST /crm/v3/objects/notes` with
  `{ properties: { hs_note_body, hs_timestamp } }` built by
  `RB.buildNoteProperties` (lib/search-note.js, frozen).
- Retryable: network error, 429, 5xx. Backoff `RB.backoffMs(attempt)`:
  5s,10s,20s,40s,60s cap. Alarm `rb-retry`, badge = queue length ('' when 0).

## File ownership (no cross-slice edits)
- Slice B (worker+options): `lib/hubspot.js` (client factory
  `RB.createHubSpot({fetchImpl})` -> `{testConnection, createNote}` throwing
  `RB.HubError{status,message,retryable}`), `lib/store.js` (pure queue/dedupe
  array helpers), `lib/search-flow.js`
  (`RB.handleLogSearch(deps,payload)` with
  `deps={token,logged,createNote,nowMs}` -> `{action:'logged'|'duplicate',key}`
  or retryable throw), `background/worker.js` (thin chrome wiring),
  `options/options.html`, `options/options.js`,
  `test/hubspot.test.js`, `test/store.test.js`, `test/search-flow.test.js`.
- Slice C (linkedin): `lib/linkedin-extract.js`
  (`RB.extractLinkedInCount(root)` stub-DOM-friendly, null when absent;
  `RB.buildLinkedInPayload(url, countOrNull, observedAtMs)`),
  `content/linkedin.js` (idempotent floating button, try/catch, SPA-URL aware),
  `test/linkedin.test.js`.
- Slice D (doccafe): `lib/doccafe-parse.js`
  (`RB.parseDocCafeSearch(url, pageTitle)` -> `{keywords, specialty, state,
  city, jobType}`; listing paths look like
  `/physician-jobs/specialty/sleep-medicine/us/state/ut/city/salt-lake-city`
  or `/physician-jobs/type/full-time`; count from
  `"Displaying 1 - 30 jobs out of 169"` text or leading title number;
  non-listing pages -> `{ keywords:'', ... }` and content script shows no button),
  `content/doccafe.js` (same shape as linkedin), `test/doccafe.test.js`.
- Frozen/shared read-only: `manifest.json`, `lib/util.js`, `lib/search-note.js`.

## DocCafe ground truth (fetched live 2026-09-22)
- Title: "169 Sleep Medicine Physician jobs · DocCafe" -> keywords
  "Sleep Medicine Physician" (strip leading count + trailing " job(s)").
- Facet path segments: `specialty/X`, `type/Y`, `us/state/S`, `city/C`.
- Count text: "Displaying 1 - 30 jobs out of 169".
- Occupations: Physician / Physician Assistant / Nurse Practitioner / CRNA /
  Certified Anesthesiologist Assistant / Midwife (first path segment
  e.g. `physician-jobs`).
