import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent, ListingCardComponent, StatTileComponent, FocusTrapDirective, ResumeDraftCardComponent } from '@cnt-workspace/ui';
import {
  SeoService, AuthService, IPublicUser, ToastService, BookingService, IPrivateListing,
  getMyListings, getHostStats, getHostBookings, IHostStats,
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

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
    private toasts: ToastService,
    private bookings: BookingService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Host dashboard — CurbNTurf',
      description: 'Manage your CurbNTurf listings, requests, and earnings.',
      url: '/hosting',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;
    if (this.user) {
      this.listings = getMyListings(this.user.email);
      this.subs.push(
        this.bookings.bookings$.subscribe(all => {
          this.hostBookings = this.user ? getHostBookings(this.user.email, all) : [];
          this.stats = getHostStats(this.listings, this.hostBookings);
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
