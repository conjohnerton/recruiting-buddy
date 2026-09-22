'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/lib/util.js');
require('../extension/lib/search-note.js');
require('../extension/lib/hubspot.js');
require('../extension/lib/store.js');
const RB = require('../extension/lib/search-flow.js');

const AT = Date.UTC(2026, 8, 22, 13, 0, 0);
const payload = {
  platform: 'LinkedIn', url: 'https://www.linkedin.com/search/results/people/?keywords=rn',
  keywords: 'rn', title: '', company: '', location: '',
  specialty: '', state: '', city: '', jobType: '',
  resultCount: 10, observedAtMs: AT,
};

describe('handleLogSearch', () => {
  it('missing token throws non-retryable, records nothing', async () => {
    const logged = [];
    let called = 0;
    await assert.rejects(
      () => RB.handleLogSearch({ token: '', logged, createNote: async () => { called++; }, nowMs: AT }, payload),
      (e) => e.name === 'RB.HubError' && e.retryable === false && /token/i.test(e.message),
    );
    assert.equal(called, 0);
    assert.deepEqual(logged, []);
  });

  it('logs new search: createNote gets token+props, hash recorded', async () => {
    const logged = [];
    let got = null;
    const r = await RB.handleLogSearch({
      token: 't', logged, createNote: async (tok, props) => { got = { tok, props }; return 'n9'; }, nowMs: AT,
    }, payload);
    assert.equal(r.action, 'logged');
    assert.equal(got.tok, 't');
    assert.equal(typeof got.props.hs_note_body, 'string');
    assert.equal(got.props.hs_timestamp, AT);
    assert.equal(logged.length, 1);
    assert.equal(r.key, logged[0]);
  });

  it('duplicate skips createNote', async () => {
    const logged = [];
    let called = 0;
    const deps = { token: 't', logged, createNote: async () => { called++; }, nowMs: AT };
    await RB.handleLogSearch(deps, payload);
    const r = await RB.handleLogSearch(deps, payload);
    assert.equal(r.action, 'duplicate');
    assert.equal(called, 1);
  });

  it('createNote failure propagates without recording hash', async () => {
    const logged = [];
    const boom = new RB.HubError(500, 'HubSpot 500', true);
    await assert.rejects(
      () => RB.handleLogSearch({ token: 't', logged, createNote: async () => { throw boom; }, nowMs: AT }, payload),
      (e) => e === boom,
    );
    assert.deepEqual(logged, []);
  });
});
