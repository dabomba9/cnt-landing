import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { CinematicRollDirective } from '@cnt-workspace/ui';
import { MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import {
  MOCK_LISTINGS, IListing, CATEGORY_META, AMENITY_LABELS, AMENITY_ICONS,
  IListingDetail, getListingDetail, CANCELLATION_TIER_META,
  TRUST_BADGE_META, NEARBY_META,
  PAD_TYPE_META, LEVELING_META, SEWER_META, CLEARANCE_META,
  AGENCY_META,
  MOCK_POIS, POI_KIND_META, IPoi, PoiKind,
  IPrivateListing, findListing, MOCK_BOONDOCKING, IAddOn,
} from '@cnt-workspace/data-access';
import { IMyRv, IMyRvProfile, emptyMyRv, readMyRv, writeMyRv, isMyRvSet, isMyRvComplete, myRvMissingFields, rvTypeLabel, listMyRvProfiles, getActiveRvProfileId, setActiveRvProfile, pushRecentlyViewed, ToastService, readFavoriteIds, addFavorite, removeFavorite } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';
import { BookingStateService } from './booking-state.service';
import { AuthService, ReviewService, IUserReview, isOwnedByUser, HostReviewService, BookingService,
  TripPlannerService, ITripPlan } from '@cnt-workspace/data-access';
import { ListingPhotoLightboxComponent } from './photo-lightbox/listing-photo-lightbox.component';
import { ListingBookingWidgetComponent } from './booking-widget/listing-booking-widget.component';
import { ListingMobileBookingBarComponent } from './mobile-booking-bar/listing-mobile-booking-bar.component';
import { RvPhotosModalComponent } from './rv-photos-modal/rv-photos-modal.component';
import { AddonLightboxComponent } from './addon-lightbox/addon-lightbox.component';
import { ListingCardComponent } from '@cnt-workspace/ui';
import { ReviewCardComponent } from '@cnt-workspace/ui';
import { AccordionCardComponent } from '@cnt-workspace/ui';
import { MiniMapComponent } from '@cnt-workspace/booking';

@Component({
  selector: 'cnt-workspace-listing-details',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective,
    ListingPhotoLightboxComponent, ListingBookingWidgetComponent, ListingMobileBookingBarComponent,
    ListingCardComponent, ReviewCardComponent, AccordionCardComponent, RvPhotosModalComponent,
    MiniMapComponent, AddonLightboxComponent,
  ],
  providers: [BookingStateService],
  templateUrl: './listing-details.component.html',
  styleUrl: './listing-details.component.scss',
})
export class ListingDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  listing!: IListing;
  detail!: IListingDetail;
  CATEGORY_META = CATEGORY_META;
  AMENITY_LABELS = AMENITY_LABELS;
  AMENITY_ICONS = AMENITY_ICONS;
  CANCELLATION_TIER_META = CANCELLATION_TIER_META;
  TRUST_BADGE_META = TRUST_BADGE_META;
  NEARBY_META = NEARBY_META;
  PAD_TYPE_META = PAD_TYPE_META;
  LEVELING_META = LEVELING_META;
  SEWER_META = SEWER_META;
  CLEARANCE_META = CLEARANCE_META;
  AGENCY_META = AGENCY_META;
  POI_KIND_META = POI_KIND_META;
  readonly poiKindsForNearest: PoiKind[] = ['dumpstation', 'propane', 'potable_water', 'rest_area'];

  /** True for public-land boondocking listings: replaces booking flow with "Get Directions" + visit info. */
  get isBoondocking(): boolean { return this.listing?.kind === 'boondocking'; }
  /** The listing narrowed to private — null on boondocking pages. Used inside @if blocks
   * to let the template access `.price` / `.rating` / `.reviewCount` / `.instantBook`
   * without the union's narrowing complaint. */
  get privateListing(): IPrivateListing | null {
    return this.listing && this.listing.kind !== 'boondocking' ? this.listing : null;
  }

  /**
   * Nearest POI of each utility kind. Shown for every stay — but most critical on
   * boondocking pages, where RVers have no hookups and need to know the closest dump
   * station / propane / water before heading out.
   * Uses squared-euclidean for ranking (cheap, same order as great-circle) and
   * a single haversine call for the displayed mile value.
   */
  get nearestUtilities(): { kind: PoiKind; poi: IPoi; miles: number }[] {
    if (!this.listing) return [];
    const out: { kind: PoiKind; poi: IPoi; miles: number }[] = [];
    for (const kind of this.poiKindsForNearest) {
      let best: IPoi | null = null;
      let bestSq = Infinity;
      for (const p of MOCK_POIS) {
        if (p.kind !== kind) continue;
        const dLat = p.lat - this.listing.lat;
        const dLng = p.lng - this.listing.lng;
        const sq = dLat * dLat + dLng * dLng;
        if (sq < bestSq) { bestSq = sq; best = p; }
      }
      if (best) out.push({ kind, poi: best, miles: this.distanceMiles(this.listing, best) });
    }
    return out;
  }

  /** Haversine miles between two lat/lng points — rounded to one decimal for display. */
  private distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 3958.7613; // Earth radius in miles
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
  }
  /** Google Maps deep link for the active listing (used by boondocking Get Directions CTAs). */
  get directionsHref(): string {
    if (!this.listing) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${this.listing.lat},${this.listing.lng}`;
  }

  // Favorite state (mirrors /search behavior)
  favorited = false;
  private favoriteSet = new Set<number>();

  // Content section state
  rulesOpen = false;
  cancellationOpen = false;

  // Lightbox state
  lightboxOpen = false;
  lightboxStartIndex = 0;

  // My RV — the active profile, persisted in localStorage. `rvProfiles` powers
  // the widget switcher so the fit check can be evaluated per-rig.
  myRv: IMyRv = emptyMyRv();
  rvProfiles: IMyRvProfile[] = [];
  activeRvId: string | null = null;

  // Reviews UI state
  reviewsExpanded = false;
  reviewSort: 'recent' | 'top-rated' = 'recent';
  readonly REVIEWS_COLLAPSED_COUNT = 4;

  // In-page section nav
  readonly sectionAnchors = [
    { id: 'photos',    label: 'Photos' },
    { id: 'amenities', label: 'Amenities' },
    { id: 'specs',     label: 'Specs' },
    { id: 'add-ons',   label: 'Add-ons' },
    { id: 'reviews',   label: 'Reviews' },
    { id: 'location',  label: 'Location' },
  ];
  /** Section anchors shown in the in-page nav. Boondocking pages hide Add-ons and Reviews
   * since those sections aren't rendered on public-land listings. */
  get visibleSectionAnchors() {
    if (!this.isBoondocking) return this.sectionAnchors;
    return this.sectionAnchors.filter(a => a.id !== 'add-ons' && a.id !== 'reviews');
  }
  activeAnchor = 'photos';
  private sectionObserver?: IntersectionObserver;

  /** Site-specs disclosure: top 3 always visible, bottom 4 expand on click. */
  specsExpanded = false;
  toggleSpecs(): void { this.specsExpanded = !this.specsExpanded; }

  /** Marks a gallery image as loaded so the skeleton pulse stops. */
  onImageLoad(event: Event): void {
    (event.target as HTMLElement).classList.add('img-loaded');
  }

  /** Persists changes to the My RV profile coming from the booking widget
      (photo attach/clear) so future bookings reuse the same photos. */
  onMyRvChange(next: IMyRv): void {
    this.myRv = next;
    writeMyRv(this.platformId, next);
    this.booking.setMyRv(next);
  }

  /** Widget RV switcher — change which saved rig the fit check evaluates. */
  onRvProfileSelect(id: string): void {
    setActiveRvProfile(this.platformId, id);
    this.activeRvId = id;
    this.myRv = readMyRv(this.platformId);
    this.booking.setMyRv(this.myRv);
  }

  // Scroll-direction reveal/hide for the sticky section nav (Airbnb pattern)
  navHidden = false;
  private lastScrollY = 0;
  private lastScrollTime = 0;
  private readonly SCROLL_THRESHOLD = 72;
  private readonly SCROLL_DEBOUNCE_MS = 80;
  private readonly REVEAL_TOP_PX = 200;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const y = window.scrollY;
    const now = performance.now();
    if (y < this.REVEAL_TOP_PX) {
      if (this.navHidden) this.navHidden = false;
      this.lastScrollY = y;
      this.lastScrollTime = now;
      return;
    }
    const dy = y - this.lastScrollY;
    if (Math.abs(dy) < this.SCROLL_THRESHOLD) return;
    if (now - this.lastScrollTime < this.SCROLL_DEBOUNCE_MS) return;
    if (dy > 0 && !this.navHidden) this.navHidden = true;
    else if (dy < 0 && this.navHidden) this.navHidden = false;
    this.lastScrollY = y;
    this.lastScrollTime = now;
  }
  private bookingChangedSub?: { unsubscribe: () => void };

  /** Up to 3 listings of the same kind + category as the current one, excluding self. */
  get similarListings(): IListing[] {
    const pool: IListing[] = this.isBoondocking ? MOCK_BOONDOCKING : MOCK_LISTINGS;
    return pool
      .filter(l => l.category === this.listing.category && l.id !== this.listing.id)
      .slice(0, 3);
  }

  /** Up to 3 other listings hosted by the same host (matched by name), excluding self.
   * Boondocking has no host, so this returns empty on those pages. */
  get hostListings(): IListing[] {
    if (this.isBoondocking) return [];
    const hostName = this.detail.host.name;
    return MOCK_LISTINGS
      .filter(l => l.id !== this.listing.id && getListingDetail(l).host.name === hostName)
      .slice(0, 3);
  }

  /** Aggregated rating + count (seeded + user-submitted) for private listings.
   * Drives the header tiles + review-section count so submitted reviews
   * actually move the displayed headline number. */
  get aggregatedRating(): { rating: number; count: number } {
    if (this.listing.kind === 'boondocking') return { rating: 0, count: 0 };
    return this.reviewSvc.aggregateRating(this.listing.rating, this.listing.reviewCount, this.listing.id);
  }

  /** One-line fit summary derived from siteSpecs. */
  get fitSummary(): string {
    const s = this.detail.siteSpecs;
    if (s.bigRigFriendly) return `Yes — fits rigs up to ${s.maxRigLength} ft`;
    return `Best for rigs under ${s.maxRigLength} ft`;
  }

  get isMyRvSet(): boolean { return isMyRvSet(this.myRv); }

  /** Fit verdict against the user's saved My RV. Null when My RV isn't set. */
  get myRvFit(): { passes: boolean; label: string } | null {
    if (!this.isMyRvSet) return null;
    const max = this.detail.siteSpecs.maxRigLength;
    const len = this.myRv.length;
    const typeStr = rvTypeLabel(this.myRv.type);
    if (len && len > max) {
      return { passes: false, label: `Won't fit your ${len}-ft ${typeStr}` };
    }
    if (len) {
      return { passes: true, label: `Fits your ${len}-ft ${typeStr}` };
    }
    return { passes: true, label: `Fits your ${typeStr}` };
  }

  /** Map a UserReview into the listing's Review shape so the UI doesn't branch.
   * Passes `bookingId` + `hostResponse` through so the template can show the
   * Respond button (real reviews only) and render the response block. */
  private userReviewAsReview(r: IUserReview): typeof this.detail.reviews[number] {
    const d = new Date(r.createdAt);
    const dateLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return {
      authorName: r.authorName,
      authorInitials: r.authorInitials,
      date: dateLabel,
      rating: r.rating,
      text: r.text || '(No comment)',
      bookingId: r.bookingId,
      hostResponse: r.hostResponse,
    };
  }

  /** ============ Host response inline editor ============ */
  respondingBookingId: string | null = null;
  responseDraft = '';

  openRespond(r: typeof this.detail.reviews[number]): void {
    if (!this.isOwner || !r.bookingId) return;
    this.respondingBookingId = r.bookingId;
    this.responseDraft = r.hostResponse?.text ?? '';
  }

  cancelRespond(): void {
    this.respondingBookingId = null;
    this.responseDraft = '';
  }

  saveResponse(): void {
    const id = this.respondingBookingId;
    if (!id) return;
    this.reviewSvc.setHostResponse(id, this.responseDraft);
    this.toasts.success('Response posted.');
    this.cancelRespond();
  }

  removeResponse(bookingId: string | undefined): void {
    if (!bookingId) return;
    this.reviewSvc.setHostResponse(bookingId, null);
    this.toasts.info('Response removed.');
  }

  /** Reviews sorted by current sort key. Real user reviews are prepended (most recent first). */
  get sortedReviews(): typeof this.detail.reviews {
    const real = this.userReviews
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(r => this.userReviewAsReview(r));
    const mocked = [...this.detail.reviews];
    const reviews = [...real, ...mocked];
    if (this.reviewSort === 'top-rated') {
      reviews.sort((a, b) => b.rating - a.rating);
    }
    return reviews;
  }


  get visibleReviews(): typeof this.detail.reviews {
    const list = this.sortedReviews;
    return this.reviewsExpanded ? list : list.slice(0, this.REVIEWS_COLLAPSED_COUNT);
  }

  toggleReviewsExpanded(): void { this.reviewsExpanded = !this.reviewsExpanded; }
  setReviewSort(s: 'recent' | 'top-rated'): void { this.reviewSort = s; }

  /** Average of the 5 sub-scores. */
  get overallScore(): number {
    const s = this.detail.subScores;
    return +((s.cleanliness + s.communication + s.hookups + s.location + s.value) / 5).toFixed(2);
  }

  /** Years the host has been listed (current year minus joinedYear). */
  get hostingYears(): number {
    return Math.max(1, new Date().getFullYear() - this.detail.host.joinedYear);
  }

  /** True when the current user published this listing — surfaces the Edit CTA. */
  get isOwner(): boolean {
    const email = this.auth.currentUser?.email;
    return !!email && isOwnedByUser(email, this.listing.id);
  }

  /** User reviews for this listing — keeps live via reviews$ subscription. */
  userReviews: IUserReview[] = [];
  private reviewsSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
    @Inject(BookingStateService) public booking: BookingStateService,
    private auth: AuthService,
    private reviewSvc: ReviewService,
    private hostReviewSvc: HostReviewService,
    private planner: TripPlannerService,
    private bookingSvc: BookingService,
    private toasts: ToastService,
  ) {}

  private currentListingId = -1;

  ngOnInit(): void {
    // Subscribe once: any service mutation pushes URL state
    this.bookingChangedSub = this.booking.changed.subscribe(() => this.syncBookingToUrl());

    // Hydrate from ?id, fall back to first listing if missing/invalid
    this.route.queryParams.subscribe(params => {
      const id = parseInt(params['id'], 10);
      const found = findListing(id);
      const newListing: IListing = found || MOCK_LISTINGS[0];

      // Always refresh myRv on route change — the user may have just saved
      // their rig on /account#rig and been bounced back here. We want the
      // sidebar alert + Reserve gate to reflect the latest profile.
      this.myRv = readMyRv(this.platformId);
      this.rvProfiles = listMyRvProfiles(this.platformId);
      this.activeRvId = getActiveRvProfileId(this.platformId);
      this.booking.setMyRv(this.myRv);

      // Only reset listing-scoped state when the listing actually changes
      if (newListing.id !== this.currentListingId) {
        this.listing = newListing;
        this.detail = getListingDetail(this.listing);
        // Booking state only applies to private listings — boondocking pages don't render
        // the widget/mobile-bar, so we skip wiring it for them.
        if (this.listing.kind !== 'boondocking') {
          this.booking.setListing(this.listing, this.detail);
        }
        this.currentListingId = newListing.id;
        pushRecentlyViewed(this.platformId, newListing.id);

        this.reviewsSub?.unsubscribe();
        this.reviewsSub = this.reviewSvc.reviews$.subscribe(all => {
          const forListing = all.filter(r => r.listingId === this.currentListingId);
          // Two-sided reveal: hide a guest-side review until the host also
          // submitted (or the 14-day window passed). Seeded reviews have no
          // booking record → always revealed.
          const map = new Map(this.bookingSvc.getAll().map(b => [b.id, b]));
          this.userReviews = this.hostReviewSvc.filterRevealed(forListing, map);
        });

        const heroImage = this.seo.absUrl(this.detail.photos[0]);
        this.seo.update({
          title: `${this.listing.title} — ${this.listing.location} | CurbNTurf`,
          description: this.detail.description.slice(0, 160),
          url: `/listing?id=${this.listing.id}`,
          image: heroImage,
          type: 'website',
        });
        this.seo.setStructuredData(this.buildListingJsonLd(heroImage));
        this.preloadLightboxPhotos();

        this.hydrateFavorite();
      }

      // Always reconcile booking state with URL (idempotent)
      this.booking.hydrateFromParams(params);
    });
  }

  /** Browser-cache photos[1] and photos[2] so the first prev/next click in the lightbox feels instant. */
  private preloadLightboxPhotos(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const candidates = [this.detail.photos[1], this.detail.photos[2]].filter(Boolean);
    for (const src of candidates) {
      const img = new Image();
      img.src = src;
    }
  }

  private syncBookingToUrl(): void {
    const queryParams = this.booking.serializeToParams();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private buildListingJsonLd(heroImage: string): object {
    const photos = this.detail.photos.map(p => this.seo.absUrl(p));
    const isBoondock = this.listing.kind === 'boondocking';
    return {
      '@context': 'https://schema.org',
      '@type': 'Campground',
      name: this.listing.title,
      description: this.detail.description.replace(/\s+/g, ' ').trim().slice(0, 500),
      image: photos.length > 0 ? photos : heroImage,
      url: `https://www.curbnturf.com/listing?id=${this.listing.id}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: this.listing.location,
        addressCountry: 'US',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: this.listing.lat,
        longitude: this.listing.lng,
      },
      // Boondocking has no price, no curated rating — omit schema fields rather than emit zeros.
      ...(isBoondock ? {} : {
        priceRange: `$${(this.listing as IPrivateListing).price}`,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: (this.listing as IPrivateListing).rating.toFixed(2),
          reviewCount: (this.listing as IPrivateListing).reviewCount,
          bestRating: '5',
          worstRating: '1',
        },
      }),
      review: this.detail.reviews.slice(0, 4).map(r => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.authorName },
        reviewBody: r.text,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: '5',
          worstRating: '1',
        },
      })),
      amenityFeature: this.listing.amenities.map(a => ({
        '@type': 'LocationFeatureSpecification',
        name: AMENITY_LABELS[a],
        value: true,
      })),
    };
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.listing-gallery', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' });
    gsap.from('.listing-title-row > *', { y: 16, opacity: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06, delay: 0.2 });
    gsap.from('.listing-content > *', { y: 24, opacity: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06, delay: 0.4 });
    gsap.from('.listing-sidebar', { x: 24, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.4 });

    // Section observer — track which section is in view to highlight its pill.
    setTimeout(() => this.setupSectionObserver(), 500);
  }

  private setupSectionObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const targets = this.sectionAnchors
      .map(a => document.getElementById(a.id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    this.sectionObserver?.disconnect();
    this.sectionObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      this.activeAnchor = visible[0].target.id;
    }, {
      rootMargin: '-120px 0px -55% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    targets.forEach(el => this.sectionObserver!.observe(el));
  }

  // ---- Favorite ----
  private hydrateFavorite(): void {
    this.favoriteSet = readFavoriteIds(this.platformId);
    this.favorited = !!this.listing && this.favoriteSet.has(this.listing.id);
  }

  toggleFavorite(event: MouseEvent): void {
    event.stopPropagation();
    this.toggleListingFavorite(this.listing.id, event);
    this.favorited = this.favoriteSet.has(this.listing.id);
  }

  // ---- Add-to-trip menu ----
  tripPlans: ITripPlan[] = [];
  addTripMenuOpen = false;
  private plansSub: import('rxjs').Subscription | null = null;

  toggleAddTripMenu(event: Event): void {
    event.stopPropagation();
    this.addTripMenuOpen = !this.addTripMenuOpen;
    if (this.addTripMenuOpen && this.plansSub === null) {
      this.plansSub = this.planner.plans$.subscribe(plans => {
        this.tripPlans = plans.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
    }
  }

  /** Close the menu when the user clicks anywhere else. */
  @HostListener('document:click', ['$event'])
  onDocClickForTripMenu(event: Event): void {
    if (!this.addTripMenuOpen) return;
    const t = event.target as HTMLElement | null;
    if (t && !t.closest('[aria-haspopup="true"]') && !t.closest('[role="menu"]')) {
      this.addTripMenuOpen = false;
    }
  }

  /** Append this listing to a saved trip. */
  addToTripPlan(planId: string): void {
    if (!this.listing) return;
    this.planner.addStop(planId, {
      kind: this.listing.kind === 'boondocking' ? 'boondocking' : 'private',
      refId: this.listing.id,
      name: this.listing.title,
      lat: this.listing.lat,
      lng: this.listing.lng,
      address: this.listing.location,
      photo: this.listing.image,
    });
    this.planner.setActiveId(planId);
    this.addTripMenuOpen = false;
    this.toasts.success('Added to trip.');
  }

  /** Create a fresh trip seeded with this listing. */
  createTripWithListing(): void {
    if (!this.listing) return;
    const name = `Trip with ${this.listing.title}`;
    const plan = this.planner.create(name);
    this.addToTripPlan(plan.id);
  }

  isListingFavorite(id: number): boolean {
    return this.favoriteSet.has(id);
  }

  toggleListingFavorite(id: number, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    // Determine kind: same listing → use its kind; otherwise look up in ALL_LISTINGS.
    const target = id === this.listing?.id ? this.listing : findListing(id);
    const kind = target?.kind === 'boondocking' ? 'boondocking' : 'listing';
    if (this.favoriteSet.has(id)) {
      removeFavorite(this.platformId, { kind, id });
      this.favoriteSet.delete(id);
    } else {
      addFavorite(this.platformId, { kind, id });
      this.favoriteSet.add(id);
    }
    this.favoriteSet = new Set(this.favoriteSet);
    if (id === this.listing?.id) this.favorited = this.favoriteSet.has(id);
  }

  share(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      navigator.share({
        title: this.listing.title,
        text: `${this.listing.title} — ${this.listing.location}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {/* could toast */}).catch(() => {});
    }
  }

  /** Modal flag for the RV photos collection step (non-Instant-Book listings only). */
  rvPhotosOpen = false;

  /** Add-on photo lightbox (null = closed). */
  lightboxAddon: IAddOn | null = null;
  openAddonLightbox(a: IAddOn, ev: MouseEvent): void {
    ev.stopPropagation();
    this.lightboxAddon = a;
  }
  closeAddonLightbox(): void { this.lightboxAddon = null; }

  requestBooking(): void {
    // Wired from the booking widget which only renders on private listings — guard for narrowing.
    if (this.listing.kind === 'boondocking') return;
    if (!this.booking.canBook) return;
    // Re-read myRv from storage at click time so the gate sees the latest
    // profile even if the user mutated it in another tab / via /account.
    this.myRv = readMyRv(this.platformId);
    this.booking.setMyRv(this.myRv);
    // Gate 1: complete rig profile required for ALL bookings (instant or not).
    if (!isMyRvComplete(this.myRv)) {
      const missing = myRvMissingFields(this.myRv);
      const label = missing.length === 1
        ? missing[0]
        : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];
      this.toasts.info(`Add your ${label} to book this stay.`);
      this.router.navigate(['/account'], {
        fragment: 'rig',
        queryParams: { returnTo: this.router.url },
      });
      return;
    }
    // Gate 2: non-Instant-Book listings additionally need RV + plate photos.
    if (!this.listing.instantBook && !this.booking.hasPhotosForBooking) {
      this.rvPhotosOpen = true;
      return;
    }
    this.proceedToReview();
  }

  /** Modal saved photos → persist to MyRv profile, close, continue to /booking/review. */
  onRvPhotosSaved(next: IMyRv): void {
    this.onMyRvChange(next);
    this.rvPhotosOpen = false;
    this.proceedToReview();
  }

  private proceedToReview(): void {
    const params = this.booking.serializeToParams();
    const reviewQuery: Record<string, string | number> = {
      listingId: this.listing.id,
      guests: this.booking.guestCount,
    };
    if (params.start) reviewQuery['start'] = params.start;
    if (params.end) reviewQuery['end'] = params.end;
    if (this.booking.selectedAddOns.size > 0) {
      reviewQuery['addOns'] = [...this.booking.selectedAddOns].join(',');
    }
    if (!this.auth.currentUser) {
      const queryString = Object.entries(reviewQuery)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');
      this.router.navigate(['/signin'], {
        queryParams: { returnTo: `/booking/review?${queryString}` },
      });
      return;
    }
    this.router.navigate(['/booking/review'], { queryParams: reviewQuery });
  }

  onMobileReserveClick(): void {
    if (this.booking.canBook) {
      this.requestBooking();
      return;
    }
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.booking.showCalendar = true;
  }

  toggleRules(): void { this.rulesOpen = !this.rulesOpen; }
  toggleCancellation(): void { this.cancellationOpen = !this.cancellationOpen; }

  // ---- Lightbox trigger ----
  openLightbox(index: number): void {
    this.lightboxStartIndex = index;
    this.lightboxOpen = true;
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    this.bookingChangedSub?.unsubscribe();
    this.reviewsSub?.unsubscribe();
    this.plansSub?.unsubscribe();
    this.seo.setStructuredData(null);
  }

  scrollToAnchor(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeAnchor = id;
  }
}
