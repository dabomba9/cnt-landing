import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { ListingCardComponent } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { AuthService, IPublicUser, getMyListings } from '@cnt-workspace/data-access';
import { BookingService, ReviewService, IUserReview, REVIEW_CREDIT_PER_NIGHT, ICreditEntry,
  TripPlannerService, ITripPlan, totalTripMiles } from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';
import { IMyRv, readMyRv, readRecentlyViewed } from '@cnt-workspace/data-access';
import { IListing, MOCK_LISTINGS, ALL_LISTINGS, findListing } from '@cnt-workspace/data-access';
import { DashboardGreetingComponent } from './widgets/greeting/greeting.component';
import { StatTileComponent, FocusTrapDirective } from '@cnt-workspace/ui';
import { UpcomingTripCardComponent } from './widgets/upcoming-trip/upcoming-trip.component';
import { SavedStaysWidgetComponent } from './widgets/saved-stays/saved-stays.component';
import { MyRvSummaryWidgetComponent } from './widgets/my-rv-summary/my-rv-summary.component';
import { ActivityFeedComponent } from './widgets/activity-feed/activity-feed.component';
import { QuickActionsComponent } from './widgets/quick-actions/quick-actions.component';
import { TripPrepComponent } from './widgets/trip-prep/trip-prep.component';
import { ReviewsWidgetComponent } from './widgets/reviews/reviews-widget.component';
import { SpendingSummaryComponent } from './widgets/spending-summary/spending-summary.component';
import { HostingShortcutComponent } from './widgets/hosting-shortcut/hosting-shortcut.component';
import { isMyRvSet, readFavorites } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, NavbarComponent, FooterComponent, ListingCardComponent,
    DashboardGreetingComponent, StatTileComponent, UpcomingTripCardComponent,
    SavedStaysWidgetComponent, MyRvSummaryWidgetComponent, ActivityFeedComponent,
    QuickActionsComponent, TripPrepComponent, ReviewsWidgetComponent, SpendingSummaryComponent,
    HostingShortcutComponent, FocusTrapDirective,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  user: IPublicUser | null = null;
  bookings: IBooking[] = [];
  /** Owned-listings count — gates the Hosting shortcut card. Zero for
   *  travel-only users so the dashboard stays clean. */
  ownedListingCount = 0;
  myRv: IMyRv | null = null;
  savedListings: IListing[] = [];
  userReviews: IUserReview[] = [];
  /** Active trip plan — drives the dashboard's "Trip in progress" card. */
  activeTripPlan: ITripPlan | null = null;
  activeTripMiles = 0;
  private bookingsSub: Subscription | null = null;
  private reviewsSub: Subscription | null = null;
  private tripPlansSub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
    private bookingSvc: BookingService,
    private reviewSvc: ReviewService,
    private seo: SeoService,
    private router: Router,
    private planner: TripPlannerService,
  ) {}

  /** Flip to host view and head to the host dashboard — mirrors the host
   * dashboard's "Switch to traveling" control. */
  switchToHosting(): void {
    this.auth.setView('host');
    this.router.navigate(['/hosting']);
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Dashboard — CurbNTurf',
      description: 'Your CurbNTurf dashboard.',
      url: '/dashboard',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;
    this.ownedListingCount = this.user ? getMyListings(this.user.email).length : 0;
    this.myRv = readMyRv(this.platformId);
    this.savedListings = this.readSavedListings();
    this.bookingsSub = this.bookingSvc.bookings$.subscribe(all => {
      const email = this.user?.email;
      this.bookings = email ? all.filter(b => b.userEmail === email) : [];
    });
    this.reviewsSub = this.reviewSvc.reviews$.subscribe(all => {
      const email = this.user?.email;
      this.userReviews = email ? all.filter(r => r.userEmail === email) : [];
    });
    this.tripPlansSub = this.planner.plans$.subscribe(plans => {
      const activeId = this.planner.getActiveId();
      this.activeTripPlan = (activeId && plans.find(p => p.id === activeId)) || null;
      this.activeTripMiles = this.activeTripPlan ? totalTripMiles(this.activeTripPlan) : 0;
    });
  }

  ngOnDestroy(): void {
    this.bookingsSub?.unsubscribe();
    this.reviewsSub?.unsubscribe();
    this.tripPlansSub?.unsubscribe();
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

  private readSavedListings(): IListing[] {
    const favorites = readFavorites(this.platformId);
    const orderById = new Map(favorites.map((f, i) => [f.id, i]));
    // Span both private listings and boondocking — favorites can now reference either.
    return ALL_LISTINGS
      .filter(l => orderById.has(l.id))
      .sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0));
  }

  /** Bookings whose check-in is in the future and not cancelled/declined; soonest first. */
  get upcomingTrip(): IBooking | null {
    const now = Date.now();
    const upcoming = this.bookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'declined')
      .filter(b => new Date(b.dates.start).getTime() > now)
      .sort((a, b) => new Date(a.dates.start).getTime() - new Date(b.dates.start).getTime());
    return upcoming[0] || null;
  }

  /** Booking currently in-progress (check-in passed, check-out not yet reached, confirmed/approved). */
  get inProgressTrip(): IBooking | null {
    const now = Date.now();
    return this.bookings.find(b =>
      (b.status === 'confirmed' || b.status === 'approved')
      && new Date(b.dates.start).getTime() <= now
      && new Date(b.dates.end).getTime() > now,
    ) || null;
  }

  /** Google Maps deep link for the active in-progress trip. */
  get inProgressDirectionsHref(): string {
    const t = this.inProgressTrip;
    if (!t || t.lat == null || t.lng == null) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`;
  }

  /** Verified flag from current user. */
  get verified(): boolean { return !!this.user?.verified; }

  /** Show trip-prep checklist when there's an upcoming booking starting within 14 days
   *  AND the user has notifPrefs.tripReminders enabled (default true). */
  get showTripPrep(): boolean {
    if (this.user?.notifPrefs?.tripReminders === false) return false;
    const t = this.upcomingTrip;
    if (!t) return false;
    const days = Math.ceil((new Date(t.dates.start).getTime() - Date.now()) / 86_400_000);
    return days >= 0 && days <= 14;
  }

  /** notifPrefs.marketing gate (default true) — used to hide promo callouts. */
  get marketingEnabled(): boolean {
    return this.user?.notifPrefs?.marketing !== false;
  }

  /** True when MyRv profile has any specs set. */
  get rvSet(): boolean { return this.myRv ? isMyRvSet(this.myRv) : false; }

  /** Listings the user visited recently, minus anything saved or already booked. */
  get recentlyViewedListings(): IListing[] {
    const seen = new Set<number>();
    for (const l of this.savedListings) seen.add(l.id);
    for (const b of this.bookings) seen.add(b.listingId);
    return readRecentlyViewed(this.platformId)
      .filter(id => !seen.has(id))
      .map(id => findListing(id))
      .filter((l): l is IListing => !!l)
      .slice(0, 4);
  }

  /** "Continue exploring" — 4 recommended listings.
      Strategy: prioritize same categories as the user's saved + booked listings, exclude already-saved/booked, fall back to top-rated. */
  get recommendedListings(): IListing[] {
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
      if (b.status === 'declined' || b.status === 'cancelled') return false;
      return new Date(b.dates.end).getTime() < now;
    }).length;
  }
  get nightsBooked(): number {
    return this.bookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'declined')
      .reduce((sum, b) => sum + (b.nights || 0), 0);
  }
  get staysSaved(): number { return this.savedListings.length; }
  get reviewsGiven(): number { return this.userReviews.length; }

  /** Truly-empty account → trigger the welcome hero in place of upcoming-trip. */
  get isBrandNewUser(): boolean {
    return this.bookings.length === 0 && this.savedListings.length === 0;
  }
  /** Reward credit available to spend — earned per-night × reviewed minus already-applied. */
  get rewardCredit(): number {
    return this.user ? this.bookingSvc.getAvailableCredit(this.user.email) : 0;
  }
  readonly creditPerNight = REVIEW_CREDIT_PER_NIGHT;

  /** Toggle state for the credit breakdown disclosure. */
  creditBreakdownOpen = false;
  toggleCreditBreakdown(): void { this.creditBreakdownOpen = !this.creditBreakdownOpen; }
  closeCreditBreakdown(): void { this.creditBreakdownOpen = false; }

  get creditHistory(): ICreditEntry[] {
    return this.user ? this.bookingSvc.getCreditHistory(this.user.email) : [];
  }
  get earnedEntries(): ICreditEntry[] { return this.creditHistory.filter(e => e.type === 'earned'); }
  get spentEntries(): ICreditEntry[] { return this.creditHistory.filter(e => e.type === 'spent'); }
  get totalEarned(): number { return this.earnedEntries.reduce((s, e) => s + e.amount, 0); }
  get totalSpent(): number { return this.spentEntries.reduce((s, e) => s + e.amount, 0); }

  creditEntryDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  }
}
