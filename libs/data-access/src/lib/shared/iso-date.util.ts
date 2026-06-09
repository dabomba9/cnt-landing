/** Shared ISO YYYY-MM-DD primitives — central util replacing the ~9
 *  duplicated `isoKey` / `toIso` / `parseIso` / `nextDayIso` helpers
 *  that grew across the calendar work. DST-safe by anchoring parsed
 *  Dates at noon-local, so wall-clock comparisons don't flip during
 *  spring-forward / fall-back transitions. */

/** Local-time ISO YYYY-MM-DD key from a Date. */
export function isoKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD (or YYYY-MM-DDT…) into a local Date anchored at
 *  noon so DST transitions can't shift the wall-clock date. Returns
 *  null on malformed or empty input. */
export function parseIsoLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const head = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const m = head.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const out = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (Number.isNaN(out.getTime())) return null;
  // Reject silent JS Date rollover (e.g. 2026-04-31 → May 1, 2026-13-01 → Jan 2027).
  if (out.getFullYear() !== y || out.getMonth() !== mo - 1 || out.getDate() !== d) return null;
  return out;
}

/** "2026-04-12" → "2026-04-13". Local-time math via the Date constructor. */
export function nextDayIso(iso: string): string {
  return addDaysIso(iso, 1);
}

/** "2026-04-12" → "2026-04-11". */
export function priorDayIso(iso: string): string {
  return addDaysIso(iso, -1);
}

/** Add N days (negative OK). Returns an ISO YYYY-MM-DD. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(n => parseInt(n, 10));
  const shifted = new Date(y, m - 1, d + days, 12, 0, 0, 0);
  return isoKey(shifted);
}

/** Inclusive iteration of every ISO YYYY-MM-DD between start and end. */
export function eachDateIso(startIso: string, endIso: string): string[] {
  if (!startIso || !endIso || startIso > endIso) return [];
  const out: string[] = [];
  let cur = startIso;
  while (cur <= endIso) {
    out.push(cur);
    cur = nextDayIso(cur);
  }
  return out;
}

/** Whole-night count between two ISO keys (DST-safe). */
export function nightsBetween(startIso: string, endIso: string): number {
  const s = parseIsoLocal(startIso);
  const e = parseIsoLocal(endIso);
  if (!s || !e) return 0;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000));
}
