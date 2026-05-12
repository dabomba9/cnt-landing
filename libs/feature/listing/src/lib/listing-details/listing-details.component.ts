import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
} from '@cnt-workspace/data-access';
import { IMyRv, emptyMyRv, readMyRv, writeMyRv, isMyRvSet, rvTypeLabel } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';
import { BookingStateService } from './booking-state.service';
import { AuthService, ReviewService, IUserReview } from '@cnt-workspace/data-access';
import { ListingPhotoLightboxComponent } from './photo-lightbox/listing-photo-lightbox.component';
import { ListingBookingWidgetComponent } from './booking-widget/listing-booking-widget.component';
import { ListingMobileBookingBarComponent } from './mobile-booking-bar/listing-mobile-booking-bar.component';
import { RvPhotosModalComponent } from './rv-photos-modal/rv-photos-modal.component';
import { ListingCardComponent } from '@cnt-workspace/ui';
import { ReviewCardComponent } from '@cnt-workspace/ui';
import { AccordionCardComponent } from '@cnt-workspace/ui';

@Component({
  selector: 'cnt-workspace-listing-details',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective,
    ListingPhotoLightboxComponent, ListingBookingWidgetComponent, ListingMobileBookingBarComponent,
    ListingCardComponent, ReviewCardComponent, AccordionCardComponent, RvPhotosModalComponent,
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

  // Favorite state (mirrors /search behavior)
  favorited = false;
  private readonly FAV_KEY = 'cnt-favorites';
  private favoriteSet = new Set<number>();

  // Content section state
  rulesOpen = false;
  cancellationOpen = false;

  // Lightbox state
  lightboxOpen = false;
  lightboxStartIndex = 0;

  // My RV (from /search settings, persisted in localStorage)
  myRv: IMyRv = emptyMyRv();

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

  // Scroll-direction reveal/hide for the sticky section nav (Airbnb pattern)
  navHidden = false;
  private lastScrollY = 0;
  private lastScrollTime = 0;
  private readonly SCROLL_THRESHOLD = 24;
  private readonly SCROLL_DEBOUNCE_MS = 80;
  private readonly REVEAL_TOP_PX = 200;

  /** True once user has scrolled past the hero photo block (~600px in). */
  stickyTitleVisible = false;
  private readonly STICKY_TITLE_THRESHOLD = 600;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const y = window.scrollY;
    const now = performance.now();
    this.stickyTitleVisible = y > this.STICKY_TITLE_THRESHOLD;
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

  /** Up to 3 listings in the same category as the current one, excluding self. */
  get similarListings(): IListing[] {
    return MOCK_LISTINGS
      .filter(l => l.category === this.listing.category && l.id !== this.listing.id)
      .slice(0, 3);
  }

  /** Up to 3 other listings hosted by the same host (matched by name), excluding self. */
  get hostListings(): IListing[] {
    const hostName = this.detail.host.name;
    return MOCK_LISTINGS
      .filter(l => l.id !== this.listing.id && getListingDetail(l).host.name === hostName)
      .slice(0, 3);
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

  /** Map a UserReview into the listing's Review shape so the UI doesn't branch. */
  private userReviewAsReview(r: IUserReview): typeof this.detail.reviews[number] {
    const d = new Date(r.createdAt);
    const dateLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return {
      authorName: r.authorName,
      authorInitials: r.authorInitials,
      date: dateLabel,
      rating: r.rating,
      text: r.text || '(No comment)',
    };
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
  ) {}

  private currentListingId = -1;

  ngOnInit(): void {
    // Subscribe once: any service mutation pushes URL state
    this.bookingChangedSub = this.booking.changed.subscribe(() => this.syncBookingToUrl());

    // Hydrate from ?id, fall back to first listing if missing/invalid
    this.route.queryParams.subscribe(params => {
      const id = parseInt(params['id'], 10);
      const found = MOCK_LISTINGS.find(l => l.id === id);
      const newListing = found || MOCK_LISTINGS[0];

      // Only reset listing-scoped state when the listing actually changes
      if (newListing.id !== this.currentListingId) {
        this.listing = newListing;
        this.detail = getListingDetail(this.listing);
        this.booking.setListing(this.listing, this.detail);
        this.myRv = readMyRv(this.platformId);
        this.booking.setMyRv(this.myRv);
        this.currentListingId = newListing.id;

        this.reviewsSub?.unsubscribe();
        this.reviewsSub = this.reviewSvc.reviews$.subscribe(all => {
          this.userReviews = all.filter(r => r.listingId === this.currentListingId);
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
      priceRange: `$${this.listing.price}`,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: this.listing.rating.toFixed(2),
        reviewCount: this.listing.reviewCount,
        bestRating: '5',
        worstRating: '1',
      },
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
    if (!isPlatformBrowser(this.platformId)) {
      this.favoriteSet = new Set();
      this.favorited = false;
      return;
    }
    const raw = localStorage.getItem(this.FAV_KEY);
    try {
      this.favoriteSet = new Set(raw ? (JSON.parse(raw) as number[]) : []);
    } catch {
      this.favoriteSet = new Set();
    }
    this.favorited = this.favoriteSet.has(this.listing.id);
  }

  toggleFavorite(event: MouseEvent): void {
    event.stopPropagation();
    this.toggleListingFavorite(this.listing.id, event);
    this.favorited = this.favoriteSet.has(this.listing.id);
  }

  isListingFavorite(id: number): boolean {
    return this.favoriteSet.has(id);
  }

  toggleListingFavorite(id: number, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.favoriteSet.has(id)) this.favoriteSet.delete(id);
    else this.favoriteSet.add(id);
    if (id === this.listing?.id) this.favorited = this.favoriteSet.has(id);
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.FAV_KEY, JSON.stringify([...this.favoriteSet]));
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

  requestBooking(): void {
    if (!this.booking.canBook) return;
    // Gate: non-Instant-Book listings need the user's RV + license-plate photos.
    // If they're missing, open the photos modal first; on success it'll re-fire requestBooking.
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
    this.seo.setStructuredData(null);
  }

  scrollToAnchor(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeAnchor = id;
  }
}
