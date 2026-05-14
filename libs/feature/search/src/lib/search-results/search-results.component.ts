import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule, DateRange } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CinematicRollDirective } from '@cnt-workspace/ui';
import { NavbarComponent } from '@cnt-workspace/ui';
import { SearchMapComponent } from './search-map.component';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  MOCK_LISTINGS, IListing, Category, CATEGORY_META,
  Amenity, AMENITY_LABELS, AMENITY_GROUP, RV_TYPES, RvType, PRICE_RANGE,
} from '@cnt-workspace/data-access';
import { readMyRv, writeMyRv } from '@cnt-workspace/data-access';
import { readFavoriteIds, addFavorite, removeFavorite } from '@cnt-workspace/data-access';
import { ListingCardComponent } from '@cnt-workspace/ui';

type FilterPill = 'dates' | 'price' | 'rv' | 'amenities' | 'sort' | null;

/** Query-string shape for /search. All fields optional; values arrive as strings from Angular Router. */
export interface ISearchQueryParams {
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
  searchParams: ISearchQueryParams = {};
  private scrollTriggers: ScrollTrigger[] = [];

  // Listings
  listings = MOCK_LISTINGS;
  hoveredId: number | null = null;
  selectedId: number | null = null;
  /** Map viewport bounds; when set, listings are filtered to those within view. */
  mapBounds: { north: number; south: number; east: number; west: number } | null = null;
  favorites = new Set<number>();
  CATEGORY_META = CATEGORY_META;

  // Filter constants exposed to template
  AMENITY_GROUP = AMENITY_GROUP;
  AMENITY_LABELS = AMENITY_LABELS;
  RV_TYPES = RV_TYPES;

  // Filter UI state
  openPill: FilterPill = null;
  allFiltersOpen = false;
  toggleAllFilters(): void { this.allFiltersOpen = !this.allFiltersOpen; }
  closeAllFilters(): void { this.allFiltersOpen = false; }
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

  /** Listing IDs to restrict to (set via ?ids= query param from /wishlists). null = no restriction. */
  pinnedIds: Set<number> | null = null;

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
    guests: 0,
    instantBookOnly: false,
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
    this.hydrateFiltersFromUrl();
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
      // Wishlists deep-link: filter to a specific set of listing IDs.
      const idsParam = params['ids'];
      if (typeof idsParam === 'string' && idsParam.length > 0) {
        const ids = idsParam.split(',').map(s => parseInt(s, 10)).filter(n => Number.isFinite(n));
        this.pinnedIds = ids.length > 0 ? new Set(ids) : null;
      } else {
        this.pinnedIds = null;
      }
    });
    this.favorites = readFavoriteIds(this.platformId);
    if (isPlatformBrowser(this.platformId)) {
      // Restore last view-mode + mobile-map preference so the layout persists across visits.
      const vm = localStorage.getItem(this.VIEW_MODE_KEY);
      if (vm === 'split' || vm === 'map-only') this.viewMode = vm;
      // ?view=map (e.g., from the home Explore Map CTA) overrides persisted preference.
      const viewParam = this.route.snapshot.queryParamMap.get('view');
      if (viewParam === 'map') this.viewMode = 'map-only';
      else if (viewParam === 'list' || viewParam === 'split') this.viewMode = 'split';
      this.showMobileMap = localStorage.getItem(this.MOBILE_MAP_KEY) === '1';
    }
  }

  isFavorite(id: number): boolean {
    return this.favorites.has(id);
  }

  /** True when /search was deep-linked from /wishlists with ?ids=... */
  get wishlistMode(): boolean { return this.pinnedIds !== null && this.pinnedIds.size > 0; }
  /** Count of listings pinned by ?ids=... — drives the banner copy. */
  get pinnedCount(): number { return this.pinnedIds?.size ?? 0; }

  /** Drop the ?ids= filter and show full results again. */
  clearWishlistFilter(): void {
    this.pinnedIds = null;
    this.router.navigate([], { relativeTo: this.route, queryParams: { ids: null }, queryParamsHandling: 'merge', replaceUrl: true });
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
    if (next) {
      addFavorite(this.platformId, id);
      this.favorites.add(id);
    } else {
      removeFavorite(this.platformId, id);
      this.favorites.delete(id);
    }
    // Make the Set reference change so child components re-evaluate when needed.
    this.favorites = new Set(this.favorites);
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
  get pinListings(): IListing[] {
    return this.listings.filter(l => this.passesNonViewportFilters(l));
  }

  /** Mirrors `getListingDetail.maxGuests` formula so we can filter without the full detail. */
  private listingMaxGuests(l: IListing): number {
    return 2 + ((l.id * 5) % 5);
  }

  /** True if listing passes all non-viewport filters (price, amenities, dates, RV, etc.). */
  private passesNonViewportFilters(l: IListing): boolean {
    if (this.pinnedIds && !this.pinnedIds.has(l.id)) return false;
    if (this.filters.instantBookOnly && !l.instantBook) return false;
    if (this.filters.guests > 0 && this.listingMaxGuests(l) < this.filters.guests) return false;
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

  get filteredListings(): IListing[] {
    const filtered = this.listings.filter(l => {
      if (this.mapBounds) {
        const b = this.mapBounds;
        if (l.lat > b.north || l.lat < b.south) return false;
        if (b.west <= b.east) {
          if (l.lng < b.west || l.lng > b.east) return false;
        } else {
          if (l.lng < b.west && l.lng > b.east) return false;
        }
      }
      return this.passesNonViewportFilters(l);
    });
    return this.applySort(filtered);
  }

  private applySort(items: IListing[]): IListing[] {
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

  private distance(l: IListing): number {
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
      || f.guests > 0
      || f.instantBookOnly
      || f.amenities.size > 0
      || !!this.selectedDateRange?.start
      || this.sortBy !== 'recommended';
  }

  /** Number of distinct active filters — surfaced as a count badge. */
  get activeFilterCount(): number {
    return this.activeFilterChips.length;
  }

  /** Inline chip strip below the pill bar — one chip per applied filter, dismissable. */
  get activeFilterChips(): { key: string; label: string; clear: () => void }[] {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (this.filters.instantBookOnly) {
      chips.push({ key: 'ib', label: 'Instant Book', clear: () => { this.filters.instantBookOnly = false; this.syncToUrl(); } });
    }
    if (this.filters.guests > 0) {
      const g = this.filters.guests;
      chips.push({ key: 'guests', label: `${g} guest${g === 1 ? '' : 's'}`, clear: () => { this.filters.guests = 0; this.syncToUrl(); } });
    }
    if (this.selectedDateRange?.start) {
      chips.push({ key: 'dates', label: this.dateDisplayText, clear: () => { this.clearDates(); this.syncToUrl(); } });
    }
    if (this.filters.minPrice !== PRICE_RANGE.min || this.filters.maxPrice !== PRICE_RANGE.max) {
      chips.push({ key: 'price', label: `$${this.filters.minPrice}–$${this.filters.maxPrice}`, clear: () => { this.clearPrice(); this.syncToUrl(); } });
    }
    if (this.filters.rvType) {
      const rv = RV_TYPES.find(t => t.id === this.filters.rvType);
      chips.push({ key: 'rvType', label: rv?.label || 'RV', clear: () => { this.filters.rvType = null; this.persistMyRv(); this.syncToUrl(); } });
    }
    if (this.filters.rvLength) {
      chips.push({ key: 'rvLength', label: `${this.filters.rvLength} ft long`, clear: () => { this.filters.rvLength = ''; this.persistMyRv(); this.syncToUrl(); } });
    }
    if (this.filters.rvHeight) {
      chips.push({ key: 'rvHeight', label: `${this.filters.rvHeight} ft tall`, clear: () => { this.filters.rvHeight = ''; this.persistMyRv(); this.syncToUrl(); } });
    }
    if (this.filters.rvWidth) {
      chips.push({ key: 'rvWidth', label: `${this.filters.rvWidth} ft wide`, clear: () => { this.filters.rvWidth = ''; this.persistMyRv(); this.syncToUrl(); } });
    }
    if (this.filters.rvVehicles > 0) {
      chips.push({ key: 'rvVehicles', label: `${this.filters.rvVehicles} vehicle${this.filters.rvVehicles === 1 ? '' : 's'}`, clear: () => { this.filters.rvVehicles = 0; this.syncToUrl(); } });
    }
    if (this.filters.rvTents > 0) {
      chips.push({ key: 'rvTents', label: `${this.filters.rvTents} tent${this.filters.rvTents === 1 ? '' : 's'}`, clear: () => { this.filters.rvTents = 0; this.syncToUrl(); } });
    }
    for (const a of this.filters.amenities) {
      chips.push({
        key: 'amenity-' + a,
        label: AMENITY_LABELS[a],
        clear: () => {
          const next = new Set(this.filters.amenities);
          next.delete(a);
          this.filters.amenities = next;
          this.syncToUrl();
        },
      });
    }
    if (this.sortBy !== 'recommended') {
      const opt = SORT_OPTIONS.find(o => o.id === this.sortBy);
      chips.push({ key: 'sort', label: opt?.label || 'Sort', clear: () => { this.sortBy = 'recommended'; this.syncToUrl(); } });
    }
    return chips;
  }

  togglePetsFilter(): void {
    if (this.filters.amenities.has('pets')) {
      const next = new Set(this.filters.amenities);
      next.delete('pets');
      this.filters.amenities = next;
    } else {
      this.filters.amenities = new Set([...this.filters.amenities, 'pets']);
    }
    this.syncToUrl();
  }

  toggleInstantBookFilter(): void {
    this.filters.instantBookOnly = !this.filters.instantBookOnly;
    this.syncToUrl();
  }

  setGuests(n: number): void {
    this.filters.guests = Math.max(0, n);
    this.syncToUrl();
  }

  stepGuests(delta: number): void {
    this.setGuests(this.filters.guests + delta);
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
    this.filters.guests = 0;
    this.filters.instantBookOnly = false;
    this.filters.amenities = new Set();
    this.selectedDateRange = null;
    this.sortBy = 'recommended';
    this.persistMyRv();
    this.syncToUrl();
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
    this.syncToUrl();
  }

  selectSort(id: SortOption): void {
    if (id === 'nearest' && !this.userLocation) {
      this.requestGeolocation(() => {
        this.sortBy = 'nearest';
        this.closePill();
        this.syncToUrl();
      });
      return;
    }
    this.sortBy = id;
    this.closePill();
    this.syncToUrl();
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
    this.syncToUrl();
  }

  // ============ Filter actions ============

  togglePill(pill: FilterPill): void {
    this.openPill = this.openPill === pill ? null : pill;
  }

  closePill(): void {
    this.openPill = null;
  }

  toggleAmenity(a: Amenity): void {
    const next = new Set(this.filters.amenities);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    this.filters.amenities = next;
    this.syncToUrl();
  }

  isAmenitySelected(a: Amenity): boolean {
    return this.filters.amenities.has(a);
  }

  clearAmenities(): void {
    this.filters.amenities = new Set();
    this.syncToUrl();
  }

  selectRvType(t: RvType): void {
    this.filters.rvType = this.filters.rvType === t ? null : t;
    this.persistMyRv();
    this.syncToUrl();
  }

  clearRvSetup(): void {
    this.filters.rvType = null;
    this.filters.rvLength = '';
    this.filters.rvHeight = '';
    this.filters.rvWidth = '';
    this.filters.rvVehicles = 0;
    this.filters.rvTents = 0;
    this.filters.guests = 0;
    this.persistMyRv();
    this.syncToUrl();
  }

  /** Called when length/height/width inputs change (template binding). */
  onRvDimensionChange(): void { this.persistMyRv(); this.syncToUrl(); }

  private persistMyRv(): void {
    const num = (s: string): number | null => {
      const n = parseInt(s, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    // Preserve any existing photos so editing rig specs doesn't drop them.
    const existing = readMyRv(this.platformId);
    writeMyRv(this.platformId, {
      ...existing,
      type: this.filters.rvType,
      length: num(this.filters.rvLength),
      height: num(this.filters.rvHeight),
      width:  num(this.filters.rvWidth),
    });
  }

  /** Hydrate filters from URL on first load — refresh-safe shareable links. */
  private hydrateFiltersFromUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    const sort = q.get('sort');
    if (sort && SORT_OPTIONS.some(o => o.id === sort)) this.sortBy = sort as SortOption;
    const min = parseInt(q.get('min') || '', 10);
    if (Number.isFinite(min)) this.filters.minPrice = min;
    const max = parseInt(q.get('max') || '', 10);
    if (Number.isFinite(max)) this.filters.maxPrice = max;
    const am = q.get('am');
    if (am) {
      for (const a of am.split(',')) {
        if ((AMENITY_GROUP as string[]).includes(a)) this.filters.amenities.add(a as Amenity);
      }
    }
    const rt = q.get('rt');
    if (rt && RV_TYPES.some(t => t.id === rt)) this.filters.rvType = rt as RvType;
    const rl = q.get('rl'); if (rl) this.filters.rvLength = rl;
    const rh = q.get('rh'); if (rh) this.filters.rvHeight = rh;
    const rw = q.get('rw'); if (rw) this.filters.rvWidth = rw;
    const rvh = parseInt(q.get('rvh') || '', 10); if (Number.isFinite(rvh) && rvh > 0) this.filters.rvVehicles = rvh;
    const rvt = parseInt(q.get('rvt') || '', 10); if (Number.isFinite(rvt) && rvt > 0) this.filters.rvTents = rvt;
    const g = parseInt(q.get('guests') || '', 10); if (Number.isFinite(g) && g > 0) this.filters.guests = g;
    if (q.get('ib') === '1') this.filters.instantBookOnly = true;
  }

  /** Push the current filter state to query params; replaceUrl so we don't pollute history. */
  syncToUrl(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const f = this.filters;
    const qp: Record<string, string | null> = {
      sort: this.sortBy !== 'recommended' ? this.sortBy : null,
      min: f.minPrice !== PRICE_RANGE.min ? String(f.minPrice) : null,
      max: f.maxPrice !== PRICE_RANGE.max ? String(f.maxPrice) : null,
      am: f.amenities.size ? [...f.amenities].join(',') : null,
      rt: f.rvType || null,
      rl: f.rvLength || null,
      rh: f.rvHeight || null,
      rw: f.rvWidth || null,
      rvh: f.rvVehicles > 0 ? String(f.rvVehicles) : null,
      rvt: f.rvTents > 0 ? String(f.rvTents) : null,
      guests: f.guests > 0 ? String(f.guests) : null,
      ib: f.instantBookOnly ? '1' : null,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
      replaceUrl: true,
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
    this.syncToUrl();
  }

  clearPrice(): void {
    this.filters.minPrice = PRICE_RANGE.min;
    this.filters.maxPrice = PRICE_RANGE.max;
    this.syncToUrl();
  }

  onPriceChange(): void { this.syncToUrl(); }

  step(field: 'rvVehicles' | 'rvTents', delta: number): void {
    this.filters[field] = Math.max(0, this.filters[field] + delta);
    this.syncToUrl();
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
