/**
 * KokiKasir — Secure Error Logger
 * Stores up to 100 recent error entries in localStorage.
 * Scrubs tokens, passwords, and sensitive headers before writing.
 */

const LS_KEY = 'kokikasir_error_logs';
const MAX_ENTRIES = 100;
export const APP_VERSION = '1.3.0';

/** Regex patterns for sensitive data scrubbing */
const SENSITIVE_PATTERNS = [
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g, // JWT tokens
  /Bearer\s+[^\s"']+/gi,
  /password["'\s:=]+[^\s,"'&;]+/gi,
  /secret["'\s:=]+[^\s,"'&;]+/gi,
  /api[_-]?key["'\s:=]+[^\s,"'&;]+/gi,
  /Authorization:\s*[^\n"']*/gi,
  /supabase[._-]?(key|token|secret)["'\s:=]+[^\s,"'&;]+/gi,
];

/**
 * Scrubs sensitive data from a string before logging.
 * @param {string} str
 * @returns {string}
 */
function scrubSensitive(str) {
  if (typeof str !== 'string') return String(str ?? '');
  let result = str;
  SENSITIVE_PATTERNS.forEach(pattern => {
    result = result.replace(pattern, '[REDACTED]');
  });
  return result;
}

/**
 * Returns the current WIB timestamp as ISO string.
 * @returns {string}
 */
function getWIBTimestamp() {
  return new Date().toISOString();
}

/**
 * Reads all error logs from localStorage.
 * @returns {Array}
 */
export function readErrorLogs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Writes an array of log entries to localStorage.
 * @param {Array} logs
 */
function writeErrorLogs(logs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(logs));
  } catch {
    // localStorage quota exceeded — trim aggressively and retry
    try {
      const trimmed = logs.slice(-20);
      localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
    } catch {
      // silent fail — logging must never crash the app
    }
  }
}

/**
 * Appends a new error entry to the log, capped at MAX_ENTRIES.
 * Scrubs sensitive data from message and stack.
 *
 * @param {object} opts
 * @param {string} opts.message
 * @param {string} [opts.stack]
 * @param {string} [opts.route]
 * @param {string} [opts.componentStack]
 * @returns {object} The saved log entry
 */
export function logError({ message, stack, route, componentStack }) {
  const entry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: getWIBTimestamp(),
    message: scrubSensitive(message ?? 'Unknown error'),
    stack: scrubSensitive(stack ?? ''),
    componentStack: scrubSensitive(componentStack ?? ''),
    route: scrubSensitive(route ?? window?.location?.pathname ?? ''),
    appVersion: APP_VERSION,
    reported: false,
  };

  const existing = readErrorLogs();
  const updated = [...existing, entry].slice(-MAX_ENTRIES);
  writeErrorLogs(updated);

  return entry;
}

/**
 * Marks a list of log entries as reported (e.g., after uploading to Supabase).
 * @param {string[]} ids
 */
export function markLogsAsReported(ids) {
  const existing = readErrorLogs();
  const updated = existing.map(e =>
    ids.includes(e.id) ? { ...e, reported: true } : e
  );
  writeErrorLogs(updated);
}

/**
 * Clears all stored error logs.
 */
export function clearErrorLogs() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // silent fail
  }
}

/**
 * Returns unreported log entries suitable for upload.
 * @returns {Array}
 */
export function getUnreportedLogs() {
  return readErrorLogs().filter(e => !e.reported);
}

/**
 * Exports all logs as a downloadable JSON file.
 */
export function downloadErrorLogsJson() {
  const logs = readErrorLogs();
  const payload = {
    app: 'KokiKasir',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    totalEntries: logs.length,
    unreportedEntries: logs.filter(e => !e.reported).length,
    logs
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kokikasir-error-log-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
