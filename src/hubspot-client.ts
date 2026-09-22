/**
 * HubSpot API client. Fetch is injected so tests run offline; the worker
 * passes the real one. A failed call throws HubSpotError carrying whether
 * the worker should park it for retry (network/429/5xx) or surface it
 * immediately (bad token, missing scope).
 */
import type { HubSpotNoteId, NoteProperties } from './types.ts';

const HUBSPOT_API = 'https://api.hubapi.com';

export class HubSpotError extends Error {
  readonly status: number;
  readonly isRetryable: boolean;
  constructor(status: number, message: string, isRetryable: boolean) {
    super(message);
    this.name = 'HubSpotError';
    this.status = status;
    this.isRetryable = isRetryable;
  }
}

export interface HubSpotClient {
  testConnection(token: string): Promise<true>;
  createNote(token: string, properties: NoteProperties): Promise<HubSpotNoteId>;
}

/** Minimal fetch shape; the real `fetch` fits, and tests stub it offline. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export function createHubSpotClient(fetchImpl: FetchLike = fetch): HubSpotClient {
  async function request(token: string, path: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetchImpl(HUBSPOT_API + path, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
      });
    } catch (err) {
      throw new HubSpotError(0, `Network error: ${err instanceof Error ? err.message : err}`, true);
    }
    if (res.ok) return res;
    const isRetryable = res.status === 429 || res.status >= 500;
    let detail = '';
    try {
      detail = String(await res.text()).slice(0, 200);
    } catch {
      /* body unreadable; status carries the story */
    }
    throw new HubSpotError(res.status, `HubSpot ${res.status}${detail ? ` — ${detail}` : ''}`, isRetryable);
  }

  return {
    async testConnection(token: string): Promise<true> {
      await request(token, '/crm/v3/objects/contacts?limit=1', { method: 'GET' });
      return true;
    },
    async createNote(token: string, properties: NoteProperties): Promise<HubSpotNoteId> {
      const res = await request(token, '/crm/v3/objects/notes', {
        method: 'POST',
        body: JSON.stringify({ properties }),
      });
      try {
        const body: unknown = await res.json();
        if (body && typeof body === "object" && "id" in body && typeof body.id === "string") return body.id;
        return null;
      } catch {
        return null;
      }
    },
  };
}
