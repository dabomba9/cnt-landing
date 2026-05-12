import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { SeoService, AuthService, BookingService, ToastService, ReviewService, IUserReview, IReviewSubScores } from '@cnt-workspace/data-access';
import { IBooking, STATUS_META } from '@cnt-workspace/models';

type TripFilter = 'upcoming' | 'past' | 'all';

@Component({
  selector: 'cnt-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './trips.component.html',
})
export class TripsComponent implements OnInit, OnDestroy {
  bookings: IBooking[] = [];
  filter: TripFilter = 'upcoming';
  STATUS_META = STATUS_META;
  guestVerified = false;

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
  reviewRating = 5;
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
  }

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
      this.reviewRating = existing.rating;
      this.reviewText = existing.text;
      this.reviewSubScores = { ...existing.subScores };
    } else {
      this.reviewRating = 5;
      this.reviewText = '';
      this.reviewSubScores = { cleanliness: 5, communication: 5, location: 5, hookups: 5, value: 5 };
    }
  }

  closeReview(): void {
    if (this.reviewSaving) return;
    this.reviewTarget = null;
  }

  setReviewRating(value: number): void { this.reviewRating = Math.max(1, Math.min(5, value)); }

  setReviewSubScore(key: keyof IReviewSubScores, value: number): void {
    this.reviewSubScores = { ...this.reviewSubScores, [key]: Math.max(1, Math.min(5, value)) };
  }

  /** Helper exposed to the template for rendering star rows (1..5). */
  readonly stars = [1, 2, 3, 4, 5];
  readonly subScoreLabels: Array<{ key: keyof IReviewSubScores; label: string }> = [
    { key: 'cleanliness',   label: 'Cleanliness' },
    { key: 'communication', label: 'Communication' },
    { key: 'location',      label: 'Location' },
    { key: 'hookups',       label: 'Hookups' },
    { key: 'value',         label: 'Value' },
  ];

  confirmReview(): void {
    if (!this.reviewTarget || this.reviewSaving) return;
    const target = this.reviewTarget;
    const user = this.auth.currentUser;
    if (!user) return;
    this.reviewSaving = true;
    const authorName = `${user.firstName} ${user.lastName}`.trim();
    const authorInitials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || authorName.slice(0, 2).toUpperCase();
    setTimeout(() => {
      this.reviewSvc.upsert({
        bookingId: target.id,
        listingId: target.listingId,
        userEmail: user.email,
        authorName,
        authorInitials,
        rating: this.reviewRating,
        text: this.reviewText.trim(),
        subScores: this.reviewSubScores,
      });
      this.bookingSvc.markReviewed(target.id);
      this.reviewSaving = false;
      this.reviewTarget = null;
      this.toasts.success('Review saved — thanks for sharing.');
    }, 300);
  }
}
