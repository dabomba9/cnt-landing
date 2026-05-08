import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { ListingCardComponent } from '../listing-card/listing-card.component';
import { SeoService } from '../seo.service';
import { AuthService, PublicUser } from '../auth/auth.service';
import { BookingService } from '../booking/booking.service';
import { Booking } from '../booking/booking.types';
import { MyRv, readMyRv } from '../my-rv.util';
import { Listing, MOCK_LISTINGS } from '../search-results/mock-listings.data';
import { DashboardGreetingComponent } from './widgets/greeting/greeting.component';
import { StatTileComponent } from './widgets/stat-tile/stat-tile.component';
import { UpcomingTripCardComponent } from './widgets/upcoming-trip/upcoming-trip.component';
import { SavedStaysWidgetComponent } from './widgets/saved-stays/saved-stays.component';
import { MyRvSummaryWidgetComponent } from './widgets/my-rv-summary/my-rv-summary.component';
import { ActivityFeedComponent } from './widgets/activity-feed/activity-feed.component';
import { QuickActionsComponent } from './widgets/quick-actions/quick-actions.component';
import { isMyRvSet } from '../my-rv.util';

const FAV_KEY = 'cnt-favorites';

@Component({
  selector: 'cnt-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, NavbarComponent, FooterComponent, ListingCardComponent,
    DashboardGreetingComponent, StatTileComponent, UpcomingTripCardComponent,
    SavedStaysWidgetComponent, MyRvSummaryWidgetComponent, ActivityFeedComponent,
    QuickActionsComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: PublicUser | null = null;
  bookings: Booking[] = [];
  myRv: MyRv | null = null;
  savedListings: Listing[] = [];
  private bookingsSub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
    private bookingSvc: BookingService,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Dashboard — CurbNTurf',
      description: 'Your CurbNTurf dashboard.',
      url: '/dashboard',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;
    this.myRv = readMyRv(this.platformId);
    this.savedListings = this.readSavedListings();
    this.bookingsSub = this.bookingSvc.bookings$.subscribe(all => {
      const email = this.user?.email;
      this.bookings = email ? all.filter(b => b.userEmail === email) : [];
    });
  }

  ngOnDestroy(): void {
    this.bookingsSub?.unsubscribe();
  }

  private readSavedListings(): Listing[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const set = new Set(ids);
      return MOCK_LISTINGS.filter(l => set.has(l.id));
    } catch {
      return [];
    }
  }

  /** Bookings whose check-in is in the future and not cancelled/declined; soonest first. */
  get upcomingTrip(): Booking | null {
    const now = Date.now();
    const upcoming = this.bookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'declined')
      .filter(b => new Date(b.dates.start).getTime() > now)
      .sort((a, b) => new Date(a.dates.start).getTime() - new Date(b.dates.start).getTime());
    return upcoming[0] || null;
  }

  /** Verified flag from current user. */
  get verified(): boolean { return !!this.user?.verified; }

  /** True when MyRv profile has any specs set. */
  get rvSet(): boolean { return this.myRv ? isMyRvSet(this.myRv) : false; }

  /** "Continue exploring" — 4 recommended listings.
      Strategy: prioritize same categories as the user's saved + booked listings, exclude already-saved/booked, fall back to top-rated. */
  get recommendedListings(): Listing[] {
    const seen = new Set<number>();
    for (const l of this.savedListings) seen.add(l.id);
    for (const b of this.bookings) seen.add(b.listingId);

    // Categories the user has shown interest in
    const interestCats = new Set<string>();
    for (const l of this.savedListings) interestCats.add(l.category);
    for (const b of this.bookings) {
      const listing = MOCK_LISTINGS.find(l => l.id === b.listingId);
      if (listing) interestCats.add(listing.category);
    }

    // Pool: not already seen, sorted by rating desc
    const pool = MOCK_LISTINGS.filter(l => !seen.has(l.id))
      .sort((a, b) => b.rating - a.rating);

    // Prefer matching categories first, then fill from rest
    const matching = pool.filter(l => interestCats.has(l.category));
    const rest = pool.filter(l => !interestCats.has(l.category));
    const ranked = [...matching, ...rest];
    return ranked.slice(0, 4);
  }

  /** "May 2026" formatted member-since pulled from createdAt. */
  get memberSince(): string {
    if (!this.user?.createdAt) return '';
    try {
      return new Date(this.user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }

  // ---- Stat values ----
  get tripsTaken(): number {
    const now = Date.now();
    return this.bookings.filter(b => {
      if (b.status === 'declined') return false;
      return new Date(b.dates.end).getTime() < now;
    }).length;
  }
  get nightsBooked(): number {
    return this.bookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'declined')
      .reduce((sum, b) => sum + (b.nights || 0), 0);
  }
  get staysSaved(): number { return this.savedListings.length; }
  /** Reward credit stub — $5/night × completed trips. */
  get rewardCredit(): number {
    const now = Date.now();
    const completedNights = this.bookings
      .filter(b => (b.status === 'confirmed' || b.status === 'approved') && new Date(b.dates.end).getTime() < now)
      .reduce((sum, b) => sum + (b.nights || 0), 0);
    return completedNights * 5;
  }
}
