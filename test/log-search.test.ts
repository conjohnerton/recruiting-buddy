import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { HubSpotError } from '../src/hubspot-client.ts';
import { logSearchOnce, type LogSearchDeps } from '../src/log-search.ts';
import type { SearchPayload } from '../src/types.ts';

const NOON = Date.UTC(2026, 8, 22, 13, 0, 0);
const search: SearchPayload = {
  platform: 'LinkedIn', url: 'https://www.linkedin.com/search/results/people/?keywords=rn',
  keywords: 'rn', title: '', company: '', location: '',
  specialty: '', state: '', city: '', jobType: '',
  resultCount: 10, observedAtMs: NOON,
};

function depsWith(postNote: LogSearchDeps['postNote'], token = 't'): LogSearchDeps & { loggedKeys: string[] } {
  return { token, loggedKeys: [], postNote };
}

describe('recruiter clicks "Log this search"', () => {
  it('given no token saved, when she clicks, then she is told to open options — nothing is posted or remembered', async () => {
    const deps = depsWith(async () => { throw new Error('must not post'); }, '');
    await assert.rejects(() => logSearchOnce(deps, search), (e: unknown) => {
      assert.ok(e instanceof HubSpotError && !e.isRetryable && /token/i.test(e.message));
      return true;
    });
    assert.deepEqual(deps.loggedKeys, []);
  });
  it('given a fresh search, when she clicks, then one note posts with her token and the search is remembered', async () => {
    const deps = depsWith(async () => 'n9');
    let seen: { token: string; body: unknown } | null = null;
    deps.postNote = async (token, props) => { seen = { token, body: props.hs_note_body }; return 'n9'; };
    assert.equal(await logSearchOnce(deps, search), 'logged');
    assert.equal(seen!.token, 't');
    assert.equal(typeof seen!.body, 'string');
    assert.equal(deps.loggedKeys.length, 1);
  });
  it('given the same search clicked twice, when she clicks again, then no second note posts', async () => {
    let posts = 0;
    const deps = depsWith(async () => { posts++; return 'n'; });
    assert.equal(await logSearchOnce(deps, search), 'logged');
    assert.equal(await logSearchOnce(deps, search), 'duplicate');
    assert.equal(posts, 1);
  });
  it('given HubSpot fails, when she clicks, then the error propagates and the search stays loggable', async () => {
    const boom = new HubSpotError(500, 'HubSpot 500', true);
    const deps = depsWith(async () => { throw boom; });
    await assert.rejects(() => logSearchOnce(deps, search), (e: unknown) => e === boom);
    assert.deepEqual(deps.loggedKeys, []);
  });
});
