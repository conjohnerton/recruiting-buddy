/* Shared pure helpers. Classic script: loads in SW, content scripts, and node.
 * No DOM, no chrome.* access here — keeps every function unit-testable. */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  RB.DEDUPE_CAP = 1000;
  RB.RETRY_MAX = 5;

  /** FNV-1a 32-bit hex. Deterministic, no allocs beyond output string. */
  RB.hashStr = function (s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  };

  /** Strip fragment; unparseable input returned unchanged (never throws). */
  RB.normalizeUrl = function (url) {
    try {
      const u = new URL(url);
      u.hash = '';
      return u.toString();
    } catch {
      return String(url);
    }
  };

  /** Dedupe key: hash(normalized URL + UTC minute bucket). */
  RB.searchDedupeKey = function (url, observedAtMs) {
    const minute = Math.floor(Number(observedAtMs) / 60000);
    return RB.hashStr(RB.normalizeUrl(url) + '|' + minute);
  };

  /** Cap array to last `max` items, oldest dropped. Returns same ref. */
  RB.capArray = function (arr, max) {
    if (arr.length > max) arr.splice(0, arr.length - max);
    return arr;
  };

  /** Retry backoff: 5s,10s,20s,40s,60s cap. attempt is 1-based. */
  RB.backoffMs = function (attempt) {
    return Math.min(60000, 5000 * 2 ** (Math.max(1, attempt) - 1));
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB;
})(typeof self !== 'undefined' ? self : globalThis);
