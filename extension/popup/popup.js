(() => {
  // src/storage-keys.ts
  var TOKEN_KEY = "rb.token";
  var LOGGED_SEARCHES_KEY = "rb.loggedSearches";
  var RETRY_QUEUE_KEY = "rb.retryQueue";
  var RETRY_ALARM = "rb-retry";
  var LINKEDIN_BUTTON_KEY = "rb.showButton.linkedin";
  var DOCCAFE_BUTTON_KEY = "rb.showButton.doccafe";

  // src/popup/popup.ts
  function element(id) {
    return document.getElementById(id);
  }
  function showStatus(text, isError = false) {
    const status = element("status");
    if (!status)
      return;
    status.textContent = text;
    status.style.color = isError ? "#b3261e" : "#137333";
  }
  async function logCurrentPage() {
    const logButton = element("log");
    if (!logButton)
      return;
    logButton.disabled = true;
    showStatus("Reading the current tab…");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        showStatus("Not a LinkedIn/DocCafe search page.", true);
        return;
      }
      const reply = await chrome.tabs.sendMessage(tab.id, { type: "RB_BUILD_PAYLOAD" });
      if (!reply.ok) {
        showStatus(reply.error ?? "Not a search page.", true);
        return;
      }
      const workerReply = await chrome.runtime.sendMessage({
        type: "RB_LOG_SEARCH",
        payload: reply.payload
      });
      if (workerReply.ok)
        showStatus(workerReply.deduped ? "Already logged ✓" : "Saved ✓");
      else if (workerReply.queued)
        showStatus("Queued — will retry");
      else
        showStatus(`Error: ${workerReply.error ?? "unknown"}`, true);
      refreshBacklog();
    } catch {
      showStatus("Open a LinkedIn/DocCafe search page, then click again.", true);
    } finally {
      logButton.disabled = false;
    }
  }
  async function refreshBacklog() {
    try {
      const stored = await chrome.storage.local.get({ [RETRY_QUEUE_KEY]: [] });
      const pending = stored[RETRY_QUEUE_KEY].length;
      const line = element("pending");
      if (line)
        line.textContent = pending ? `${pending} search log(s) waiting to retry.` : "No logs waiting to retry.";
    } catch {}
  }
  element("log")?.addEventListener("click", () => void logCurrentPage());
  element("open")?.addEventListener("click", () => void chrome.runtime.openOptionsPage());
  refreshBacklog();
})();
