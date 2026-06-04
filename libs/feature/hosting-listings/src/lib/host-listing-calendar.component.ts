import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import {
  SeoService, AuthService, BookingService, ToastService,
  HostAvailabilityService, IHostAvailability,
  IPrivateListing, MOCK_LISTINGS, getMyListings,
  downloadListingIcs, parseIcsToDateRanges, expandRangesToDates,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';

type DayState = 'past' | 'open' | 'booked' | 'pending' | 'blocked' | 'external';

interface IDayCell {
  date: Date;
  iso: string;             // YYYY-MM-DD
  inMonth: boolean;
  isToday: boolean;
  state: DayState;
  bookingId?: string;
  priceOverride?: number;
  selected: boolean;
  /** Source label when the cell is blocked by an imported feed. */
  externalSource?: string;
}

@Component({
  selector: 'cnt-host-listing-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './host-listing-calendar.component.html',
})
export class HostListingCalendarComponent implements OnInit, OnDestroy {
  listing: IPrivateListing | null = null;
  ownsListing = true;
  availability: IHostAvailability = { blocked: [], prices: {} };
  bookings: IBooking[] = [];

  /** Visible month (anchor: first day of month). */
  calendarMonth: Date = new Date();
  readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  selected = new Set<string>();
  /** Drag state — active while pointer is held down. */
  private dragging = false;
  private dragAnchor: string | null = null;
  private dragAddMode = true;

  priceInput: number | null = null;

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private bookingSvc: BookingService,
    private availabilitySvc: HostAvailabilityService,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    const id = parseInt(this.route.snapshot.paramMap.get('id') || '', 10);
    const found = MOCK_LISTINGS.find(l => l.id === id) || null;
    this.listing = found;

    const user = this.auth.currentUser;
    if (user && found) {
      const myIds = new Set(getMyListings(user.email).map(l => l.id));
      this.ownsListing = myIds.has(found.id);
    }

    this.seo.update({
      title: found ? `Calendar — ${found.title} | CurbNTurf` : 'Calendar — CurbNTurf',
      description: 'Manage availability and pricing for your listing.',
      url: `/hosting/listings/${id}/calendar`,
      robots: 'noindex, nofollow',
    });

    if (!found) return;

    this.subs.push(
      combineLatest([
        this.bookingSvc.bookings$,
        this.availabilitySvc.forListing$(found.id),
      ]).subscribe(([allBookings, avail]) => {
        this.bookings = allBookings.filter(b => b.listingId === found.id);
        this.availability = avail;
      }),
    );
  }

  ngOnDestroy(): void { for (const s of this.subs) s.unsubscribe(); }

  // ----- month nav -----
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

  /** ISO YYYY-MM-DD for a date. Uses local time to match what the host expects. */
  private isoKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** 42-cell grid for the visible month. */
  get monthCells(): IDayCell[] {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const startOffset = new Date(year, month, 1).getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const blockedSet = new Set(this.availability.blocked);

    const cells: IDayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const iso = this.isoKey(d);

      // Find a booking covering this day (priority: confirmed/approved > pending)
      let bookingId: string | undefined;
      let state: DayState = 'open';
      const covers = this.bookings.find(b => {
        if (b.status === 'cancelled' || b.status === 'declined') return false;
        const s = new Date(b.dates.start);
        s.setHours(0, 0, 0, 0);
        const e = new Date(b.dates.end);
        e.setHours(0, 0, 0, 0);
        return d >= s && d <= e;
      });
      let externalSource: string | undefined;
      if (covers) {
        bookingId = covers.id;
        state = covers.status === 'pending' ? 'pending' : 'booked';
      } else if (d < today) {
        state = 'past';
      } else if (blockedSet.has(iso)) {
        state = 'blocked';
      } else if (this.availability.externalBlocks) {
        for (const [source, dates] of Object.entries(this.availability.externalBlocks)) {
          if (dates.includes(iso)) { state = 'external'; externalSource = source; break; }
        }
      }

      cells.push({
        date: d,
        iso,
        inMonth: d.getMonth() === month,
        isToday: d.getTime() === today.getTime(),
        state,
        bookingId,
        priceOverride: this.availability.prices[iso],
        selected: this.selected.has(iso),
        externalSource,
      });
    }
    return cells;
  }

  // ----- selection -----
  canSelect(cell: IDayCell): boolean {
    return cell.state === 'open' || cell.state === 'blocked';
  }

  // ============ External feeds (T2.2 iCal import + T2.1 export) ============

  /** Inline import-feed form state. Collapsed by default. */
  feedFormOpen = false;
  feedFormLabel = '';
  feedFormUrl = '';
  feedFormText = '';
  feedFormError = '';
  feedSaving = false;
  /** Per-feed sync-in-progress flag, keyed by sourceLabel. */
  syncingSource: string | null = null;

  /** True when feeds panel should render (always once host owns the listing). */
  get registeredFeeds() { return this.availability.feeds ?? []; }

  openFeedForm(): void {
    this.feedFormOpen = true;
    this.feedFormLabel = '';
    this.feedFormUrl = '';
    this.feedFormText = '';
    this.feedFormError = '';
  }

  closeFeedForm(): void {
    this.feedFormOpen = false;
    this.feedFormError = '';
  }

  async saveFeed(): Promise<void> {
    if (!this.listing) return;
    const label = this.feedFormLabel.trim();
    const url = this.feedFormUrl.trim();
    const text = this.feedFormText.trim();
    if (!label) { this.feedFormError = 'Pick a name for this feed.'; return; }
    if (!url && !text) { this.feedFormError = 'Paste a feed URL or the calendar text.'; return; }

    this.feedSaving = true;
    this.feedFormError = '';

    let icsText = text;
    if (!icsText && url) {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) throw new Error(String(res.status));
        icsText = await res.text();
      } catch {
        this.feedFormError = 'Couldn\'t fetch automatically (likely CORS). Paste the calendar text below instead.';
        this.feedSaving = false;
        return;
      }
    }

    const ranges = parseIcsToDateRanges(icsText);
    if (ranges.length === 0) {
      this.feedFormError = 'No events found in that calendar.';
      this.feedSaving = false;
      return;
    }
    const isoDates = expandRangesToDates(ranges);

    this.availabilitySvc.upsertFeed(this.listing.id, { url: url || undefined, sourceLabel: label });
    this.availabilitySvc.applyExternalBlocks(this.listing.id, label, isoDates);

    this.toasts.success(`Imported ${isoDates.length} blocked ${isoDates.length === 1 ? 'night' : 'nights'} from ${label}.`);
    this.feedSaving = false;
    this.closeFeedForm();
  }

  async syncFeed(feed: { url?: string; sourceLabel: string }): Promise<void> {
    if (!this.listing) return;
    if (!feed.url) { this.toasts.info(`No URL on file for ${feed.sourceLabel} — paste new text via Add feed.`); return; }
    this.syncingSource = feed.sourceLabel;
    try {
      const res = await fetch(feed.url, { redirect: 'follow' });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      const ranges = parseIcsToDateRanges(text);
      const isoDates = expandRangesToDates(ranges);
      this.availabilitySvc.applyExternalBlocks(this.listing.id, feed.sourceLabel, isoDates);
      this.toasts.success(`Re-synced ${feed.sourceLabel} (${isoDates.length} ${isoDates.length === 1 ? 'night' : 'nights'}).`);
    } catch {
      this.toasts.info(`Couldn\'t reach ${feed.sourceLabel} (likely CORS). Re-paste the calendar text via Add feed.`);
    } finally {
      this.syncingSource = null;
    }
  }

  removeFeed(feed: { sourceLabel: string }): void {
    if (!this.listing) return;
    this.availabilitySvc.removeFeed(this.listing.id, feed.sourceLabel);
    this.toasts.info(`Removed ${feed.sourceLabel}.`);
  }

  /** Build + download the per-listing .ics (booked + manual blocks + external). */
  exportIcs(): void {
    if (!this.listing) return;
    downloadListingIcs({
      listing: this.listing,
      bookings: this.bookings,
      blocks: this.availability.blocked,
      externalBlocks: this.availability.externalBlocks ?? {},
    });
  }

  /** Subscribe-URL popover state. */
  subscribeOpen = false;
  toggleSubscribe(): void { this.subscribeOpen = !this.subscribeOpen; }
  get subscribeUrl(): string {
    return this.listing ? `https://calendars.curbnturf.com/listing/${this.listing.id}.ics` : '';
  }
  copySubscribeUrl(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.subscribeUrl);
      this.toasts.success('URL copied — works after backend launch.');
    }
  }

  formatRelative(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'just now';
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
    return `${Math.round(ms / 86_400_000)}d ago`;
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
  endDrag(): void {
    this.dragging = false;
    this.dragAnchor = null;
  }

  /** Apply the current drag rectangle [anchor..current] to the selection set. */
  private applyDragSelection(currentIso: string): void {
    if (!this.dragAnchor) return;
    const a = new Date(this.dragAnchor + 'T00:00:00');
    const b = new Date(currentIso + 'T00:00:00');
    const start = a < b ? a : b;
    const end = a < b ? b : a;
    const next = new Set(this.selected);
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = this.isoKey(d);
      const cell = this.monthCellAtIso(iso);
      if (!cell || !this.canSelect(cell)) continue;
      this.dragAddMode ? next.add(iso) : next.delete(iso);
    }
    this.selected = next;
  }

  private monthCellAtIso(iso: string): IDayCell | undefined {
    return this.monthCells.find(c => c.iso === iso);
  }

  clearSelection(): void { this.selected = new Set(); }

  // ----- bulk actions -----
  get selectedDates(): string[] { return [...this.selected].sort(); }
  get selectionCount(): number { return this.selected.size; }

  /** True when every selected date is currently blocked (so the button becomes "Unblock"). */
  get allSelectedBlocked(): boolean {
    if (this.selected.size === 0) return false;
    const blockedSet = new Set(this.availability.blocked);
    for (const iso of this.selected) if (!blockedSet.has(iso)) return false;
    return true;
  }

  toggleBlock(): void {
    if (!this.listing || this.selected.size === 0) return;
    const block = !this.allSelectedBlocked;
    this.availabilitySvc.setBlocked(this.listing.id, this.selectedDates, block);
    this.toasts.info(block ? `Blocked ${this.selected.size} ${this.selected.size === 1 ? 'day' : 'days'}.` : `Reopened ${this.selected.size} ${this.selected.size === 1 ? 'day' : 'days'}.`);
  }

  applyPrice(): void {
    if (!this.listing || this.selected.size === 0 || this.priceInput == null) return;
    if (this.priceInput <= 0) {
      this.toasts.info('Enter a price greater than $0.');
      return;
    }
    this.availabilitySvc.setPrice(this.listing.id, this.selectedDates, this.priceInput);
    this.toasts.success(`Set $${Math.round(this.priceInput)}/night on ${this.selected.size} ${this.selected.size === 1 ? 'day' : 'days'}.`);
  }

  resetSelection(): void {
    if (!this.listing || this.selected.size === 0) return;
    this.availabilitySvc.resetDates(this.listing.id, this.selectedDates);
    this.toasts.info(`Reset ${this.selected.size} ${this.selected.size === 1 ? 'day' : 'days'} to base.`);
  }

  // ----- styling helpers (the template stays thin) -----
  cellTone(cell: IDayCell): string {
    switch (cell.state) {
      case 'past':     return 'bg-transparent text-muted-text/40';
      case 'booked':   return 'bg-trinidad/15 border border-trinidad/40 text-dark-text';
      case 'pending':  return 'bg-gold/20 border border-gold/40 text-dark-text';
      case 'blocked':  return 'bg-cream/40 text-muted-text';
      case 'external': return 'bg-jungle-green/10 text-dark-text';
      default:         return 'bg-cream/30 hover:bg-cream/60 text-dark-text';
    }
  }

  cellLabel(cell: IDayCell): string {
    if (cell.state === 'booked') return 'Booked';
    if (cell.state === 'pending') return 'Pending';
    if (cell.state === 'blocked') return 'Blocked';
    if (cell.state === 'external') return cell.externalSource || 'External';
    return '';
  }

  basePrice(): number { return this.listing?.price ?? 0; }
}
