// ── CSV parsing ──────────────────────────────────────────────────────────────

export function parseCSV(text) {
  const lines = text.split('\n');
  // Strip blank / all-comma lines
  const nonEmpty = lines.filter((l) => l.replace(/,/g, '').trim().length > 0);
  if (nonEmpty.length === 0) return [];
  const headers = parseCSVLine(nonEmpty[0]);
  const rows = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const values = parseCSVLine(nonEmpty[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Date parsing ─────────────────────────────────────────────────────────────
// Handles DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY

export function parseDate(s) {
  if (!s || typeof s !== 'string') return null;
  s = s.trim();
  if (!s) return null;

  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // DD/MM/YYYY  (Indian format — preferred)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  // DD-MM-YYYY
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  // Fallback to native (handles "Apr 1, 2026" etc.)
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── Platform helpers ──────────────────────────────────────────────────────────

export function normPlatform(name) {
  return (name || '').toLowerCase().trim();
}

export function isTargetPlatform(name) {
  const n = normPlatform(name);
  return n.includes('zepto') || n.includes('instamart');
}

export function getDisplayPlatform(name) {
  const n = normPlatform(name);
  if (n.includes('zepto')) return 'Zepto';
  if (n.includes('instamart')) return 'Instamart';
  return name;
}

// ── Week helpers ──────────────────────────────────────────────────────────────

const MS_DAY = 24 * 60 * 60 * 1000;

// Returns 0-based week index relative to firstWeekStart (a Monday).
// Returns -1 if date is before firstWeekStart.
export function getWeekIndex(date, firstWeekStart) {
  if (!date) return -1;
  const d = midnight(date);
  const f = midnight(firstWeekStart);
  const diffMs = d - f;
  if (diffMs < 0) return -1;
  return Math.floor(diffMs / (7 * MS_DAY));
}

export function getWeekLabel(idx, firstWeekStart) {
  const start = new Date(midnight(firstWeekStart).getTime() + idx * 7 * MS_DAY);
  const end = new Date(start.getTime() + 6 * MS_DAY);
  return `${fmtShort(start)} – ${fmtShort(end)}`;
}

function midnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtShort(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtDateDisp(d) {
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── TAT ───────────────────────────────────────────────────────────────────────
// Deadline = requestDate + 2 calendar days.
// If that day is Sunday (day 0), push to Monday.
// Saturday is treated as a normal day.

export function calcTATDeadline(requestDate) {
  let deadline = new Date(midnight(requestDate).getTime() + 2 * MS_DAY);
  if (deadline.getDay() === 0) deadline = new Date(deadline.getTime() + MS_DAY);
  return deadline;
}

export function diffDays(a, b) {
  return Math.round((midnight(a) - midnight(b)) / MS_DAY);
}

// ── Number parsing ────────────────────────────────────────────────────────────

export function parseNum(s) {
  if (s === null || s === undefined || s === '') return 0;
  const n = parseFloat(String(s).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}
