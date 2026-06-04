import { Injectable, EventEmitter, OnDestroy } from '@angular/core';
import { DateRange } from '@angular/material/datepicker';
import { Subscription } from 'rxjs';
import { IAddOn, CancellationTier, IPrivateListing, IListingDetail, ListingAvailabilityService } from '@cnt-workspace/data-access';
import { IMyRv, emptyMyRv, hasMyRvPhotos } from '@cnt-workspace/data-access';
import { computeServiceFee, computeFeedbackIncentive, FEEDBACK_INCENTIVE_PER_NIGHT } from '@cnt-workspace/data-access';

/**
 * Per-listing booking state shared between the sidebar widget and the mobile bar.
 * Provided at the parent component level (`providers: [BookingStateService]` on
 * ListingDetailsComponent) so each /listing instance gets a fresh service.
 *
 * The service is router-free. It exposes a `changed` EventEmitter the parent
 * subscribes to in order to call its own `syncBookingToUrl()` after each mutation.
 */
@Injectable()
export class BookingStateService implements OnDestroy {
  /** Merged host-blocks + booked-nights set, kept live via the
   *  ListingAvailabilityService subscription. Seeded from the listing's
   *  mock unavailableDates on setListing so initial render is correct
   *  before the first stream tick lands. */
  private unavailableSet = new Set<string>();
  private availabilitySub: Subscription | null = null;
  private currentListingId: number | null = null;
  maxGuests = 2;
  addOns: IAddOn[] = [];
  cancellationTier: CancellationTier = 'moderate';
  nightlyPrice = 0;
  /** Whether the current listing supports instant book. Photos aren't required when true. */
  instantBook = false;
  /** Latest snapshot of the user's My RV profile (read by the widget; tracked here so canBook is correct). */
  myRv: IMyRv = emptyMyRv();

  // Booking state
  readonly today = new Date();
  selectedDateRange: DateRange<Date> | null = null;
  guestCount = 1;
  selectedAddOns = new Set<string>();
  /** Quantity per add-on id. Only meaningful for `per unit` add-ons; others ignore this. */
  addOnQuantities = new Map<string, number>();
  showCalendar = false;
  showAddOns = false;
  dateRangeError = '';

  /** Per-night feedback incentive — exposed so templates can show "$5/night refunds as CurbNTurf Cash". */
  readonly feedbackIncentivePerNight = FEEDBACK_INCENTIVE_PER_NIGHT;

  /** Fired after every mutating method so the parent can sync URL params. */
  readonly changed = new EventEmitter<void>();

  constructor(private availability: ListingAvailabilityService) {}

  /** Bind per-listing data. Resets transient errors but preserves user-entered booking state. */
  setListing(listing: IPrivateListing, detail: IListingDetail): void {
    this.currentListingId = listing.id;
    this.unavailableSet = new Set(detail.unavailableDates);
    this.maxGuests = detail.maxGuests;
    this.addOns = detail.addOns;
    this.cancellationTier = detail.cancellationTier;
    this.nightlyPrice = listing.price;
    this.instantBook = listing.instantBook;
    this.dateRangeError = '';

    // Drop the previous listing's subscription before subscribing to the
    // new one, so a listing-to-listing navigation doesn't leak streams.
    this.availabilitySub?.unsubscribe();
    this.availabilitySub = this.availability.unavailableSet$(listing.id).subscribe(set => {
      // Union the live merged set with the mock detail dates — keeps the
      // demo "unavailableDates" stub working until we drop it.
      const merged = new Set<string>(detail.unavailableDates);
      for (const iso of set) merged.add(iso);
      this.unavailableSet = merged;
      this.changed.emit();
    });
  }

  ngOnDestroy(): void {
    this.availabilitySub?.unsubscribe();
    this.availabilitySub = null;
  }

  /** Track the user's MyRv profile so canBook reflects whether photos are present. */
  setMyRv(rv: IMyRv): void {
    this.myRv = rv;
  }

  /** Idempotent: pulls dates/guests/addons from query params into state. */
  hydrateFromParams(params: { [k: string]: string }): void {
    const startStr = params['start'];
    const endStr = params['end'];
    const desiredStart = startStr ? this.parseIso(startStr) : null;
    const desiredEnd   = endStr   ? this.parseIso(endStr)   : null;
    const curStart = this.selectedDateRange?.start ?? null;
    const curEnd   = this.selectedDateRange?.end   ?? null;
    if (!this.sameDate(curStart, desiredStart) || !this.sameDate(curEnd, desiredEnd)) {
      this.selectedDateRange = desiredStart ? new DateRange(desiredStart, desiredEnd) : null;
    }

    const g = parseInt(params['guests'], 10);
    const desiredGuests = (Number.isFinite(g) && g > 0)
      ? Math.max(1, Math.min(this.maxGuests, g))
      : Math.min(1, this.maxGuests);
    if (this.guestCount !== desiredGuests) this.guestCount = desiredGuests;

    const addonsStr = params['addons'] || '';
    const tokens = addonsStr ? addonsStr.split(',').filter(Boolean) : [];
    const desiredAddons = new Set<string>();
    const desiredQty = new Map<string, number>();
    for (const tok of tokens) {
      const [id, qtyStr] = tok.split(':');
      if (!id) continue;
      desiredAddons.add(id);
      const qty = parseInt(qtyStr, 10);
      if (Number.isFinite(qty) && qty > 0) desiredQty.set(id, qty);
    }
    if (!this.sameStringSet(this.selectedAddOns, desiredAddons)) {
      this.selectedAddOns = desiredAddons;
    }
    this.addOnQuantities = desiredQty;
  }

  /** Returns the URL-shape of current state. Caller pushes via Router. */
  serializeToParams(): { start: string | null; end: string | null; guests: number | null; addons: string | null } {
    const start = this.selectedDateRange?.start;
    const end = this.selectedDateRange?.end;
    const addons = [...this.selectedAddOns].map(id => {
      const q = this.addOnQuantities.get(id);
      return q && q > 1 ? `${id}:${q}` : id;
    });
    return {
      start:  start ? this.toIso(start) : null,
      end:    end   ? this.toIso(end)   : null,
      guests: this.guestCount > 1 ? this.guestCount : null,
      addons: addons.length > 0 ? addons.join(',') : null,
    };
  }

  // ---- Mutators ----
  toggleCalendar(): void { this.showCalendar = !this.showCalendar; this.changed.emit(); }
  closeCalendar(): void { this.showCalendar = false; this.changed.emit(); }
  toggleAddOnsPanel(): void { this.showAddOns = !this.showAddOns; this.changed.emit(); }

  onDateSelected(date: Date | null): void {
    if (!date) return;
    this.dateRangeError = '';
    if (!this.selectedDateRange || !this.selectedDateRange.start || (this.selectedDateRange.start && this.selectedDateRange.end)) {
      this.selectedDateRange = new DateRange(date, null);
    } else if (date < this.selectedDateRange.start) {
      this.selectedDateRange = new DateRange(date, null);
    } else {
      if (this.rangeHasUnavailable(this.selectedDateRange.start, date)) {
        this.dateRangeError = 'That range crosses booked nights. Pick a check-out before the next booked date.';
        this.selectedDateRange = new DateRange(this.selectedDateRange.start, null);
        this.changed.emit();
        return;
      }
      if (this.currentListingId != null) {
        const check = this.availability.checkStayRule(
          this.currentListingId,
          this.toIso(this.selectedDateRange.start),
          this.toIso(date),
        );
        if (!check.ok) {
          this.dateRangeError = check.kind === 'min'
            ? `This range needs at least a ${check.requiredNights}-night minimum.`
            : `This range can't exceed ${check.requiredNights} nights.`;
          this.selectedDateRange = new DateRange(this.selectedDateRange.start, null);
          this.changed.emit();
          return;
        }
      }
      this.selectedDateRange = new DateRange(this.selectedDateRange.start, date);
      // Auto-close calendar after a complete range is picked
      setTimeout(() => this.closeCalendar(), 250);
    }
    this.changed.emit();
  }

  clearDates(): void {
    this.selectedDateRange = null;
    this.dateRangeError = '';
    this.changed.emit();
  }

  adjustGuests(delta: number): void {
    this.guestCount = Math.max(1, Math.min(this.maxGuests, this.guestCount + delta));
    this.changed.emit();
  }

  toggleAddOn(id: string): void {
    if (this.selectedAddOns.has(id)) {
      this.selectedAddOns.delete(id);
      this.addOnQuantities.delete(id);
    } else {
      this.selectedAddOns.add(id);
      const a = this.addOns.find(x => x.id === id);
      if (a?.unit === 'per unit') this.addOnQuantities.set(id, 1);
    }
    this.changed.emit();
  }

  /** Quantity for an add-on; 1 by default. Only `per unit` rows expose the stepper. */
  addOnQty(id: string): number {
    return this.addOnQuantities.get(id) ?? 1;
  }

  /** Step the quantity for a `per unit` add-on. Clamps at 1 minimum, 99 max. */
  adjustAddOnQty(id: string, delta: number): void {
    if (!this.selectedAddOns.has(id)) return;
    const a = this.addOns.find(x => x.id === id);
    if (a?.unit !== 'per unit') return;
    const next = Math.max(1, Math.min(99, this.addOnQty(id) + delta));
    this.addOnQuantities.set(id, next);
    this.changed.emit();
  }

  // ---- Computed (getter) ----
  /** Used by mat-calendar to gray out booked dates. */
  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    return !this.unavailableSet.has(this.toIso(d));
  };

  get nights(): number {
    if (!this.selectedDateRange?.start || !this.selectedDateRange?.end) return 0;
    const ms = this.selectedDateRange.end.getTime() - this.selectedDateRange.start.getTime();
    return Math.max(1, Math.round(ms / 86_400_000));
  }

  get subtotal(): number {
    return this.nightlyPrice * (this.nights || 0);
  }

  get addOnsTotal(): number {
    let sum = 0;
    for (const a of this.addOns) {
      if (!this.selectedAddOns.has(a.id)) continue;
      if (a.unit === 'per night')        sum += a.price * (this.nights || 1);
      else if (a.unit === 'per person')  sum += a.price * this.guestCount;
      else if (a.unit === 'per unit')    sum += a.price * this.addOnQty(a.id);
      else                               sum += a.price;
    }
    return sum;
  }

  get serviceFee(): number {
    // Fee basis is the host's nightly subtotal only — add-ons pass through fee-free.
    return computeServiceFee(this.subtotal, this.nights);
  }

  /** Charged at booking; refunded as CurbNTurf Cash when guest leaves a qualifying review. */
  get feedbackIncentive(): number {
    return computeFeedbackIncentive(this.nights);
  }

  get total(): number {
    // All-in pricing: subtotal already contains the host's service fee +
    // feedback incentive baked in. Don't double-count them here.
    return this.subtotal + this.addOnsTotal;
  }

  /** True when the user has both required photos on their My RV profile. */
  get hasPhotosForBooking(): boolean { return hasMyRvPhotos(this.myRv); }

  /**
   * Reservation gate. Only requires picked dates — the RV photos for non-Instant-Book
   * listings are now collected via the RvPhotosModal triggered by the parent's
   * requestBooking(), not gated here.
   */
  get canBook(): boolean {
    return this.nights > 0;
  }

  get dateDisplay(): string {
    if (!this.selectedDateRange?.start) return 'Add dates';
    const startStr = this.selectedDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!this.selectedDateRange.end) return startStr;
    const endStr = this.selectedDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} – ${endStr}`;
  }

  get refundPreview(): { label: string; date: string | null; tone: 'good' | 'warn' | 'bad' } {
    const tier = this.cancellationTier;
    const start = this.selectedDateRange?.start;
    if (tier === 'exclusive' || !start) {
      if (tier === 'exclusive') return { label: 'Non-refundable', date: null, tone: 'bad' };
      return { label: '', date: null, tone: 'good' };
    }
    const daysBefore = tier === 'easy-goin' ? 1 : tier === 'moderate' ? 3 : 7;
    const cutoff = new Date(start);
    cutoff.setDate(cutoff.getDate() - daysBefore);
    const dateStr = cutoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (tier === 'strict') return { label: 'Half refund until', date: dateStr, tone: 'warn' };
    return { label: 'Free cancellation until', date: dateStr, tone: 'good' };
  }

  /** Returns the priced contribution of one add-on for display in the summary. */
  addOnLineTotal(id: string): number {
    const a = this.addOns.find(x => x.id === id);
    if (!a) return 0;
    if (a.unit === 'per night')       return a.price * (this.nights || 1);
    if (a.unit === 'per person')      return a.price * this.guestCount;
    if (a.unit === 'per unit')        return a.price * this.addOnQty(id);
    return a.price;
  }

  // ---- Private helpers ----
  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseIso(s: string): Date | null {
    const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''));
    return isNaN(d.getTime()) ? null : d;
  }

  private sameDate(a: Date | null, b: Date | null): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return this.toIso(a) === this.toIso(b);
  }

  private sameStringSet(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  private rangeHasUnavailable(start: Date, end: Date): boolean {
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cur <= last) {
      if (this.unavailableSet.has(this.toIso(cur))) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  }
}
