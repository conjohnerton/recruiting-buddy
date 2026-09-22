/** Shared shapes. The worker, both buttons, and the options page must agree
 *  on these — the compiler now enforces that instead of CONTRACT.md prose. */

export type Platform = 'LinkedIn' | 'DocCafe';

/** Everything a content script hands the worker for one clicked search. */
export interface SearchPayload {
  platform: Platform;
  url: string;
  keywords: string;
  title: string;
  company: string;
  location: string;
  specialty: string;
  state: string;
  city: string;
  jobType: string;
  resultCount: number | null;
  observedAtMs: number;
}

/** HubSpot note properties for POST /crm/v3/objects/notes. */
export interface NoteProperties {
  hs_note_body: string;
  hs_timestamp: number;
}

/** One parked log waiting for HubSpot to become reachable again. */
export interface RetryEntry {
  id: string;
  payload: SearchPayload;
  attempt: number;
  nextRunMs: number;
  lastError: string;
}

export type LogSearchMessage = { type: 'RB_LOG_SEARCH'; payload: SearchPayload };
export type TestConnectionMessage = { type: 'RB_TEST_CONNECTION' };
export type WorkerMessage = LogSearchMessage | TestConnectionMessage;

/** Every reply the worker sends back to a button or the options page. */
export type WorkerReply = { ok: boolean; deduped?: boolean; error?: string; queued?: boolean };

export type HubSpotNoteId = string | null;
export type CreateNote = (token: string, props: NoteProperties) => Promise<HubSpotNoteId>;
