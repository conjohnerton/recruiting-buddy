/** Options page: save token, verify it, toggle floating buttons, show backlog. */
import { DOCCAFE_BUTTON_KEY, LINKEDIN_BUTTON_KEY, RETRY_QUEUE_KEY, TOKEN_KEY } from '../storage-keys.ts';
import type { RetryEntry, WorkerReply } from '../types.ts';

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing options element #${id}`);
  return node;
}
const input = (id: string): HTMLInputElement => el(id) as HTMLInputElement;

function showStatus(text: string, isError: boolean): void {
  const status = el('status');
  status.textContent = text;
  status.style.color = isError ? '#b3261e' : '#137333';
}

async function refreshBacklog(): Promise<void> {
  try {
    const s = await chrome.storage.local.get({ [RETRY_QUEUE_KEY]: [] });
    const n = (s[RETRY_QUEUE_KEY] as RetryEntry[]).length;
    el('pending').textContent = n ? `${n} search log(s) waiting to retry.` : 'Nothing waiting to retry.';
  } catch {
    el('pending').textContent = '';
  }
}

async function init(): Promise<void> {
  try {
    const s = await chrome.storage.local.get({
      [TOKEN_KEY]: '',
      [LINKEDIN_BUTTON_KEY]: true,
      [DOCCAFE_BUTTON_KEY]: true,
    });
    input('token').value = (s[TOKEN_KEY] as string) || '';
    input('linkedinToggle').checked = s[LINKEDIN_BUTTON_KEY] !== false;
    input('doccafeToggle').checked = s[DOCCAFE_BUTTON_KEY] !== false;
  } catch {
    /* storage unavailable; leave defaults */
  }
  await refreshBacklog();

  el('save').addEventListener('click', async () => {
    try {
      await chrome.storage.local.set({
        [TOKEN_KEY]: input('token').value.trim(),
        [LINKEDIN_BUTTON_KEY]: input('linkedinToggle').checked,
        [DOCCAFE_BUTTON_KEY]: input('doccafeToggle').checked,
      });
      showStatus('Saved.', false);
    } catch (e) {
      showStatus(`Save failed: ${e instanceof Error ? e.message : e}`, true);
    }
  });

  el('test').addEventListener('click', () => {
    showStatus('Testing…', false);
    try {
      chrome.runtime.sendMessage({ type: 'RB_TEST_CONNECTION' }, (resp: WorkerReply) => {
        if (chrome.runtime.lastError) showStatus(`Test failed: ${chrome.runtime.lastError.message}`, true);
        else if (resp?.ok) showStatus('Connection OK.', false);
        else showStatus(`Test failed: ${resp?.error ?? 'unknown'}`, true);
        void refreshBacklog();
      });
    } catch (e) {
      showStatus(`Test failed: ${e instanceof Error ? e.message : e}`, true);
    }
  });
}

void init();