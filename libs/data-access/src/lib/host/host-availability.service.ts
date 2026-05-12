import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, map } from 'rxjs';

/** Per-listing host-controlled availability and pricing overrides. */
export interface IHostAvailability {
  /** ISO YYYY-MM-DD dates the host has manually blocked. */
  blocked: string[];
  /** Per-day price overrides keyed by ISO YYYY-MM-DD. */
  prices: Record<string, number>;
}

const AVAILABILITY_KEY = 'cnt-host-availability';
const EMPTY: IHostAvailability = { blocked: [], prices: {} };

function clone(a: IHostAvailability): IHostAvailability {
  return { blocked: [...a.blocked], prices: { ...a.prices } };
}

@Injectable({ providedIn: 'root' })
export class HostAvailabilityService {
  private readonly _all$ = new BehaviorSubject<Record<number, IHostAvailability>>({});
  readonly all$: Observable<Record<number, IHostAvailability>> = this._all$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._all$.next(this.read());
  }

  /** Live availability for one listing — re-emits when any listing's data changes. */
  forListing$(listingId: number): Observable<IHostAvailability> {
    return this.all$.pipe(map(all => all[listingId] || EMPTY));
  }

  get(listingId: number): IHostAvailability {
    return this._all$.value[listingId] || EMPTY;
  }

  /** Block or unblock a set of ISO dates for a listing. */
  setBlocked(listingId: number, dates: string[], blocked: boolean): void {
    if (dates.length === 0) return;
    const current = clone(this.get(listingId));
    const set = new Set(current.blocked);
    for (const d of dates) blocked ? set.add(d) : set.delete(d);
    current.blocked = [...set].sort();
    this.patch(listingId, current);
  }

  /** Apply (or clear, when price is null) a per-day price override across a set of dates. */
  setPrice(listingId: number, dates: string[], price: number | null): void {
    if (dates.length === 0) return;
    const current = clone(this.get(listingId));
    for (const d of dates) {
      if (price === null || isNaN(price)) delete current.prices[d];
      else current.prices[d] = Math.round(price);
    }
    this.patch(listingId, current);
  }

  /** Drop all overrides + blocks for the given dates. */
  resetDates(listingId: number, dates: string[]): void {
    if (dates.length === 0) return;
    const current = clone(this.get(listingId));
    const blockedSet = new Set(current.blocked);
    for (const d of dates) {
      blockedSet.delete(d);
      delete current.prices[d];
    }
    current.blocked = [...blockedSet].sort();
    this.patch(listingId, current);
  }

  private patch(listingId: number, next: IHostAvailability): void {
    const all = { ...this._all$.value, [listingId]: next };
    this.write(all);
  }

  private read(): Record<number, IHostAvailability> {
    if (!isPlatformBrowser(this.platformId)) return {};
    try {
      const raw = localStorage.getItem(AVAILABILITY_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }

  private write(all: Record<number, IHostAvailability>): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(all)); } catch { /* quota */ }
    }
    this._all$.next(all);
  }
}
