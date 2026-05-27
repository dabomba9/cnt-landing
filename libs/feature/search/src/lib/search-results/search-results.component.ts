import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule, DateRange } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CinematicRollDirective } from '@cnt-workspace/ui';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FocusTrapDirective } from '@cnt-workspace/ui';
import { SearchMapComponent } from './search-map.component';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  IListing, ALL_LISTINGS, Category, CATEGORY_META,
  Amenity, AMENITY_LABELS, AMENITY_GROUP, RV_TYPES, RvType, PRICE_RANGE,
  ListingKind, IPoi, PoiKind, POI_KIND_META, MOCK_POIS, poisInBounds,
} from '@cnt-workspace/data-access';
import { readMyRv, IMyRvProfile, listMyRvProfiles, getActiveRvProfile, setActiveRvProfile,
  TripPlannerService, ITripPlan, ITripStop, totalTripMiles, haversineMiles, ToastService,
  autoTripName, rvTypeLabel, RoutingService, IRoute,
  suggestionsAlongRoute, pointToRouteMiles, BookingService, bookingForStop,
  parseIsoDate, formatIsoDate, shortDateLabel, encodeTripShare } from '@cnt-workspace/data-access';
import type { IBooking } from '@cnt-workspace/models';
import { Subscription } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { readFavoriteIds, readFavoriteKeys, addFavorite, removeFavorite, favoriteKey } from '@cnt-workspace/data-access';
import { PoiModalComponent } from './poi-modal.component';
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
  imports: [CommonModule, FormsModule, MatDatepickerModule, MatNativeDateModule, RouterLink, DragDropModule, CinematicRollDirective, NavbarComponent, ListingCardComponent, SearchMapComponent, FocusTrapDirective, PoiModalComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.css',
})
export class SearchResultsComponent implements OnInit, AfterViewInit, OnDestroy {
  searchParams: ISearchQueryParams = {};
  private scrollTriggers: ScrollTrigger[] = [];

  // Listings
  listings: IListing[] = ALL_LISTINGS;
  hoveredId: number | null = null;
  selectedId: number | null = null;
  /** Map viewport bounds; when set, listings are filtered to those within view. */
  mapBounds: { north: number; south: number; east: number; west: number } | null = null;
  favorites = new Set<number>();
  CATEGORY_META = CATEGORY_META;

  /** Primary kind chip — drives the result list (POIs ignore this filter). */
  kindFilter: 'all' | ListingKind = 'all';

  /** POI layers — set of kinds currently visible on the map. Persisted to localStorage. */
  visiblePoiKinds = new Set<PoiKind>();
  poiLayersOpen = false;
  /** "Free only" cost filter inside the Layers panel — also persisted. */
  poiCostFreeOnly = false;
  /** Modal state for the public POI dialog. */
  activePoi: IPoi | null = null;
  POI_KIND_META = POI_KIND_META;
  readonly poiKindsAll: PoiKind[] = ['dumpstation', 'rest_area', 'propane', 'potable_water'];

  /** Cost predicate shared by `visiblePois` and the per-kind count badge. */
  private passesPoiCost(p: IPoi): boolean {
    if (!this.poiCostFreeOnly) return true;
    return p.cost === 'free' || p.cost === 'free-with-fuel';
  }

  get visiblePois(): IPoi[] {
    if (this.visiblePoiKinds.size === 0) return [];
    const byKind = MOCK_POIS.filter(p => this.visiblePoiKinds.has(p.kind) && this.passesPoiCost(p));
    return this.mapBounds ? poisInBounds(byKind, this.mapBounds) : byKind;
  }

  poiCountByKind(kind: PoiKind): number {
    return MOCK_POIS.filter(p => p.kind === kind && this.passesPoiCost(p)).length;
  }

  togglePoiKind(kind: PoiKind): void {
    if (this.visiblePoiKinds.has(kind)) this.visiblePoiKinds.delete(kind);
    else this.visiblePoiKinds.add(kind);
    this.visiblePoiKinds = new Set(this.visiblePoiKinds);
    this.persistPoiLayers();
  }
  showAllPoiKinds(): void {
    this.visiblePoiKinds = new Set(this.poiKindsAll);
    this.persistPoiLayers();
  }
  hideAllPoiKinds(): void {
    this.visiblePoiKinds = new Set();
    this.persistPoiLayers();
  }
  togglePoiLayersPanel(): void { this.poiLayersOpen = !this.poiLayersOpen; }
  closePoiLayersPanel(): void { this.poiLayersOpen = false; }

  onPoiClick(poi: IPoi): void { this.activePoi = poi; }
  closePoiModal(): void { this.activePoi = null; }

  /** Canonical "poi:<id>" keys used by the heart UI on POI popups + modal. */
  poiFavoriteKeys = new Set<string>();
  isPoiFavorite(poi: IPoi | null): boolean {
    return !!poi && this.poiFavoriteKeys.has(favoriteKey('poi', poi.id));
  }
  onPoiFavoriteToggle(poi: IPoi): void {
    const key = favoriteKey('poi', poi.id);
    if (this.poiFavoriteKeys.has(key)) {
      removeFavorite(this.platformId, { kind: 'poi', id: poi.id });
      this.poiFavoriteKeys.delete(key);
    } else {
      addFavorite(this.platformId, { kind: 'poi', id: poi.id });
      this.poiFavoriteKeys.add(key);
    }
    this.poiFavoriteKeys = new Set(this.poiFavoriteKeys);
  }

  /** Heart click inside a POI popup card on the map. The popup updates itself optimistically
   * (event delegation in search-map already toggled the visual); we just persist the state
   * to localStorage and sync our key set without rerunning renderPois (which would close
   * the popup the user is interacting with). */
  onPoiPopupFavoriteToggle(payload: { poi: IPoi; next: boolean }): void {
    const key = favoriteKey('poi', payload.poi.id);
    if (payload.next) {
      addFavorite(this.platformId, { kind: 'poi', id: payload.poi.id });
      this.poiFavoriteKeys.add(key);
    } else {
      removeFavorite(this.platformId, { kind: 'poi', id: payload.poi.id });
      this.poiFavoriteKeys.delete(key);
    }
    this.poiFavoriteKeys = new Set(this.poiFavoriteKeys);
  }

  private readonly POI_LAYERS_KEY = 'cnt-poi-layers';
  private readonly POI_COST_KEY = 'cnt-poi-cost-free';

  togglePoiCostFreeOnly(): void {
    this.poiCostFreeOnly = !this.poiCostFreeOnly;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(this.POI_COST_KEY, this.poiCostFreeOnly ? '1' : '0'); } catch { /* quota */ }
    }
  }
  private hydratePoiCostFilter(): void {
    if (typeof localStorage === 'undefined') return;
    this.poiCostFreeOnly = localStorage.getItem(this.POI_COST_KEY) === '1';
  }

  private persistPoiLayers(): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(this.POI_LAYERS_KEY, JSON.stringify([...this.visiblePoiKinds])); } catch { /* quota */ }
  }
  private hydratePoiLayers(): void {
    if (typeof localStorage === 'undefined') {
      // SSR: default all-on so the rendered map matches first-visit behavior.
      this.visiblePoiKinds = new Set(this.poiKindsAll);
      return;
    }
    try {
      const raw = localStorage.getItem(this.POI_LAYERS_KEY);
      if (raw === null) {
        // First-visit default: show all four POI kinds so users actually discover them.
        // Once they touch any toggle, persistPoiLayers writes and this branch stops firing.
        this.visiblePoiKinds = new Set(this.poiKindsAll);
        return;
      }
      const arr = JSON.parse(raw) as PoiKind[];
      if (Array.isArray(arr)) this.visiblePoiKinds = new Set(arr.filter(k => this.poiKindsAll.includes(k)));
    } catch { /* ignore */ }
  }

  setKindFilter(kind: 'all' | ListingKind): void { this.kindFilter = kind; }

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
    private seo: SeoService,
    private planner: TripPlannerService,
    private toasts: ToastService,
    private routing: RoutingService,
    private bookingSvc: BookingService,
  ) {}

  /** Current user's live bookings — drives "Booked ✓" badge on planner stops. */
  userBookings: IBooking[] = [];
  private bookingsSub: Subscription | null = null;
  drawerBookingForStop(stop: ITripStop): IBooking | null {
    return bookingForStop(stop, this.userBookings);
  }

  /** Saved RV profiles + the active one — drives the per-card fit pills. */
  rvProfiles: IMyRvProfile[] = [];
  activeRv: IMyRvProfile | null = null;

  /** Trip planner integration — drawer state + active plan for the map overlay. */
  plannerDrawerOpen = false;
  tripPlans: ITripPlan[] = [];
  activePlan: ITripPlan | null = null;
  /** Pending stop waiting on the user to pick (or create) a trip — set when a
   * map popup "Add to trip" was clicked but no active plan exists. */
  pendingStop: { kind: 'listing' | 'poi'; id: number | string; name: string } | null = null;
  /** Saved RV profiles for the drawer's "bringing" chip + switcher. */
  drawerRvProfiles: IMyRvProfile[] = [];
  drawerActiveRv: IMyRvProfile | null = null;
  drawerRvSwitcherOpen = false;
  readonly rvTypeLabel = rvTypeLabel;
  /** Road-following route for the active plan (fetched via RoutingService). */
  activeRoute: IRoute | null = null;
  routeLoading = false;
  directionsExpanded = false;
  private plansSub: Subscription | null = null;
  private routeSub: Subscription | null = null;
  private lastFetchedRouteKey = '';

  ngOnInit(): void {
    this.seo.update({
      title: 'Search RV Spots & Campsites | CurbNTurf',
      description: 'Browse hundreds of unique private RV spots across the US. Filter by state, amenities, and hookups. Book directly with hosts — no membership fees.',
      url: '/search',
    });
    this.hydrateMyRv();
    this.rvProfiles = listMyRvProfiles(this.platformId);
    this.activeRv = getActiveRvProfile(this.platformId);
    // ?plan=:id — pre-select this trip as active. Must happen before the
    // plans$ subscription fires so the first emission picks it up.
    const requestedPlanId = this.route.snapshot.queryParamMap.get('plan');
    if (requestedPlanId) this.planner.setActiveId(requestedPlanId);

    this.plansSub = this.planner.plans$.subscribe(plans => {
      this.tripPlans = plans.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const activeId = this.planner.getActiveId();
      this.activePlan = (activeId && plans.find(p => p.id === activeId)) || null;
      this.maybeFetchRoute();
    });
    // ?openPlanner=1 (or ?plan=… alone) opens the drawer.
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('openPlanner') === '1' || qp.get('plan')) {
      this.plannerDrawerOpen = true;
    }
    this.refreshDrawerRv();
    this.bookingsSub = this.bookingSvc.bookings$.subscribe(all => { this.userBookings = all; });
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
    // POI favorites use string ids — track separately via canonical keys.
    this.poiFavoriteKeys = new Set(
      [...readFavoriteKeys(this.platformId)].filter(k => k.startsWith('poi:')),
    );
    this.hydratePoiLayers();
    this.hydratePoiCostFilter();
    // `?pois=propane,dumpstation` overrides the persisted layer prefs in-memory only
    // (no write to localStorage), so deep-links from listing detail open the map with the
    // right utility kinds visible without trampling the user's saved preference.
    const poisParam = this.route.snapshot.queryParamMap.get('pois');
    if (poisParam) {
      const requested = poisParam.split(',')
        .map(s => s.trim())
        .filter((k): k is PoiKind => this.poiKindsAll.includes(k as PoiKind));
      if (requested.length > 0) this.visiblePoiKinds = new Set(requested);
    }
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
    // Look up the listing to know whether to save as 'listing' or 'boondocking' kind.
    const listing = this.listings.find(l => l.id === id);
    const kind = listing?.kind === 'boondocking' ? 'boondocking' : 'listing';
    if (next) {
      addFavorite(this.platformId, { kind, id });
      this.favorites.add(id);
    } else {
      removeFavorite(this.platformId, { kind, id });
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

  /** True if listing passes all non-viewport filters (price, amenities, dates, RV, etc.).
   * Price / instant-book / etc. only apply to private listings; boondocking is unreservable
   * so those filters skip it (caller still respects kindFilter). */
  private passesNonViewportFilters(l: IListing): boolean {
    if (this.pinnedIds && !this.pinnedIds.has(l.id)) return false;
    const lk: ListingKind = l.kind || 'private';
    if (this.kindFilter !== 'all' && lk !== this.kindFilter) return false;
    if (l.kind === 'boondocking') {
      // Skip private-only filters (price, instant book, dates, guests, RV-fit) for boondocking.
      // It's not reservable, so those filters can't meaningfully apply.
      return true;
    }
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
    // Boondocking has price: 0 and arbitrary community ratings — these comparators
    // would bunch all boondocking at the top of price-asc, top-rated, etc. when the
    // user is browsing all stays. Push boondocking to the end of the list for any
    // booking-flow sort, unless they specifically filtered to boondocking.
    const segregate = this.kindFilter !== 'boondocking'
      && (this.sortBy === 'price-asc' || this.sortBy === 'price-desc'
          || this.sortBy === 'top-rated' || this.sortBy === 'most-reviewed'
          || this.sortBy === 'instant-book');
    const isBoon = (l: IListing) => l.kind === 'boondocking';
    const ordered = segregate
      ? [...list.filter(l => !isBoon(l)), ...list.filter(isBoon)]
      : list;
    // Apply the comparator within whichever partitioning we ended up with.
    // For private-only sort criteria, treat boondocking values as 0 (boondocking is segregated
    // to the end anyway when these sorts are active).
    const priceOf = (l: IListing) => l.kind === 'boondocking' ? 0 : l.price;
    const ratingOf = (l: IListing) => l.kind === 'boondocking' ? 0 : l.rating;
    const reviewCountOf = (l: IListing) => l.kind === 'boondocking' ? 0 : l.reviewCount;
    const instantBookOf = (l: IListing) => l.kind === 'boondocking' ? false : l.instantBook;
    const sortIn = (arr: IListing[]) => {
      switch (this.sortBy) {
        case 'instant-book':  arr.sort((a, b) => Number(instantBookOf(b)) - Number(instantBookOf(a))); break;
        case 'top-rated':     arr.sort((a, b) => ratingOf(b) - ratingOf(a)); break;
        case 'most-reviewed': arr.sort((a, b) => reviewCountOf(b) - reviewCountOf(a)); break;
        case 'price-asc':     arr.sort((a, b) => priceOf(a) - priceOf(b)); break;
        case 'price-desc':    arr.sort((a, b) => priceOf(b) - priceOf(a)); break;
        case 'nearest':       if (this.userLocation) arr.sort((a, b) => this.distance(a) - this.distance(b)); break;
        case 'recommended':
        default:              break;
      }
    };
    if (segregate) {
      const privates = ordered.filter(l => !isBoon(l));
      const boons = ordered.filter(isBoon);
      sortIn(privates);
      sortIn(boons);
      ordered.splice(0, ordered.length, ...privates, ...boons);
    } else {
      sortIn(ordered);
    }
    // Hoist the selected listing (from a marker click) to the top so it's the first card.
    if (this.selectedId != null) {
      const idx = ordered.findIndex(l => l.id === this.selectedId);
      if (idx > 0) {
        const [picked] = ordered.splice(idx, 1);
        ordered.unshift(picked);
      }
    }
    return ordered;
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
      chips.push({ key: 'rvType', label: rv?.label || 'RV', clear: () => { this.filters.rvType = null; this.syncToUrl(); } });
    }
    if (this.filters.rvLength) {
      chips.push({ key: 'rvLength', label: `${this.filters.rvLength} ft long`, clear: () => { this.filters.rvLength = ''; this.syncToUrl(); } });
    }
    if (this.filters.rvHeight) {
      chips.push({ key: 'rvHeight', label: `${this.filters.rvHeight} ft tall`, clear: () => { this.filters.rvHeight = ''; this.syncToUrl(); } });
    }
    if (this.filters.rvWidth) {
      chips.push({ key: 'rvWidth', label: `${this.filters.rvWidth} ft wide`, clear: () => { this.filters.rvWidth = ''; this.syncToUrl(); } });
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
    const list = this.filteredListings;
    const total = list.length;
    // Surface the boondocking subcount when both kinds are visible — otherwise the
    // headline conflates private bookable stays with public-land sites.
    if (this.kindFilter === 'all') {
      const boon = list.reduce((n, l) => n + (l.kind === 'boondocking' ? 1 : 0), 0);
      const priv = total - boon;
      if (boon > 0 && priv > 0) {
        return `${priv} stay${priv !== 1 ? 's' : ''} · ${boon} boondocking`;
      }
    }
    if (this.kindFilter === 'boondocking') {
      return `${total} boondocking site${total !== 1 ? 's' : ''}`;
    }
    return `${total} stay${total !== 1 ? 's' : ''} found`;
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
    this.syncToUrl();
  }

  /** Called when length/height/width inputs change (template binding). The RV
   * filter is read-only w.r.t. saved profiles — it pre-fills from the active
   * profile but never writes back, so it can't corrupt a named rig's specs.
   * Filter values still persist in the URL. */
  onRvDimensionChange(): void { this.syncToUrl(); }

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

  /** Switch which saved rig the search-card fit pills evaluate against. */
  selectFitRv(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!id) return;
    setActiveRvProfile(this.platformId, id);
    this.activeRv = getActiveRvProfile(this.platformId);
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

  // ============ Trip planner drawer integration ============

  togglePlannerDrawer(): void { this.plannerDrawerOpen = !this.plannerDrawerOpen; }
  closePlannerDrawer(): void { this.plannerDrawerOpen = false; }

  selectPlan(id: string): void {
    this.planner.setActiveId(id);
    this.activePlan = this.planner.get(id);
  }

  createPlanAndOpen(): void {
    const plan = this.planner.create(autoTripName());
    this.activePlan = plan;
    this.plannerDrawerOpen = true;
  }

  /** "Add to trip" pill clicked inside a search-map popup. If an active trip
   *  is set, append the stop. Otherwise stash it as a pending stop and open
   *  the drawer in "pick a trip" mode. */
  onMapAddToTrip(event: { kind: 'listing' | 'poi'; id: number | string }): void {
    if (!this.activePlan) {
      const source = event.kind === 'listing'
        ? ALL_LISTINGS.find(x => x.id === event.id)
        : MOCK_POIS.find(x => x.id === event.id);
      if (!source) return;
      const name = event.kind === 'listing' ? (source as IListing).title : (source as IPoi).name;
      this.pendingStop = { kind: event.kind, id: event.id, name };
      this.plannerDrawerOpen = true;
      return;
    }
    this.commitAddToTrip(this.activePlan, event);
  }

  /** Internal: append a (kind, id) source onto a plan. */
  private commitAddToTrip(plan: ITripPlan, event: { kind: 'listing' | 'poi'; id: number | string }): void {
    if (event.kind === 'listing') {
      const l = ALL_LISTINGS.find(x => x.id === event.id);
      if (!l) return;
      this.planner.addStop(plan.id, {
        kind: l.kind === 'boondocking' ? 'boondocking' : 'private',
        refId: l.id, name: l.title, lat: l.lat, lng: l.lng, address: l.location, photo: l.image,
      });
    } else {
      const p = MOCK_POIS.find(x => x.id === event.id);
      if (!p) return;
      this.planner.addStop(plan.id, {
        kind: 'poi', refId: p.id, name: p.name, lat: p.lat, lng: p.lng, address: p.address, photo: p.photos?.[0],
      });
    }
    this.toasts.success('Added to trip.');
  }

  /** From the drawer's "pending stop" picker — pick an existing trip. */
  pickPendingTrip(planId: string): void {
    if (!this.pendingStop) return;
    this.planner.setActiveId(planId);
    const plan = this.planner.get(planId);
    if (!plan) return;
    this.activePlan = plan;
    this.commitAddToTrip(plan, this.pendingStop);
    this.pendingStop = null;
  }

  /** From the drawer's "pending stop" picker — create a fresh trip on the fly. */
  createTripForPendingStop(): void {
    if (!this.pendingStop) return;
    const plan = this.planner.create(autoTripName());
    this.activePlan = plan;
    this.commitAddToTrip(plan, this.pendingStop);
    this.pendingStop = null;
  }

  cancelPendingStop(): void {
    this.pendingStop = null;
  }

  /** Inline-edit handler for the active trip's name / dates / corridor. */
  commitPlanField(key: 'name' | 'startDate' | 'endDate' | 'corridorMiles', value: string | number | undefined): void {
    if (!this.activePlan) return;
    this.planner.update(this.activePlan.id, { [key]: value });
  }

  // ============ Trip-planner date range pickers (drawer) ============
  tripDatesOpen = false;
  stopDatesOpenId: string | null = null;

  toggleTripDates(): void {
    this.tripDatesOpen = !this.tripDatesOpen;
    if (this.tripDatesOpen) this.stopDatesOpenId = null;
  }
  toggleStopDates(stopId: string): void {
    this.stopDatesOpenId = this.stopDatesOpenId === stopId ? null : stopId;
    if (this.stopDatesOpenId) this.tripDatesOpen = false;
  }

  get tripDateRange(): DateRange<Date> {
    return new DateRange(parseIsoDate(this.activePlan?.startDate), parseIsoDate(this.activePlan?.endDate));
  }
  stopDateRange(s: ITripStop): DateRange<Date> {
    return new DateRange(parseIsoDate(s.checkInDate), parseIsoDate(s.checkOutDate));
  }

  get tripDateLabel(): string {
    const s = parseIsoDate(this.activePlan?.startDate);
    const e = parseIsoDate(this.activePlan?.endDate);
    if (!s && !e) return 'Pick trip dates';
    if (s && !e) return `${shortDateLabel(s)} → …`;
    if (!s && e) return `… → ${shortDateLabel(e)}`;
    return `${shortDateLabel(s)} → ${shortDateLabel(e)}`;
  }
  stopDateLabel(s: ITripStop): string {
    const ci = parseIsoDate(s.checkInDate);
    const co = parseIsoDate(s.checkOutDate);
    if (!ci && !co) return 'Pick dates';
    if (ci && !co) return `${shortDateLabel(ci)} → …`;
    if (!ci && co) return `… → ${shortDateLabel(co)}`;
    return `${shortDateLabel(ci)} → ${shortDateLabel(co)}`;
  }

  onTripDateSelected(d: Date | null): void {
    if (!this.activePlan || !d) return;
    const next = this.nextTripRange(this.tripDateRange, d);
    this.planner.update(this.activePlan.id, {
      startDate: formatIsoDate(next.start),
      endDate: formatIsoDate(next.end),
    });
  }
  onStopDateSelected(stopId: string, d: Date | null): void {
    if (!this.activePlan || !d) return;
    const stop = this.activePlan.stops.find(x => x.id === stopId);
    if (!stop) return;
    const next = this.nextTripRange(this.stopDateRange(stop), d);
    this.planner.updateStop(this.activePlan.id, stopId, {
      checkInDate: formatIsoDate(next.start),
      checkOutDate: formatIsoDate(next.end),
    });
  }

  /** Copy a public share URL for the active trip to the clipboard. */
  async shareTrip(): Promise<void> {
    if (!this.activePlan || !isPlatformBrowser(this.platformId)) return;
    if (this.activePlan.stops.length === 0) {
      this.toasts.info('Add at least one stop before sharing.');
      return;
    }
    const payload = encodeTripShare(this.activePlan);
    const url = `${window.location.origin}/trip/share?t=${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      this.toasts.success('Share link copied to clipboard.');
    } catch {
      this.toasts.info(url);
    }
  }

  private nextTripRange(current: DateRange<Date>, d: Date): DateRange<Date> {
    if (!current.start || current.end) return new DateRange(d, null);
    if (d < current.start) return new DateRange(d, null);
    return new DateRange(current.start, d);
  }

  /** Reload the drawer's RV-profile state — called on init and after a switch. */
  private refreshDrawerRv(): void {
    this.drawerRvProfiles = listMyRvProfiles(this.platformId);
    this.drawerActiveRv = getActiveRvProfile(this.platformId);
  }

  selectDrawerRv(id: string): void {
    setActiveRvProfile(this.platformId, id);
    this.refreshDrawerRv();
    this.drawerRvSwitcherOpen = false;
  }

  get drawerActiveRvInitials(): string {
    const n = this.drawerActiveRv?.name;
    if (!n) return '?';
    return n.split(/\s+/).filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  rvInitials(name: string): string {
    return name.split(/\s+/).filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  }

  removeStopFromActive(stopId: string): void {
    if (!this.activePlan) return;
    const plan = this.activePlan;
    const idx = plan.stops.findIndex(s => s.id === stopId);
    if (idx === -1) return;
    const removed: ITripStop = plan.stops[idx];
    this.planner.removeStop(plan.id, stopId);
    this.toasts.info(`"${removed.name}" removed.`, {
      actionLabel: 'Undo',
      action: () => {
        const current = this.planner.get(plan.id);
        if (!current) return;
        const restored = current.stops.slice();
        restored.splice(Math.min(idx, restored.length), 0, removed);
        this.planner.update(plan.id, { stops: restored });
      },
    });
  }

  get activePlanDistance(): number {
    return this.activePlan ? totalTripMiles(this.activePlan) : 0;
  }

  /** Fetch (or pull from cache) the road route whenever the active plan's
   * ordered stop coordinates change. Skips when fewer than 2 stops. */
  private maybeFetchRoute(): void {
    const stops = this.activePlan?.stops ?? [];
    if (stops.length < 2) {
      this.activeRoute = null;
      this.lastFetchedRouteKey = '';
      return;
    }
    const key = stops.map(s => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join(';');
    if (key === this.lastFetchedRouteKey) return;
    this.lastFetchedRouteKey = key;
    this.routeLoading = true;
    this.routeSub?.unsubscribe();
    this.routeSub = this.routing.getRoute(stops).subscribe(route => {
      this.activeRoute = route;
      this.routeLoading = false;
    });
  }

  get activeRouteGeometry(): [number, number][] | null {
    return this.activeRoute?.coordinates ?? null;
  }

  /** Format helpers exposed to the template. */
  formatMiles = (mi: number): string => this.routing.formatDistance(mi);
  formatMins = (m: number): string => this.routing.formatDuration(m);

  /** Distance + drive time between stops i and i+1. Prefers the routed leg
   *  (when the OSRM response is in); falls back to straight-line haversine so
   *  the user sees *something* while the route is loading. */
  legBetween(i: number): { miles: number; minutes: number } | null {
    if (!this.activePlan) return null;
    const stops = this.activePlan.stops;
    if (i < 0 || i >= stops.length - 1) return null;
    const leg = this.activeRoute?.legs?.[i];
    if (leg) return { miles: leg.distanceMiles, minutes: leg.durationMinutes };
    return { miles: haversineMiles(stops[i], stops[i + 1]), minutes: 0 };
  }

  @ViewChild(SearchMapComponent) private searchMap?: SearchMapComponent;

  /** Click a step in the Directions list → fly the search map to its start. */
  flyToStep(step: { start: { lat: number; lng: number } }): void {
    if (!step?.start) return;
    this.searchMap?.flyTo(step.start.lat, step.start.lng, 14);
  }

  /** Per-stop "expanded" state in the drawer — accordion-style. */
  expandedDrawerStopId: string | null = null;
  toggleDrawerStopExpand(stopId: string): void {
    this.expandedDrawerStopId = this.expandedDrawerStopId === stopId ? null : stopId;
  }
  updateDrawerStopField(stopId: string, patch: Partial<ITripStop>): void {
    if (!this.activePlan) return;
    this.planner.updateStop(this.activePlan.id, stopId, patch);
  }

  /** Suggestions within the active plan's corridor — drives the drawer
   * "Along your route" panel. */
  get drawerListingSuggestions() {
    if (!this.activePlan) return [];
    return suggestionsAlongRoute(
      ALL_LISTINGS,
      this.activePlan.stops,
      this.activePlan.corridorMiles ?? 0,
      this.activePlan.stops,
      5,
    );
  }
  get drawerPoiSuggestions() {
    if (!this.activePlan) return [];
    return suggestionsAlongRoute(
      MOCK_POIS,
      this.activePlan.stops,
      this.activePlan.corridorMiles ?? 0,
      this.activePlan.stops,
      5,
    );
  }
  drawerMilesFromRoute(pt: { lat: number; lng: number }): number {
    if (!this.activePlan || this.activePlan.stops.length < 2) return 0;
    return pointToRouteMiles(pt, this.activePlan.stops);
  }
  addDrawerSuggestionListing(l: import('@cnt-workspace/data-access').IListing): void {
    if (!this.activePlan) return;
    this.planner.addStop(this.activePlan.id, {
      kind: l.kind === 'boondocking' ? 'boondocking' : 'private',
      refId: l.id, name: l.title, lat: l.lat, lng: l.lng, address: l.location, photo: l.image,
    });
    this.toasts.success('Added to trip.');
  }
  addDrawerSuggestionPoi(p: import('@cnt-workspace/data-access').IPoi): void {
    if (!this.activePlan) return;
    this.planner.addStop(this.activePlan.id, {
      kind: 'poi', refId: p.id, name: p.name, lat: p.lat, lng: p.lng, address: p.address, photo: p.photos?.[0],
    });
    this.toasts.success('Added to trip.');
  }
  drawerPoiKindLabel(k: string): string {
    return ({ dumpstation: 'Dump station', rest_area: 'Rest area', propane: 'Propane', potable_water: 'Potable water' } as Record<string, string>)[k] ?? k;
  }

  /** Drag-reorder for the drawer's stops list. */
  onDrawerStopDrop(event: CdkDragDrop<unknown>): void {
    if (!this.activePlan) return;
    const stops = this.activePlan.stops.slice();
    moveItemInArray(stops, event.previousIndex, event.currentIndex);
    this.planner.update(this.activePlan.id, { stops });
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
    this.plansSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.bookingsSub?.unsubscribe();
  }
}
