/**
 * Date utility helpers used across the dashboard.
 */

/** Format a duration in minutes as "Xh Ym" or "Ym" */
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format an ISO date string to a human-friendly date: "14 Mar 2026" */
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Format an ISO date string to a time: "10:30" */
export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

/** Return the YYYY-MM-DD string for today in local time */
export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Build the last N days as YYYY-MM-DD strings (inclusive of today), oldest first.
 */
export function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

/** Number of whole calendar days between two YYYY-MM-DD strings */
export function daysBetween(from, to) {
  return Math.round((new Date(to) - new Date(from)) / 86400000);
}
