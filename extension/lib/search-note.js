/* Search-note builders + pure URL parsers. No DOM, no chrome.*. */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  /** Pull named query params from a URL; missing -> ''. Never throws. */
  RB.parseQueryParams = function (url, names) {
    const out = {};
    for (const n of names) out[n] = '';
    try {
      const q = new URL(url).searchParams;
      for (const n of names) out[n] = (q.get(n) || '').trim();
    } catch {
      /* keep defaults */
    }
    return out;
  };

  /** LinkedIn people search: keywords/title/company/location params. */
  RB.parseLinkedInSearch = function (url) {
    const p = RB.parseQueryParams(url, ['keywords', 'title', 'company', 'location']);
    return { keywords: p.keywords, title: p.title, company: p.company, location: p.location };
  };

  /**
   * Note body per spec:
   * "Searched LinkedIn at <ISO time>: keywords='<kw>' (<N> results) — <url>"
   * title/company/location appended when present; count omitted when null.
   */
  RB.buildSearchNoteBody = function (o) {
    const at = new Date(Number(o.observedAtMs)).toISOString();
    let s = `Searched ${o.platform} at ${at}: keywords='${o.keywords || ''}'`;
    const extras = [];
    if (o.title) extras.push(`title='${o.title}'`);
    if (o.company) extras.push(`company='${o.company}'`);
    if (o.location) extras.push(`location='${o.location}'`);
    if (extras.length) s += ' ' + extras.join(' ');
    if (o.resultCount != null) s += ` (${o.resultCount} results)`;
    return s + ` \u2014 ${o.url}`;
  };

  /** HubSpot note properties for POST /crm/v3/objects/notes. */
  RB.buildNoteProperties = function (o) {
    return {
      hs_note_body: RB.buildSearchNoteBody(o),
      hs_timestamp: Number(o.observedAtMs),
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB;
})(typeof self !== 'undefined' ? self : globalThis);
