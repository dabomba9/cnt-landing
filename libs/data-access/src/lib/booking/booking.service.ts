import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { IBooking, IBookingAddOn } from '@cnt-workspace/models';
import { ToastService } from '../toast/toast.service';

const BOOKINGS_KEY = 'cnt-bookings';
/** Demo wait time before a request-to-book gets a host decision. */
const DECISION_WAIT_MS = 30_000;
/** Probability the host approves the booking. Remainder declines. */
const APPROVAL_RATE = 0.85;

/** Dollars credited per reviewed night. Centralized so every copy + formula stays in sync. */
export const REVIEW_CREDIT_PER_NIGHT = 5;
/** Minimum trimmed review text length required to actually earn the credit. */
export const MIN_REVIEW_CHARS_FOR_CREDIT = 20;

/** One row in the user's credit ledger — drives the breakdown disclosure on /dashboard. */
export interface ICreditEntry {
  type: 'earned' | 'spent';
  amount: number;
  bookingId: string;
  listingTitle: string;
  date: string;       // ISO
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly _bookings$ = new BehaviorSubject<IBooking[]>([]);
  readonly bookings$: Observable<IBooking[]> = this._bookings$.asObservable();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private toasts: ToastService,
  ) {
    const initial = this.read();
    this._bookings$.next(initial);
    this.replayPendingDecisions(initial);
  }

  /** All bookings for one user, newest first. */
  list(userEmail: string): IBooking[] {
    return this.read()
      .filter(b => b.userEmail === userEmail)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getById(id: string): IBooking | null {
    return this.read().find(b => b.id === id) ?? null;
  }

  createBooking(input: Omit<IBooking, 'id' | 'createdAt'>): IBooking {
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const isPending = input.status === 'pending';
    const booking: IBooking = {
      ...input,
      id,
      createdAt: new Date(now).toISOString(),
      decisionAt: isPending ? new Date(now + DECISION_WAIT_MS).toISOString() : input.decisionAt,
    };
    const all = this.read();
    all.push(booking);
    this.write(all);
    if (isPending) this.scheduleDecision(booking.id);
    return booking;
  }

  cancel(id: string, reason?: string): IBooking | null {
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const cleaned = reason?.trim();
    all[idx] = {
      ...all[idx],
      status: 'cancelled',
      cancelReason: cleaned || undefined,
    };
    this.write(all);
    this.clearTimer(id);
    return all[idx];
  }

  /**
   * Bookings that qualify a user to earn credit — completed, confirmed/approved,
   * reviewed, and the FIRST reviewed booking per listing (anti-fraud lite — repeat
   * stays at the same listing earn once).
   */
  private earningBookings(userEmail: string): IBooking[] {
    const now = Date.now();
    const reviewed = this.read()
      .filter(b => b.userEmail === userEmail
                && (b.status === 'confirmed' || b.status === 'approved')
                && new Date(b.dates.end).getTime() < now
                && !!b.reviewedAt)
      .sort((a, b) => (a.reviewedAt || '').localeCompare(b.reviewedAt || ''));
    const seenListings = new Set<number>();
    const earners: IBooking[] = [];
    for (const b of reviewed) {
      if (seenListings.has(b.listingId)) continue;
      seenListings.add(b.listingId);
      earners.push(b);
    }
    return earners;
  }

  /** True when this booking is the user's first reviewed stay at that listing. */
  qualifiesForCredit(booking: IBooking): boolean {
    return this.earningBookings(booking.userEmail).some(b => b.id === booking.id);
  }

  /**
   * Available reward credit for a user, in dollars. Earned = nights from each
   * qualifying booking × REVIEW_CREDIT_PER_NIGHT. Spent = creditApplied across all
   * bookings. Always non-negative.
   */
  getAvailableCredit(userEmail: string): number {
    const earnedNights = this.earningBookings(userEmail)
      .reduce((sum, b) => sum + (b.nights || 0), 0);
    const earned = earnedNights * REVIEW_CREDIT_PER_NIGHT;
    const spent = this.read()
      .filter(b => b.userEmail === userEmail)
      .reduce((sum, b) => sum + (b.creditApplied || 0), 0);
    return Math.max(0, earned - spent);
  }

  /** Chronological credit ledger — earned + spent entries, newest first. */
  getCreditHistory(userEmail: string): ICreditEntry[] {
    const entries: ICreditEntry[] = [];
    for (const b of this.earningBookings(userEmail)) {
      entries.push({
        type: 'earned',
        amount: (b.nights || 0) * REVIEW_CREDIT_PER_NIGHT,
        bookingId: b.id,
        listingTitle: b.listingTitle,
        date: b.reviewedAt || b.dates.end,
      });
    }
    for (const b of this.read().filter(x => x.userEmail === userEmail && (x.creditApplied || 0) > 0)) {
      entries.push({
        type: 'spent',
        amount: b.creditApplied || 0,
        bookingId: b.id,
        listingTitle: b.listingTitle,
        date: b.createdAt,
      });
    }
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }

  /** Flag a completed booking as reviewed. Called after a successful Review save. */
  markReviewed(id: string): IBooking | null {
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], reviewedAt: new Date().toISOString() };
    this.write(all);
    return all[idx];
  }

  /** Host-initiated decision on a pending request — approve or decline. */
  hostDecide(id: string, decision: 'approved' | 'declined', reason?: string): IBooking | null {
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    if (all[idx].status !== 'pending') return null;
    const cleaned = reason?.trim();
    all[idx] = {
      ...all[idx],
      status: decision,
      cancelReason: decision === 'declined' ? (cleaned || undefined) : all[idx].cancelReason,
    };
    this.write(all);
    this.clearTimer(id);
    if (decision === 'approved') {
      this.toasts.success(`Approved — ${all[idx].listingTitle} is locked in for the guest.`);
    } else {
      this.toasts.info('Request declined.');
    }
    return all[idx];
  }

  /** Host-initiated cancellation on an already-approved/confirmed booking. */
  hostCancel(id: string, reason?: string): IBooking | null {
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const status = all[idx].status;
    if (status !== 'approved' && status !== 'confirmed') return null;
    const cleaned = reason?.trim();
    all[idx] = {
      ...all[idx],
      status: 'cancelled',
      cancelReason: cleaned || undefined,
    };
    this.write(all);
    this.clearTimer(id);
    this.toasts.info('Reservation cancelled.');
    return all[idx];
  }

  /**
   * Modify an existing booking's dates and/or guest count. Recomputes nights,
   * subtotal, and total from the original pricePerNight. Returns null if the
   * booking is missing, cancelled/declined, or check-in has already passed.
   */
  modify(
    id: string,
    patch: { start?: string; end?: string; guests?: number; addOns?: IBookingAddOn[] },
  ): IBooking | null {
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const current = all[idx];
    if (current.status === 'cancelled' || current.status === 'declined') return null;
    if (new Date(current.dates.start).getTime() < Date.now()) return null;

    const startIso = patch.start ?? current.dates.start;
    const endIso   = patch.end   ?? current.dates.end;
    const guests   = typeof patch.guests === 'number' ? Math.max(1, patch.guests) : current.guests;
    const addOns   = patch.addOns ?? current.addOns ?? [];

    const startMs = new Date(startIso).getTime();
    const endMs   = new Date(endIso).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

    const nights      = Math.max(1, Math.round((endMs - startMs) / 86_400_000));
    const subtotal    = current.pricePerNight * nights;
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.amount, 0);
    const total       = subtotal + addOnsTotal + current.cleaningFee + current.serviceFee;

    all[idx] = {
      ...current,
      dates: { start: startIso, end: endIso },
      guests,
      nights,
      subtotal,
      addOns: addOns.length > 0 ? addOns : undefined,
      addOnsTotal: addOnsTotal || undefined,
      total,
      modifiedAt: new Date().toISOString(),
    };
    this.write(all);
    return all[idx];
  }

  // ---- Host-decision state machine (mock) ------------------------------

  private replayPendingDecisions(bookings: IBooking[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    for (const b of bookings) {
      if (b.status !== 'pending' || !b.decisionAt) continue;
      this.scheduleDecision(b.id);
    }
  }

  private scheduleDecision(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.timers.has(id)) return; // already scheduled
    const booking = this.getById(id);
    if (!booking || booking.status !== 'pending' || !booking.decisionAt) return;
    const ms = Math.max(0, new Date(booking.decisionAt).getTime() - Date.now());
    const t = setTimeout(() => this.applyDecision(id), ms);
    this.timers.set(id, t);
  }

  private clearTimer(id: string): void {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
  }

  /** Mock host decision — flips pending → approved (most of the time) or declined. */
  private applyDecision(id: string): void {
    this.clearTimer(id);
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return;
    const booking = all[idx];
    if (booking.status !== 'pending') return; // user already cancelled or otherwise moved on
    const approved = Math.random() < APPROVAL_RATE;
    const next: IBooking = { ...booking, status: approved ? 'approved' : 'declined' };
    all[idx] = next;
    this.write(all);
    if (approved) {
      this.toasts.success(`Approved — your stay at ${next.listingTitle} is locked in.`);
    } else {
      this.toasts.info(`Host declined your request — try a similar stay nearby.`);
    }
  }

  // ---- Storage ---------------------------------------------------------

  private read(): IBooking[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(BOOKINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(bookings: IBooking[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    this._bookings$.next(bookings);
  }
}
