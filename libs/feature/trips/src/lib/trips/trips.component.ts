import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { SeoService, AuthService, BookingService, ToastService } from '@cnt-workspace/data-access';
import { Booking, STATUS_META } from '@cnt-workspace/models';

type TripFilter = 'upcoming' | 'past' | 'all';

@Component({
  selector: 'cnt-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './trips.component.html',
})
export class TripsComponent implements OnInit, OnDestroy {
  bookings: Booking[] = [];
  filter: TripFilter = 'upcoming';
  STATUS_META = STATUS_META;
  guestVerified = false;

  /** Cancel modal state. */
  cancelTarget: Booking | null = null;
  cancelReason = '';
  cancelling = false;
  readonly cancelReasonPresets = ['Plans changed', 'Weather', 'Found another stay', 'Other'];

  pickCancelReason(preset: string): void {
    this.cancelReason = this.cancelReason === preset ? '' : preset;
  }

  private userEmail = '';
  private sub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
    private bookingSvc: BookingService,
    private seo: SeoService,
    private toasts: ToastService,
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
    this.sub = this.bookingSvc.bookings$.subscribe(all => {
      this.bookings = all
        .filter(b => b.userEmail === this.userEmail)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  setFilter(f: TripFilter): void { this.filter = f; }

  get filteredBookings(): Booking[] {
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

  datesLabel(b: Booking): string {
    const start = new Date(b.dates.start);
    const end = new Date(b.dates.end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  }

  /** Days until check-in. Negative if past. Null if not applicable. */
  daysUntil(b: Booking): number | null {
    const start = new Date(b.dates.start).getTime();
    const days = Math.ceil((start - Date.now()) / 86_400_000);
    return days;
  }

  countdownLabel(b: Booking): string | null {
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
  canCancel(b: Booking): boolean {
    if (b.status === 'cancelled' || b.status === 'declined') return false;
    return new Date(b.dates.start).getTime() > Date.now();
  }

  openCancel(b: Booking, event?: Event): void {
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
}
