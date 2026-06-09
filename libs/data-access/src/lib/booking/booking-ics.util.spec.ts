import { IBooking } from '@cnt-workspace/models';
import { buildBookingIcs } from './booking-ics.util';

function mkBooking(over: Partial<IBooking>): IBooking {
  return {
    id: 'booking-abc',
    userEmail: 'rver@example.com',
    listingId: 1,
    listingTitle: 'Quiet Pad on Maple Ridge',
    listingLocation: 'Bend, OR',
    listingPhoto: '',
    hostName: 'Sam',
    dates: { start: '2026-04-12T15:00:00Z', end: '2026-04-15T11:00:00Z' },
    nights: 3,
    guests: 2,
    rvSummary: 'Class C, 26ft',
    pricePerNight: 80,
    subtotal: 240,
    cleaningFee: 0,
    serviceFee: 36,
    total: 276,
    instantBook: true,
    status: 'confirmed',
    createdAt: new Date(0).toISOString(),
    contact: { email: 'rver@example.com' },
    ...over,
  } as IBooking;
}

describe('buildBookingIcs', () => {
  it('emits a VCALENDAR shell wrapping a single VEVENT', () => {
    const ics = buildBookingIcs(mkBooking({}));
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
    expect((ics.match(/END:VEVENT/g) ?? []).length).toBe(1);
  });

  it('uses CRLF line endings (RFC 5545)', () => {
    const ics = buildBookingIcs(mkBooking({}));
    expect(ics.includes('\r\n')).toBe(true);
    // No bare LFs should appear unsegmented.
    expect(ics.split('\r\n').every(l => !l.includes('\n'))).toBe(true);
  });

  it('UID is {bookingId}@curbnturf', () => {
    const ics = buildBookingIcs(mkBooking({ id: 'xyz' }));
    expect(ics).toContain('UID:xyz@curbnturf');
  });

  it('DTSTART / DTEND use basic ICS form (YYYYMMDDTHHmmssZ)', () => {
    const ics = buildBookingIcs(mkBooking({}));
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(ics).toMatch(/DTEND:\d{8}T\d{6}Z/);
  });

  it('SUMMARY and LOCATION reflect the listing', () => {
    const ics = buildBookingIcs(mkBooking({}));
    expect(ics).toContain('SUMMARY:CurbNTurf — Quiet Pad on Maple Ridge');
    expect(ics).toContain('LOCATION:Bend, OR');
    expect(ics).toContain('DESCRIPTION:Hosted by Sam.');
  });
});
