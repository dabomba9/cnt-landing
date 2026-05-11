import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Booking } from '@cnt-workspace/models';
import { ToastService } from '../toast/toast.service';

const BOOKINGS_KEY = 'cnt-bookings';
/** Demo wait time before a request-to-book gets a host decision. */
const DECISION_WAIT_MS = 30_000;
/** Probability the host approves the booking. Remainder declines. */
const APPROVAL_RATE = 0.85;

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly _bookings$ = new BehaviorSubject<Booking[]>([]);
  readonly bookings$: Observable<Booking[]> = this._bookings$.asObservable();
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
  list(userEmail: string): Booking[] {
    return this.read()
      .filter(b => b.userEmail === userEmail)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getById(id: string): Booking | null {
    return this.read().find(b => b.id === id) ?? null;
  }

  createBooking(input: Omit<Booking, 'id' | 'createdAt'>): Booking {
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const isPending = input.status === 'pending';
    const booking: Booking = {
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

  cancel(id: string): Booking | null {
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], status: 'cancelled' };
    this.write(all);
    this.clearTimer(id);
    return all[idx];
  }

  // ---- Host-decision state machine (mock) ------------------------------

  private replayPendingDecisions(bookings: Booking[]): void {
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
    const next: Booking = { ...booking, status: approved ? 'approved' : 'declined' };
    all[idx] = next;
    this.write(all);
    if (approved) {
      this.toasts.success(`Approved — your stay at ${next.listingTitle} is locked in.`);
    } else {
      this.toasts.info(`Host declined your request — try a similar stay nearby.`);
    }
  }

  // ---- Storage ---------------------------------------------------------

  private read(): Booking[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(BOOKINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(bookings: Booking[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    this._bookings$.next(bookings);
  }
}
