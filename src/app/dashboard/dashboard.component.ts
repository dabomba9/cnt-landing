import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
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
import { TripPrepComponent } from './widgets/trip-prep/trip-prep.component';
import { isMyRvSet } from '../my-rv.util';

const FAV_KEY = 'cnt-favorites';

@Component({
  selector: 'cnt-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, NavbarComponent, FooterComponent, ListingCardComponent,
    DashboardGreetingComponent, StatTileComponent, UpcomingTripCardComponent,
    SavedStaysWidgetComponent, MyRvSummaryWidgetComponent, ActivityFeedComponent,
    QuickActionsComponent, TripPrepComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  user: PublicUser | null = null;
  bookings: Booking[] = [];
  myRv: MyRv | null = null;
  savedListings: Listing[] = [];
  private bookingsSub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
    private router: Router,
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

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    requestAnimationFrame(() => {
      gsap.from('.dashboard-anim', {
        opacity: 0,
        y: 18,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.07,
        delay: 0.05,
        clearProps: 'opacity,transform',
      });
    });
  }

  // ---- Sparkline series helpers (mock 4-week trends derived from stable inputs) ----
  get tripsSpark(): number[] {
    const t = this.tripsTaken;
    return [Math.max(0, t - 3), Math.max(0, t - 2), Math.max(0, t - 1), t];
  }
  get nightsSpark(): number[] {
    const n = this.nightsBooked;
    return [Math.max(0, n - 5), Math.max(0, n - 3), Math.max(0, n - 1), n];
  }
  get savedSpark(): number[] {
    const s = this.staysSaved;
    return [Math.max(0, s - 2), Math.max(0, s - 1), s, s];
  }
  get rewardSpark(): number[] {
    const r = this.rewardCredit;
    return [Math.max(0, r - 15), Math.max(0, r - 10), Math.max(0, r - 5), r];
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

  /** Show trip-prep checklist when there's an upcoming booking starting within 14 days. */
  get showTripPrep(): boolean {
    const t = this.upcomingTrip;
    if (!t) return false;
    const days = Math.ceil((new Date(t.dates.start).getTime() - Date.now()) / 86_400_000);
    return days >= 0 && days <= 14;
  }

  /** True when MyRv profile has any specs set. */
  get rvSet(): boolean { return this.myRv ? isMyRvSet(this.myRv) : false; }

  /** Flip to hosting view from the greeting CTA. */
  onSwitchToHosting(): void {
    this.auth.setView('host');
    this.router.navigate(['/hosting']);
  }

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
