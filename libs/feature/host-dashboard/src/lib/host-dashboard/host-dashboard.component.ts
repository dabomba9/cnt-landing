import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent, ListingCardComponent, StatTileComponent, FocusTrapDirective, ResumeDraftCardComponent } from '@cnt-workspace/ui';
import {
  SeoService, AuthService, IPublicUser, ToastService, BookingService, IPrivateListing,
  getMyListings, getHostStats, getHostBookings, IHostStats,
  getAddOnPerformance, IAddOnPerformance, hasOwnedListings,
  HostListingDraftService, getListingDetail,
  HostReviewService, IHostReviewSubScores, GUEST_SUBSCORE_LABELS, averageHostSubScores, REVEAL_WINDOW_DAYS,
  MIN_REVIEW_CHARS_FOR_CREDIT,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';
import { EarningsChartComponent } from './widgets/earnings-chart/earnings-chart.component';
import { ReviewsSnapshotComponent } from './widgets/reviews-snapshot/reviews-snapshot.component';
import { AvailabilityCalendarComponent } from './widgets/availability-calendar/availability-calendar.component';

type ModalAction = 'decline' | 'cancel';

const DECLINE_PRESETS = ['No longer available', 'Capacity issue', 'Other'];
const CANCEL_PRESETS  = ['Property unavailable', 'Maintenance', 'Booked elsewhere', 'Other'];

@Component({
  selector: 'cnt-host-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, ListingCardComponent,
    StatTileComponent, EarningsChartComponent, ReviewsSnapshotComponent, AvailabilityCalendarComponent,
    FocusTrapDirective, ResumeDraftCardComponent,
  ],
  templateUrl: './host-dashboard.component.html',
})
export class HostDashboardComponent implements OnInit, OnDestroy {
  user: IPublicUser | null = null;
  listings: IPrivateListing[] = [];
  stats: IHostStats = { earningsThisMonth: 0, earningsYearToDate: 0, upcomingNights: 0, occupancyRate: 0, averageRating: 0, totalReviews: 0 };
  /** Real bookings against this host's listings. */
  hostBookings: IBooking[] = [];
  /** Aggregated attach-rate / revenue per add-on the host offers. */
  addOnPerformance: IAddOnPerformance[] = [];
  /** addOn id → owning listing id, precomputed for drill-in routing on the
   *  analytics panel's Top sellers list. */
  private addOnToListingId: Record<string, number> = {};
  private subs: Subscription[] = [];

  /** Action modal state — used for both decline (pending) and cancel (approved/confirmed). */
  modalAction: ModalAction | null = null;
  modalTarget: IBooking | null = null;
  modalReason = '';
  modalSaving = false;
  readonly declinePresets = DECLINE_PRESETS;
  readonly cancelPresets = CANCEL_PRESETS;

  /** "m:ss" countdown per pending booking id — auto-decision deadline. */
  countdowns: Record<string, string> = {};
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  /** True until the host publishes their first listing — drives the
   * getting-started panel in place of the empty KPI dashboard. */
  isNewHost = false;

  /** Host → guest review modal state. */
  hostReviewTarget: IBooking | null = null;
  hostReviewSubScores: IHostReviewSubScores = { cleanliness: 5, communication: 5, rulesFollowed: 5, careOfSite: 5, punctuality: 5 };
  hostReviewText = '';
  hostReviewSaving = false;
  readonly stars = [1, 2, 3, 4, 5];
  readonly guestSubScoreLabels = GUEST_SUBSCORE_LABELS;
  readonly minHostReviewChars = MIN_REVIEW_CHARS_FOR_CREDIT;
  readonly revealWindowDays = REVEAL_WINDOW_DAYS;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
    private toasts: ToastService,
    private bookings: BookingService,
    private drafts: HostListingDraftService,
    private hostReviews: HostReviewService,
  ) {}

  /** Per-step completion of any in-progress wizard draft (null when none). */
  get draftCompletion() { return this.drafts.completion; }

  ngOnInit(): void {
    this.seo.update({
      title: 'Host dashboard — CurbNTurf',
      description: 'Manage your CurbNTurf listings, requests, and earnings.',
      url: '/hosting',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;
    if (this.user) {
      this.isNewHost = !hasOwnedListings(this.user.email);
      this.listings = getMyListings(this.user.email);
      this.subs.push(
        this.bookings.bookings$.subscribe(all => {
          this.hostBookings = this.user ? getHostBookings(this.user.email, all) : [];
          this.stats = getHostStats(this.listings, this.hostBookings);
          this.addOnPerformance = getAddOnPerformance(this.listings, this.hostBookings);
          this.recomputeAddOnLocations();
        }),
      );
    }
    // Auto-flip view to host so the navbar/menu reflects it.
    if (this.auth.currentView !== 'host') this.auth.setView('host');

    // Tick the pending-request countdown chips every second.
    if (isPlatformBrowser(this.platformId)) {
      this.countdownInterval = setInterval(() => this.tickCountdowns(), 1000);
      this.tickCountdowns();
    }

    // Honor #reservations fragment from navbar dropdown deep-link.
    this.subs.push(
      this.route.fragment.subscribe(f => {
        if (!f || !isPlatformBrowser(this.platformId)) return;
        // Defer a tick so the section renders before we look for it.
        setTimeout(() => document.getElementById(f)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }),
    );
  }

  ngOnDestroy(): void {
    for (const s of this.subs) s.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  private tickCountdowns(): void {
    const next: Record<string, string> = {};
    for (const b of this.pendingHostBookings) {
      if (!b.decisionAt) continue;
      const ms = new Date(b.decisionAt).getTime() - Date.now();
      if (ms <= 0) { next[b.id] = 'Any moment now'; continue; }
      const total = Math.ceil(ms / 1000);
      const m = Math.floor(total / 60);
      const s = total % 60;
      next[b.id] = `${m}:${s.toString().padStart(2, '0')}`;
    }
    this.countdowns = next;
  }

  get timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  formatBookingDates(b: IBooking): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = new Date(b.dates.start).toLocaleDateString('en-US', opts);
    const end = new Date(b.dates.end).toLocaleDateString('en-US', opts);
    return `${start} – ${end}`;
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
    return `${Math.round(diff / 86_400_000)}d ago`;
  }

  /** Pending real bookings on the host's listings. */
  get pendingHostBookings(): IBooking[] {
    return this.hostBookings.filter(b => b.status === 'pending');
  }

  /** Approved/confirmed real bookings on the host's listings. */
  get activeHostBookings(): IBooking[] {
    const now = Date.now();
    return this.hostBookings
      .filter(b => (b.status === 'approved' || b.status === 'confirmed') && new Date(b.dates.end).getTime() >= now);
  }

  /** Real revenue-counting bookings for the chart — confirmed + approved. */
  get countableHostBookings(): IBooking[] {
    return this.hostBookings.filter(b => b.status === 'confirmed' || b.status === 'approved');
  }

  // ============ Add-on revenue panel ============

  /** Performance rows with at least one booking — drives the Top sellers list. */
  get bookedAddOns(): IAddOnPerformance[] {
    return this.addOnPerformance.filter(a => a.bookingsCount > 0).slice(0, 5);
  }

  /** True when the host offers ≥1 add-on (booked or not). Controls whether to
   *  show the empty-state CTA in the analytics panel. */
  get hasAnyAddOns(): boolean {
    return this.addOnPerformance.length > 0;
  }

  /** Sum of revenue across every add-on the host offers. */
  get totalAddOnRevenue(): number {
    return this.addOnPerformance.reduce((sum, a) => sum + (a.totalRevenue || 0), 0);
  }

  /** Overall attach rate: % of eligible (confirmed/approved) bookings that
   *  included at least one add-on. */
  get overallAttachRate(): { pct: number; attached: number; total: number } {
    const eligible = this.countableHostBookings;
    const total = eligible.length;
    const attached = eligible.filter(b => !!b.addOns?.length).length;
    return { pct: total > 0 ? Math.round((attached / total) * 100) : 0, attached, total };
  }

  /** Resolve an add-on id back to its owning listing for the drill-in link. */
  listingIdForAddOn(addOnId: string): number | null {
    return this.addOnToListingId[addOnId] ?? null;
  }

  /** Build `addOnToListingId` from the current listings — called after the
   *  bookings subscription refreshes `addOnPerformance`. */
  private recomputeAddOnLocations(): void {
    const map: Record<string, number> = {};
    for (const l of this.listings) {
      try {
        const detail = getListingDetail(l);
        for (const a of detail.addOns) {
          if (!(a.id in map)) map[a.id] = l.id;
        }
      } catch { /* ignore */ }
    }
    this.addOnToListingId = map;
  }

  /** Completed bookings within the 14-day reveal window that the host hasn't
   * reviewed yet. Drives the "Review your guests" card. */
  get pendingGuestReviews(): IBooking[] {
    const now = Date.now();
    const windowMs = this.revealWindowDays * 86_400_000;
    return this.hostBookings.filter(b => {
      if (b.status !== 'confirmed' && b.status !== 'approved') return false;
      if (b.hostReviewedAt) return false;
      const end = new Date(b.dates.end).getTime();
      if (Number.isNaN(end)) return false;
      return end <= now && now - end <= windowMs;
    });
  }

  /** Aggregated guest reputation across this host's bookings — used for
   * the rating chip on the pending-requests card and the inbox thread. */
  guestRatingFor(email: string): { rating: number; count: number } {
    const map = new Map(this.hostBookings.map(b => [b.id, b]));
    return this.hostReviews.aggregateForGuest(email, map);
  }

  /** Days remaining in the 14-day reveal window for a given booking. */
  daysLeftToReview(b: IBooking): number {
    const end = new Date(b.dates.end).getTime();
    const deadline = end + this.revealWindowDays * 86_400_000;
    return Math.max(0, Math.ceil((deadline - Date.now()) / 86_400_000));
  }

  /** ============ Host → guest review modal ============ */
  openHostReview(b: IBooking, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.hostReviewTarget = b;
    const existing = this.hostReviews.forBooking(b.id);
    if (existing) {
      this.hostReviewText = existing.text;
      this.hostReviewSubScores = { ...existing.subScores };
    } else {
      this.hostReviewText = '';
      this.hostReviewSubScores = { cleanliness: 5, communication: 5, rulesFollowed: 5, careOfSite: 5, punctuality: 5 };
    }
  }

  closeHostReview(): void {
    if (this.hostReviewSaving) return;
    this.hostReviewTarget = null;
  }

  setHostReviewSubScore(key: keyof IHostReviewSubScores, value: number): void {
    this.hostReviewSubScores = { ...this.hostReviewSubScores, [key]: Math.max(1, Math.min(5, value)) };
  }

  /** Decimal overall (for the modal preview) and 2-decimal stored value. */
  get hostReviewOverallExact(): number { return averageHostSubScores(this.hostReviewSubScores); }
  get hostReviewOverall(): number { return +this.hostReviewOverallExact.toFixed(2); }

  confirmHostReview(): void {
    if (!this.hostReviewTarget || this.hostReviewSaving) return;
    const target = this.hostReviewTarget;
    const user = this.user;
    if (!user) return;
    this.hostReviewSaving = true;
    const guestName = target.contact?.email?.split('@')[0] ? target.contact.email.split('@')[0] : 'Guest';
    const guestInitials = guestName.slice(0, 2).toUpperCase();
    setTimeout(() => {
      this.hostReviews.upsert({
        bookingId: target.id,
        listingId: target.listingId,
        hostEmail: user.email,
        guestEmail: target.userEmail,
        guestName,
        guestInitials,
        rating: this.hostReviewOverall,
        text: this.hostReviewText.trim(),
        subScores: this.hostReviewSubScores,
      });
      this.bookings.markHostReviewed(target.id);
      this.hostReviewSaving = false;
      this.hostReviewTarget = null;
      this.toasts.success('Guest review submitted.');
    }, 400);
  }

  /** Cancelled / declined real bookings in the last 30 days, max 5. */
  get cancelledHostBookings(): IBooking[] {
    const cutoff = Date.now() - 30 * 86_400_000;
    return this.hostBookings
      .filter(b => (b.status === 'cancelled' || b.status === 'declined') && new Date(b.createdAt).getTime() >= cutoff)
      .slice(0, 5);
  }

  /** Best-guess guest initials from email (fallback when names aren't on the booking). */
  guestInitials(b: IBooking): string {
    const local = (b.userEmail || '').split('@')[0] || '?';
    const parts = local.split(/[._-]+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || local[1] || '')).toUpperCase();
  }

  /** ===== Real booking actions ===== */

  approveBooking(b: IBooking): void {
    this.bookings.hostDecide(b.id, 'approved');
  }

  openDeclineModal(b: IBooking): void {
    this.modalAction = 'decline';
    this.modalTarget = b;
    this.modalReason = '';
  }

  openCancelModal(b: IBooking): void {
    this.modalAction = 'cancel';
    this.modalTarget = b;
    this.modalReason = '';
  }

  closeModal(): void {
    if (this.modalSaving) return;
    this.modalAction = null;
    this.modalTarget = null;
    this.modalReason = '';
  }

  pickModalReason(preset: string): void {
    this.modalReason = this.modalReason === preset ? '' : preset;
  }

  get modalReasonPresets(): string[] {
    return this.modalAction === 'decline' ? this.declinePresets : this.cancelPresets;
  }

  get modalIsOtherSelected(): boolean {
    if (!this.modalReason) return false;
    if (this.modalReason === 'Other') return true;
    return !this.modalReasonPresets.includes(this.modalReason);
  }

  confirmModal(): void {
    if (!this.modalTarget || !this.modalAction || this.modalSaving) return;
    this.modalSaving = true;
    const target = this.modalTarget;
    const action = this.modalAction;
    const reason = this.modalReason === 'Other' ? '' : this.modalReason;
    setTimeout(() => {
      if (action === 'decline') {
        this.bookings.hostDecide(target.id, 'declined', reason);
      } else {
        this.bookings.hostCancel(target.id, reason);
      }
      this.modalSaving = false;
      this.modalAction = null;
      this.modalTarget = null;
      this.modalReason = '';
    }, 300);
  }

  /** Toggle back to guest view. */
  switchToTraveling(): void {
    this.auth.setView('guest');
    this.router.navigate(['/dashboard']);
  }

  /** Keeps the platformId field referenced (avoids unused-DI warning). */
  get isBrowser(): boolean { return isPlatformBrowser(this.platformId); }
}
