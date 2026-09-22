/* LinkedIn people-search extraction. Pure; stub-DOM-friendly. */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  function textsOf(rootEl) {
    const out = [];
    try {
      const nodes = (rootEl && rootEl.querySelectorAll) ? rootEl.querySelectorAll('div,span,h1,h2,p') : [];
      for (const n of nodes) {
        if (n && typeof n.textContent === 'string' && n.textContent.length < 200) out.push(n.textContent);
      }
      if (rootEl && rootEl.body && typeof rootEl.body.textContent === 'string') out.push(rootEl.body.textContent);
    } catch {
      /* ignore */
    }
    return out;
  }

  /** First /([\d,]+)\s+results?/i across candidates; null when absent. */
  RB.extractLinkedInCount = function (rootEl) {
    for (const t of textsOf(rootEl)) {
      const m = /([\d,]+)\s+results?/i.exec(t);
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ''), 10);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  };

  RB.buildLinkedInPayload = function (url, countOrNull, observedAtMs) {
    const p = RB.parseLinkedInSearch(url);
    return {
      platform: 'LinkedIn',
      url,
      keywords: p.keywords,
      title: p.title,
      company: p.company,
      location: p.location,
      specialty: '',
      state: '',
      city: '',
      jobType: '',
      resultCount: countOrNull == null ? null : countOrNull,
      observedAtMs: Number(observedAtMs),
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB;
})(typeof self !== 'undefined' ? self : globalThis);
