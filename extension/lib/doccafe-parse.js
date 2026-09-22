/* DocCafe listing parser. Pure; ground truth fetched live 2026-09-22. */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  const EMPTY = { keywords: '', specialty: '', state: '', city: '', jobType: '' };

  /** 'ut' -> 'UT'; 'salt-lake-city' -> 'Salt Lake City'. Never throws. */
  function facetValue(raw) {
    const s = String(raw);
    if (/^[a-zA-Z]{2}$/.test(s)) return s.toUpperCase();
    return s
      .split('-')
      .map(function (w) {
        return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w;
      })
      .join(' ');
  }

  /** '169 Sleep Medicine Physician jobs · DocCafe' -> 'Sleep Medicine Physician'. */
  RB.docCafeKeywordsFromTitle = function (pageTitle) {
    return String(pageTitle || '')
      .replace(/^\s*\d[\d,]*\s+/, '')
      .replace(/\s*·\s*DocCafe\s*/i, '')
      .replace(/\s+job(s?)\s*$/i, '')
      .trim();
  };

  /** Decoded path segments. Throws on unparseable URLs. */
  function segments(url) {
    return new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .map(function (s) {
        try {
          return decodeURIComponent(s);
        } catch {
          return s;
        }
      });
  }

  /**
   * Parse listing URL + page title. First '-jobs' segment is the occupation
   * (not keywords); facets: specialty/X, type/Y, us/state/S, city/C.
   * Non-listing paths (/job/..., /company/..., anything without '-jobs') ->
   * all fields ''. Garbage URLs never throw (all '').
   */
  RB.parseDocCafeSearch = function (url, pageTitle) {
    let segs;
    try {
      segs = segments(url);
    } catch {
      return Object.assign({}, EMPTY);
    }
    if (!segs.length || !segs[0].toLowerCase().endsWith('-jobs')) return Object.assign({}, EMPTY);
    const out = Object.assign({}, EMPTY);
    out.keywords = RB.docCafeKeywordsFromTitle(pageTitle);
    for (let i = 0; i < segs.length; i++) {
      const k = segs[i].toLowerCase();
      if (k === 'specialty' && i + 1 < segs.length) {
        i++;
        out.specialty = facetValue(segs[i]);
      } else if (k === 'type' && i + 1 < segs.length) {
        i++;
        out.jobType = facetValue(segs[i]);
      } else if (k === 'us' && i + 2 < segs.length && segs[i + 1].toLowerCase() === 'state') {
        out.state = facetValue(segs[i + 2]);
        i += 2;
      } else if (k === 'city' && i + 1 < segs.length) {
        i++;
        out.city = facetValue(segs[i]);
      }
    }
    return out;
  };

  /**
   * 'Displaying 1 - 30 jobs out of 169' on root text, else leading title
   * number, else null. Root is stub-DOM-friendly ({textContent}).
   */
  RB.extractDocCafeCount = function (root, pageTitle) {
    try {
      const m = String((root && root.textContent) || '').match(
        /Displaying\s+\d[\d,]*\s*-\s*\d[\d,]*\s+jobs?\s+out\s+of\s+([\d,]+)/i
      );
      if (m) return parseInt(m[1].replace(/,/g, ''), 10);
    } catch {
      /* try title fallback */
    }
    try {
      const m = String(pageTitle || '').match(/^\s*([\d,]+)\s/);
      if (m) return parseInt(m[1].replace(/,/g, ''), 10);
    } catch {
      /* keep null */
    }
    return null;
  };

  RB.buildDocCafePayload = function (url, pageTitle, countOrNull, observedAtMs) {
    const p = RB.parseDocCafeSearch(url, pageTitle);
    const location = [p.city, p.state].filter(Boolean).join(', ');
    return {
      platform: 'DocCafe',
      url: String(url),
      keywords: p.keywords,
      title: '',
      company: '',
      location,
      specialty: p.specialty,
      state: p.state,
      city: p.city,
      jobType: p.jobType,
      resultCount: countOrNull == null ? null : Number(countOrNull),
      observedAtMs: Number(observedAtMs),
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB;
})(typeof self !== 'undefined' ? self : globalThis);