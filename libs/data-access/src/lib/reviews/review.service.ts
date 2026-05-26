import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface IReviewSubScores {
  cleanliness: number;
  communication: number;
  location: number;
  hookups: number;
  value: number;
}

/** Host's public reply to a guest's review. One per review, edit/remove allowed. */
export interface IHostReviewResponse {
  text: string;
  respondedAt: string;     // ISO
}

export interface IUserReview {
  id: string;
  bookingId: string;
  listingId: number;
  userEmail: string;
  authorName: string;
  authorInitials: string;
  rating: number;          // 1–5 (overall)
  text: string;
  subScores: IReviewSubScores;
  createdAt: string;
  /** Optional host reply, rendered under the review. */
  hostResponse?: IHostReviewResponse;
}

const REVIEWS_KEY = 'cnt-reviews';

/** Average of the review sub-scores. Drives the derived overall rating.
 * Off-grid stays (no hookups) skip the Hookups score so an N/A field can't
 * drag the overall down. */
export function averageSubScores(s: IReviewSubScores, excludeHookups = false): number {
  if (excludeHookups) return (s.cleanliness + s.communication + s.location + s.value) / 4;
  return (s.cleanliness + s.communication + s.location + s.hookups + s.value) / 5;
}

/** Star-rendering state for position `pos` (1..5) against a fractional rating.
 *   pos=5, rating=4.8 → 'half'   pos=4, rating=4.8 → 'full'
 *   pos=5, rating=4.2 → 'empty' (rating below 4.5)
 */
export function starState(pos: number, rating: number): 'full' | 'half' | 'empty' {
  if (rating >= pos) return 'full';
  if (rating >= pos - 0.5) return 'half';
  return 'empty';
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `r-${crypto.randomUUID()}`;
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly _reviews$ = new BehaviorSubject<IUserReview[]>([]);
  readonly reviews$: Observable<IUserReview[]> = this._reviews$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._reviews$.next(this.read());
  }

  list(): IUserReview[] { return this._reviews$.value; }

  forBooking(bookingId: string): IUserReview | null {
    return this._reviews$.value.find(r => r.bookingId === bookingId) ?? null;
  }

  forListing(listingId: number): IUserReview[] {
    return this._reviews$.value
      .filter(r => r.listingId === listingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  forUser(email: string): IUserReview[] {
    return this._reviews$.value.filter(r => r.userEmail === email);
  }

  /** Combine the seeded listing rating with user-submitted reviews so the
   * headline rating actually reflects what guests are saying. */
  aggregateRating(seededRating: number, seededCount: number, listingId: number): { rating: number; count: number } {
    const userReviews = this._reviews$.value.filter(r => r.listingId === listingId);
    if (userReviews.length === 0) return { rating: seededRating, count: seededCount };
    const userSum = userReviews.reduce((sum, r) => sum + r.rating, 0);
    const totalCount = seededCount + userReviews.length;
    const totalSum = seededRating * seededCount + userSum;
    return { rating: +(totalSum / totalCount).toFixed(2), count: totalCount };
  }

  upsert(input: Omit<IUserReview, 'id' | 'createdAt'> & { id?: string }): IUserReview {
    const now = new Date().toISOString();
    const all = this.read();
    const existing = all.findIndex(r => r.bookingId === input.bookingId);
    if (existing !== -1) {
      const merged: IUserReview = { ...all[existing], ...input, id: all[existing].id, createdAt: all[existing].createdAt };
      all[existing] = merged;
      this.write(all);
      return merged;
    }
    const review: IUserReview = {
      id: input.id || newId(),
      ...input,
      createdAt: now,
    };
    all.push(review);
    this.write(all);
    return review;
  }

  remove(bookingId: string): void {
    const next = this._reviews$.value.filter(r => r.bookingId !== bookingId);
    this.write(next);
  }

  /** Set / replace / clear the host's public response on a review. Pass null
   * (or empty/whitespace) to remove. Returns the updated review or null if
   * the booking isn't reviewed. */
  setHostResponse(bookingId: string, text: string | null): IUserReview | null {
    const all = this.read();
    const idx = all.findIndex(r => r.bookingId === bookingId);
    if (idx === -1) return null;
    const trimmed = text?.trim() ?? '';
    const current = all[idx];
    const next: IUserReview = trimmed
      ? { ...current, hostResponse: { text: trimmed, respondedAt: new Date().toISOString() } }
      // Drop the field cleanly when clearing.
      : (() => { const { hostResponse: _drop, ...rest } = current; void _drop; return rest; })();
    all[idx] = next;
    this.write(all);
    return next;
  }

  private read(): IUserReview[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(REVIEWS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private write(reviews: IUserReview[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); } catch {}
    }
    this._reviews$.next(reviews);
  }
}
