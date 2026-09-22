# Recruiting Buddy (search-logger MVP)

Logs candidate searches on LinkedIn and DocCafe to HubSpot as timestamped notes.
Call logging is deferred — see `future/call-logger` branch.

## What it does

- **LinkedIn** people search: floating "Log this search" button writes a note
  with keywords/title/company/location, result count, timestamp, URL.
- **DocCafe** candidate search (recruiter side, `/company/candidate/search`):
  same button; the note captures every applied filter chip (occupation,
  specialties, country, activity window, sponsorship) plus match count.
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

## Load unpacked (local test)

Prerequisite: [bun](https://bun.sh) 1.x (builds the TypeScript sources).

1. `cd ~/recruiting-buddy && bun install && bun run build`
2. `chrome://extensions` → enable Developer mode → Load unpacked →
   select `~/recruiting-buddy/extension`.
3. Open extension Options, paste token, Test connection → "Connection OK."
4. After any `src/` edit: re-run `bun run build`, then hit Reload on the
   extension card (or `bun run watch` during dev + manual reload).

## Manual test checklist

- [ ] LinkedIn: run a people search → click "Log this search" → "Saved ✓" →
      verify note in HubSpot (body format `Searched LinkedIn at <ISO>: …`).
- [ ] Click again same minute → "Already logged ✓" → no second note.
- [ ] Reload page → click → still "Already logged ✓" (persisted dedupe).
- [ ] DocCafe: run a candidate search (filters applied) → button visible;
      open the dashboard/account page → button hidden.
- [ ] Disconnect network → click → "Queued — will retry" → badge shows 1 →
      reconnect → note lands, badge clears.
- [ ] Options page with bad token → Test connection shows failure.

## Dev

- `bun run test` = typecheck + `bun test test/` + manifest drift check.
- Sources in `src/` (TypeScript, strict); `bun run build` bundles each entry
  to `extension/` with bun's iife bundler — no bundler config, no deps.
  Never edit `extension/*.js` by hand; it is build output.
- Shared shapes live in `src/types.ts` so the worker, buttons, and options
  page can't drift. Contracts: `CONTRACT.md`.
