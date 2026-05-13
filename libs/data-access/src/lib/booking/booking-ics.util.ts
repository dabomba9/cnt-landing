import { IBooking } from '@cnt-workspace/models';

/** Format a Date as a basic-form ICS UTC stamp (YYYYMMDDTHHmmssZ). */
function icsTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Build a single-event VCALENDAR string for a booking. Caller decides what to do with it. */
export function buildBookingIcs(b: IBooking): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CurbNTurf//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${b.id}@curbnturf`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART:${icsTimestamp(new Date(b.dates.start))}`,
    `DTEND:${icsTimestamp(new Date(b.dates.end))}`,
    `SUMMARY:CurbNTurf — ${b.listingTitle}`,
    `DESCRIPTION:Hosted by ${b.hostName}.`,
    `LOCATION:${b.listingLocation}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

/** Browser-only: trigger a download of the booking's .ics file. No-op outside the browser. */
export function downloadBookingIcs(b: IBooking): void {
  if (typeof document === 'undefined') return;
  const ics = buildBookingIcs(b);
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `curbnturf-${b.id.slice(0, 8)}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
