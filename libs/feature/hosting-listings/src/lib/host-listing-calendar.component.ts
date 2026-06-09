import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  HostAvailabilityService, IHostAvailability, IStayRule, IPricingTier,
  IPrivateListing, MOCK_LISTINGS, getMyListings,
  downloadListingIcs, parseIcsToDateRanges, expandRangesToDates,
  isoKey, parseIsoLocal,
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
  /** Tier covering this cell (when no per-day override). */
  tierPrice?: number;
  tierName?: string;
  selected: boolean;
  /** Source label when the cell is blocked by an imported feed. */
  externalSource?: string;
  /** Reason label when the cell is a manual block (state === 'blocked'). */
  blockReason?: string;
}

@Component({
  selector: 'cnt-host-listing-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule, NavbarComponent, FooterComponent],
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
  minNightsInput: number | null = null;
  tierNameInput = '';
  tierPriceInput: number | null = null;
  /** Reason dropdown for the Block action. '__custom' opens the custom-text
   *  input below; '' means no reason attached. */
  blockReasonInput = '';
  blockReasonCustom = '';
  readonly blockReasonPresets = ['Private use', 'Cleaning', 'Maintenance', 'Held for repeat'];
  /** Rule id currently being edited from the rules list (null = new rule). */
  editingRuleId: string | null = null;

  /** Type-in range fields — peer entry point to drag-selecting on the grid.
   *  Both write into the same `selected` set; drag updates write back.
   *  Date variants drive the Material datepicker inputs; ISO strings are
   *  derived only inside selectByRange(). */
  rangeStart = '';
  rangeEnd = '';
  rangeStartDate: Date | null = null;
  rangeEndDate: Date | null = null;
  /** Header "Pick by date" popover visibility. */
  pickByDateOpen = false;
  /** DateRange driving the inline mat-calendar in the picker popover. */
  pickerRange: DateRange<Date> | null = null;
  /** Typed-entry peers inside the Pick-by-date popover, in sync with
   *  pickerRange via onPickerFieldChange + write-back in onPickerDateSelected. */
  pickerStartDate: Date | null = null;
  pickerEndDate: Date | null = null;
  /** Inline rule-list edit state — keyed by rule id. */
  inlineEditId: string | null = null;
  inlineEditStartDate: Date | null = null;
  inlineEditEndDate: Date | null = null;
  inlineEditMinNights: number | null = null;
  /** Inline tier-list edit state — keyed by tier id. */
  inlineTierId: string | null = null;
  inlineTierName = '';
  inlineTierStartDate: Date | null = null;
  inlineTierEndDate: Date | null = null;
  inlineTierPrice: number | null = null;

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

  /** Thin instance wrappers around the shared util so existing
   *  `this.isoKey(d)` / `this.parseIso(s)` template + handler call
   *  sites compile unchanged. */
  isoKey(d: Date): string { return isoKey(d); }
  private parseIso(iso: string): Date | null { return parseIsoLocal(iso); }

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
      let blockReason: string | undefined;
      if (covers) {
        bookingId = covers.id;
        state = covers.status === 'pending' ? 'pending' : 'booked';
      } else if (d < today) {
        state = 'past';
      } else if (blockedSet.has(iso)) {
        state = 'blocked';
        blockReason = this.availability.blockReasons?.[iso];
      } else if (this.availability.externalBlocks) {
        for (const [source, dates] of Object.entries(this.availability.externalBlocks)) {
          if (dates.includes(iso)) { state = 'external'; externalSource = source; break; }
        }
      }

      const priceOverride = this.availability.prices[iso];
      let tierPrice: number | undefined;
      let tierName: string | undefined;
      if (priceOverride == null && this.availability.pricingTiers) {
        const tier = this.availability.pricingTiers.find(t => iso >= t.start && iso <= t.end);
        if (tier) { tierPrice = tier.nightlyPrice; tierName = tier.name; }
      }
      cells.push({
        date: d,
        iso,
        inMonth: d.getMonth() === month,
        isToday: d.getTime() === today.getTime(),
        state,
        bookingId,
        priceOverride,
        tierPrice,
        tierName,
        selected: this.selected.has(iso),
        externalSource,
        blockReason,
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
      blockReasons: this.availability.blockReasons,
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

  startDrag(cell: IDayCell, event: PointerEvent): void {
    if (!this.canSelect(cell)) return;
    event.preventDefault();
    this.dragging = true;
    this.dragAnchor = cell.iso;
    this.dragAddMode = !this.selected.has(cell.iso);
    this.applyDragSelection(cell.iso);
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
    const cell = this.monthCellAtIso(iso);
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

  /** Push the current selection's bounds back into the type-in fields so
   *  the host can see what the grid says. */
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

  /** Mat-datepicker write-back for the action-bar Range row. */
  onRangeDateChange(): void {
    this.rangeStart = this.rangeStartDate ? this.isoKey(this.rangeStartDate) : '';
    this.rangeEnd   = this.rangeEndDate   ? this.isoKey(this.rangeEndDate)   : '';
    if (this.rangeStart && this.rangeEnd) this.selectByRange(this.rangeStart, this.rangeEnd);
  }

  /** Inline mat-calendar in the Pick-by-date popover. Click-1 = start,
   *  click-2 = end, click-before-start = restart. Mirrors the booking-widget
   *  and trip-planner range selection pattern. */
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
    // Mirror into the typed peers so they reflect calendar taps.
    this.pickerStartDate = this.pickerRange?.start ?? null;
    this.pickerEndDate   = this.pickerRange?.end   ?? null;
  }

  /** Typed-field writer inside the popover — peers with the inline
   *  calendar. Both write through to the same `selected: Set<string>`. */
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

  /** Date-field writer. Treats the typed range like a drag-selected
   *  rectangle: every selectable cell between start and end joins the
   *  selection; past/booked days are skipped (canSelect == false). */
  selectByRange(startIso: string, endIso: string): void {
    if (!startIso || !endIso || startIso > endIso) return;
    const next = new Set<string>();
    const cursor = new Date(startIso + 'T00:00:00');
    const last   = new Date(endIso   + 'T00:00:00');
    while (cursor <= last) {
      next.add(this.isoKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    // Jump the visible month to the start so the host sees the selection.
    const startDate = new Date(startIso + 'T00:00:00');
    this.calendarMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    // Filter to selectable cells now that the grid covers the right month.
    const filtered = new Set<string>();
    for (const iso of next) {
      const cell = this.monthCellAtIso(iso);
      if (cell && this.canSelect(cell)) filtered.add(iso);
    }
    this.selected = filtered;
  }

  /** (ngModelChange) handler for either date input. Re-runs selection
   *  when both fields are populated. */
  onRangeFieldChange(): void {
    if (this.rangeStart && this.rangeEnd) this.selectByRange(this.rangeStart, this.rangeEnd);
  }

  /** localStorage key for last typed/picked range so a host returning
   *  to the popover gets their previous picks pre-seeded. */
  private readonly LAST_RANGE_KEY = 'cnt-listing-calendar-last-range';

  togglePickByDate(): void {
    const opening = !this.pickByDateOpen;
    if (!opening) this.persistLastRange();
    else if (this.selected.size === 0) this.seedFromLastRange();
    this.pickByDateOpen = opening;
  }

  private persistLastRange(): void {
    if (typeof localStorage === 'undefined') return;
    if (!this.pickerStartDate || !this.pickerEndDate) return;
    try {
      localStorage.setItem(this.LAST_RANGE_KEY, JSON.stringify({
        start: this.isoKey(this.pickerStartDate),
        end:   this.isoKey(this.pickerEndDate),
      }));
    } catch { /* ignore */ }
  }

  private seedFromLastRange(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.LAST_RANGE_KEY);
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

  // ----- inline rule-list edit -----
  startInlineEdit(rule: IStayRule): void {
    this.inlineEditId = rule.id;
    this.inlineEditStartDate = this.parseIso(rule.start);
    this.inlineEditEndDate = this.parseIso(rule.end);
    this.inlineEditMinNights = rule.minNights ?? null;
  }

  cancelInlineEdit(): void {
    this.inlineEditId = null;
    this.inlineEditStartDate = null;
    this.inlineEditEndDate = null;
    this.inlineEditMinNights = null;
  }

  saveInlineEdit(): void {
    if (!this.listing || !this.inlineEditId) return;
    if (!this.inlineEditStartDate || !this.inlineEditEndDate) { this.toasts.info('Pick both a start and end date.'); return; }
    if (this.inlineEditMinNights == null || this.inlineEditMinNights < 1) { this.toasts.info('Pick at least 1 night.'); return; }
    const saved = this.availabilitySvc.upsertStayRule(this.listing.id, {
      id: this.inlineEditId,
      start: this.isoKey(this.inlineEditStartDate),
      end: this.isoKey(this.inlineEditEndDate),
      minNights: Math.round(this.inlineEditMinNights),
    });
    if (!saved) { this.toasts.error('Could not save the rule.'); return; }
    this.toasts.success(`Updated ${saved.minNights}-night min stay · ${this.formatRuleRange(saved)}.`);
    this.cancelInlineEdit();
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

  clearSelection(): void {
    this.selected = new Set();
    this.rangeStart = '';
    this.rangeEnd = '';
    this.rangeStartDate = null;
    this.rangeEndDate = null;
    this.pickerRange = null;
    this.pickerStartDate = null;
    this.pickerEndDate = null;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(this.LAST_RANGE_KEY); } catch { /* ignore */ }
    }
  }

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
    const reason = block ? this.effectiveBlockReason() : undefined;
    this.availabilitySvc.setBlocked(this.listing.id, this.selectedDates, block, reason);
    const n = this.selected.size;
    const noun = n === 1 ? 'day' : 'days';
    if (block) {
      this.toasts.info(reason ? `Blocked ${n} ${noun} · ${reason}.` : `Blocked ${n} ${noun}.`);
    } else {
      this.toasts.info(`Reopened ${n} ${noun}.`);
    }
    this.blockReasonInput = '';
    this.blockReasonCustom = '';
  }

  /** Resolve the reason string from the dropdown + optional custom input. */
  effectiveBlockReason(): string {
    if (this.blockReasonInput === '__custom') return this.blockReasonCustom.trim();
    return this.blockReasonInput;
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

  // ----- min-stay rules -----
  get stayRules(): IStayRule[] { return this.availability.stayRules ?? []; }

  applyMinStay(): void {
    if (!this.listing || this.selected.size === 0 || this.minNightsInput == null) return;
    if (this.minNightsInput < 1) { this.toasts.info('Pick at least 1 night.'); return; }
    const dates = this.selectedDates;
    const saved = this.availabilitySvc.upsertStayRule(this.listing.id, {
      id: this.editingRuleId ?? undefined,
      start: dates[0],
      end: dates[dates.length - 1],
      minNights: Math.round(this.minNightsInput),
    });
    if (!saved) { this.toasts.error('Could not save the rule.'); return; }
    const action = this.editingRuleId ? 'Updated' : 'Set';
    this.toasts.success(`${action} ${saved.minNights}-night min stay · ${this.formatRuleRange(saved)}.`);
    this.minNightsInput = null;
    this.editingRuleId = null;
    this.clearSelection();
  }

  editStayRule(rule: IStayRule): void {
    if (!this.listing) return;
    // Re-select the rule's date range so applyMinStay edits in place.
    const selected = new Set<string>();
    const cursor = new Date(rule.start + 'T00:00:00');
    const last   = new Date(rule.end   + 'T00:00:00');
    while (cursor <= last) {
      selected.add(this.isoKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    this.selected = selected;
    this.minNightsInput = rule.minNights ?? null;
    this.editingRuleId = rule.id;
    this.calendarMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    this.toasts.info('Editing rule — tweak min nights, then Set min stay.');
  }

  removeStayRule(rule: IStayRule): void {
    if (!this.listing) return;
    this.availabilitySvc.removeStayRule(this.listing.id, rule.id);
    this.toasts.info('Rule removed.');
  }

  // ----- pricing tiers -----
  get pricingTiers(): IPricingTier[] { return this.availability.pricingTiers ?? []; }

  applyTier(): void {
    if (!this.listing || this.selected.size === 0) return;
    if (!this.tierNameInput.trim()) { this.toasts.info('Name the tier first.'); return; }
    if (this.tierPriceInput == null || this.tierPriceInput <= 0) { this.toasts.info('Pick a nightly rate above $0.'); return; }
    const dates = this.selectedDates;
    const saved = this.availabilitySvc.upsertPricingTier(this.listing.id, {
      name: this.tierNameInput,
      start: dates[0],
      end: dates[dates.length - 1],
      nightlyPrice: this.tierPriceInput,
    });
    if (!saved) { this.toasts.error('Could not save the tier.'); return; }
    this.toasts.success(`Saved ${saved.name} tier · $${saved.nightlyPrice}/night · ${this.formatTierRange(saved)}.`);
    this.tierNameInput = '';
    this.tierPriceInput = null;
    this.clearSelection();
  }

  startInlineTierEdit(tier: IPricingTier): void {
    this.inlineTierId = tier.id;
    this.inlineTierName = tier.name;
    this.inlineTierStartDate = this.parseIso(tier.start);
    this.inlineTierEndDate = this.parseIso(tier.end);
    this.inlineTierPrice = tier.nightlyPrice;
  }

  cancelInlineTierEdit(): void {
    this.inlineTierId = null;
    this.inlineTierName = '';
    this.inlineTierStartDate = null;
    this.inlineTierEndDate = null;
    this.inlineTierPrice = null;
  }

  saveInlineTierEdit(): void {
    if (!this.listing || !this.inlineTierId) return;
    if (!this.inlineTierName.trim()) { this.toasts.info('Name the tier.'); return; }
    if (!this.inlineTierStartDate || !this.inlineTierEndDate) { this.toasts.info('Pick both a start and end date.'); return; }
    if (this.inlineTierPrice == null || this.inlineTierPrice <= 0) { this.toasts.info('Pick a nightly rate above $0.'); return; }
    const saved = this.availabilitySvc.upsertPricingTier(this.listing.id, {
      id: this.inlineTierId,
      name: this.inlineTierName,
      start: this.isoKey(this.inlineTierStartDate),
      end: this.isoKey(this.inlineTierEndDate),
      nightlyPrice: this.inlineTierPrice,
    });
    if (!saved) { this.toasts.error('Could not save the tier.'); return; }
    this.toasts.success(`Updated ${saved.name} tier · $${saved.nightlyPrice}/night.`);
    this.cancelInlineTierEdit();
  }

  removePricingTier(tier: IPricingTier): void {
    if (!this.listing) return;
    this.availabilitySvc.removePricingTier(this.listing.id, tier.id);
    this.toasts.info('Tier removed.');
  }

  formatTierRange(tier: IPricingTier): string {
    const start = new Date(tier.start + 'T00:00:00');
    const end   = new Date(tier.end   + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const sLabel = start.toLocaleDateString('en-US', opts);
    if (tier.start === tier.end) return sLabel;
    return `${sLabel} – ${end.toLocaleDateString('en-US', opts)}`;
  }

  formatRuleRange(rule: IStayRule): string {
    const start = new Date(rule.start + 'T00:00:00');
    const end   = new Date(rule.end   + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const sLabel = start.toLocaleDateString('en-US', opts);
    if (rule.start === rule.end) return sLabel;
    return `${sLabel} – ${end.toLocaleDateString('en-US', opts)}`;
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
    if (cell.state === 'blocked') return cell.blockReason || 'Blocked';
    if (cell.state === 'external') return cell.externalSource || 'External';
    return '';
  }

  basePrice(): number { return this.listing?.price ?? 0; }
}
