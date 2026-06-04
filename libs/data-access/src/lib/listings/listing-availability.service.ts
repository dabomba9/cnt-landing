import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { HostAvailabilityService } from '../host/host-availability.service';
import { BookingService } from '../booking/booking.service';
import { IBooking } from '@cnt-workspace/models';

/** Local-time ISO YYYY-MM-DD key. Matches the convention used in
 *  HostAvailabilityService, BookingStateService, and the host calendars.
 *  Deferring the full T4.1 centralization until the dedicated util ship. */
function isoKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Iterate every ISO date in [start, end] inclusive. */
function eachDateIso(start: Date, end: Date): string[] {
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    out.push(isoKey(d));
  }
  return out;
}

/** Booked-date set per listing, derived from the bookings stream.
 *  Skips cancelled / declined. Identical logic to the host calendars'
 *  per-cell booking lookup, centralized here so all three surfaces
 *  (host editors, guest widget, search) agree. */
function bookedByListing(bookings: IBooking[]): Record<number, Set<string>> {
  const map: Record<number, Set<string>> = {};
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'declined') continue;
    const s = new Date(b.dates.start); s.setHours(0, 0, 0, 0);
    const e = new Date(b.dates.end);   e.setHours(0, 0, 0, 0);
    const set = map[b.listingId] ?? (map[b.listingId] = new Set());
    for (const iso of eachDateIso(s, e)) set.add(iso);
  }
  return map;
}

/** Composition layer over HostAvailabilityService (manual blocks +
 *  per-day price overrides) and BookingService (committed nights). Every
 *  consumer that asks "is this listing free?" should go through this
 *  service so the two sources of truth stay reconciled at read time
 *  rather than synced at write time. */
@Injectable({ providedIn: 'root' })
export class ListingAvailabilityService {
  constructor(
    private hostAvailability: HostAvailabilityService,
    private bookings: BookingService,
  ) {}

  /** Live merged unavailable-date set for one listing.
   *  Re-emits whenever either source changes. */
  unavailableSet$(listingId: number): Observable<Set<string>> {
    return combineLatest([
      this.hostAvailability.forListing$(listingId),
      this.bookings.bookings$,
    ]).pipe(
      map(([avail, allBookings]) => {
        const set = new Set<string>(avail.blocked);
        if (avail.externalBlocks) {
          for (const dates of Object.values(avail.externalBlocks)) for (const iso of dates) set.add(iso);
        }
        const booked = bookedByListing(allBookings)[listingId];
        if (booked) for (const iso of booked) set.add(iso);
        return set;
      }),
    );
  }

  /** Sync range check for search and other filter pipelines. Booking
   *  convention: every night in [startIso, endIso) is required free,
   *  so checkout-day itself does not need to be open. Returns true when
   *  no required night intersects an unavailable date. */
  isAvailableForRange(listingId: number, startIso: string, endIso: string): boolean {
    const start = new Date(startIso + 'T00:00:00');
    const end   = new Date(endIso + 'T00:00:00');
    if (!(start < end)) return true;
    const avail = this.hostAvailability.get(listingId);
    const blockedSet = new Set(avail.blocked);
    if (avail.externalBlocks) {
      for (const dates of Object.values(avail.externalBlocks)) for (const iso of dates) blockedSet.add(iso);
    }
    const bookedSet = bookedByListing(this.bookings.getAll())[listingId] ?? new Set<string>();
    for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = isoKey(d);
      if (blockedSet.has(iso) || bookedSet.has(iso)) return false;
    }
    return true;
  }
}
