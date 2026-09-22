/**
 * One clicked search, end to end: skip if already logged → post the note →
 * remember the fingerprint. The hash is recorded only after HubSpot confirms,
 * so a failure always leaves the search eligible for retry.
 */
import { alreadyLogged, markLogged } from './retry-queue.ts';
import { searchDedupeKey } from './dedupe.ts';
import { searchNoteProperties } from './search-note.ts';
import { HubSpotError } from './hubspot-client.ts';
import type { CreateNote, SearchPayload } from './types.ts';

export interface LogSearchDeps {
  token: string;
  loggedKeys: string[];
  postNote: CreateNote;
}

export async function logSearchOnce(deps: LogSearchDeps, search: SearchPayload): Promise<'logged' | 'duplicate'> {
  if (!deps.token) {
    throw new HubSpotError(0, 'HubSpot token not set. Open Recruiting Buddy options and paste a private-app token.', false);
  }
  const key = searchDedupeKey(search.url, search.observedAtMs);
  if (alreadyLogged(deps.loggedKeys, key)) return 'duplicate';
  await deps.postNote(deps.token, searchNoteProperties(search));
  markLogged(deps.loggedKeys, key);
  return 'logged';
}
