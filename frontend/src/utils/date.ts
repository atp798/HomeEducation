/**
 * Parse a date string from the backend as UTC.
 *
 * SQLite datetime('now') returns strings like '2026-03-26 04:00:11' with no
 * timezone marker. Browsers parse such strings as *local* time, causing an
 * N-hour offset on non-UTC machines.  We normalise by replacing the space
 * separator with 'T' and appending 'Z' so the value is always treated as UTC.
 *
 * Strings that already carry timezone info (ISO 8601 with 'Z' or '±HH:MM')
 * are left unchanged.
 */
export function parseUTC(dateStr: string): Date {
  if (!dateStr) return new Date(0)
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr)
  }
  return new Date(dateStr.replace(' ', 'T') + 'Z')
}
