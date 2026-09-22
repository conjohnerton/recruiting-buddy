/** Toolbar popup: jump to settings, show the retry backlog at a glance. */
import { RETRY_QUEUE_KEY } from '../storage-keys.ts';
import type { RetryEntry } from '../types.ts';

const openButton = document.getElementById('open');
openButton?.addEventListener('click', () => {
  void chrome.runtime.openOptionsPage();
});

void (async () => {
  try {
    const stored = await chrome.storage.local.get({ [RETRY_QUEUE_KEY]: [] });
    const pending = (stored[RETRY_QUEUE_KEY] as RetryEntry[]).length;
    const line = document.getElementById('pending');
    if (line) line.textContent = pending ? `${pending} search log(s) waiting to retry.` : 'No logs waiting to retry.';
  } catch {
    /* storage unavailable; leave blank */
  }
})();