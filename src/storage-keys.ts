/** chrome.storage.local keys. One place so the worker and options page can't drift. */
export const TOKEN_KEY = 'rb.token';
export const LOGGED_SEARCHES_KEY = 'rb.loggedSearches';
export const RETRY_QUEUE_KEY = 'rb.retryQueue';

/** Alarm that wakes the worker when the next retry comes due. */
export const RETRY_ALARM = 'rb-retry';
