import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ReviewSubScores {
  cleanliness: number;
  communication: number;
  location: number;
  hookups: number;
  value: number;
}

export interface UserReview {
  id: string;
  bookingId: string;
  listingId: number;
  userEmail: string;
  authorName: string;
  authorInitials: string;
  rating: number;          // 1–5 (overall)
  text: string;
  subScores: ReviewSubScores;
  createdAt: string;
}

const REVIEWS_KEY = 'cnt-reviews';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `r-${crypto.randomUUID()}`;
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly _reviews$ = new BehaviorSubject<UserReview[]>([]);
  readonly reviews$: Observable<UserReview[]> = this._reviews$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._reviews$.next(this.read());
  }

  list(): UserReview[] { return this._reviews$.value; }

  forBooking(bookingId: string): UserReview | null {
    return this._reviews$.value.find(r => r.bookingId === bookingId) ?? null;
  }

  forListing(listingId: number): UserReview[] {
    return this._reviews$.value
      .filter(r => r.listingId === listingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  forUser(email: string): UserReview[] {
    return this._reviews$.value.filter(r => r.userEmail === email);
  }

  upsert(input: Omit<UserReview, 'id' | 'createdAt'> & { id?: string }): UserReview {
    const now = new Date().toISOString();
    const all = this.read();
    const existing = all.findIndex(r => r.bookingId === input.bookingId);
    if (existing !== -1) {
      const merged: UserReview = { ...all[existing], ...input, id: all[existing].id, createdAt: all[existing].createdAt };
      all[existing] = merged;
      this.write(all);
      return merged;
    }
    const review: UserReview = {
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

  private read(): UserReview[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(REVIEWS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private write(reviews: UserReview[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); } catch {}
    }
    this._reviews$.next(reviews);
  }
}
