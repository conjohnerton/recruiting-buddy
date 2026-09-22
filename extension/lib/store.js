/* Pure storage-shape helpers: dedupe list + retry queue. No chrome.*. */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});
  RB.RETRY_QUEUE_CAP = 200;

  RB.hasHash = function (logged, key) {
    return logged.includes(key);
  };

  RB.recordHash = function (logged, key) {
    logged.push(key);
    return RB.capArray(logged, RB.DEDUPE_CAP);
  };

  RB.enqueue = function (queue, entry) {
    queue.push(entry);
    return RB.capArray(queue, RB.RETRY_QUEUE_CAP);
  };

  /** Partition queue into due vs future. Pure; caller persists `rest`. */
  RB.dequeueDue = function (queue, nowMs) {
    const due = [];
    const rest = [];
    for (const e of queue) (e.nextRunMs <= nowMs ? due : rest).push(e);
    return { due, rest };
  };

  RB.makeRetryEntry = function (id, payload, nowMs, lastError) {
    return {
      id,
      payload,
      attempt: 1,
      nextRunMs: nowMs + RB.backoffMs(1),
      lastError: String((lastError && lastError.message) || lastError),
    };
  };

  RB.scheduleRetry = function (entry, nowMs) {
    const attempt = entry.attempt + 1;
    return Object.assign({}, entry, { attempt, nextRunMs: nowMs + RB.backoffMs(attempt) });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB;
})(typeof self !== 'undefined' ? self : globalThis);
