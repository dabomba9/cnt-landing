import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent, FocusTrapDirective } from '@cnt-workspace/ui';
import { SeoService, AuthService, BookingService, ToastService, ReviewService, IUserReview, IReviewSubScores, averageSubScores, REVIEW_CREDIT_PER_NIGHT, MIN_REVIEW_CHARS_FOR_CREDIT, MOCK_LISTINGS, isoKey } from '@cnt-workspace/data-access';
import { IBooking, STATUS_META } from '@cnt-workspace/models';

type TripFilter = 'upcoming' | 'past' | 'all';
type TripView = 'list' | 'calendar';
type TripBarState = 'past' | 'in-progress' | 'upcoming' | 'pending' | 'cancelled';

interface IDayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  /** Bookings covering this day — drives mobile dot mode + day-selection panel. */
  bookings: IBooking[];
  /** Distinct status tones for the dot row, derived from bookings (max 3 dots). */
  dotStates: TripBarState[];
}

interface IBarSegment {
  booking: IBooking;
  /** 1-7 — CSS grid-column-start. */
  startCol: number;
  /** 1-7 — width in columns. */
  span: number;
  /** 0-based row within the week (laid out below day numbers). */
  lane: number;
  /** True when this segment is the booking's actual start day (renders the label). */
  isStart: boolean;
  state: TripBarState;
}

interface ICalendarWeek {
  days: IDayCell[];   // length 7
  bars: IBarSegment[];
  /** Lanes occupied — drives week container height. */
  laneCount: number;
}

const VIEW_KEY = 'cnt-trips-view-mode';
const MAX_LANES = 3;

@Component({
  selector: 'cnt-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, FocusTrapDirective],
  templateUrl: './trips.component.html',
})
export class TripsComponent implements OnInit, OnDestroy {
  bookings: IBooking[] = [];
  filter: TripFilter = 'upcoming';
  STATUS_META = STATUS_META;
  guestVerified = false;

  /** List ↔ calendar toggle, persisted to localStorage. */
  viewMode: TripView = 'list';
  /** Currently-visible month in calendar mode. */
  calendarMonth: Date = new Date();
  /** ISO YYYY-MM-DD of the day selected for the detail panel. */
  selectedDayIso: string | null = null;
  readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /** Cancel modal state. */
  cancelTarget: IBooking | null = null;
  cancelReason = '';
  cancelling = false;
  readonly cancelReasonPresets = ['Plans changed', 'Weather', 'Found another stay', 'Other'];

  pickCancelReason(preset: string): void {
    this.cancelReason = this.cancelReason === preset ? '' : preset;
  }

  /** Review modal state. */
  reviewTarget: IBooking | null = null;
  reviewText = '';
  reviewSubScores: IReviewSubScores = { cleanliness: 5, communication: 5, location: 5, hookups: 5, value: 5 };
  reviewSaving = false;
  /** Existing reviews keyed by bookingId — drives "Leave a review" vs "Edit review". */
  reviewByBookingId: Record<string, IUserReview> = {};

  private userEmail = '';
  private subs: Subscription[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
    private bookingSvc: BookingService,
    private reviewSvc: ReviewService,
    private seo: SeoService,
    private toasts: ToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'My trips — CurbNTurf',
      description: 'Your CurbNTurf bookings.',
      url: '/trips',
      robots: 'noindex, nofollow',
    });
    const user = this.auth.currentUser;
    if (!user) return;
    this.userEmail = user.email;
    this.guestVerified = !!user.verified;
    // Live updates so cancel/modify reflects immediately without reload.
    this.subs.push(this.bookingSvc.bookings$.subscribe(all => {
      this.bookings = all
        .filter(b => b.userEmail === this.userEmail)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      // Deep-link: ?review=<bookingId> auto-opens the review modal once bookings are loaded.
      const targetId = this.route.snapshot.queryParamMap.get('review');
      if (targetId && !this.reviewTarget) {
        const b = this.bookings.find(x => x.id === targetId);
        if (b) this.openReview(b);
      }
    }));
    this.subs.push(this.reviewSvc.reviews$.subscribe(all => {
      this.reviewByBookingId = {};
      for (const r of all) if (r.userEmail === this.userEmail) this.reviewByBookingId[r.bookingId] = r;
    }));
    // Honor ?filter=past to switch tabs from the dashboard widget link.
    const f = this.route.snapshot.queryParamMap.get('filter');
    if (f === 'past' || f === 'upcoming' || f === 'all') this.filter = f;
    // Restore last-used view (list vs calendar).
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'calendar' || saved === 'list') this.viewMode = saved;
    }
  }

  setView(v: TripView): void {
    this.viewMode = v;
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore quota */ }
    }
  }

  prevMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1);
    this.selectedDayIso = null;
  }
  nextMonth(): void {
    this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1);
    this.selectedDayIso = null;
  }
  goToday(): void {
    this.calendarMonth = new Date();
    this.selectedDayIso = this.isoKey(new Date());
  }

  get calendarMonthLabel(): string {
    return this.calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  /** ISO YYYY-MM-DD using local time (matches what hosts/guests see in their tz). */
  private isoKey(d: Date): string { return isoKey(d); }

  /** Strip time-of-day from a Date (returns a new Date at local midnight). */
  private dayStart(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Booking → status tone, taking start/end into account. */
  private barState(b: IBooking): TripBarState {
    if (b.status === 'cancelled' || b.status === 'declined') return 'cancelled';
    if (b.status === 'pending') return 'pending';
    const now = Date.now();
    const start = new Date(b.dates.start).getTime();
    const end = new Date(b.dates.end).getTime();
    if (end < now) return 'past';
    if (start <= now && now <= end) return 'in-progress';
    return 'upcoming';
  }

  /** 6 weeks of day cells + booking segments laid out across them. */
  get calendarWeeks(): ICalendarWeek[] {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const startOffset = new Date(year, month, 1).getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const todayKey = this.isoKey(new Date());

    // Pre-compute eligible bookings (with at least one day in the visible 6-week window).
    const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41);
    const visible = this.bookings.filter(b => {
      const s = this.dayStart(new Date(b.dates.start));
      const e = this.dayStart(new Date(b.dates.end));
      return e >= gridStart && s <= gridEnd;
    }).sort((a, b) => new Date(a.dates.start).getTime() - new Date(b.dates.start).getTime());

    const weeks: ICalendarWeek[] = [];
    for (let w = 0; w < 6; w++) {
      const weekStart = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

      // Build day cells for this week
      const days: IDayCell[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
        const iso = this.isoKey(d);
        const dayBookings = visible.filter(b => {
          const s = this.dayStart(new Date(b.dates.start)).getTime();
          const e = this.dayStart(new Date(b.dates.end)).getTime();
          return d.getTime() >= s && d.getTime() <= e;
        });
        // De-duplicate dot states preserving precedence: in-progress > pending > upcoming > past > cancelled
        const order: TripBarState[] = ['in-progress', 'pending', 'upcoming', 'past', 'cancelled'];
        const set = new Set(dayBookings.map(b => this.barState(b)));
        const dotStates = order.filter(s => set.has(s)).slice(0, 3);
        days.push({
          date: d,
          iso,
          inMonth: d.getMonth() === month,
          isToday: iso === todayKey,
          isWeekend: i === 0 || i === 6,
          bookings: dayBookings,
          dotStates,
        });
      }

      // Build bar segments — booking intersected with this week's range
      const candidates = visible.filter(b => {
        const s = this.dayStart(new Date(b.dates.start));
        const e = this.dayStart(new Date(b.dates.end));
        return e >= weekStart && s <= weekEnd;
      });
      // Lane assignment: greedy — for each booking, pick the lowest lane that doesn't overlap
      const lanes: Array<Array<{ start: number; end: number }>> = [];
      const bars: IBarSegment[] = [];
      for (const b of candidates) {
        const s = this.dayStart(new Date(b.dates.start));
        const e = this.dayStart(new Date(b.dates.end));
        const segStart = s < weekStart ? weekStart : s;
        const segEnd   = e > weekEnd   ? weekEnd   : e;
        const startCol = Math.floor((segStart.getTime() - weekStart.getTime()) / 86_400_000) + 1; // 1-7
        const endCol   = Math.floor((segEnd.getTime()   - weekStart.getTime()) / 86_400_000) + 1;
        const span = endCol - startCol + 1;
        // Find a lane with no overlap
        let lane = 0;
        for (; lane < MAX_LANES; lane++) {
          const placed = lanes[lane] || [];
          if (placed.every(r => endCol < r.start || startCol > r.end)) break;
        }
        if (lane >= MAX_LANES) continue; // overflow handled by the day's "+N more" hint
        if (!lanes[lane]) lanes[lane] = [];
        lanes[lane].push({ start: startCol, end: endCol });
        bars.push({
          booking: b,
          startCol,
          span,
          lane,
          isStart: segStart.getTime() === s.getTime(),
          state: this.barState(b),
        });
      }

      weeks.push({ days, bars, laneCount: Math.max(1, lanes.length) });
    }
    return weeks;
  }

  /** Booking events for the visible month — agenda strip + mobile day list. */
  get monthBookings(): IBooking[] {
    const year = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return this.bookings.filter(b => {
      const s = this.dayStart(new Date(b.dates.start));
      const e = this.dayStart(new Date(b.dates.end));
      return e >= monthStart && s <= monthEnd;
    }).sort((a, b) => new Date(a.dates.start).getTime() - new Date(b.dates.start).getTime());
  }

  /** The currently-selected day's bookings, for the inline detail panel. */
  get selectedDayBookings(): IBooking[] {
    if (!this.selectedDayIso) return [];
    return this.bookings.filter(b => {
      const s = this.dayStart(new Date(b.dates.start));
      const e = this.dayStart(new Date(b.dates.end));
      const sel = new Date(this.selectedDayIso + 'T00:00:00');
      return sel >= s && sel <= e;
    });
  }

  get selectedDayLabel(): string {
    if (!this.selectedDayIso) return '';
    const d = new Date(this.selectedDayIso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  /** Tailwind bar tone classes by state (used by both spans and dots). */
  barToneClass(state: TripBarState): string {
    switch (state) {
      case 'cancelled':   return 'bg-transparent border border-dashed border-muted-text/40 text-muted-text';
      case 'pending':     return 'bg-gold/70 text-dark-text';
      case 'past':        return 'bg-muted-text/30 text-dark-text';
      case 'in-progress': return 'bg-jungle-green text-white';
      default:            return 'bg-trinidad text-white';
    }
  }

  dotToneClass(state: TripBarState): string {
    switch (state) {
      case 'cancelled':   return 'bg-muted-text/40';
      case 'pending':     return 'bg-gold';
      case 'past':        return 'bg-muted-text/50';
      case 'in-progress': return 'bg-jungle-green';
      default:            return 'bg-trinidad';
    }
  }

  /** Hover-tooltip text for a booking bar. */
  barTooltip(b: IBooking): string {
    return `${b.listingTitle} · ${this.datesLabel(b)} · ${STATUS_META[b.status].label}`;
  }

  /** Click a day cell → open the detail panel for that day. */
  selectDay(day: IDayCell): void {
    this.selectedDayIso = this.selectedDayIso === day.iso ? null : day.iso;
  }

  /** Click a bar segment → open the day panel anchored on its start day. */
  selectBar(bar: IBarSegment): void {
    const start = this.dayStart(new Date(bar.booking.dates.start));
    this.selectedDayIso = this.isoKey(start);
  }

  closeDayPanel(): void { this.selectedDayIso = null; }

  /** Booking-in-progress flag for inline labels. */
  isInProgress(b: IBooking): boolean { return this.barState(b) === 'in-progress'; }

  ngOnDestroy(): void { for (const s of this.subs) s.unsubscribe(); }

  setFilter(f: TripFilter): void { this.filter = f; }

  get filteredBookings(): IBooking[] {
    const now = Date.now();
    if (this.filter === 'upcoming') {
      return this.bookings.filter(b => new Date(b.dates.end).getTime() >= now && b.status !== 'cancelled');
    }
    if (this.filter === 'past') {
      return this.bookings.filter(b => new Date(b.dates.end).getTime() < now || b.status === 'cancelled');
    }
    return this.bookings;
  }

  get upcomingCount(): number {
    const now = Date.now();
    return this.bookings.filter(b => new Date(b.dates.end).getTime() >= now && b.status !== 'cancelled').length;
  }

  get pastCount(): number {
    const now = Date.now();
    return this.bookings.filter(b => new Date(b.dates.end).getTime() < now || b.status === 'cancelled').length;
  }

  datesLabel(b: IBooking): string {
    const start = new Date(b.dates.start);
    const end = new Date(b.dates.end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  }

  /** Days until check-in. Negative if past. Null if not applicable. */
  daysUntil(b: IBooking): number | null {
    const start = new Date(b.dates.start).getTime();
    const days = Math.ceil((start - Date.now()) / 86_400_000);
    return days;
  }

  countdownLabel(b: IBooking): string | null {
    const d = this.daysUntil(b);
    if (d === null) return null;
    if (d < 0) {
      const end = Math.ceil((new Date(b.dates.end).getTime() - Date.now()) / 86_400_000);
      if (end >= 0) return 'Checked in';
      return 'Trip complete';
    }
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d < 7) return `In ${d} days`;
    if (d < 30) return `In ${Math.round(d / 7)} weeks`;
    return `In ${Math.round(d / 30)} months`;
  }

  /** Can this booking still be cancelled? */
  canCancel(b: IBooking): boolean {
    if (b.status === 'cancelled' || b.status === 'declined') return false;
    return new Date(b.dates.start).getTime() > Date.now();
  }

  /** Hours from now until check-in for the active cancel target. */
  get cancelTargetHoursToCheckIn(): number {
    if (!this.cancelTarget) return 0;
    return Math.floor((new Date(this.cancelTarget.dates.start).getTime() - Date.now()) / 3_600_000);
  }
  get cancelTargetPastFreeWindow(): boolean {
    return this.cancelTargetHoursToCheckIn < 72;
  }
  get cancelTargetDeadlineLabel(): string {
    const h = this.cancelTargetHoursToCheckIn - 72;
    if (h <= 0) return 'Free-cancellation window has passed';
    if (h < 24) return `Free cancellation for ${h} more ${h === 1 ? 'hour' : 'hours'}`;
    const d = Math.floor(h / 24);
    return `Free cancellation for ${d} more ${d === 1 ? 'day' : 'days'}`;
  }

  openCancel(b: IBooking, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.cancelTarget = b;
    this.cancelReason = '';
  }

  closeCancel(): void {
    if (this.cancelling) return;
    this.cancelTarget = null;
    this.cancelReason = '';
  }

  confirmCancel(): void {
    if (!this.cancelTarget || this.cancelling) return;
    this.cancelling = true;
    const target = this.cancelTarget;
    setTimeout(() => {
      const updated = this.bookingSvc.cancel(target.id, this.cancelReason);
      this.cancelling = false;
      this.cancelTarget = null;
      this.cancelReason = '';
      if (updated) this.toasts.info(`Cancelled your stay at ${updated.listingTitle}.`);
    }, 300);
  }

  // ============ Review flow ============

  /** A completed (past) trip the user actually stayed at — eligible to be reviewed. */
  canReview(b: IBooking): boolean {
    if (b.status === 'cancelled' || b.status === 'declined' || b.status === 'pending') return false;
    return new Date(b.dates.end).getTime() < Date.now();
  }

  hasReviewed(b: IBooking): boolean { return !!this.reviewByBookingId[b.id]; }

  openReview(b: IBooking, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.reviewTarget = b;
    const existing = this.reviewByBookingId[b.id];
    if (existing) {
      this.reviewText = existing.text;
      this.reviewSubScores = { ...existing.subScores };
    } else {
      this.reviewText = '';
      this.reviewSubScores = { cleanliness: 5, communication: 5, location: 5, hookups: 5, value: 5 };
    }
  }

  closeReview(): void {
    if (this.reviewSaving) return;
    this.reviewTarget = null;
  }

  /** True when the listing being reviewed has no hookups (off-grid). The
   * Hookups sub-score is then hidden and dropped from the average. */
  get reviewTargetIsOffgrid(): boolean {
    if (!this.reviewTarget) return false;
    return MOCK_LISTINGS.find(l => l.id === this.reviewTarget!.listingId)?.category === 'offgrid';
  }

  /** Live overall rating, averaged from the sub-scores. Stored at 2-decimal
   * precision so renderers can show half-stars; preserves what off-grid
   * stays say when Hookups is excluded. */
  get overallRatingExact(): number {
    return averageSubScores(this.reviewSubScores, this.reviewTargetIsOffgrid);
  }
  get overallRating(): number {
    return +this.overallRatingExact.toFixed(2);
  }

  setReviewSubScore(key: keyof IReviewSubScores, value: number): void {
    this.reviewSubScores = { ...this.reviewSubScores, [key]: Math.max(1, Math.min(5, value)) };
  }

  /** Helper exposed to the template for rendering star rows (1..5). */
  readonly stars = [1, 2, 3, 4, 5];
  readonly subScoreLabels: Array<{ key: keyof IReviewSubScores; label: string; hint: string }> = [
    { key: 'cleanliness',   label: 'Cleanliness',   hint: 'Tidy, well-maintained site on arrival.' },
    { key: 'communication', label: 'Communication', hint: 'Host was responsive and helpful.' },
    { key: 'location',      label: 'Location',      hint: 'Setting matched the listing — quiet, views, access.' },
    { key: 'hookups',       label: 'Hookups',       hint: 'Power, water, sewer — accurate and working.' },
    { key: 'value',         label: 'Value',         hint: 'Fair price for what you got.' },
  ];

  confirmReview(): void {
    if (!this.reviewTarget || this.reviewSaving) return;
    const target = this.reviewTarget;
    const user = this.auth.currentUser;
    if (!user) return;
    this.reviewSaving = true;
    const authorName = `${user.firstName} ${user.lastName}`.trim();
    const authorInitials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || authorName.slice(0, 2).toUpperCase();
    const wasAlreadyReviewed = !!target.reviewedAt;
    const trimmedText = this.reviewText.trim();
    const qualifiesByText = trimmedText.length >= MIN_REVIEW_CHARS_FOR_CREDIT;
    setTimeout(() => {
      this.reviewSvc.upsert({
        bookingId: target.id,
        listingId: target.listingId,
        userEmail: user.email,
        authorName,
        authorInitials,
        rating: this.overallRating,
        text: trimmedText,
        subScores: this.reviewSubScores,
      });

      // Mark the booking reviewed only when the text earns credit. Edits that
      // upgrade a too-short review can still flip this on later.
      if (qualifiesByText) this.bookingSvc.markReviewed(target.id);

      // Choose the right toast for the moment. The submit gate (canSubmitReview) prevents
      // sub-threshold first-reviews when credit is available, so we never need the
      // "Add a few words" message here — the modal blocks that case in-place.
      let toastMsg = 'Review updated.';
      if (!wasAlreadyReviewed) {
        const updated = this.bookingSvc.getById(target.id);
        const earnedCredit = qualifiesByText && updated ? this.bookingSvc.qualifiesForCredit(updated) : false;
        if (qualifiesByText && earnedCredit) {
          toastMsg = `Review saved · earned $${(target.nights || 0) * REVIEW_CREDIT_PER_NIGHT} in credit.`;
        } else {
          // Either qualifies-but-already-earned-on-listing, OR the user knowingly chose to
          // skip credit (boondocking, no-credit-available scenarios).
          toastMsg = 'Review saved — thanks for sharing.';
        }
      }

      this.reviewSaving = false;
      this.reviewTarget = null;
      this.toasts.success(toastMsg);
    }, 300);
  }

  readonly creditPerNight = REVIEW_CREDIT_PER_NIGHT;

  /**
   * True when the active review target is at a listing where the user has already earned
   * credit on a prior stay. Surfaces an inline notice in the modal so users understand
   * why this review won't add to their balance (first-stay-per-listing rule).
   */
  /**
   * Submit gate: when credit is on the table for this booking but the text is too short,
   * block the submit so the warning lands inside the modal instead of as a toast after close.
   * Returns true when the user can save. Edits or already-earned-on-listing always allowed.
   */
  get canSubmitReview(): boolean {
    if (!this.reviewTarget) return false;
    if (this.reviewTarget.reviewedAt) return true;        // editing an existing review
    if (this.creditAlreadyEarnedForTarget) return true;   // credit not available — text length unconstrained
    return this.reviewText.trim().length >= MIN_REVIEW_CHARS_FOR_CREDIT;
  }

  get creditAlreadyEarnedForTarget(): boolean {
    if (!this.reviewTarget) return false;
    // Already-reviewed THIS booking — no warning needed; they may be editing their own review.
    if (this.reviewTarget.reviewedAt) return false;
    const user = this.auth.currentUser;
    if (!user) return false;
    // Any other booking at this listing, same user, already reviewed?
    return this.bookingSvc.list(user.email).some(b =>
      b.id !== this.reviewTarget!.id
      && b.listingId === this.reviewTarget!.listingId
      && !!b.reviewedAt,
    );
  }
  readonly minReviewChars = MIN_REVIEW_CHARS_FOR_CREDIT;

  /** Earn label for a past-trip card when the user has already reviewed it. */
  creditEarnedFor(b: IBooking): { amount: number; alreadyEarned: boolean } | null {
    if (!b.reviewedAt) return null;
    const qualifies = this.bookingSvc.qualifiesForCredit(b);
    return {
      amount: (b.nights || 0) * REVIEW_CREDIT_PER_NIGHT,
      alreadyEarned: !qualifies,
    };
  }
}
