(() => {
  // src/storage-keys.ts
  var TOKEN_KEY = "rb.token";
  var LOGGED_SEARCHES_KEY = "rb.loggedSearches";
  var RETRY_QUEUE_KEY = "rb.retryQueue";
  var RETRY_ALARM = "rb-retry";

  // src/popup/popup.ts
  var openButton = document.getElementById("open");
  openButton?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  (async () => {
    try {
      const stored = await chrome.storage.local.get({ [RETRY_QUEUE_KEY]: [] });
      const pending = stored[RETRY_QUEUE_KEY].length;
      const line = document.getElementById("pending");
      if (line)
        line.textContent = pending ? `${pending} search log(s) waiting to retry.` : "No logs waiting to retry.";
    } catch {}
  })();
})();
