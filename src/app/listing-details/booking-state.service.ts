import { Injectable, EventEmitter } from '@angular/core';
import { DateRange } from '@angular/material/datepicker';
import { AddOn, CancellationTier, Listing, ListingDetail } from '../search-results/mock-listings.data';

/**
 * Per-listing booking state shared between the sidebar widget and the mobile bar.
 * Provided at the parent component level (`providers: [BookingStateService]` on
 * ListingDetailsComponent) so each /listing instance gets a fresh service.
 *
 * The service is router-free. It exposes a `changed` EventEmitter the parent
 * subscribes to in order to call its own `syncBookingToUrl()` after each mutation.
 */
@Injectable()
export class BookingStateService {
  // Per-listing config (set via setListing)
  private unavailableSet = new Set<string>();
  maxGuests = 2;
  addOns: AddOn[] = [];
  cancellationTier: CancellationTier = 'moderate';
  nightlyPrice = 0;

  // Booking state
  readonly today = new Date();
  selectedDateRange: DateRange<Date> | null = null;
  guestCount = 2;
  selectedAddOns = new Set<string>();
  showCalendar = false;
  showAddOns = false;
  dateRangeError = '';

  readonly SERVICE_FEE_RATE = 0.15;

  /** Fired after every mutating method so the parent can sync URL params. */
  readonly changed = new EventEmitter<void>();

  /** Bind per-listing data. Resets transient errors but preserves user-entered booking state. */
  setListing(listing: Listing, detail: ListingDetail): void {
    this.unavailableSet = new Set(detail.unavailableDates);
    this.maxGuests = detail.maxGuests;
    this.addOns = detail.addOns;
    this.cancellationTier = detail.cancellationTier;
    this.nightlyPrice = listing.price;
    this.dateRangeError = '';
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
      : Math.min(2, this.maxGuests);
    if (this.guestCount !== desiredGuests) this.guestCount = desiredGuests;

    const addonsStr = params['addons'] || '';
    const desiredAddons = new Set(addonsStr ? addonsStr.split(',').filter(Boolean) : []);
    if (!this.sameStringSet(this.selectedAddOns, desiredAddons)) {
      this.selectedAddOns = desiredAddons;
    }
  }

  /** Returns the URL-shape of current state. Caller pushes via Router. */
  serializeToParams(): { start: string | null; end: string | null; guests: number | null; addons: string | null } {
    const start = this.selectedDateRange?.start;
    const end = this.selectedDateRange?.end;
    return {
      start:  start ? this.toIso(start) : null,
      end:    end   ? this.toIso(end)   : null,
      guests: this.guestCount > 1 ? this.guestCount : null,
      addons: this.selectedAddOns.size > 0 ? [...this.selectedAddOns].join(',') : null,
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
    if (this.selectedAddOns.has(id)) this.selectedAddOns.delete(id);
    else this.selectedAddOns.add(id);
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
      else                               sum += a.price;
    }
    return sum;
  }

  get serviceFee(): number {
    return Math.round((this.subtotal + this.addOnsTotal) * this.SERVICE_FEE_RATE);
  }

  get total(): number {
    return this.subtotal + this.addOnsTotal + this.serviceFee;
  }

  get canBook(): boolean { return this.nights > 0; }

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
