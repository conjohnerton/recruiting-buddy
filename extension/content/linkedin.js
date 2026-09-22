/* LinkedIn floating "Log this search" button. No unhandled throws. */
(function () {
  'use strict';
  const BTN_ID = 'rb-log-search';
  const LABEL = 'Log this search';
  let lastUrl = '';

  function onPeopleResults() {
    try {
      return window.location.pathname.indexOf('/search/results/people') === 0;
    } catch {
      return false;
    }
  }

  function ensureButton() {
    try {
      let btn = document.getElementById(BTN_ID);
      if (btn) return btn;
      btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.textContent = LABEL;
      btn.style.cssText =
        'position:fixed;right:16px;bottom:16px;z-index:999999;' +
        'padding:10px 14px;border:0;border-radius:8px;cursor:pointer;' +
        'background:#0a66c2;color:#fff;font:600 14px system-ui,sans-serif;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.3);';
      btn.addEventListener('click', onClick);
      document.documentElement.appendChild(btn);
      return btn;
    } catch {
      return null;
    }
  }

  function setLabel(btn, text) {
    try {
      btn.textContent = text;
      btn.disabled = text !== LABEL;
    } catch {
      /* ignore */
    }
  }

  function onClick() {
    const btn = document.getElementById(BTN_ID);
    try {
      if (!btn || btn.disabled) return;
      setLabel(btn, 'Logging…');
      const payload = RB.buildLinkedInPayload(
        window.location.href,
        RB.extractLinkedInCount(document),
        Date.now(),
      );
      chrome.runtime.sendMessage({ type: 'RB_LOG_SEARCH', payload }, (resp) => {
        try {
          if (chrome.runtime.lastError) {
            setLabel(btn, 'Error — retry');
          } else if (resp && resp.ok) {
            setLabel(btn, resp.deduped ? 'Already logged ✓' : 'Saved ✓');
          } else if (resp && resp.queued) {
            setLabel(btn, 'Queued — will retry');
          } else {
            setLabel(btn, 'Error — retry');
          }
          setTimeout(() => setLabel(btn, LABEL), 2000);
        } catch {
          /* ignore */
        }
      });
    } catch {
      if (btn) setLabel(btn, LABEL);
    }
  }

  function tick() {
    try {
      const url = window.location.href;
      if (url !== lastUrl) lastUrl = url;
      const btn = ensureButton();
      if (btn) btn.style.display = onPeopleResults() ? '' : 'none';
    } catch {
      /* ignore */
    }
  }

  try {
    tick();
    setInterval(tick, 2000);
    window.addEventListener('popstate', tick);
  } catch {
    /* ignore */
  }
})();
