import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { SeoService } from '../seo.service';
import { AuthService } from '../auth/auth.service';
import { BookingService } from '../booking/booking.service';
import { Booking, STATUS_META } from '../booking/booking.types';

type TripFilter = 'upcoming' | 'past' | 'all';

@Component({
  selector: 'cnt-trips',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './trips.component.html',
})
export class TripsComponent implements OnInit {
  bookings: Booking[] = [];
  filter: TripFilter = 'upcoming';
  STATUS_META = STATUS_META;
  guestVerified = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
    private bookingSvc: BookingService,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'My trips — CurbNTurf',
      description: 'Your CurbNTurf bookings.',
      url: '/trips',
      robots: 'noindex, nofollow',
    });
    const user = this.auth.currentUser;
    if (user) {
      this.bookings = this.bookingSvc.list(user.email);
      this.guestVerified = !!user.verified;
    }
  }

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
}
