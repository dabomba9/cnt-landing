import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { IBooking } from '@cnt-workspace/models';
import { AuthService } from '../auth/auth.service';
import { BookingService } from '../booking/booking.service';
import { ToastService } from '../toast/toast.service';
import { REVEAL_WINDOW_DAYS } from '../reviews/host-review.service';

const FIRED_KEY = 'cnt-date-trigger-fired';
const RECHECK_MS = 60 * 60 * 1000; // 60 minutes

type Stage = 'checkin-soon' | 'checkout-day' | 'review-expiry';

/** Date-driven toast firings on top of the existing derived
 *  NotificationService feed. Where the inbox notification feed is
 *  passive ("there's a thing to see"), this service is proactive —
 *  it pops a toast on app load + every 60 minutes for stays that
 *  cross the relevant date thresholds, so a guest who hasn't checked
 *  the inbox in a while still gets the nudge.
 *
 *  Triggers:
 *  - 24h before check-in → "Get ready"
 *  - Day of check-out     → "Time to wrap up"
 *  - Review-window expiry → "Last day to review"
 *
 *  Each (booking × stage) fires at most once thanks to a localStorage
 *  ledger; clearing the key (or signing out and back in) resets it. */
@Injectable({ providedIn: 'root' })
export class DateTriggerService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);
  private bookings = inject(BookingService);
  private toasts = inject(ToastService);

  private sub: Subscription | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private fired: Set<string> = new Set();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.fired = this.readFired();

    // Re-scan whenever the user changes or bookings update.
    this.sub = combineLatest([this.auth.currentUser$, this.bookings.bookings$])
      .subscribe(([user, all]) => {
        if (!user) return;
        const mine = all.filter(b => b.userEmail === user.email);
        this.scan(mine);
      });

    // Catch transitions that happen while the tab is left open.
    this.timer = setInterval(() => {
      const user = this.auth.currentUser;
      if (!user) return;
      const mine = this.bookings.getAll().filter(b => b.userEmail === user.email);
      this.scan(mine);
    }, RECHECK_MS);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.timer) clearInterval(this.timer);
  }

  private scan(bookings: IBooking[]): void {
    const now = Date.now();
    for (const b of bookings) {
      if (b.status === 'cancelled' || b.status === 'declined') continue;
      const startMs = new Date(b.dates.start).getTime();
      const endMs   = new Date(b.dates.end).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;

      // 1) Check-in soon — fires inside the 24h window before start.
      if (b.status === 'confirmed' || b.status === 'approved') {
        const diff = startMs - now;
        if (diff > 0 && diff <= 86_400_000) {
          this.fire(b, 'checkin-soon', `Get ready — your stay at ${b.listingTitle} starts tomorrow.`);
        }
      }

      // 2) Check-out day — fires on the calendar day matching dates.end
      //    (before or after the wall clock; we don't gate on time-of-day).
      if (this.sameLocalDay(endMs, now)) {
        this.fire(b, 'checkout-day', `Heading out today? Leave a review for ${b.listingTitle} — earn CurbNTurf Cash.`);
      }

      // 3) Review-window expiry — fires on the last day of the review
      //    window if the guest hasn't reviewed.
      if (!b.reviewedAt && (b.status === 'confirmed' || b.status === 'approved')) {
        const expiryMs = endMs + REVEAL_WINDOW_DAYS * 86_400_000;
        const lastDayMs = expiryMs - 86_400_000;
        if (now >= lastDayMs && now < expiryMs) {
          this.fire(b, 'review-expiry', `Last day to review ${b.listingTitle} for credit.`);
        }
      }
    }
  }

  private fire(b: IBooking, stage: Stage, message: string): void {
    const key = `${b.id}:${stage}`;
    if (this.fired.has(key)) return;
    this.fired.add(key);
    this.persistFired();
    // Use info tone — these are timely nudges, not errors or successes.
    this.toasts.info(message);
  }

  /** True when two epoch ms values fall on the same local-time date. */
  private sameLocalDay(aMs: number, bMs: number): boolean {
    const a = new Date(aMs);
    const b = new Date(bMs);
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
  }

  private readFired(): Set<string> {
    try {
      const raw = localStorage.getItem(FIRED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch { return new Set(); }
  }

  private persistFired(): void {
    try { localStorage.setItem(FIRED_KEY, JSON.stringify([...this.fired])); } catch { /* ignore */ }
  }
}
