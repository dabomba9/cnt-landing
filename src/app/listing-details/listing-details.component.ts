import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';
import { MagneticBtnDirective } from '../directives/magnetic-btn.directive';
import { SeoService } from '../seo.service';
import {
  MOCK_LISTINGS, Listing, CATEGORY_META, AMENITY_LABELS, AMENITY_ICONS,
  ListingDetail, getListingDetail, CANCELLATION_TIER_META,
  TRUST_BADGE_META, NEARBY_META,
  PAD_TYPE_META, LEVELING_META, SEWER_META, CLEARANCE_META,
} from '../search-results/mock-listings.data';
import { MyRv, emptyMyRv, readMyRv, isMyRvSet, rvTypeLabel } from '../my-rv.util';
import { gsap } from 'gsap';
import { BookingStateService } from './booking-state.service';
import { ListingPhotoLightboxComponent } from './photo-lightbox/listing-photo-lightbox.component';
import { ListingBookingWidgetComponent } from './booking-widget/listing-booking-widget.component';
import { ListingMobileBookingBarComponent } from './mobile-booking-bar/listing-mobile-booking-bar.component';
import { ListingCardComponent } from '../listing-card/listing-card.component';

@Component({
  selector: 'cnt-workspace-listing-details',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective,
    ListingPhotoLightboxComponent, ListingBookingWidgetComponent, ListingMobileBookingBarComponent,
    ListingCardComponent,
  ],
  providers: [BookingStateService],
  templateUrl: './listing-details.component.html',
  styleUrl: './listing-details.component.scss',
})
export class ListingDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  listing!: Listing;
  detail!: ListingDetail;
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
  myRv: MyRv = emptyMyRv();

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
  private bookingChangedSub?: { unsubscribe: () => void };

  /** Up to 3 listings in the same category as the current one, excluding self. */
  get similarListings(): Listing[] {
    return MOCK_LISTINGS
      .filter(l => l.category === this.listing.category && l.id !== this.listing.id)
      .slice(0, 3);
  }

  /** Up to 3 other listings hosted by the same host (matched by name), excluding self. */
  get hostListings(): Listing[] {
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

  /** Reviews sorted by current sort key (returns a stable copy — does not mutate detail.reviews). */
  get sortedReviews(): typeof this.detail.reviews {
    const reviews = [...this.detail.reviews];
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
    public booking: BookingStateService,
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
        this.currentListingId = newListing.id;

        const heroImage = this.seo.absUrl(this.detail.photos[0]);
        this.seo.update({
          title: `${this.listing.title} — ${this.listing.location} | CurbNTurf`,
          description: this.detail.description.slice(0, 160),
          url: `/listing?id=${this.listing.id}`,
          image: heroImage,
          type: 'website',
        });
        this.seo.setStructuredData(this.buildListingJsonLd(heroImage));

        this.hydrateFavorite();
      }

      // Always reconcile booking state with URL (idempotent)
      this.booking.hydrateFromParams(params);
    });
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
    if ((navigator as any).share) {
      (navigator as any).share({
        title: this.listing.title,
        text: `${this.listing.title} — ${this.listing.location}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {/* could toast */}).catch(() => {});
    }
  }

  requestBooking(): void {
    if (!this.booking.canBook) return;
    this.router.navigate(['/contact'], {
      queryParams: {
        reason: 'guest-support',
        listingId: this.listing.id,
        listingTitle: this.listing.title,
        nights: this.booking.nights,
        guests: this.booking.guestCount,
      },
    });
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
    this.seo.setStructuredData(null);
  }

  scrollToAnchor(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeAnchor = id;
  }
}
