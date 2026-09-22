import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { HubSpotError, createHubSpotClient } from '../src/hubspot-client.ts';

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;
function fakeFetch(handler: FetchFn): FetchFn & { calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn: FetchFn = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return Object.assign(fn, { calls });
}
function callsOf(fetch: FetchFn & { calls: unknown }): Array<{ url: string; init: RequestInit }> {
  return fetch.calls as Array<{ url: string; init: RequestInit }>;
}
const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response;
const fail = (status: number, text: string): Response =>
  ({ ok: false, status, json: async () => { throw new Error('no json'); }, text: async () => text }) as unknown as Response;
describe('recruiter verifies her HubSpot token', () => {
  it('given a valid token, when tested, then contacts?limit=1 is fetched with Bearer auth', async () => {
    const f = fakeFetch(async () => okJson({}));
    assert.equal(await createHubSpotClient(f).testConnection('tok123'), true);
    assert.equal(callsOf(f).length, 1);
    assert.equal(callsOf(f)[0].url, 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1');
    assert.equal((callsOf(f)[0].init.headers as Record<string, string>).Authorization, 'Bearer tok123');
  });
  it('given a token without the read scope, when tested, then she gets a non-retryable 403', async () => {
    await assert.rejects(() => createHubSpotClient(fakeFetch(async () => fail(403, 'forbidden'))).testConnection('t'), (e: unknown) => {
      assert.ok(e instanceof HubSpotError && e.status === 403 && e.isRetryable === false);
      assert.match((e as Error).message, /403/);
      return true;
    });
  });
});

describe('recruiter saves a search as a HubSpot note', () => {
  it('given note properties, when posted, then the properties wrapper goes out and the id comes back', async () => {
    const f = fakeFetch(async () => okJson({ id: 'n1' }));
    const id = await createHubSpotClient(f).createNote('t', { hs_note_body: 'b', hs_timestamp: 1 });
    assert.equal(id, 'n1');
    assert.equal(callsOf(f)[0].url, 'https://api.hubapi.com/crm/v3/objects/notes');
    assert.deepEqual(JSON.parse(callsOf(f)[0].init.body as string), { properties: { hs_note_body: 'b', hs_timestamp: 1 } });
  });
  it('given a response without an id, when posted, then null comes back', async () => {
    assert.equal(await createHubSpotClient(fakeFetch(async () => okJson({}))).createNote('t', { hs_note_body: 'b', hs_timestamp: 1 }), null);
  });
});

describe('failed HubSpot calls sort themselves into retry vs surfacing', () => {
  it('given a dead network, when called, then the error is retryable status 0', async () => {
    const down = (() => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    await assert.rejects(() => createHubSpotClient(down).testConnection('t'), (e: unknown) => e instanceof HubSpotError && e.isRetryable && e.status === 0);
  });
  it('given 429/500/503, when called, then retryable; given 400/401, when called, then not', async () => {
    for (const s of [429, 500, 503]) {
      await assert.rejects(
        () => createHubSpotClient(fakeFetch(async () => fail(s, 'x'))).testConnection('t'),
        (e: unknown) => e instanceof HubSpotError && e.isRetryable, `status ${s}`,
      );
    }
    for (const s of [400, 401]) {
      await assert.rejects(
        () => createHubSpotClient(fakeFetch(async () => fail(s, 'x'))).testConnection('t'),
        (e: unknown) => e instanceof HubSpotError && !e.isRetryable && e.status === s, `status ${s}`,
      );
    }
  });
});
