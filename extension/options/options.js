'use strict';
const $ = (id) => document.getElementById(id);

function setStatus(text, isError) {
  const el = $('status');
  el.textContent = text;
  el.style.color = isError ? '#b3261e' : '#137333';
}

async function refreshPending() {
  try {
    const s = await chrome.storage.local.get({ 'rb.retryQueue': [] });
    const n = s['rb.retryQueue'].length;
    $('pending').textContent = n ? `${n} search log(s) pending retry.` : 'Nothing pending retry.';
  } catch {
    $('pending').textContent = '';
  }
}

async function init() {
  try {
    const s = await chrome.storage.local.get({ 'rb.token': '' });
    $('token').value = s['rb.token'] || '';
  } catch {
    /* storage unavailable; leave blank */
  }
  await refreshPending();

  $('save').addEventListener('click', async () => {
    try {
      await chrome.storage.local.set({ 'rb.token': $('token').value.trim() });
      setStatus('Saved.', false);
    } catch (e) {
      setStatus('Save failed: ' + (e && e.message), true);
    }
  });

  $('test').addEventListener('click', () => {
    setStatus('Testing…', false);
    try {
      chrome.runtime.sendMessage({ type: 'RB_TEST_CONNECTION' }, (resp) => {
        if (chrome.runtime.lastError) {
          setStatus('Test failed: ' + chrome.runtime.lastError.message, true);
          return;
        }
        if (resp && resp.ok) setStatus('Connection OK.', false);
        else setStatus('Test failed: ' + ((resp && resp.error) || 'unknown'), true);
        refreshPending();
      });
    } catch (e) {
      setStatus('Test failed: ' + (e && e.message), true);
    }
  });
}

init();
