import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { IBooking } from '@cnt-workspace/models';
import { HostAvailabilityService } from '../host/host-availability.service';
import { BookingService } from '../booking/booking.service';
import { ListingAvailabilityService } from './listing-availability.service';

/** Minimal BookingService stub. ListingAvailabilityService only reads
 *  bookings$ and getAll() — keep the surface tight to avoid coupling
 *  the test to unrelated BookingService changes. */
class BookingServiceStub {
  private readonly _bookings$ = new BehaviorSubject<IBooking[]>([]);
  bookings$ = this._bookings$.asObservable();
  getAll(): IBooking[] { return this._bookings$.value; }
  set(bs: IBooking[]): void { this._bookings$.next(bs); }
}

function mkBooking(over: Partial<IBooking>): IBooking {
  return {
    id: 'b-' + Math.random().toString(36).slice(2, 8),
    listingId: 1,
    dates: { start: '2026-04-12', end: '2026-04-15' },
    status: 'confirmed',
    subtotal: 300,
    total: 300,
    ...over,
  } as IBooking;
}

describe('ListingAvailabilityService', () => {
  let svc: ListingAvailabilityService;
  let host: HostAvailabilityService;
  let bookings: BookingServiceStub;

  beforeEach(() => {
    localStorage.clear();
    bookings = new BookingServiceStub();
    TestBed.configureTestingModule({
      providers: [
        HostAvailabilityService,
        ListingAvailabilityService,
        { provide: BookingService, useValue: bookings },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    host = TestBed.inject(HostAvailabilityService);
    svc = TestBed.inject(ListingAvailabilityService);
  });

  describe('unavailableSet$', () => {
    it('merges manual + external blocks + booked nights', (done) => {
      host.setBlocked(1, ['2026-04-10'], true);
      host.applyExternalBlocks(1, 'Airbnb', ['2026-04-11']);
      // 4-night booking — assert on inner days that hold across the
      // TZ-sensitivity in bookedByListing's date math (existing
      // behavior, not in scope for this spec to nail down).
      bookings.set([mkBooking({ listingId: 1, dates: { start: '2026-04-15', end: '2026-04-18' } })]);

      svc.unavailableSet$(1).pipe(take(1)).subscribe(set => {
        expect(set.has('2026-04-10')).toBe(true);
        expect(set.has('2026-04-11')).toBe(true);
        expect(set.has('2026-04-16')).toBe(true);
        expect(set.has('2026-04-17')).toBe(true);
        done();
      });
    });

    it('ignores cancelled / declined bookings', (done) => {
      bookings.set([
        mkBooking({ listingId: 1, status: 'cancelled', dates: { start: '2026-04-12', end: '2026-04-14' } }),
        mkBooking({ listingId: 1, status: 'declined', dates: { start: '2026-04-20', end: '2026-04-22' } }),
      ]);
      svc.unavailableSet$(1).pipe(take(1)).subscribe(set => {
        expect(set.size).toBe(0);
        done();
      });
    });
  });

  describe('isAvailableForRange', () => {
    it('returns true when no required night is blocked or booked', () => {
      expect(svc.isAvailableForRange(1, '2026-04-12', '2026-04-15')).toBe(true);
    });

    it('treats checkout day as free (not a required night)', () => {
      host.setBlocked(1, ['2026-04-15'], true);
      expect(svc.isAvailableForRange(1, '2026-04-12', '2026-04-15')).toBe(true);
    });

    it('returns false when any required night is blocked', () => {
      host.setBlocked(1, ['2026-04-13'], true);
      expect(svc.isAvailableForRange(1, '2026-04-12', '2026-04-15')).toBe(false);
    });

    it('returns false when a required night is booked', () => {
      bookings.set([mkBooking({ listingId: 1, dates: { start: '2026-04-13', end: '2026-04-14' } })]);
      expect(svc.isAvailableForRange(1, '2026-04-12', '2026-04-15')).toBe(false);
    });

    it('returns true on degenerate start >= end', () => {
      expect(svc.isAvailableForRange(1, '2026-04-15', '2026-04-12')).toBe(true);
      expect(svc.isAvailableForRange(1, '2026-04-12', '2026-04-12')).toBe(true);
    });
  });

  describe('effectiveNightlyPrice + range', () => {
    it('per-day override beats tier beats base', () => {
      host.upsertPricingTier(1, { name: 'Peak', start: '2026-06-01', end: '2026-08-31', nightlyPrice: 120 });
      host.setPrice(1, ['2026-07-04'], 200);

      expect(svc.effectiveNightlyPrice(1, '2026-05-01', 80)).toBe(80);   // base
      expect(svc.effectiveNightlyPrice(1, '2026-07-01', 80)).toBe(120);  // tier
      expect(svc.effectiveNightlyPrice(1, '2026-07-04', 80)).toBe(200);  // override
    });

    it('effectivePricesForRange yields one entry per required night (checkout excluded)', () => {
      const prices = svc.effectivePricesForRange(1, '2026-04-12', '2026-04-15', 80);
      expect(Object.keys(prices).sort()).toEqual(['2026-04-12', '2026-04-13', '2026-04-14']);
      expect(prices['2026-04-12']).toBe(80);
    });

    it('lowestNightlyForRange returns base when no tiers/overrides apply', () => {
      expect(svc.lowestNightlyForRange(1, '2026-04-12', '2026-04-15', 80)).toBe(80);
    });

    it('lowestNightlyForRange picks the cheapest covered night', () => {
      host.setPrice(1, ['2026-04-13'], 50);
      expect(svc.lowestNightlyForRange(1, '2026-04-12', '2026-04-15', 80)).toBe(50);
    });
  });

  describe('checkStayRule', () => {
    it('returns ok when no rules are configured', () => {
      expect(svc.checkStayRule(1, '2026-04-12', '2026-04-15')).toEqual({ ok: true });
    });

    it('flags min violation with the required nights returned', () => {
      host.upsertStayRule(1, { start: '2026-06-01', end: '2026-08-31', minNights: 3 });
      expect(svc.checkStayRule(1, '2026-07-01', '2026-07-02')).toEqual({
        ok: false, kind: 'min', requiredNights: 3,
      });
    });

    it('passes min when nights meet the threshold', () => {
      host.upsertStayRule(1, { start: '2026-06-01', end: '2026-08-31', minNights: 3 });
      expect(svc.checkStayRule(1, '2026-07-01', '2026-07-05')).toEqual({ ok: true });
    });

    it('the rule whose window contains check-in is the gate (not check-out)', () => {
      host.upsertStayRule(1, { start: '2026-06-01', end: '2026-06-30', minNights: 7 });
      // Check-in June 25 falls inside the rule even though check-out is in July.
      expect(svc.checkStayRule(1, '2026-06-25', '2026-06-27')).toEqual({
        ok: false, kind: 'min', requiredNights: 7,
      });
    });

    it('ignores rule when check-in is outside any range', () => {
      host.upsertStayRule(1, { start: '2026-06-01', end: '2026-08-31', minNights: 7 });
      expect(svc.checkStayRule(1, '2026-04-12', '2026-04-13')).toEqual({ ok: true });
    });
  });
});
