/**
 * The floating pill both search pages share. Each site passes two
 * site-specific functions; everything else (button, messaging, labels)
 * lives here so the two buttons can't drift apart.
 */
import type { BuildPayloadReply, SearchPayload, WorkerReply } from '../types.ts';

export interface ButtonSite {
  /** False on non-search pages (job detail, homepage) → button stays hidden. */
  isSearchPage(): boolean;
  /** Build the worker payload at click time. Null → not loggable (do nothing).
   *  May throw → caught below. */
  buildPayload(): SearchPayload | null;
}

const BUTTON_ID = 'rb-log-search';
const IDLE_LABEL = 'Log this search';

/** The storage key deciding whether this site shows the floating pill at all. */
export type ShowButtonKey = 'rb.showButton.linkedin' | 'rb.showButton.doccafe';

function findButton(): HTMLButtonElement | null {
  try {
    return document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  } catch {
    return null;
  }
}

function createButton(onClick: () => void, accent: string): HTMLButtonElement | null {
  try {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = IDLE_LABEL;
    btn.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:999999;' +
      'padding:10px 14px;border:0;border-radius:8px;cursor:pointer;' +
      `background:${accent};color:#fff;font:600 14px system-ui,sans-serif;` +
      'box-shadow:0 2px 8px rgba(0,0,0,.3);';
    btn.addEventListener('click', onClick);
    document.documentElement.appendChild(btn);
    return btn;
  } catch {
    return null;
  }
}

function showStatus(btn: HTMLButtonElement, text: string): void {
  try {
    btn.textContent = text;
    btn.disabled = text !== IDLE_LABEL;
    if (text === IDLE_LABEL) return;
    setTimeout(() => {
      try {
        btn.textContent = IDLE_LABEL;
        btn.disabled = false;
      } catch {
        /* page gone */
      }
    }, 2000);
  } catch {
    /* ignore */
  }
}

/** Mount the pill; safe to call repeatedly (SPA navigation re-checks visibility).
 *  Visibility = user toggle AND search page. Toggle changes apply live via
 *  storage.onChanged, so she never needs a reload after settings. */
export function mountLogButton(site: ButtonSite, accent: string, showButtonKey: ShowButtonKey): void {
  const onClick = () => {
    const btn = findButton();
    if (!btn || btn.disabled) return;
    try {
      showStatus(btn, 'Logging…');
      const payload = site.buildPayload();
      if (!payload) {
        showStatus(btn, IDLE_LABEL);
        return;
      }
      chrome.runtime.sendMessage({ type: 'RB_LOG_SEARCH', payload }, (resp: WorkerReply) => {
        if (chrome.runtime.lastError) showStatus(btn, 'Error — retry');
        else if (resp?.ok) showStatus(btn, resp.deduped ? 'Already logged ✓' : 'Saved ✓');
        else if (resp?.queued) showStatus(btn, 'Queued — will retry');
        else showStatus(btn, 'Error — retry');
      });
    } catch {
      showStatus(btn, IDLE_LABEL);
    }
  };

  const refresh = () => {
    try {
      const btn = findButton() ?? createButton(onClick, accent);
      if (btn) btn.style.display = site.isSearchPage() && floatingEnabled ? '' : 'none';
    } catch {
      /* ignore */
    }
  };

  let floatingEnabled = true;
  try {
    void chrome.storage.local.get({ [showButtonKey]: true }).then((s) => {
      floatingEnabled = s[showButtonKey] !== false;
      refresh();
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (showButtonKey in changes) {
        floatingEnabled = changes[showButtonKey].newValue !== false;
        refresh();
      }
    });
  } catch {
    /* storage unavailable; default to visible */
  }

  try {
    refresh();
    setInterval(refresh, 2000);
    window.addEventListener('popstate', refresh);
  } catch {
    /* ignore */
  }
}

/** Answer the popup's "log this page" request with a ready payload (or an
 *  explanation when we are not on a search page). */
export function mountPayloadListener(build: () => SearchPayload | null): void {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'RB_BUILD_PAYLOAD') {
      try {
        const payload = build();
        if (payload) sendResponse({ ok: true, payload } satisfies BuildPayloadReply);
        else sendResponse({ ok: false, error: 'Not a search page.' } satisfies BuildPayloadReply);
      } catch (e) {
        sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Could not read the page.' } satisfies BuildPayloadReply);
      }
    }
    return false;
  });
}
