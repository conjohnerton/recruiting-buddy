/**
 * The floating pill both search pages share. Each site passes two
 * site-specific functions; everything else (button, messaging, labels)
 * lives here so the two buttons can't drift apart.
 */
import type { SearchPayload, WorkerReply } from '../types.ts';

export interface ButtonSite {
  /** False on non-search pages (job detail, homepage) → button stays hidden. */
  isSearchPage(): boolean;
  /** Build the worker payload at click time. May throw → caught below. */
  buildPayload(): SearchPayload;
}

const BUTTON_ID = 'rb-log-search';
const IDLE_LABEL = 'Log this search';

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

/** Mount the pill; safe to call repeatedly (SPA navigation re-checks visibility). */
export function mountLogButton(site: ButtonSite, accent: string): void {
  const onClick = () => {
    const btn = findButton();
    if (!btn || btn.disabled) return;
    try {
      showStatus(btn, 'Logging…');
      const payload = site.buildPayload();
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
      if (btn) btn.style.display = site.isSearchPage() ? '' : 'none';
    } catch {
      /* ignore */
    }
  };

  try {
    refresh();
    setInterval(refresh, 2000);
    window.addEventListener('popstate', refresh);
  } catch {
    /* ignore */
  }
}
