/* HubSpot API client. Pure factory: fetch injected, no chrome.*. */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});
  RB.HUB_BASE = 'https://api.hubapi.com';

  class HubError extends Error {
    constructor(status, message, retryable) {
      super(message);
      this.name = 'RB.HubError';
      this.status = status;
      this.retryable = !!retryable;
    }
  }
  RB.HubError = HubError;

  RB.createHubSpot = function (opts) {
    const o = opts || {};
    const fetchFn = o.fetchImpl || fetch;
    const base = o.baseUrl || RB.HUB_BASE;

    async function req(token, path, init) {
      let res;
      try {
        res = await fetchFn(base + path, Object.assign({}, init, {
          headers: Object.assign(
            { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            (init && init.headers) || {},
          ),
        }));
      } catch (err) {
        throw new HubError(0, 'Network error: ' + ((err && err.message) || err), true);
      }
      if (res.ok) return res;
      const retryable = res.status === 429 || res.status >= 500;
      let detail = '';
      try {
        detail = String(await res.text()).slice(0, 200);
      } catch {
        /* ignore */
      }
      throw new HubError(res.status, 'HubSpot ' + res.status + (detail ? ' — ' + detail : ''), retryable);
    }

    return {
      async testConnection(token) {
        await req(token, '/crm/v3/objects/contacts?limit=1', { method: 'GET' });
        return true;
      },
      async createNote(token, properties) {
        const res = await req(token, '/crm/v3/objects/notes', {
          method: 'POST',
          body: JSON.stringify({ properties }),
        });
        let data = null;
        try {
          data = await res.json();
        } catch {
          /* empty body */
        }
        return (data && data.id) || null;
      },
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB;
})(typeof self !== 'undefined' ? self : globalThis);
