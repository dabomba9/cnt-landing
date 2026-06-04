import { Component, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import {
  SeoService, AuthService, BookingService, ToastService,
  HostAvailabilityService, HostListingDraftService,
  IPrivateListing, getMyListings,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';

type AggregateState =
  | 'past' | 'open' | 'mixed' | 'all-booked' | 'all-blocked' | 'uniform-price';

interface IDayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  state: AggregateState;
  /** When state === 'uniform-price', the common per-night override. */
  uniformPrice: number | null;
  /** Tooltip breakdown across scoped listings — only set when state === 'mixed'. */
  breakdown: string;
  selected: boolean;
}

@Component({
  selector: 'cnt-host-bulk-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './host-bulk-calendar.component.html',
})
export class HostBulkCalendarComponent implements OnInit, OnDestroy {
  listings: IPrivateListing[] = [];
  bookings: IBooking[] = [];

  /** ListingId → set of ISO dates with a confirmed/approved/pending booking. */
  private bookedByListing: Record<number, Set<string>> = {};

  /** Listing ids currently in scope for edits + aggregate render. */
  scopedIds = new Set<number>();

  calendarMonth: Date = new Date();
  readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  selected = new Set<string>();
  private dragging = false;
  private dragAnchor: string | null = null;
  private dragAddMode = true;

  priceInput: number | null = null;
  minNightsInput: number | null = null;

  private subs: Subscription[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private auth: AuthService,
    private bookingSvc: BookingService,
    private availability: HostAvailabilityService,
    private drafts: HostListingDraftService,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Bulk calendar — CurbNTurf',
      description: 'Block dates and set pricing across multiple listings at once.',
      url: '/hosting/calendar',
      robots: 'noindex, nofollow',
    });
    if (this.auth.currentView !== 'host') this.auth.setView('host');

    const user = this.auth.currentUser;
    if (!user) return;
    this.listings = getMyListings(user.email);
    this.scopedIds = new Set(this.listings.map(l => l.id));

    this.subs.push(
      combineLatest([this.bookingSvc.bookings$, this.availability.all$]).subscribe(([allBookings]) => {
        const ownedIds = new Set(this.listings.map(l => l.id));
        this.bookings = allBookings.filter(b => ownedIds.has(b.listingId));
        this.rebuildBookedMap();
      }),
    );
  }

  ngOnDestroy(): void { for (const s of this.subs) s.unsubscribe(); }

  get isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  // ============ Listing scope ============

  get propertyGroups() { return this.drafts.groupOwnedByProperty(this.listings); }

  isScoped(id: number): boolean { return this.scopedIds.has(id); }

  toggleScope(id: number): void {
    const next = new Set(this.scopedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.scopedIds = next;
    this.clearSelection();
  }

  selectAllScope(): void {
    this.scopedIds = new Set(this.listings.map(l => l.id));
    this.clearSelection();
  }

  clearScope(): void {
    this.scopedIds = new Set();
    this.clearSelection();
  }

  get scopedCount(): number { return this.scopedIds.size; }
  get scopedListingIds(): number[] { return [...this.scopedIds]; }

  // ============ Month nav ============

  prevMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
    this.clearSelection();
  }
  nextMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    this.clearSelection();
  }
  goToday(): void {
    this.calendarMonth = new Date();
    this.clearSelection();
  }

  get calendarMonthLabel(): string {
    return this.calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private isoKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Rebuild the listingId → Set<iso> booked-dates map whenever bookings change. */
  private rebuildBookedMap(): void {
    const map: Record<number, Set<string>> = {};
    for (const b of this.bookings) {
      if (b.status === 'cancelled' || b.status === 'declined') continue;
      const s = new Date(b.dates.start); s.setHours(0, 0, 0, 0);
      const e = new Date(b.dates.end); e.setHours(0, 0, 0, 0);
      const set = map[b.listingId] ?? (map[b.listingId] = new Set());
      for (let d = new Date(s); d <= e; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        set.add(this.isoKey(d));
      }
    }
    this.bookedByListing = map;
  }

  // ============ Day grid ============

  get monthCells(): IDayCell[] {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const startOffset = new Date(year, month, 1).getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ids = this.scopedListingIds;

    const cells: IDayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const iso = this.isoKey(d);
      const inMonth = d.getMonth() === month;
      const isToday = d.getTime() === today.getTime();

      let state: AggregateState = 'open';
      let uniformPrice: number | null = null;
      let breakdown = '';

      if (d < today) {
        state = 'past';
      } else if (ids.length === 0) {
        state = 'open';
      } else {
        const agg = this.availability.aggregateDayState(ids, iso, this.bookedByListing);
        const total = ids.length;
        if (agg.booked === total) state = 'all-booked';
        else if (agg.blocked === total) state = 'all-blocked';
        else if (agg.open === total && agg.uniformPrice !== null) {
          state = 'uniform-price'; uniformPrice = agg.uniformPrice;
        } else if (agg.open === total && agg.priced === 0) {
          state = 'open';
        } else {
          state = 'mixed';
          const parts: string[] = [];
          if (agg.open) parts.push(`${agg.open} open`);
          if (agg.booked) parts.push(`${agg.booked} booked`);
          if (agg.blocked) parts.push(`${agg.blocked} blocked`);
          if (agg.priced) parts.push(`${agg.priced} priced`);
          breakdown = parts.join(' · ');
        }
      }

      cells.push({
        date: d, iso, inMonth, isToday, state, uniformPrice, breakdown,
        selected: this.selected.has(iso),
      });
    }
    return cells;
  }

  // ============ Selection / drag ============

  canSelect(cell: IDayCell): boolean {
    return cell.state !== 'past' && cell.state !== 'all-booked' && this.scopedCount > 0;
  }

  startDrag(cell: IDayCell, event: MouseEvent): void {
    if (!this.canSelect(cell)) return;
    event.preventDefault();
    this.dragging = true;
    this.dragAnchor = cell.iso;
    this.dragAddMode = !this.selected.has(cell.iso);
    this.applyDragSelection(cell.iso);
  }

  enterDrag(cell: IDayCell): void {
    if (!this.dragging || !this.dragAnchor) return;
    if (!this.canSelect(cell)) return;
    this.applyDragSelection(cell.iso);
  }

  @HostListener('document:mouseup')
  endDrag(): void { this.dragging = false; this.dragAnchor = null; }

  private applyDragSelection(currentIso: string): void {
    if (!this.dragAnchor) return;
    const a = new Date(this.dragAnchor + 'T00:00:00');
    const b = new Date(currentIso + 'T00:00:00');
    const start = a < b ? a : b;
    const end = a < b ? b : a;
    const next = new Set(this.selected);
    const cells = this.monthCells;
    const cellByIso = new Map(cells.map(c => [c.iso, c] as const));
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = this.isoKey(d);
      const cell = cellByIso.get(iso);
      if (!cell || !this.canSelect(cell)) continue;
      this.dragAddMode ? next.add(iso) : next.delete(iso);
    }
    this.selected = next;
  }

  clearSelection(): void { this.selected = new Set(); }

  get selectedDates(): string[] { return [...this.selected].sort(); }
  get selectionCount(): number { return this.selected.size; }

  /** True when every (date × scoped listing) cross is already blocked — drives
   *  the Block/Unblock label flip on the action bar. */
  get allSelectedBlocked(): boolean {
    if (this.selected.size === 0 || this.scopedCount === 0) return false;
    const ids = this.scopedListingIds;
    for (const iso of this.selected) {
      const agg = this.availability.aggregateDayState(ids, iso, this.bookedByListing);
      if (agg.blocked !== ids.length - agg.booked) return false;
    }
    return true;
  }

  // ============ Bulk actions ============

  toggleBlock(): void {
    const ids = this.scopedListingIds;
    if (ids.length === 0 || this.selected.size === 0) return;
    const block = !this.allSelectedBlocked;
    const skips = block ? this.countConflicts(ids) : 0;
    this.availability.setBlockedBulk(ids, this.selectedDates, block);
    const verb = block ? 'Blocked' : 'Reopened';
    const noun = this.selected.size === 1 ? 'day' : 'days';
    const scope = `${ids.length} ${ids.length === 1 ? 'listing' : 'listings'}`;
    if (skips > 0) {
      this.toasts.info(`${verb} ${this.selected.size} ${noun} across ${scope}. Skipped ${skips} listing-${skips === 1 ? 'date' : 'dates'} with existing bookings.`);
    } else {
      this.toasts.info(`${verb} ${this.selected.size} ${noun} across ${scope}.`);
    }
    this.clearSelection();
  }

  applyPrice(): void {
    const ids = this.scopedListingIds;
    if (ids.length === 0 || this.selected.size === 0 || this.priceInput == null) return;
    if (this.priceInput <= 0) { this.toasts.info('Enter a price greater than $0.'); return; }
    this.availability.setPriceBulk(ids, this.selectedDates, this.priceInput);
    const noun = this.selected.size === 1 ? 'day' : 'days';
    const scope = `${ids.length} ${ids.length === 1 ? 'listing' : 'listings'}`;
    this.toasts.success(`Set $${Math.round(this.priceInput)}/night on ${this.selected.size} ${noun} across ${scope}.`);
    this.clearSelection();
  }

  resetSelection(): void {
    const ids = this.scopedListingIds;
    if (ids.length === 0 || this.selected.size === 0) return;
    this.availability.resetDatesBulk(ids, this.selectedDates);
    const noun = this.selected.size === 1 ? 'day' : 'days';
    const scope = `${ids.length} ${ids.length === 1 ? 'listing' : 'listings'}`;
    this.toasts.info(`Reset ${this.selected.size} ${noun} across ${scope} to base.`);
    this.clearSelection();
  }

  applyMinStay(): void {
    const ids = this.scopedListingIds;
    if (ids.length === 0 || this.selected.size === 0 || this.minNightsInput == null) return;
    if (this.minNightsInput < 1) { this.toasts.info('Pick at least 1 night.'); return; }
    const dates = this.selectedDates;
    this.availability.setStayRuleBulk(ids, {
      start: dates[0],
      end: dates[dates.length - 1],
      minNights: Math.round(this.minNightsInput),
    });
    const scope = `${ids.length} ${ids.length === 1 ? 'listing' : 'listings'}`;
    this.toasts.success(`${Math.round(this.minNightsInput)}-night minimum applied to ${scope}.`);
    this.minNightsInput = null;
    this.clearSelection();
  }

  /** Count (listing × date) pairs that already carry a booking — used in the
   *  block-apply toast so the host knows we skipped those. */
  private countConflicts(ids: number[]): number {
    let n = 0;
    for (const iso of this.selected) {
      for (const id of ids) if (this.bookedByListing[id]?.has(iso)) n++;
    }
    return n;
  }

  // ============ Styling helpers ============

  cellTone(cell: IDayCell): string {
    switch (cell.state) {
      case 'past':         return 'bg-transparent text-muted-text/40';
      case 'all-booked':   return 'bg-trinidad/15 border border-trinidad/40 text-dark-text';
      case 'all-blocked':  return 'bg-cream/40 text-muted-text';
      case 'mixed':        return 'bg-gold/10 border border-gold/30 text-dark-text';
      case 'uniform-price':return 'bg-jungle-green/10 border border-jungle-green/30 text-dark-text';
      default:             return 'bg-cream/30 hover:bg-cream/60 text-dark-text';
    }
  }

  cellLabel(cell: IDayCell): string {
    if (cell.state === 'all-booked')  return 'Booked';
    if (cell.state === 'all-blocked') return 'Blocked';
    if (cell.state === 'mixed')       return 'Mixed';
    return '';
  }
}
