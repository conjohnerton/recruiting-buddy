/**
 * Toolbar popup. "Log this page's search" works even when the floating
 * buttons are off in settings: it asks the page's content script for a
 * ready payload (same parsing as the pill) and hands it to the worker.
 */
import { RETRY_QUEUE_KEY } from '../storage-keys.ts';
import type { BuildPayloadReply, RetryEntry, SearchPayload, WorkerReply } from '../types.ts';

function element<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function showStatus(text: string, isError = false): void {
  const status = element<HTMLElement>('status');
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? '#b3261e' : '#137333';
}

async function logCurrentPage(): Promise<void> {
  const logButton = element<HTMLButtonElement>('log');
  if (!logButton) return;
  logButton.disabled = true;
  showStatus('Reading the current tab…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      showStatus('Not a LinkedIn/DocCafe search page.', true);
      return;
    }
    const reply = (await chrome.tabs.sendMessage(tab.id, { type: 'RB_BUILD_PAYLOAD' })) as BuildPayloadReply;
    if (!reply.ok) {
      showStatus(reply.error ?? 'Not a search page.', true);
      return;
    }
    const workerReply = (await chrome.runtime.sendMessage({
      type: 'RB_LOG_SEARCH',
      payload: (reply as { payload: SearchPayload }).payload,
    })) as WorkerReply;
    if (workerReply.ok) showStatus(workerReply.deduped ? 'Already logged ✓' : 'Saved ✓');
    else if (workerReply.queued) showStatus('Queued — will retry');
    else showStatus(`Error: ${workerReply.error ?? 'unknown'}`, true);
    void refreshBacklog();
  } catch {
    showStatus('Open a LinkedIn/DocCafe search page, then click again.', true);
  } finally {
    logButton.disabled = false;
  }
}

async function refreshBacklog(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get({ [RETRY_QUEUE_KEY]: [] });
    const pending = (stored[RETRY_QUEUE_KEY] as RetryEntry[]).length;
    const line = element<HTMLElement>('pending');
    if (line) line.textContent = pending ? `${pending} search log(s) waiting to retry.` : 'No logs waiting to retry.';
  } catch {
    /* storage unavailable; leave blank */
  }
}

element<HTMLButtonElement>('log')?.addEventListener('click', () => void logCurrentPage());
element<HTMLButtonElement>('open')?.addEventListener('click', () => void chrome.runtime.openOptionsPage());
void refreshBacklog();