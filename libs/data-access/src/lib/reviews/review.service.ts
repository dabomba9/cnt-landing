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
}

const REVIEWS_KEY = 'cnt-reviews';

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
