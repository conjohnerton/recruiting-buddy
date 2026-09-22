'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/lib/util.js');
const RB = require('../extension/lib/hubspot.js');

function mockFetch(handler) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  fn.calls = calls;
  return fn;
}
const okRes = (body) => ({
  ok: true, status: 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
const errRes = (status, text) => ({
  ok: false, status,
  json: async () => { throw new Error('no json'); },
  text: async () => text,
});

describe('testConnection', () => {
  it('GETs contacts?limit=1 with Bearer header, returns true', async () => {
    const fetch = mockFetch(async () => okRes({}));
    const hub = RB.createHubSpot({ fetchImpl: fetch });
    assert.equal(await hub.testConnection('tok123'), true);
    assert.equal(fetch.calls.length, 1);
    assert.equal(fetch.calls[0].url, 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1');
    assert.equal(fetch.calls[0].init.headers.Authorization, 'Bearer tok123');
    assert.equal(fetch.calls[0].init.method, 'GET');
  });
  it('403 surfaces non-retryable HubError with status', async () => {
    const hub = RB.createHubSpot({ fetchImpl: mockFetch(async () => errRes(403, 'forbidden')) });
    await assert.rejects(() => hub.testConnection('t'), (e) => {
      assert.equal(e.name, 'RB.HubError');
      assert.equal(e.status, 403);
      assert.equal(e.retryable, false);
      assert.match(e.message, /403/);
      return true;
    });
  });
});

describe('createNote', () => {
  it('POSTs properties wrapper and returns id', async () => {
    const fetch = mockFetch(async () => okRes({ id: 'n1' }));
    const hub = RB.createHubSpot({ fetchImpl: fetch });
    const id = await hub.createNote('t', { hs_note_body: 'b', hs_timestamp: 1 });
    assert.equal(id, 'n1');
    assert.equal(fetch.calls[0].url, 'https://api.hubapi.com/crm/v3/objects/notes');
    assert.equal(fetch.calls[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(fetch.calls[0].init.body), { properties: { hs_note_body: 'b', hs_timestamp: 1 } });
  });
  it('returns null when response has no id', async () => {
    const hub = RB.createHubSpot({ fetchImpl: mockFetch(async () => okRes({})) });
    assert.equal(await hub.createNote('t', {}), null);
  });
});

describe('retryability', () => {
  it('network failure is retryable status 0', async () => {
    const hub = RB.createHubSpot({ fetchImpl: async () => { throw new TypeError('fetch failed'); } });
    await assert.rejects(() => hub.testConnection('t'), (e) => e.retryable === true && e.status === 0);
  });
  it('429 and 500 retryable; 400 and 401 not', async () => {
    for (const s of [429, 500, 503]) {
      const hub = RB.createHubSpot({ fetchImpl: mockFetch(async () => errRes(s, 'x')) });
      await assert.rejects(() => hub.testConnection('t'), (e) => e.retryable === true, 'status ' + s);
    }
    for (const s of [400, 401]) {
      const hub = RB.createHubSpot({ fetchImpl: mockFetch(async () => errRes(s, 'x')) });
      await assert.rejects(() => hub.testConnection('t'), (e) => e.retryable === false && e.status === s, 'status ' + s);
    }
  });
});
