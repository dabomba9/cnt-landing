import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent, ListingCardComponent, StatTileComponent } from '@cnt-workspace/ui';
import {
  SeoService, AuthService, PublicUser, ToastService, BookingService, Listing,
  getMyListings, getHostStats, getPendingRequests, getHostBookings, HostStats, HostRequest,
} from '@cnt-workspace/data-access';
import { Booking } from '@cnt-workspace/models';
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
  ],
  templateUrl: './host-dashboard.component.html',
})
export class HostDashboardComponent implements OnInit, OnDestroy {
  user: PublicUser | null = null;
  listings: Listing[] = [];
  stats: HostStats = { earningsThisMonth: 0, earningsYearToDate: 0, upcomingNights: 0, occupancyRate: 0, averageRating: 0, totalReviews: 0 };
  /** Seeded mock requests — kept so a fresh demo isn't empty. */
  requests: HostRequest[] = [];
  /** Real bookings against this host's listings. */
  hostBookings: Booking[] = [];
  private subs: Subscription[] = [];

  /** Action modal state — used for both decline (pending) and cancel (approved/confirmed). */
  modalAction: ModalAction | null = null;
  modalTarget: Booking | null = null;
  modalReason = '';
  modalSaving = false;
  readonly declinePresets = DECLINE_PRESETS;
  readonly cancelPresets = CANCEL_PRESETS;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
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
      this.stats = getHostStats(this.listings);
      this.requests = getPendingRequests(this.listings);
      this.subs.push(
        this.bookings.bookings$.subscribe(all => {
          this.hostBookings = this.user ? getHostBookings(this.user.email, all) : [];
        }),
      );
    }
    // Auto-flip view to host so the navbar/menu reflects it.
    if (this.auth.currentView !== 'host') this.auth.setView('host');
  }

  ngOnDestroy(): void { for (const s of this.subs) s.unsubscribe(); }

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

  formatRequestDates(req: HostRequest): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = new Date(req.startDate).toLocaleDateString('en-US', opts);
    const end = new Date(req.endDate).toLocaleDateString('en-US', opts);
    return `${start} – ${end}`;
  }

  formatBookingDates(b: Booking): string {
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
  get pendingHostBookings(): Booking[] {
    return this.hostBookings.filter(b => b.status === 'pending');
  }

  /** Approved/confirmed real bookings on the host's listings. */
  get activeHostBookings(): Booking[] {
    const now = Date.now();
    return this.hostBookings
      .filter(b => (b.status === 'approved' || b.status === 'confirmed') && new Date(b.dates.end).getTime() >= now);
  }

  /** Best-guess guest initials from email (fallback when names aren't on the booking). */
  guestInitials(b: Booking): string {
    const local = (b.userEmail || '').split('@')[0] || '?';
    const parts = local.split(/[._-]+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || local[1] || '')).toUpperCase();
  }

  /** ===== Mock request actions (unchanged demo behavior) ===== */

  approveRequest(req: HostRequest): void {
    this.requests = this.requests.filter(r => r.id !== req.id);
    this.toasts.success(`Approved ${req.guestName}'s request.`);
  }

  declineRequest(req: HostRequest): void {
    this.requests = this.requests.filter(r => r.id !== req.id);
    this.toasts.info(`Declined ${req.guestName}'s request.`);
  }

  /** ===== Real booking actions ===== */

  approveBooking(b: Booking): void {
    this.bookings.hostDecide(b.id, 'approved');
  }

  openDeclineModal(b: Booking): void {
    this.modalAction = 'decline';
    this.modalTarget = b;
    this.modalReason = '';
  }

  openCancelModal(b: Booking): void {
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
