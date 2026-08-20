/* ── CORTEXA shared utilities ─────────────────────────────────────────── */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

let seq = 0;
export function uid(prefix = 'id'): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/* dates ─────────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtWeekday(iso: string): string {
  return DAYS[new Date(iso).getDay()];
}

export function fmtTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtTime12(t?: string): string {
  if (!t) return '';
  const [hs, ms] = t.split(':').map(Number);
  const ampm = hs >= 12 ? 'PM' : 'AM';
  const h = hs % 12 === 0 ? 12 : hs % 12;
  return `${h}:${String(ms).padStart(2, '0')} ${ampm}`;
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function daysUntil(iso?: string): number {
  if (!iso) return Infinity;
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const d = new Date(iso);
  const startThen = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startThen - startNow) / 86400000);
}

export function isOverdueDate(iso?: string): boolean {
  return daysUntil(iso) < 0;
}

export function isToday(iso?: string): boolean {
  return daysUntil(iso) === 0;
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let core: string;
  if (mins < 1) core = 'just now';
  else if (mins < 60) core = `${mins}m`;
  else if (hrs < 24) core = `${hrs}h`;
  else if (days < 30) core = `${days}d`;
  else core = fmtDateShort(iso);
  if (core === 'just now') return core;
  return diff >= 0 ? `${core} ago` : `in ${core}`;
}

export function dueLabel(iso?: string): { text: string; tone: 'overdue' | 'today' | 'soon' | 'later' | 'none' } {
  if (!iso) return { text: 'No deadline', tone: 'none' };
  const d = daysUntil(iso);
  if (d < 0) return { text: `Overdue ${Math.abs(d)}d`, tone: 'overdue' };
  if (d === 0) return { text: 'Due today', tone: 'today' };
  if (d === 1) return { text: 'Due tomorrow', tone: 'soon' };
  if (d <= 7) return { text: `Due in ${d} days`, tone: 'soon' };
  return { text: `Due ${fmtDateShort(iso)}`, tone: 'later' };
}

/** offset-days helper for seed data: d(-3) = 3 days ago at 09:30, d(2, 14) = in 2 days at 14:00 */
export function d(offsetDays: number, hour = 9, minute = 30): string {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

export function dateOnly(offsetDays: number): string {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

export function monthKey(iso: string): string {
  const dt = new Date(iso);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

export function lastNMonthKeys(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function pad(n: number, w = 4): string {
  return String(n).padStart(w, '0');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w && w[0] === w[0].toUpperCase())
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || name.slice(0, 2).toUpperCase();
}

export function fileSizeLabel(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.round(kb)} KB`;
}

/* export helpers ────────────────────────────────────────────────────── */

export function toCSV(rows: Record<string, string | number>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export function download(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

export function highlightParts(text: string, q: string): { text: string; hit: boolean }[] {
  if (!q.trim()) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const needle = q.trim().toLowerCase();
  const parts: { text: string; hit: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) {
      parts.push({ text: text.slice(i), hit: false });
      break;
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), hit: false });
    parts.push({ text: text.slice(idx, idx + needle.length), hit: true });
    i = idx + needle.length;
  }
  return parts;
}
