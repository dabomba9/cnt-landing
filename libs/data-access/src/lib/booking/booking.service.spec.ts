import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { IBooking } from '@cnt-workspace/models';
import { BookingService } from './booking.service';
import { ToastService } from '../toast/toast.service';

class ToastStub {
  success = jest.fn();
  error = jest.fn();
  warn = jest.fn();
  info = jest.fn();
  show = jest.fn();
  dismiss = jest.fn();
}

const USER = 'rver@example.com';

function baseInput(over: Partial<Omit<IBooking, 'id' | 'createdAt'>> = {}): Omit<IBooking, 'id' | 'createdAt'> {
  return {
    userEmail: USER,
    listingId: 1,
    listingTitle: 'Maple Ridge',
    listingLocation: 'Bend, OR',
    listingPhoto: '',
    hostName: 'Sam',
    dates: { start: '2027-04-12', end: '2027-04-15' },
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
    contact: { email: USER },
    ...over,
  } as Omit<IBooking, 'id' | 'createdAt'>;
}

describe('BookingService', () => {
  let svc: BookingService;
  let toasts: ToastStub;

  beforeEach(() => {
    localStorage.clear();
    toasts = new ToastStub();
    TestBed.configureTestingModule({
      providers: [
        BookingService,
        { provide: ToastService, useValue: toasts },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    svc = TestBed.inject(BookingService);
  });

  describe('createBooking', () => {
    it('assigns id + createdAt and stores the booking', () => {
      const b = svc.createBooking(baseInput());
      expect(b.id).toBeTruthy();
      expect(b.createdAt).toBeTruthy();
      expect(svc.getById(b.id)).toEqual(b);
    });

    it('confirmed booking does not arm a decisionAt', () => {
      const b = svc.createBooking(baseInput({ status: 'confirmed' }));
      expect(b.decisionAt).toBeUndefined();
    });

    it('pending booking arms a future decisionAt (~30s)', () => {
      const before = Date.now();
      const b = svc.createBooking(baseInput({ status: 'pending' }));
      const due = new Date(b.decisionAt!).getTime();
      expect(due).toBeGreaterThanOrEqual(before + 29_000);
      expect(due).toBeLessThanOrEqual(before + 31_000);
      // Resolve so the test doesn't leak a 30s timer.
      svc.hostDecide(b.id, 'declined');
    });
  });

  describe('hostDecide', () => {
    it('flips pending → approved', () => {
      const b = svc.createBooking(baseInput({ status: 'pending' }));
      const out = svc.hostDecide(b.id, 'approved');
      expect(out?.status).toBe('approved');
      expect(toasts.success).toHaveBeenCalled();
    });

    it('flips pending → declined and captures the reason', () => {
      const b = svc.createBooking(baseInput({ status: 'pending' }));
      const out = svc.hostDecide(b.id, 'declined', '  Sorry, just booked  ');
      expect(out?.status).toBe('declined');
      expect(out?.cancelReason).toBe('Sorry, just booked');
      expect(toasts.info).toHaveBeenCalled();
    });

    it('returns null on a non-pending booking (already-decided guard)', () => {
      const b = svc.createBooking(baseInput({ status: 'confirmed' }));
      expect(svc.hostDecide(b.id, 'approved')).toBeNull();
    });

    it('returns null on an unknown id', () => {
      expect(svc.hostDecide('missing', 'approved')).toBeNull();
    });
  });

  describe('cancel + hostCancel', () => {
    it('cancel sets status + reason', () => {
      const b = svc.createBooking(baseInput());
      const out = svc.cancel(b.id, '  Changed plans  ');
      expect(out?.status).toBe('cancelled');
      expect(out?.cancelReason).toBe('Changed plans');
    });

    it('hostCancel rejects already-cancelled / declined bookings', () => {
      const b = svc.createBooking(baseInput({ status: 'pending' }));
      svc.hostDecide(b.id, 'declined');
      expect(svc.hostCancel(b.id)).toBeNull();
    });
  });

  describe('hasUserDateConflict', () => {
    beforeEach(() => {
      svc.createBooking(baseInput({ dates: { start: '2027-04-12', end: '2027-04-15' } }));
    });

    it('detects an overlapping range on the same listing', () => {
      expect(svc.hasUserDateConflict(USER, 1, { start: '2027-04-13', end: '2027-04-16' })).toBe(true);
    });

    it('treats touching ranges as non-overlapping (booking convention)', () => {
      expect(svc.hasUserDateConflict(USER, 1, { start: '2027-04-15', end: '2027-04-17' })).toBe(false);
    });

    it('different listing → no conflict', () => {
      expect(svc.hasUserDateConflict(USER, 99, { start: '2027-04-13', end: '2027-04-14' })).toBe(false);
    });

    it('ignores cancelled / declined bookings', () => {
      const b = svc.createBooking(baseInput({ dates: { start: '2027-06-01', end: '2027-06-05' } }));
      svc.cancel(b.id);
      expect(svc.hasUserDateConflict(USER, 1, { start: '2027-06-02', end: '2027-06-04' })).toBe(false);
    });
  });

  describe('markReviewed + credit math', () => {
    it('markReviewed stamps reviewedAt', () => {
      const b = svc.createBooking(baseInput({
        dates: { start: '2020-01-01', end: '2020-01-04' },  // in the past
      }));
      const out = svc.markReviewed(b.id);
      expect(out?.reviewedAt).toBeTruthy();
    });

    it('qualifiesForCredit is true for first reviewed stay at a listing, false for repeat', () => {
      const first  = svc.createBooking(baseInput({ dates: { start: '2020-01-01', end: '2020-01-04' }, nights: 3 }));
      const second = svc.createBooking(baseInput({ dates: { start: '2020-02-01', end: '2020-02-04' }, nights: 3 }));
      svc.markReviewed(first.id);
      svc.markReviewed(second.id);
      const refreshedFirst  = svc.getById(first.id)!;
      const refreshedSecond = svc.getById(second.id)!;
      expect(svc.qualifiesForCredit(refreshedFirst)).toBe(true);
      expect(svc.qualifiesForCredit(refreshedSecond)).toBe(false);
    });

    it('getAvailableCredit = earned - spent, clamped non-negative', () => {
      const b = svc.createBooking(baseInput({
        dates: { start: '2020-01-01', end: '2020-01-04' }, nights: 3,
      }));
      svc.markReviewed(b.id);
      // 3 nights × $5 = $15 earned, none spent yet.
      expect(svc.getAvailableCredit(USER)).toBe(15);

      // Simulate a future booking that applied $10 of credit.
      const spender = svc.createBooking(baseInput({ creditApplied: 10 } as any));
      expect(svc.getAvailableCredit(USER)).toBe(5);

      // Apply more than the balance — clamps to 0, never negative.
      svc.cancel(spender.id);
      svc.createBooking(baseInput({ creditApplied: 999 } as any));
      expect(svc.getAvailableCredit(USER)).toBe(0);
    });
  });

  describe('modify', () => {
    it('recomputes nights / subtotal / total when dates change', () => {
      const b = svc.createBooking(baseInput({ pricePerNight: 80, cleaningFee: 10, serviceFee: 20 }));
      const out = svc.modify(b.id, { start: '2027-04-12', end: '2027-04-17' });
      expect(out?.nights).toBe(5);
      expect(out?.subtotal).toBe(400);
      expect(out?.total).toBe(430);  // 400 + 10 + 20
      expect(out?.modifiedAt).toBeTruthy();
    });

    it('refuses to modify a cancelled booking', () => {
      const b = svc.createBooking(baseInput());
      svc.cancel(b.id);
      expect(svc.modify(b.id, { guests: 3 })).toBeNull();
    });

    it('refuses to modify a past-checkin booking', () => {
      const b = svc.createBooking(baseInput({ dates: { start: '2020-01-01', end: '2020-01-04' } }));
      expect(svc.modify(b.id, { guests: 3 })).toBeNull();
    });

    it('refuses an end <= start patch', () => {
      const b = svc.createBooking(baseInput());
      expect(svc.modify(b.id, { start: '2027-04-12', end: '2027-04-12' })).toBeNull();
    });
  });

  describe('persistence', () => {
    it('rehydrates from localStorage on a fresh instance', () => {
      const b = svc.createBooking(baseInput());
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          BookingService,
          { provide: ToastService, useValue: new ToastStub() },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      const fresh = TestBed.inject(BookingService);
      expect(fresh.getById(b.id)?.id).toBe(b.id);
    });
  });
});
