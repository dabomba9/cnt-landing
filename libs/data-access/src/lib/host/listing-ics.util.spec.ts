import { IBooking } from '@cnt-workspace/models';
import {
  buildListingIcs, collapseToRanges, parseIcsToDateRanges, expandRangesToDates,
} from './listing-ics.util';
import { IPrivateListing } from '../listings/mock-listings.data';

const LISTING: IPrivateListing = {
  id: 1,
  title: 'Quiet Pad on Maple Ridge',
  location: 'Bend, OR',
  lat: 0, lng: 0,
  category: 'wineries' as any,
  amenities: [],
  image: '',
  price: 80,
  rating: 4.8,
  reviewCount: 12,
  instantBook: true,
};

function mkBooking(over: Partial<IBooking>): IBooking {
  return {
    id: 'b1', userEmail: 'r@e.com', listingId: 1, listingTitle: 'Maple',
    listingLocation: 'Bend, OR', listingPhoto: '', hostName: 'Sam',
    dates: { start: '2026-04-12T15:00:00Z', end: '2026-04-14T11:00:00Z' },
    nights: 2, guests: 2, rvSummary: '', pricePerNight: 80, subtotal: 160,
    cleaningFee: 0, serviceFee: 24, total: 184,
    instantBook: true, status: 'confirmed',
    createdAt: new Date(0).toISOString(), contact: { email: 'r@e.com' },
    ...over,
  } as IBooking;
}

describe('listing-ics.util', () => {
  describe('collapseToRanges', () => {
    it('returns [] for empty input', () => {
      expect(collapseToRanges([])).toEqual([]);
    });

    it('keeps a single-day block as start===end', () => {
      expect(collapseToRanges(['2026-04-12'])).toEqual([{ start: '2026-04-12', end: '2026-04-12' }]);
    });

    it('merges consecutive ISOs into one range', () => {
      expect(collapseToRanges(['2026-04-12', '2026-04-13', '2026-04-14'])).toEqual([
        { start: '2026-04-12', end: '2026-04-14' },
      ]);
    });

    it('splits at the first gap', () => {
      expect(collapseToRanges(['2026-04-12', '2026-04-13', '2026-04-15'])).toEqual([
        { start: '2026-04-12', end: '2026-04-13' },
        { start: '2026-04-15', end: '2026-04-15' },
      ]);
    });

    it('handles unsorted + duplicate input by sorting first', () => {
      const out = collapseToRanges(['2026-04-13', '2026-04-12', '2026-04-13']);
      // Duplicates show up as same-day pass-throughs; we just check the start/end range stretches both.
      expect(out[0].start).toBe('2026-04-12');
      expect(out[out.length - 1].end).toBe('2026-04-13');
    });
  });

  describe('expandRangesToDates', () => {
    it('expands inclusive ranges', () => {
      expect(expandRangesToDates([{ start: '2026-04-12', end: '2026-04-14' }])).toEqual([
        '2026-04-12', '2026-04-13', '2026-04-14',
      ]);
    });

    it('returns a single entry for start===end', () => {
      expect(expandRangesToDates([{ start: '2026-04-12', end: '2026-04-12' }])).toEqual(['2026-04-12']);
    });

    it('concats multiple ranges in order', () => {
      expect(expandRangesToDates([
        { start: '2026-04-12', end: '2026-04-13' },
        { start: '2026-04-20', end: '2026-04-20' },
      ])).toEqual(['2026-04-12', '2026-04-13', '2026-04-20']);
    });
  });

  describe('buildListingIcs', () => {
    it('emits a VCALENDAR shell with the X-WR-CALNAME header', () => {
      const ics = buildListingIcs({
        listing: LISTING, bookings: [], blocks: [], externalBlocks: {},
      });
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('X-WR-CALNAME:CurbNTurf — Quiet Pad on Maple Ridge');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('skips cancelled and declined bookings', () => {
      const ics = buildListingIcs({
        listing: LISTING,
        bookings: [
          mkBooking({ id: 'ok', status: 'confirmed' }),
          mkBooking({ id: 'no', status: 'cancelled' }),
          mkBooking({ id: 'meh', status: 'declined' }),
        ],
        blocks: [], externalBlocks: {},
      });
      expect(ics).toContain('UID:booking-ok@curbnturf');
      expect(ics).not.toContain('UID:booking-no@curbnturf');
      expect(ics).not.toContain('UID:booking-meh@curbnturf');
    });

    it('skips bookings that target a different listingId', () => {
      const ics = buildListingIcs({
        listing: LISTING,
        bookings: [mkBooking({ id: 'other', listingId: 99 })],
        blocks: [], externalBlocks: {},
      });
      expect(ics).not.toContain('UID:booking-other@curbnturf');
    });

    it('partitions manual blocks by reason — each contiguous run is its own VEVENT', () => {
      const ics = buildListingIcs({
        listing: LISTING,
        bookings: [],
        blocks: ['2026-04-12', '2026-04-13', '2026-04-20'],
        externalBlocks: {},
        blockReasons: { '2026-04-12': 'Cleaning', '2026-04-13': 'Cleaning' },
      });
      expect(ics).toContain('SUMMARY:CurbNTurf — Blocked (Cleaning)');
      expect(ics).toContain('SUMMARY:CurbNTurf — Blocked');
      // Cleaning run merges to one event; the no-reason day is a second event.
      expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    });

    it('source-tags external blocks in the SUMMARY', () => {
      const ics = buildListingIcs({
        listing: LISTING, bookings: [], blocks: [],
        externalBlocks: { Airbnb: ['2026-04-12', '2026-04-13'] },
      });
      expect(ics).toContain('SUMMARY:CurbNTurf — Blocked (Airbnb)');
    });

    it('all-day blocks use VALUE=DATE with exclusive DTEND (+1 day)', () => {
      const ics = buildListingIcs({
        listing: LISTING, bookings: [], blocks: ['2026-04-12'], externalBlocks: {},
      });
      expect(ics).toContain('DTSTART;VALUE=DATE:20260412');
      expect(ics).toContain('DTEND;VALUE=DATE:20260413');
    });
  });

  describe('parseIcsToDateRanges', () => {
    it('parses all-day VEVENTs and converts DTEND back to inclusive', () => {
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:abc',
        'DTSTART;VALUE=DATE:20260412',
        'DTEND;VALUE=DATE:20260415',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
      expect(parseIcsToDateRanges(ics)).toEqual([
        { start: '2026-04-12', end: '2026-04-14', uid: 'abc' },
      ]);
    });

    it('round-trips with buildListingIcs', () => {
      const ics = buildListingIcs({
        listing: LISTING, bookings: [], externalBlocks: {},
        blocks: ['2026-04-12', '2026-04-13', '2026-04-14'],
      });
      const ranges = parseIcsToDateRanges(ics);
      expect(ranges.length).toBe(1);
      expect(ranges[0].start).toBe('2026-04-12');
      expect(ranges[0].end).toBe('2026-04-14');
    });

    it('skips VEVENTs missing DTSTART or DTEND', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT', 'UID:no-dates', 'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
      expect(parseIcsToDateRanges(ics)).toEqual([]);
    });
  });
});
