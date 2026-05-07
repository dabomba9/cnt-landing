import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule, DateRange } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';
import { NavbarComponent } from '../navbar/navbar.component';
import { SearchMapComponent } from './search-map.component';
import { SeoService } from '../seo.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  MOCK_LISTINGS, Listing, Category, CATEGORY_META,
  Amenity, AMENITY_LABELS, AMENITY_GROUP, RV_TYPES, RvType, PRICE_RANGE,
} from './mock-listings.data';
import { readMyRv, writeMyRv } from '../my-rv.util';
import { ListingCardComponent } from '../listing-card/listing-card.component';

type FilterPill = 'dates' | 'price' | 'rv' | 'amenities' | 'sort' | null;

/** Query-string shape for /search. All fields optional; values arrive as strings from Angular Router. */
export interface SearchQueryParams {
  mode?: 'destination' | 'roadtrip';
  dest?: string;
  start?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  rigType?: RvType | string;
  rigLength?: string;
  rigSlideOuts?: string;
  rigTowing?: string;
}

export type SortOption = 'recommended' | 'instant-book' | 'top-rated' | 'most-reviewed' | 'price-asc' | 'price-desc' | 'nearest';

export const SORT_OPTIONS: { id: SortOption; label: string; icon: string }[] = [
  { id: 'recommended',   label: 'Recommended',    icon: 'auto_awesome' },
  { id: 'instant-book',  label: 'Instant Book',   icon: 'bolt' },
  { id: 'top-rated',     label: 'Top Rated',      icon: 'star' },
  { id: 'most-reviewed', label: 'Most Reviewed',  icon: 'reviews' },
  { id: 'price-asc',     label: 'Lowest Price',   icon: 'arrow_upward' },
  { id: 'price-desc',    label: 'Highest Price',  icon: 'arrow_downward' },
  { id: 'nearest',       label: 'Nearest',        icon: 'near_me' },
];

@Component({
  selector: 'cnt-workspace-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDatepickerModule, MatNativeDateModule, RouterLink, CinematicRollDirective, NavbarComponent, ListingCardComponent, SearchMapComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.css',
})
export class SearchResultsComponent implements OnInit, AfterViewInit, OnDestroy {
  searchParams: SearchQueryParams = {};
  private scrollTriggers: ScrollTrigger[] = [];

  // Listings
  listings = MOCK_LISTINGS;
  hoveredId: number | null = null;
  selectedId: number | null = null;
  /** Map viewport bounds; when set, listings are filtered to those within view. */
  mapBounds: { north: number; south: number; east: number; west: number } | null = null;
  favorites = new Set<number>();
  private readonly FAV_KEY = 'cnt-favorites';
  CATEGORY_META = CATEGORY_META;

  // Filter constants exposed to template
  AMENITY_GROUP = AMENITY_GROUP;
  AMENITY_LABELS = AMENITY_LABELS;
  RV_TYPES = RV_TYPES;

  // Filter UI state
  openPill: FilterPill = null;
  showMobileMap = false;
  viewMode: 'split' | 'map-only' = 'split';
  private readonly VIEW_MODE_KEY = 'cnt-search-view-mode';
  private readonly MOBILE_MAP_KEY = 'cnt-search-mobile-map';

  // Sort
  SORT_OPTIONS = SORT_OPTIONS;
  sortBy: SortOption = 'recommended';
  userLocation: { lat: number; lng: number } | null = null;
  geoLocating = false;
  geoError = '';

  // Filter values
  filters = {
    minPrice: PRICE_RANGE.min,
    maxPrice: PRICE_RANGE.max,
    rvType: null as RvType | null,
    rvLength: '',
    rvHeight: '',
    rvWidth: '',
    rvVehicles: 0,
    rvTents: 0,
    amenities: new Set<Amenity>(),
  };

  // Date range state (mirrors home-hero)
  readonly today = new Date();
  selectedDateRange: DateRange<Date> | null = null;

  PRICE_RANGE = PRICE_RANGE;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Search RV Spots & Campsites | CurbNTurf',
      description: 'Browse hundreds of unique private RV spots across the US. Filter by state, amenities, and hookups. Book directly with hosts — no membership fees.',
      url: '/search',
    });
    this.hydrateMyRv();
    this.route.queryParams.subscribe(params => {
      this.searchParams = params;
      // Hydrate date range from query params (e.g. arriving from home page)
      if (params['startDate']) {
        const start = new Date(params['startDate']);
        const end = params['endDate'] ? new Date(params['endDate']) : null;
        if (!isNaN(start.getTime())) {
          this.selectedDateRange = new DateRange(start, end && !isNaN(end.getTime()) ? end : null);
        }
      }
    });
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem(this.FAV_KEY);
      if (raw) {
        try { this.favorites = new Set(JSON.parse(raw) as number[]); } catch {}
      }
      // Restore last view-mode + mobile-map preference so the layout persists across visits.
      const vm = localStorage.getItem(this.VIEW_MODE_KEY);
      if (vm === 'split' || vm === 'map-only') this.viewMode = vm;
      this.showMobileMap = localStorage.getItem(this.MOBILE_MAP_KEY) === '1';
    }
  }

  isFavorite(id: number): boolean {
    return this.favorites.has(id);
  }

  toggleFavorite(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.setFavorite(id, !this.favorites.has(id));
  }

  /** Toggle handler for the map popup heart (already optimistically updated in the popup). */
  onMapFavoriteToggle(payload: { id: number; next: boolean }): void {
    this.setFavorite(payload.id, payload.next);
  }

  private setFavorite(id: number, next: boolean): void {
    if (next) this.favorites.add(id);
    else this.favorites.delete(id);
    // Make the Set reference change so child components re-evaluate when needed.
    this.favorites = new Set(this.favorites);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.FAV_KEY, JSON.stringify([...this.favorites]));
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.registerPlugin(ScrollTrigger);
    this.initEntrance();
  }

  private initEntrance(): void {
    gsap.from('.search-topbar', { y: -16, opacity: 0, duration: 0.6, ease: 'power3.out' });
    gsap.fromTo('.listing-card',
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.04, delay: 0.2 }
    );
  }

  // ============ Computed ============

  /** Listings that pass every filter except the map viewport — used for map pins. */
  get pinListings(): Listing[] {
    return this.listings.filter(l => this.passesNonViewportFilters(l));
  }

  /** True if listing passes all non-viewport filters (price, amenities, dates, RV, etc.). */
  private passesNonViewportFilters(l: Listing): boolean {
    if (l.price < this.filters.minPrice || l.price > this.filters.maxPrice) return false;
    if (this.filters.amenities.size > 0) {
      for (const a of this.filters.amenities) if (!l.amenities.includes(a)) return false;
    }
    if (this.selectedDateRange?.start) {
      const dayHash = Math.floor(this.selectedDateRange.start.getTime() / 86_400_000);
      if (((l.id * 31) + dayHash) % 100 >= 85) return false;
    }
    const bigRigs: RvType[] = ['class-a', 'fifth-wheel'];
    if (this.filters.rvType && bigRigs.includes(this.filters.rvType) && !l.amenities.includes('pull-through')) return false;
    const len = this.filters.rvLength ? parseInt(this.filters.rvLength, 10) : 0;
    if (len >= 40 && !l.amenities.includes('pull-through')) return false;
    if (this.filters.rvVehicles > 0 && !l.amenities.includes('vehicles-allowed')) return false;
    if (this.filters.rvTents > 0 && !l.amenities.includes('tents-allowed')) return false;
    return true;
  }

  get filteredListings(): Listing[] {
    const filtered = this.listings.filter(l => {
      // Map viewport — only listings whose pin is currently visible on the map
      if (this.mapBounds) {
        const b = this.mapBounds;
        if (l.lat > b.north || l.lat < b.south) return false;
        if (b.west <= b.east) {
          if (l.lng < b.west || l.lng > b.east) return false;
        } else {
          if (l.lng < b.west && l.lng > b.east) return false;
        }
      }

      // Price
      if (l.price < this.filters.minPrice || l.price > this.filters.maxPrice) return false;

      // Amenities (must include all selected)
      if (this.filters.amenities.size > 0) {
        for (const a of this.filters.amenities) if (!l.amenities.includes(a)) return false;
      }

      // Dates — mock availability check (~85% available, stable per (listing, date)).
      // In production this would query real booking availability.
      if (this.selectedDateRange?.start) {
        const dayHash = Math.floor(this.selectedDateRange.start.getTime() / 86_400_000);
        if (((l.id * 31) + dayHash) % 100 >= 85) return false;
      }

      // RV type — large rigs need pull-through access
      const bigRigs: RvType[] = ['class-a', 'fifth-wheel'];
      if (this.filters.rvType && bigRigs.includes(this.filters.rvType) && !l.amenities.includes('pull-through')) {
        return false;
      }

      // RV length — anything 40+ ft needs pull-through
      const len = this.filters.rvLength ? parseInt(this.filters.rvLength, 10) : 0;
      if (len >= 40 && !l.amenities.includes('pull-through')) return false;

      // Extra vehicles must be allowed at the site
      if (this.filters.rvVehicles > 0 && !l.amenities.includes('vehicles-allowed')) return false;

      // Tents must be allowed at the site
      if (this.filters.rvTents > 0 && !l.amenities.includes('tents-allowed')) return false;

      return true;
    });
    return this.applySort(filtered);
  }

  private applySort(items: Listing[]): Listing[] {
    const list = [...items];
    switch (this.sortBy) {
      case 'instant-book':  list.sort((a, b) => Number(b.instantBook) - Number(a.instantBook)); break;
      case 'top-rated':     list.sort((a, b) => b.rating - a.rating); break;
      case 'most-reviewed': list.sort((a, b) => b.reviewCount - a.reviewCount); break;
      case 'price-asc':     list.sort((a, b) => a.price - b.price); break;
      case 'price-desc':    list.sort((a, b) => b.price - a.price); break;
      case 'nearest':       if (this.userLocation) list.sort((a, b) => this.distance(a) - this.distance(b)); break;
      case 'recommended':
      default:              break;
    }
    // Hoist the selected listing (from a marker click) to the top so it's the first card.
    if (this.selectedId != null) {
      const idx = list.findIndex(l => l.id === this.selectedId);
      if (idx > 0) {
        const [picked] = list.splice(idx, 1);
        list.unshift(picked);
      }
    }
    return list;
  }

  private distance(l: Listing): number {
    if (!this.userLocation) return 0;
    const dLat = l.lat - this.userLocation.lat;
    const dLng = l.lng - this.userLocation.lng;
    return dLat * dLat + dLng * dLng; // squared euclidean — sufficient for ranking
  }

  /** Number of nights between selectedDateRange start/end, or 0 when not fully set. */
  get searchNights(): number {
    const r = this.selectedDateRange;
    if (!r?.start || !r?.end) return 0;
    const ms = r.end.getTime() - r.start.getTime();
    return Math.max(1, Math.round(ms / 86_400_000));
  }

  get currentSortLabel(): string {
    return SORT_OPTIONS.find(o => o.id === this.sortBy)?.label || 'Sort';
  }

  /** True when any user-applied filter (price/dates/RV/amenities/sort) differs from defaults. */
  get hasActiveFilters(): boolean {
    const f = this.filters;
    return f.minPrice !== PRICE_RANGE.min
      || f.maxPrice !== PRICE_RANGE.max
      || !!f.rvType
      || !!f.rvLength
      || !!f.rvHeight
      || !!f.rvWidth
      || f.rvVehicles > 0
      || f.rvTents > 0
      || f.amenities.size > 0
      || !!this.selectedDateRange?.start
      || this.sortBy !== 'recommended';
  }

  /** Identify the filter most likely cutting results, surfaced in the empty state. */
  get mostRestrictiveFilter(): { key: 'price' | 'amenities' | 'rv' | 'dates' | 'sort'; label: string } | null {
    if (!this.hasActiveFilters) return null;
    if (this.filters.amenities.size > 0) return { key: 'amenities', label: 'Amenities' };
    if (this.filters.minPrice !== PRICE_RANGE.min || this.filters.maxPrice !== PRICE_RANGE.max) return { key: 'price', label: 'Price range' };
    if (this.filters.rvType || this.filters.rvLength || this.filters.rvHeight || this.filters.rvWidth || this.filters.rvVehicles || this.filters.rvTents) {
      return { key: 'rv', label: 'My RV' };
    }
    if (this.selectedDateRange?.start) return { key: 'dates', label: 'Trip dates' };
    return null;
  }

  clearAllFilters(): void {
    this.filters.minPrice = PRICE_RANGE.min;
    this.filters.maxPrice = PRICE_RANGE.max;
    this.filters.rvType = null;
    this.filters.rvLength = '';
    this.filters.rvHeight = '';
    this.filters.rvWidth = '';
    this.filters.rvVehicles = 0;
    this.filters.rvTents = 0;
    this.filters.amenities = new Set();
    this.selectedDateRange = null;
    this.sortBy = 'recommended';
    this.persistMyRv();
  }

  clearOneFilter(key: 'price' | 'amenities' | 'rv' | 'dates' | 'sort'): void {
    switch (key) {
      case 'price': this.clearPrice(); break;
      case 'amenities': this.clearAmenities(); break;
      case 'rv': this.clearRvSetup(); break;
      case 'dates': this.clearDates(); break;
      case 'sort': this.clearSort(); break;
    }
  }

  clearSort(): void {
    this.sortBy = 'recommended';
  }

  selectSort(id: SortOption): void {
    if (id === 'nearest' && !this.userLocation) {
      this.requestGeolocation(() => {
        this.sortBy = 'nearest';
        this.closePill();
      });
      return;
    }
    this.sortBy = id;
    this.closePill();
  }

  /** Re-request geolocation after a permission denial — used by the "Try again"
   * button shown alongside the geo error in the Sort drawer. Stays open so the
   * user can immediately see the result. */
  retryNearestSort(): void {
    this.geoError = '';
    this.requestGeolocation(() => {
      this.sortBy = 'nearest';
      this.closePill();
    });
  }

  private requestGeolocation(onSuccess: () => void): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      this.geoError = 'Geolocation not available in this browser.';
      return;
    }
    this.geoLocating = true;
    this.geoError = '';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.geoLocating = false;
        onSuccess();
      },
      (err) => {
        this.geoLocating = false;
        this.geoError = err.code === err.PERMISSION_DENIED
          ? 'Location permission denied.'
          : 'Could not determine your location.';
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  get resultCountLabel(): string {
    const n = this.filteredListings.length;
    return `${n} stay${n !== 1 ? 's' : ''} found`;
  }

  get headerTitle(): string {
    if (this.searchParams.mode === 'roadtrip') return 'Roadtrip Route';
    if (this.searchParams.dest) return `Stays near ${this.searchParams.dest}`;
    if (this.searchParams.state) {
      return `Stays in ${this.searchParams.state.split('-')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
    }
    return 'Curated Collection';
  }

  /** Compact amenities label for the pill: first amenity name + "+N more" suffix. */
  get amenitiesSummary(): string {
    const set = this.filters.amenities;
    if (set.size === 0) return '';
    const [first] = set;
    const firstLabel = AMENITY_LABELS[first as Amenity] ?? '1 selected';
    return set.size === 1 ? firstLabel : `${firstLabel} +${set.size - 1}`;
  }

  // Active filter chips for top bar summary
  get activePillSummary() {
    const f = this.filters;
    const rvActive = !!(f.rvType || f.rvLength || f.rvHeight || f.rvWidth || f.rvVehicles || f.rvTents);
    return {
      dates: this.dateDisplayText !== 'Add dates' ? this.dateDisplayText : '',
      price: (f.minPrice !== PRICE_RANGE.min || f.maxPrice !== PRICE_RANGE.max)
        ? `$${f.minPrice} – $${f.maxPrice}` : '',
      rv: rvActive
        ? (f.rvType ? RV_TYPES.find(r => r.id === f.rvType)?.label || 'Set' : 'Set')
        : '',
      amenities: this.amenitiesSummary,
    };
  }

  // Mirrors home-hero.dateDisplayText
  get dateDisplayText(): string {
    if (!this.selectedDateRange || !this.selectedDateRange.start) return 'Add dates';
    const startStr = this.selectedDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!this.selectedDateRange.end) return startStr;
    const endStr = this.selectedDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} – ${endStr}`;
  }

  // Mirrors home-hero.onDateSelected
  onDateSelected(date: Date): void {
    if (!this.selectedDateRange || !this.selectedDateRange.start || (this.selectedDateRange.start && this.selectedDateRange.end)) {
      this.selectedDateRange = new DateRange(date, null);
    } else if (date < this.selectedDateRange.start) {
      this.selectedDateRange = new DateRange(date, null);
    } else {
      this.selectedDateRange = new DateRange(this.selectedDateRange.start, date);
      setTimeout(() => this.closePill(), 250);
    }
  }

  // ============ Filter actions ============

  togglePill(pill: FilterPill): void {
    this.openPill = this.openPill === pill ? null : pill;
  }

  closePill(): void {
    this.openPill = null;
  }

  toggleAmenity(a: Amenity): void {
    if (this.filters.amenities.has(a)) this.filters.amenities.delete(a);
    else this.filters.amenities.add(a);
  }

  isAmenitySelected(a: Amenity): boolean {
    return this.filters.amenities.has(a);
  }

  clearAmenities(): void {
    this.filters.amenities = new Set();
  }

  selectRvType(t: RvType): void {
    this.filters.rvType = this.filters.rvType === t ? null : t;
    this.persistMyRv();
  }

  clearRvSetup(): void {
    this.filters.rvType = null;
    this.filters.rvLength = '';
    this.filters.rvHeight = '';
    this.filters.rvWidth = '';
    this.filters.rvVehicles = 0;
    this.filters.rvTents = 0;
    this.persistMyRv();
  }

  /** Called when length/height/width inputs change (template binding). */
  onRvDimensionChange(): void { this.persistMyRv(); }

  private persistMyRv(): void {
    const num = (s: string): number | null => {
      const n = parseInt(s, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    // Preserve any existing photos so editing rig specs doesn't drop them.
    const existing = readMyRv(this.platformId);
    writeMyRv(this.platformId, {
      type: this.filters.rvType,
      length: num(this.filters.rvLength),
      height: num(this.filters.rvHeight),
      width:  num(this.filters.rvWidth),
      rvPhoto: existing.rvPhoto,
      licensePhoto: existing.licensePhoto,
    });
  }

  private hydrateMyRv(): void {
    const rv = readMyRv(this.platformId);
    if (rv.type)   this.filters.rvType = rv.type;
    if (rv.length) this.filters.rvLength = String(rv.length);
    if (rv.height) this.filters.rvHeight = String(rv.height);
    if (rv.width)  this.filters.rvWidth  = String(rv.width);
  }

  clearDates(): void {
    this.selectedDateRange = null;
  }

  clearPrice(): void {
    this.filters.minPrice = PRICE_RANGE.min;
    this.filters.maxPrice = PRICE_RANGE.max;
  }

  step(field: 'rvVehicles' | 'rvTents', delta: number): void {
    this.filters[field] = Math.max(0, this.filters[field] + delta);
  }

  // ============ Card / map sync ============

  onCardHover(id: number | null): void {
    this.hoveredId = id;
  }

  onCardClick(id: number): void {
    this.router.navigate(['/listing'], { queryParams: { id } });
  }

  /** Marker click: hoist the listing to top of the list, scroll list to top, map opens its popup. */
  onMarkerClick(id: number): void {
    this.selectedId = id;
    this.hoveredId = id;
    if (!isPlatformBrowser(this.platformId)) return;
    // Selected card is now at index 0 thanks to applySort hoisting; scroll the list section to top.
    setTimeout(() => {
      const list = document.querySelector('.search-list') as HTMLElement | null;
      if (list) list.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }

  /** Leaflet popup closed — clear the selection so the ring goes away too. */
  onPopupClosed(): void {
    this.selectedId = null;
  }

  /** Map bounds changed — re-filter the list. */
  onMapBoundsChange(bounds: { north: number; south: number; east: number; west: number }): void {
    this.mapBounds = bounds;
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLElement;
    img.classList.add('img-loaded');
  }

  toggleMobileMap(): void {
    this.showMobileMap = !this.showMobileMap;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.MOBILE_MAP_KEY, this.showMobileMap ? '1' : '0');
    }
  }

  setViewMode(mode: 'split' | 'map-only'): void {
    this.viewMode = mode;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.VIEW_MODE_KEY, mode);
    }
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
  }
}
