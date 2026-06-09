import { Component, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { MatDatepickerModule, DateRange } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import {
  SeoService, AuthService, BookingService, ToastService,
  HostAvailabilityService, HostListingDraftService,
  IPrivateListing, getMyListings,
  isoKey, parseIsoLocal, eachDateIso,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';

type AggregateState =
  | 'past' | 'open' | 'mixed' | 'all-booked' | 'all-blocked' | 'uniform-price';

type BulkView = 'month' | '3month' | 'list';

const VIEW_KEY = 'cnt-bulk-calendar-view';
const LAST_RANGE_KEY = 'cnt-bulk-calendar-last-range';
const LIST_WINDOW_DAYS = 60;

interface IUpcomingEvent {
  listingId: number;
  title: string;
  start: string;
  end: string;
  kind: 'booked' | 'blocked' | 'external' | 'priced' | 'tier' | 'min-stay';
  detail?: string;
}

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
  imports: [CommonModule, FormsModule, RouterLink, MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule, NavbarComponent, FooterComponent],
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

  /** Month grid, 3-month strip, or chronological list. Persisted per device
   *  so the host's preference sticks across visits. */
  viewMode: BulkView = 'month';

  selected = new Set<string>();
  private dragging = false;
  private dragAnchor: string | null = null;
  private dragAddMode = true;

  priceInput: number | null = null;
  minNightsInput: number | null = null;
  tierNameInput = '';
  tierPriceInput: number | null = null;
  blockReasonInput = '';
  blockReasonCustom = '';
  readonly blockReasonPresets = ['Private use', 'Cleaning', 'Maintenance', 'Held for repeat'];

  /** Type-in range fields — peer to drag-selecting on the grid. */
  rangeStart = '';
  rangeEnd = '';
  rangeStartDate: Date | null = null;
  rangeEndDate: Date | null = null;
  pickByDateOpen = false;
  pickerRange: DateRange<Date> | null = null;
  pickerStartDate: Date | null = null;
  pickerEndDate: Date | null = null;

  private subs: Subscription[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private route: ActivatedRoute,
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

    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem(VIEW_KEY);
        if (stored === 'month' || stored === '3month' || stored === 'list') this.viewMode = stored;
      } catch { /* ignore */ }
    }

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

    // Deep-link support: ?day=YYYY-MM-DD pre-selects that single day,
    // or ?from=YYYY-MM-DD&to=YYYY-MM-DD pre-selects a range. Both jump
    // the visible month to the start and open the action bar.
    const params = this.route.snapshot.queryParamMap;
    const dayIso = params.get('day');
    const fromIso = params.get('from');
    const toIso = params.get('to');
    const ISO_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
    if (fromIso && toIso && ISO_SHAPE.test(fromIso) && ISO_SHAPE.test(toIso) && fromIso <= toIso) {
      this.selectByRange(fromIso, toIso);
    } else if (dayIso && ISO_SHAPE.test(dayIso)) {
      this.selectByRange(dayIso, dayIso);
    }
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

  /** Thin instance wrappers around the shared util so existing
   *  `this.isoKey(d)` / `this.parseIso(s)` call sites compile. */
  private isoKey(d: Date): string { return isoKey(d); }
  private parseIso(iso: string): Date | null { return parseIsoLocal(iso); }

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
    return this.cellsForMonth(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth());
  }

  /** 42-cell month grid for any anchor (year, month). Aggregate state per
   *  cell is identical to the original single-month getter. */
  private cellsForMonth(year: number, month: number): IDayCell[] {
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

  startDrag(cell: IDayCell, event: PointerEvent): void {
    if (!this.canSelect(cell)) return;
    event.preventDefault();
    this.dragging = true;
    this.dragAnchor = cell.iso;
    this.dragAddMode = !this.selected.has(cell.iso);
    this.applyDragSelection(cell.iso);
  }

  /** Keyboard-friendly single-cell toggle. Enter/Space on a focused cell
   *  toggles its membership in the selection without going through the
   *  drag state machine. */
  toggleCellSelection(cell: IDayCell, event: Event): void {
    if (!this.canSelect(cell)) return;
    event.preventDefault();
    const next = new Set(this.selected);
    if (next.has(cell.iso)) next.delete(cell.iso);
    else next.add(cell.iso);
    this.selected = next;
  }

  /** Document-level move handler — touch drags don't fire pointerenter on
   *  other cells once a pointer is implicitly captured by its target, so we
   *  hit-test via document.elementFromPoint and the cell's data-iso attr. */
  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el) return;
    const cellEl = (el as Element).closest('[data-iso]') as HTMLElement | null;
    if (!cellEl) return;
    const iso = cellEl.getAttribute('data-iso');
    if (!iso) return;
    const cell = this.allVisibleCells().find(c => c.iso === iso);
    if (!cell || !this.canSelect(cell)) return;
    this.applyDragSelection(iso);
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  endDrag(): void {
    this.dragging = false;
    this.dragAnchor = null;
    this.syncRangeFields();
  }

  private syncRangeFields(): void {
    const dates = this.selectedDates;
    this.rangeStart = dates[0] ?? '';
    this.rangeEnd   = dates[dates.length - 1] ?? '';
    this.rangeStartDate = this.parseIso(this.rangeStart);
    this.rangeEndDate   = this.parseIso(this.rangeEnd);
    this.pickerRange = (this.rangeStartDate && this.rangeEndDate)
      ? new DateRange<Date>(this.rangeStartDate, this.rangeEndDate)
      : null;
    this.pickerStartDate = this.rangeStartDate;
    this.pickerEndDate   = this.rangeEndDate;
  }

  onRangeDateChange(): void {
    this.rangeStart = this.rangeStartDate ? this.isoKey(this.rangeStartDate) : '';
    this.rangeEnd   = this.rangeEndDate   ? this.isoKey(this.rangeEndDate)   : '';
    if (this.rangeStart && this.rangeEnd) this.selectByRange(this.rangeStart, this.rangeEnd);
  }

  onPickerDateSelected(d: Date | null): void {
    if (!d) return;
    const start = this.pickerRange?.start ?? null;
    const end = this.pickerRange?.end ?? null;
    if (!start || end) {
      this.pickerRange = new DateRange<Date>(d, null);
    } else if (d < start) {
      this.pickerRange = new DateRange<Date>(d, null);
    } else {
      this.pickerRange = new DateRange<Date>(start, d);
      this.selectByRange(this.isoKey(start), this.isoKey(d));
    }
    this.pickerStartDate = this.pickerRange?.start ?? null;
    this.pickerEndDate   = this.pickerRange?.end   ?? null;
  }

  onPickerFieldChange(): void {
    if (!this.pickerStartDate || !this.pickerEndDate) {
      this.pickerRange = this.pickerStartDate ? new DateRange<Date>(this.pickerStartDate, null) : null;
      return;
    }
    const start = this.pickerStartDate < this.pickerEndDate ? this.pickerStartDate : this.pickerEndDate;
    const end   = this.pickerStartDate < this.pickerEndDate ? this.pickerEndDate   : this.pickerStartDate;
    this.pickerRange = new DateRange<Date>(start, end);
    this.selectByRange(this.isoKey(start), this.isoKey(end));
  }

  selectByRange(startIso: string, endIso: string): void {
    if (!startIso || !endIso || startIso > endIso) return;
    const startDate = new Date(startIso + 'T00:00:00');
    this.calendarMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const next = new Set<string>();
    const cursor = new Date(startIso + 'T00:00:00');
    const last   = new Date(endIso   + 'T00:00:00');
    const cells = this.allVisibleCells();
    while (cursor <= last) {
      const iso = this.isoKey(cursor);
      const cell = cells.find(c => c.iso === iso);
      if (cell && this.canSelect(cell)) next.add(iso);
      cursor.setDate(cursor.getDate() + 1);
    }
    this.selected = next;
  }

  onRangeFieldChange(): void {
    if (this.rangeStart && this.rangeEnd) this.selectByRange(this.rangeStart, this.rangeEnd);
  }

  /** One entry per month currently rendered. n=1 in 'month' view, n=3 in
   *  '3month' view. The list-view template skips this entirely. */
  get visibleMonths(): Array<{ year: number; month: number; label: string; cells: IDayCell[] }> {
    const base = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth(), 1);
    const n = this.viewMode === '3month' ? 3 : 1;
    const out: Array<{ year: number; month: number; label: string; cells: IDayCell[] }> = [];
    for (let i = 0; i < n; i++) {
      const m = new Date(base.getFullYear(), base.getMonth() + i, 1);
      out.push({
        year: m.getFullYear(),
        month: m.getMonth(),
        label: m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        cells: this.cellsForMonth(m.getFullYear(), m.getMonth()),
      });
    }
    return out;
  }

  /** Flattened cell pool for drag-select lookups — spans all visible months
   *  so a drag started in month N can finish in month N+1 inside the 3mo strip. */
  private allVisibleCells(): IDayCell[] {
    return this.visibleMonths.flatMap(m => m.cells);
  }

  setViewMode(v: BulkView): void {
    if (this.viewMode === v) return;
    this.viewMode = v;
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
    }
    this.clearSelection();
    this.pickByDateOpen = false;
  }

  togglePickByDate(): void {
    const opening = !this.pickByDateOpen;
    if (!opening) {
      // Closing: persist the current pair if both are set.
      this.persistLastRange();
    } else if (this.selected.size === 0) {
      // Opening fresh (no current selection): seed from the last
      // range the host typed/picked so they can iterate without
      // re-typing the season.
      this.seedFromLastRange();
    }
    this.pickByDateOpen = opening;
  }

  private persistLastRange(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.pickerStartDate || !this.pickerEndDate) return;
    try {
      localStorage.setItem(LAST_RANGE_KEY, JSON.stringify({
        start: this.isoKey(this.pickerStartDate),
        end:   this.isoKey(this.pickerEndDate),
      }));
    } catch { /* ignore */ }
  }

  private seedFromLastRange(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(LAST_RANGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const start = this.parseIso(parsed?.start);
      const end = this.parseIso(parsed?.end);
      if (!start || !end) return;
      this.pickerStartDate = start;
      this.pickerEndDate = end;
      this.pickerRange = new DateRange<Date>(start, end);
    } catch { /* ignore */ }
  }

  private applyDragSelection(currentIso: string): void {
    if (!this.dragAnchor) return;
    const a = new Date(this.dragAnchor + 'T00:00:00');
    const b = new Date(currentIso + 'T00:00:00');
    const start = a < b ? a : b;
    const end = a < b ? b : a;
    const next = new Set(this.selected);
    const cells = this.allVisibleCells();
    const cellByIso = new Map(cells.map(c => [c.iso, c] as const));
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = this.isoKey(d);
      const cell = cellByIso.get(iso);
      if (!cell || !this.canSelect(cell)) continue;
      this.dragAddMode ? next.add(iso) : next.delete(iso);
    }
    this.selected = next;
  }

  clearSelection(): void {
    this.selected = new Set();
    this.rangeStart = '';
    this.rangeEnd = '';
    this.rangeStartDate = null;
    this.rangeEndDate = null;
    this.pickerRange = null;
    this.pickerStartDate = null;
    this.pickerEndDate = null;
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.removeItem(LAST_RANGE_KEY); } catch { /* ignore */ }
    }
  }

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
    const reason = block ? this.effectiveBlockReason() : undefined;
    const skips = block ? this.countConflicts(ids) : 0;
    this.availability.setBlockedBulk(ids, this.selectedDates, block, reason);
    const verb = block ? 'Blocked' : 'Reopened';
    const noun = this.selected.size === 1 ? 'day' : 'days';
    const scope = `${ids.length} ${ids.length === 1 ? 'listing' : 'listings'}`;
    const reasonSuffix = block && reason ? ` · ${reason}` : '';
    if (skips > 0) {
      this.toasts.info(`${verb} ${this.selected.size} ${noun} across ${scope}${reasonSuffix}. Skipped ${skips} listing-${skips === 1 ? 'date' : 'dates'} with existing bookings.`);
    } else {
      this.toasts.info(`${verb} ${this.selected.size} ${noun} across ${scope}${reasonSuffix}.`);
    }
    this.blockReasonInput = '';
    this.blockReasonCustom = '';
    this.clearSelection();
  }

  effectiveBlockReason(): string {
    if (this.blockReasonInput === '__custom') return this.blockReasonCustom.trim();
    return this.blockReasonInput;
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

  applyTier(): void {
    const ids = this.scopedListingIds;
    if (ids.length === 0 || this.selected.size === 0) return;
    if (!this.tierNameInput.trim()) { this.toasts.info('Name the tier first.'); return; }
    if (this.tierPriceInput == null || this.tierPriceInput <= 0) { this.toasts.info('Pick a nightly rate above $0.'); return; }
    const dates = this.selectedDates;
    this.availability.setPricingTierBulk(ids, {
      name: this.tierNameInput.trim(),
      start: dates[0],
      end: dates[dates.length - 1],
      nightlyPrice: this.tierPriceInput,
    });
    const scope = `${ids.length} ${ids.length === 1 ? 'listing' : 'listings'}`;
    this.toasts.success(`Saved ${this.tierNameInput.trim()} tier · $${Math.round(this.tierPriceInput)}/night across ${scope}.`);
    this.tierNameInput = '';
    this.tierPriceInput = null;
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
      case 'past':         return 'bg-transparent text-muted-text/70';
      case 'all-booked':   return 'bg-trinidad/15 border border-trinidad/40 text-dark-text';
      case 'all-blocked':  return 'bg-cream/40 text-muted-text';
      case 'mixed':        return 'bg-gold/10 border border-gold/30 text-dark-text';
      case 'uniform-price':return 'bg-jungle-green/10 border border-jungle-green/30 text-dark-text';
      default:             return 'bg-cream/30 hover:bg-cream/60 text-dark-text';
    }
  }

  // ============ List view (T3.4) ============

  readonly listWindowDays = LIST_WINDOW_DAYS;

  /** Notable events across the next LIST_WINDOW_DAYS, grouped by listing
   *  and collapsed into contiguous same-kind runs. Sorted by start date. */
  get upcomingEvents(): IUpcomingEvent[] {
    if (this.viewMode !== 'list') return [];   // skip the compute when hidden
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + LIST_WINDOW_DAYS);

    const out: IUpcomingEvent[] = [];
    for (const l of this.listings) {
      const av = this.availability.get(l.id);
      const booked = this.bookedByListing[l.id] ?? new Set<string>();

      // Walk the window day-by-day, classify each iso, then collapse runs.
      type Kind = IUpcomingEvent['kind'];
      const dailyKinds: Array<{ iso: string; kind: Kind | null; detail?: string }> = [];
      for (let d = new Date(today); d <= horizon; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const iso = this.isoKey(d);
        let kind: Kind | null = null;
        let detail: string | undefined;
        if (booked.has(iso)) {
          kind = 'booked';
        } else if (av.blocked.includes(iso)) {
          kind = 'blocked';
          detail = av.blockReasons?.[iso];
        } else if (av.externalBlocks) {
          for (const [src, dates] of Object.entries(av.externalBlocks)) {
            if (dates.includes(iso)) { kind = 'external'; detail = src; break; }
          }
        }
        if (!kind && typeof av.prices?.[iso] === 'number') {
          kind = 'priced';
          detail = `$${av.prices[iso]}`;
        }
        if (!kind && av.pricingTiers) {
          const tier = av.pricingTiers.find(t => iso >= t.start && iso <= t.end);
          if (tier) { kind = 'tier'; detail = `${tier.name} · $${tier.nightlyPrice}`; }
        }
        if (!kind && av.stayRules) {
          const rule = av.stayRules.find(r => iso >= r.start && iso <= r.end);
          if (rule?.minNights) { kind = 'min-stay'; detail = `${rule.minNights}-night min`; }
        }
        dailyKinds.push({ iso, kind, detail });
      }

      // Collapse consecutive runs with the same (kind, detail).
      let i = 0;
      while (i < dailyKinds.length) {
        const cur = dailyKinds[i];
        if (!cur.kind) { i++; continue; }
        let j = i + 1;
        while (j < dailyKinds.length && dailyKinds[j].kind === cur.kind && dailyKinds[j].detail === cur.detail) j++;
        out.push({
          listingId: l.id,
          title: l.title,
          start: cur.iso,
          end: dailyKinds[j - 1].iso,
          kind: cur.kind,
          detail: cur.detail,
        });
        i = j;
      }
    }

    out.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
    return out.slice(0, 100);
  }

  formatEventRange(ev: IUpcomingEvent): string {
    const s = new Date(ev.start + 'T00:00:00');
    const e = new Date(ev.end   + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const sLabel = s.toLocaleDateString('en-US', opts);
    if (ev.start === ev.end) return sLabel;
    return `${sLabel} – ${e.toLocaleDateString('en-US', opts)}`;
  }

  eventChipLabel(ev: IUpcomingEvent): string {
    switch (ev.kind) {
      case 'booked':   return 'Booked';
      case 'blocked':  return ev.detail || 'Blocked';
      case 'external': return ev.detail || 'External';
      case 'priced':   return ev.detail || 'Priced';
      case 'tier':     return ev.detail || 'Tier';
      case 'min-stay': return ev.detail || 'Min stay';
      default:         return '';
    }
  }

  eventChipClass(ev: IUpcomingEvent): string {
    switch (ev.kind) {
      case 'booked':   return 'bg-trinidad/15 text-trinidad';
      case 'blocked':  return 'bg-cream/60 text-muted-text border border-dark-text/15';
      case 'external': return 'bg-jungle-green/15 text-jungle-green';
      case 'priced':   return 'bg-trinidad/10 text-trinidad';
      case 'tier':     return 'bg-jungle-green/10 text-jungle-green';
      case 'min-stay': return 'bg-gold/15 text-dark-text';
      default:         return 'bg-cream/60 text-muted-text';
    }
  }

  /** Flip to month view, jump the calendar to the event's start month,
   *  and pre-select the range so the host can act immediately. */
  openFromList(ev: IUpcomingEvent): void {
    this.setViewMode('month');
    const start = new Date(ev.start + 'T00:00:00');
    this.calendarMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    this.selectByRange(ev.start, ev.end);
  }

  // ----- List view multi-select (C3) -----
  /** Stable composite id matching the @for track expression. */
  eventId(ev: IUpcomingEvent): string {
    return `${ev.listingId}-${ev.start}-${ev.kind}`;
  }

  /** Set of event ids the host has ticked in List view. Drives the
   *  sticky bottom strip + Block all action. */
  selectedEventIds = new Set<string>();
  get selectedEventCount(): number { return this.selectedEventIds.size; }

  isEventSelected(ev: IUpcomingEvent): boolean {
    return this.selectedEventIds.has(this.eventId(ev));
  }

  toggleEventSelected(ev: IUpcomingEvent): void {
    const id = this.eventId(ev);
    const next = new Set(this.selectedEventIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedEventIds = next;
  }

  clearEventSelection(): void { this.selectedEventIds = new Set(); }

  /** Block every iso in every checked event across its own listing. */
  blockSelectedEvents(): void {
    const ids = this.selectedEventIds;
    if (ids.size === 0) return;
    const byListing = new Map<number, Set<string>>();
    for (const ev of this.upcomingEvents) {
      if (!ids.has(this.eventId(ev))) continue;
      const set = byListing.get(ev.listingId) ?? new Set<string>();
      for (const iso of eachDateIso(ev.start, ev.end)) set.add(iso);
      byListing.set(ev.listingId, set);
    }
    let totalNights = 0;
    for (const [listingId, dates] of byListing.entries()) {
      const arr = [...dates];
      this.availability.setBlocked(listingId, arr, true);
      totalNights += arr.length;
    }
    const evCount = ids.size;
    const lCount = byListing.size;
    this.toasts.success(`Blocked ${totalNights} ${totalNights === 1 ? 'night' : 'nights'} across ${evCount} ${evCount === 1 ? 'event' : 'events'} · ${lCount} ${lCount === 1 ? 'listing' : 'listings'}.`);
    this.clearEventSelection();
  }

  cellLabel(cell: IDayCell): string {
    if (cell.state === 'all-booked')  return 'Booked';
    if (cell.state === 'all-blocked') return 'Blocked';
    if (cell.state === 'mixed')       return 'Mixed';
    return '';
  }
}
