import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Booking } from './booking.types';

const BOOKINGS_KEY = 'cnt-bookings';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly _bookings$ = new BehaviorSubject<Booking[]>([]);
  readonly bookings$: Observable<Booking[]> = this._bookings$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this._bookings$.next(this.read());
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
    const booking: Booking = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
    };
    const all = this.read();
    all.push(booking);
    this.write(all);
    return booking;
  }

  cancel(id: string): Booking | null {
    const all = this.read();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], status: 'cancelled' };
    this.write(all);
    return all[idx];
  }

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
