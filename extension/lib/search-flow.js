/* Search-log flow: dedupe check -> create note -> record hash. Pure except createNote. */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  /**
   * deps: { token, logged[], createNote(token, props)->id, nowMs }.
   * Returns { action: 'logged'|'duplicate', key }.
   * Throws RB.HubError (retryable or not); never records hash on failure.
   */
  RB.handleLogSearch = async function (deps, payload) {
    if (!deps.token) {
      throw new RB.HubError(0, 'HubSpot token not set. Open Recruiting Buddy options and paste a private-app token.', false);
    }
    const key = RB.searchDedupeKey(payload.url, payload.observedAtMs);
    if (RB.hasHash(deps.logged, key)) return { action: 'duplicate', key };
    await deps.createNote(deps.token, RB.buildNoteProperties(payload));
    RB.recordHash(deps.logged, key);
    return { action: 'logged', key };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB;
})(typeof self !== 'undefined' ? self : globalThis);
