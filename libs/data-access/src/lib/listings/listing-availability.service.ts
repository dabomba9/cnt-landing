import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { HostAvailabilityService } from '../host/host-availability.service';
import { BookingService } from '../booking/booking.service';
import { IBooking } from '@cnt-workspace/models';
import { isoKey, eachDateIso } from '../shared/iso-date.util';

/** Pull the YYYY-MM-DD calendar day out of a booking's stored date
 *  string. Bookings persist either bare ISO dates ('2027-04-12') or
 *  full timestamps ('2027-04-12T15:00:00Z') — we always want the
 *  wall-clock day the guest is staying, not whatever local Date()
 *  parsing shifts to in a negative-offset timezone. */
function bookingIsoDay(dateString: string): string {
  return dateString.slice(0, 10);
}

/** Booked-date set per listing, derived from the bookings stream.
 *  Skips cancelled / declined. Identical logic to the host calendars'
 *  per-cell booking lookup, centralized here so all three surfaces
 *  (host editors, guest widget, search) agree. */
function bookedByListing(bookings: IBooking[]): Record<number, Set<string>> {
  const map: Record<number, Set<string>> = {};
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'declined') continue;
    const start = bookingIsoDay(b.dates.start);
    const end   = bookingIsoDay(b.dates.end);
    const set = map[b.listingId] ?? (map[b.listingId] = new Set());
    for (const iso of eachDateIso(start, end)) set.add(iso);
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
  private hostAvailability = inject(HostAvailabilityService);
  private bookings = inject(BookingService);


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

  /** Effective nightly price for one date — applies the standard layering:
   *  per-day override > seasonal tier > listing base price. First matching
   *  tier wins when multiple overlap (host controls order). */
  effectiveNightlyPrice(listingId: number, iso: string, basePrice: number): number {
    const avail = this.hostAvailability.get(listingId);
    const override = avail.prices?.[iso];
    if (typeof override === 'number') return override;
    const tier = avail.pricingTiers?.find(t => iso >= t.start && iso <= t.end);
    if (tier) return tier.nightlyPrice;
    return basePrice;
  }

  /** Lowest effective nightly price across [startIso, endIso) — drives
   *  the "from $X" headline on /listing/:id when seasonal tiers create
   *  a price floor different from the listing's base. */
  lowestNightlyForRange(listingId: number, startIso: string, endIso: string, basePrice: number): number {
    const prices = this.effectivePricesForRange(listingId, startIso, endIso, basePrice);
    const values = Object.values(prices);
    if (values.length === 0) return basePrice;
    let min = values[0];
    for (let i = 1; i < values.length; i++) if (values[i] < min) min = values[i];
    return min;
  }

  /** Per-night effective prices across [startIso, endIso) — booking
   *  convention, last night IS the checkout-eve, checkout day is free. */
  effectivePricesForRange(
    listingId: number,
    startIso: string,
    endIso: string,
    basePrice: number,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    const start = new Date(startIso + 'T00:00:00');
    const end   = new Date(endIso   + 'T00:00:00');
    if (!(start < end)) return out;
    for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = isoKey(d);
      out[iso] = this.effectiveNightlyPrice(listingId, iso, basePrice);
    }
    return out;
  }

  /** Min/max-stay rule check for a chosen [start, end). The rule that
   *  applies is the one whose [start, end] contains the check-in date
   *  (booking convention — guest's check-in night is the gate). */
  checkStayRule(
    listingId: number,
    startIso: string,
    endIso: string,
  ): { ok: true } | { ok: false; kind: 'min' | 'max'; requiredNights: number } {
    const rules = this.hostAvailability.get(listingId).stayRules;
    if (!rules || rules.length === 0) return { ok: true };
    const start = new Date(startIso + 'T00:00:00');
    const end   = new Date(endIso + 'T00:00:00');
    const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (nights <= 0) return { ok: true };
    const rule = rules.find(r => startIso >= r.start && startIso <= r.end);
    if (!rule) return { ok: true };
    if (rule.minNights != null && nights < rule.minNights) {
      return { ok: false, kind: 'min', requiredNights: rule.minNights };
    }
    if (rule.maxNights != null && nights > rule.maxNights) {
      return { ok: false, kind: 'max', requiredNights: rule.maxNights };
    }
    return { ok: true };
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
