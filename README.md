# Recruiting Buddy (search-logger MVP)

Logs candidate searches on LinkedIn and DocCafe to HubSpot as timestamped notes.
Call logging is deferred — see `future/call-logger` branch.

## What it does

- **LinkedIn** people search: floating "Log this search" button writes a note
  with keywords/title/company/location, result count, timestamp, URL.
- **DocCafe** job listings: same button; keywords from page title, facets from
  path (`specialty/X`, `type/Y`, `us/state/S`, `city/C`), count from the
  "Displaying … out of N" text or leading title number.
- Notes are unassociated for the MVP: `POST /crm/v3/objects/notes` with
  `hs_note_body` + `hs_timestamp`.
- Dedupes by hash(URL + UTC minute); retry queue (5 attempts, 5s→60s backoff)
  with action badge count.

## HubSpot token setup

1. HubSpot → Settings → Integrations → Private Apps → Create.
2. Required scopes: `crm.objects.contacts.read`, `crm.objects.notes.write`.
3. Copy the token → extension options page → paste → Save → Test connection
   (hits `GET /crm/v3/objects/contacts?limit=1`).
4. Token lives in `chrome.storage.local` on her machine only. Anyone with
   access to the browser profile can read it — acceptable for MVP; nothing
   leaves the browser except calls to `api.hubapi.com`.

## Load unpacked

1. `chrome://extensions` → enable Developer mode → Load unpacked →
   select `~/recruiting-buddy/extension`.
2. Open extension Options, paste token, Test connection → "Connection OK."

## Manual test checklist

- [ ] LinkedIn: run a people search → click "Log this search" → "Saved ✓" →
      verify note in HubSpot (body format `Searched LinkedIn at <ISO>: …`).
- [ ] Click again same minute → "Already logged ✓" → no second note.
- [ ] Reload page → click → still "Already logged ✓" (persisted dedupe).
- [ ] DocCafe: open a specialty listing → button visible; open a `/job/…`
      detail page → button hidden.
- [ ] Disconnect network → click → "Queued — will retry" → badge shows 1 →
      reconnect → note lands, badge clears.
- [ ] Options page with bad token → Test connection shows failure.

## Dev

- Zero deps. `node --test test/` (node 18+). Lib files are classic scripts
  (`self.RB` namespace) shared by SW, content scripts, and tests.
- Contracts: `CONTRACT.md`.
