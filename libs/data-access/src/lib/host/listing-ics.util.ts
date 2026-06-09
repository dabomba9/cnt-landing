import { IBooking } from '@cnt-workspace/models';
import { IPrivateListing } from '../listings/mock-listings.data';
import { nextDayIso, priorDayIso } from '../shared/iso-date.util';

/** Format a Date as a basic-form ICS UTC stamp (YYYYMMDDTHHmmssZ). */
function icsTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** YYYY-MM-DD → YYYYMMDD (ICS DATE form). */
function icsDate(iso: string): string {
  return iso.replace(/-/g, '');
}

/** Collapse a sorted list of ISO YYYY-MM-DD dates into contiguous
 *  [start, end] ranges (end is inclusive). Single-day blocks come back
 *  with start === end. Used so a 30-day block renders as one VEVENT
 *  rather than 30. */
export function collapseToRanges(isoDates: string[]): Array<{ start: string; end: string }> {
  if (isoDates.length === 0) return [];
  const sorted = [...isoDates].sort();
  const out: Array<{ start: string; end: string }> = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (nextDayIso(prev) === cur) { prev = cur; continue; }
    out.push({ start: rangeStart, end: prev });
    rangeStart = cur;
    prev = cur;
  }
  out.push({ start: rangeStart, end: prev });
  return out;
}

/** "2026-04-12" → "20260413" (ICS DTEND is exclusive, so we add a day). */
function icsExclusiveEnd(iso: string): string {
  return icsDate(nextDayIso(iso));
}

/** Build a per-listing VCALENDAR covering bookings + manual host blocks
 *  + imported external blocks. Hosts subscribe peers to this feed so
 *  every committed night on this listing surfaces on Airbnb / VRBO /
 *  Google Cal etc. */
export function buildListingIcs(input: {
  listing: IPrivateListing;
  bookings: IBooking[];
  blocks: string[];
  externalBlocks: Record<string, string[]>;
  /** Optional reason label per blocked iso — annotated onto the
   *  per-range VEVENT SUMMARY when the range's first date carries one. */
  blockReasons?: Record<string, string>;
}): string {
  const { listing, bookings, blocks, externalBlocks } = input;
  const blockReasons = input.blockReasons ?? {};
  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CurbNTurf//Listing//EN',
    `X-WR-CALNAME:CurbNTurf — ${listing.title}`,
  ];

  // 1) Active bookings — same date-time encoding as the booking-level helper.
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'declined') continue;
    if (b.listingId !== listing.id) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${b.id}@curbnturf`,
      `DTSTAMP:${icsTimestamp(new Date())}`,
      `DTSTART:${icsTimestamp(new Date(b.dates.start))}`,
      `DTEND:${icsTimestamp(new Date(b.dates.end))}`,
      `SUMMARY:CurbNTurf — Booked (${b.listingTitle})`,
      `DESCRIPTION:Reservation ${b.id.slice(0, 8)} (${b.status}).`,
      `LOCATION:${b.listingLocation}`,
      'END:VEVENT',
    );
  }

  // 2) Manual host blocks — one all-day VEVENT per contiguous run of the
  //    same reason. Partition by reason first so a run that mixes reasons
  //    doesn't collapse into a single SUMMARY.
  const blocksByReason = new Map<string, string[]>();
  for (const iso of blocks) {
    const key = blockReasons[iso] ?? '';
    const bucket = blocksByReason.get(key) ?? [];
    bucket.push(iso);
    blocksByReason.set(key, bucket);
  }
  for (const [reason, isos] of blocksByReason.entries()) {
    const summary = reason ? `CurbNTurf — Blocked (${reason})` : 'CurbNTurf — Blocked';
    for (const range of collapseToRanges(isos)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:block-${listing.id}-${range.start}@curbnturf`,
        `DTSTAMP:${icsTimestamp(new Date())}`,
        `DTSTART;VALUE=DATE:${icsDate(range.start)}`,
        `DTEND;VALUE=DATE:${icsExclusiveEnd(range.end)}`,
        `SUMMARY:${summary}`,
        'END:VEVENT',
      );
    }
  }

  // 3) External blocks — keep source-tagged so a re-import or hosted
  //    feed can identify provenance.
  for (const [sourceLabel, dates] of Object.entries(externalBlocks)) {
    for (const range of collapseToRanges(dates)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:ext-${listing.id}-${sourceLabel}-${range.start}@curbnturf`,
        `DTSTAMP:${icsTimestamp(new Date())}`,
        `DTSTART;VALUE=DATE:${icsDate(range.start)}`,
        `DTEND;VALUE=DATE:${icsExclusiveEnd(range.end)}`,
        `SUMMARY:CurbNTurf — Blocked (${sourceLabel})`,
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Browser-only: download the listing's .ics. No-op outside the browser. */
export function downloadListingIcs(input: Parameters<typeof buildListingIcs>[0]): void {
  if (typeof document === 'undefined') return;
  const ics = buildListingIcs(input);
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `curbnturf-listing-${input.listing.id}-${stamp}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Minimal ICS reader. Returns one entry per VEVENT with iso YYYY-MM-DD
 *  start + end (end inclusive — we expand to per-night blocks). Skips
 *  events without DTSTART/DTEND. RRULE not supported. */
export function parseIcsToDateRanges(text: string): Array<{ start: string; end: string; uid?: string }> {
  // Unfold RFC 5545 continuation lines (leading space/tab after CRLF).
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const out: Array<{ start: string; end: string; uid?: string }> = [];
  let inEvent = false;
  let dtStart = '', dtEnd = '', uid: string | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { inEvent = true; dtStart = ''; dtEnd = ''; uid = undefined; continue; }
    if (line === 'END:VEVENT') {
      inEvent = false;
      const s = parseIcsDate(dtStart);
      let e = parseIcsDate(dtEnd);
      if (s && e) {
        // ICS DTEND for VALUE=DATE is exclusive; treat as inclusive last night.
        if (dtStart.startsWith('VALUE=DATE') || /^\d{8}$/.test(dtStart.split(':').pop() || '')) {
          e = priorDayIso(e);
        }
        if (e >= s) out.push({ start: s, end: e, uid });
      }
      continue;
    }
    if (!inEvent) continue;
    if (line.startsWith('DTSTART')) dtStart = line.slice('DTSTART'.length).replace(/^[^:]*:/, ':').slice(1) || line.replace(/^.*?:/, '');
    else if (line.startsWith('DTEND')) dtEnd = line.slice('DTEND'.length).replace(/^[^:]*:/, ':').slice(1) || line.replace(/^.*?:/, '');
    else if (line.startsWith('UID:')) uid = line.slice(4);
  }
  return out;
}

function parseIcsDate(raw: string): string | null {
  if (!raw) return null;
  const v = raw.trim();
  // YYYYMMDD (all-day)
  const date = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (date) return `${date[1]}-${date[2]}-${date[3]}`;
  // YYYYMMDDTHHmmssZ (UTC) or YYYYMMDDTHHmmss (floating)
  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T\d{6}Z?$/);
  if (dt) return `${dt[1]}-${dt[2]}-${dt[3]}`;
  return null;
}

/** Expand a list of [start, end]-inclusive ranges into a flat list of
 *  each ISO night between them. */
export function expandRangesToDates(ranges: Array<{ start: string; end: string }>): string[] {
  const out: string[] = [];
  for (const r of ranges) {
    let iso = r.start;
    while (iso <= r.end) {
      out.push(iso);
      iso = nextDayIso(iso);
    }
  }
  return out;
}
