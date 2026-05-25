import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { IBooking } from '@cnt-workspace/models';
import { IUserReview } from './review.service';

export interface IHostReviewSubScores {
  cleanliness: number;
  communication: number;
  rulesFollowed: number;
  careOfSite: number;
  punctuality: number;
}

export interface IHostReview {
  id: string;
  bookingId: string;
  listingId: number;
  hostEmail: string;
  guestEmail: string;
  guestName: string;
  guestInitials: string;
  rating: number;                // 1–5, 2-decimal precision
  text: string;
  subScores: IHostReviewSubScores;
  createdAt: string;
}

const HOST_REVIEWS_KEY = 'cnt-host-reviews';

/** Two-sided reveal window — after the stay ends, either side has this many
 * days to submit before the other side's review reveals on its own. */
export const REVEAL_WINDOW_DAYS = 14;

export const GUEST_SUBSCORE_LABELS: Array<{ key: keyof IHostReviewSubScores; label: string; hint: string }> = [
  { key: 'cleanliness',    label: 'Cleanliness',    hint: 'Left the site as they found it.' },
  { key: 'communication',  label: 'Communication',  hint: 'Responsive, clear, on time.' },
  { key: 'rulesFollowed',  label: 'Followed rules', hint: 'Honored quiet hours, pet rules, etc.' },
  { key: 'careOfSite',     label: 'Care of site',   hint: 'Treated the property with respect.' },
  { key: 'punctuality',    label: 'Punctuality',    hint: 'Arrived and departed when expected.' },
];

/** Average of the five host-review sub-scores. Drives the derived overall. */
export function averageHostSubScores(s: IHostReviewSubScores): number {
  return (s.cleanliness + s.communication + s.rulesFollowed + s.careOfSite + s.punctuality) / 5;
}

/**
 * Two-sided reveal: a guest↔host review pair becomes visible to the world
 * only when both sides submitted OR the reveal window has expired. Until
 * then, only the author sees their own submission and aggregations skip it.
 */
export function isReviewRevealed(
  booking: Pick<IBooking, 'dates' | 'reviewedAt' | 'hostReviewedAt'> | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!booking) return true;
  // Both sides submitted → reveal immediately.
  if (booking.reviewedAt && booking.hostReviewedAt) return true;
  // Window expired → reveal whatever is in.
  const end = new Date(booking.dates.end);
  if (Number.isNaN(end.getTime())) return true;
  const windowEnd = new Date(end);
  windowEnd.setDate(windowEnd.getDate() + REVEAL_WINDOW_DAYS);
  return now >= windowEnd;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `h-${crypto.randomUUID()}`;
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class HostReviewService {
  private readonly _reviews$ = new BehaviorSubject<IHostReview[]>([]);
  readonly reviews$: Observable<IHostReview[]> = this._reviews$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._reviews$.next(this.read());
  }

  list(): IHostReview[] { return this._reviews$.value; }

  forBooking(bookingId: string): IHostReview | null {
    return this._reviews$.value.find(r => r.bookingId === bookingId) ?? null;
  }

  forGuest(email: string): IHostReview[] {
    return this._reviews$.value
      .filter(r => r.guestEmail === email)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  upsert(input: Omit<IHostReview, 'id' | 'createdAt'> & { id?: string }): IHostReview {
    const now = new Date().toISOString();
    const all = this.read();
    const existing = all.findIndex(r => r.bookingId === input.bookingId);
    if (existing !== -1) {
      const merged: IHostReview = { ...all[existing], ...input, id: all[existing].id, createdAt: all[existing].createdAt };
      all[existing] = merged;
      this.write(all);
      return merged;
    }
    const review: IHostReview = { id: input.id || newId(), ...input, createdAt: now };
    all.push(review);
    this.write(all);
    return review;
  }

  /**
   * Aggregated guest reputation: combines all *revealed* host-reviews of a
   * guest across all their bookings. Returns count = 0 when the guest is
   * brand-new (caller should render "New guest").
   */
  aggregateForGuest(
    email: string,
    bookingsByBookingId: Map<string, Pick<IBooking, 'dates' | 'reviewedAt' | 'hostReviewedAt'>>,
    now: Date = new Date(),
  ): { rating: number; count: number } {
    const all = this.forGuest(email);
    const revealed = all.filter(r => isReviewRevealed(bookingsByBookingId.get(r.bookingId), now));
    if (revealed.length === 0) return { rating: 0, count: 0 };
    const sum = revealed.reduce((acc, r) => acc + r.rating, 0);
    return { rating: +(sum / revealed.length).toFixed(2), count: revealed.length };
  }

  /** Filter a list of guest→host reviews down to those whose booking is
   * revealed. Drives the listing-detail reviews list. */
  filterRevealed(
    reviews: IUserReview[],
    bookingsByBookingId: Map<string, Pick<IBooking, 'dates' | 'reviewedAt' | 'hostReviewedAt'>>,
    now: Date = new Date(),
  ): IUserReview[] {
    return reviews.filter(r => {
      const b = bookingsByBookingId.get(r.bookingId);
      // Seeded reviews have no booking record — always considered revealed.
      if (!b) return true;
      return isReviewRevealed(b, now);
    });
  }

  private read(): IHostReview[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(HOST_REVIEWS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private write(reviews: IHostReview[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(HOST_REVIEWS_KEY, JSON.stringify(reviews)); } catch { /* noop */ }
    }
    this._reviews$.next(reviews);
  }
}
