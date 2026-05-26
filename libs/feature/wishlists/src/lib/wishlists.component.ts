import { Component, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent, ListingCardComponent } from '@cnt-workspace/ui';
import {
  IListing, ALL_LISTINGS, SeoService, ToastService,
  Category, CATEGORY_META,
  readFavorites, removeFavorite, clearFavorites, writeFavorites, IFavorite,
  readRecentlyViewed,
  MOCK_POIS, POI_KIND_META, IPoi,
} from '@cnt-workspace/data-access';

type WishlistSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'rating-desc';

const VIEW_KEY = 'cnt-wishlists-view';
const UNDO_WINDOW_MS = 5000;

interface ICategoryCount { category: Category; label: string; count: number; }

@Component({
  selector: 'cnt-wishlists',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, ListingCardComponent],
  templateUrl: './wishlists.component.html',
})
export class WishlistsComponent implements OnInit {
  /** Raw favorites with timestamps — newest first by util contract. */
  favorites: IFavorite[] = [];
  favoriteIds = new Set<number>();

  /** Filter + sort state, persisted to localStorage. */
  selectedCategories = new Set<Category>();
  sort: WishlistSort = 'newest';

  /** Undo state for Clear all. */
  clearedSnapshot: IFavorite[] | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  /** Cross-reference to drive the "Continue from recently viewed" empty-state link. */
  hasRecentlyViewed = false;

  CATEGORY_META = CATEGORY_META;
  readonly allCategories: Category[] = ['vineyard', 'farm', 'brewery', 'attraction', 'offgrid'];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Favorites — CurbNTurf',
      description: 'Stays you saved on CurbNTurf.',
      url: '/wishlists',
      robots: 'noindex, nofollow',
    });
    this.hydrate();
    this.hydrateView();
    this.hasRecentlyViewed = readRecentlyViewed(this.platformId).length > 0;
  }

  private hydrate(): void {
    this.favorites = readFavorites(this.platformId);
    // Only numeric ids (stays + boondocking) — POIs use string ids and don't appear in the listing card grid.
    this.favoriteIds = new Set(
      this.favorites.filter(f => typeof f.id === 'number').map(f => f.id as number),
    );
  }

  private hydrateView(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(VIEW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { sort?: WishlistSort; categories?: Category[] };
      if (parsed.sort) this.sort = parsed.sort;
      if (Array.isArray(parsed.categories)) this.selectedCategories = new Set(parsed.categories);
    } catch { /* ignore */ }
  }

  private persistView(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({
        sort: this.sort,
        categories: [...this.selectedCategories],
      }));
    } catch { /* quota */ }
  }

  /** All saved listings (no filters) — drives the count, the breakdown, and the deep-link.
   * Spans both private listings and boondocking so saved entries of either kind appear. */
  get listings(): IListing[] {
    const byId = new Map<number, IListing>(ALL_LISTINGS.map(l => [l.id, l]));
    const out: IListing[] = [];
    for (const f of this.favorites) {
      if (typeof f.id !== 'number') continue; // POIs aren't IListings — handled in their own section.
      const l = byId.get(f.id);
      if (l) out.push(l);
    }
    return out;
  }

  /** Saved POIs (utilities) — separate section since they're not IListings. */
  get savedPois(): { poi: IPoi; savedAt: string }[] {
    const byId = new Map(MOCK_POIS.map(p => [p.id, p]));
    const out: { poi: IPoi; savedAt: string }[] = [];
    for (const f of this.favorites) {
      if (f.kind !== 'poi' || typeof f.id !== 'string') continue;
      const p = byId.get(f.id);
      if (p) out.push({ poi: p, savedAt: f.savedAt });
    }
    return out;
  }

  POI_KIND_META = POI_KIND_META;

  removePoiFavorite(poiId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    removeFavorite(this.platformId, { kind: 'poi', id: poiId });
    this.hydrate();
  }

  directionsHrefFor(poi: IPoi): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;
  }

  /** Listings after category filter + sort.
   * Price + rating sorts treat boondocking as 0 (it has no curated price/rating). */
  get filteredListings(): IListing[] {
    let out = this.listings;
    if (this.selectedCategories.size > 0) {
      out = out.filter(l => this.selectedCategories.has(l.category));
    }
    const priceOf = (l: IListing) => l.kind === 'boondocking' ? 0 : l.price;
    const ratingOf = (l: IListing) => l.kind === 'boondocking' ? 0 : l.rating;
    const savedAtById = new Map(this.favorites.map(f => [f.id, f.savedAt]));
    switch (this.sort) {
      case 'oldest':
        return [...out].sort((a, b) => (savedAtById.get(a.id) || '').localeCompare(savedAtById.get(b.id) || ''));
      case 'price-asc':
        return [...out].sort((a, b) => priceOf(a) - priceOf(b));
      case 'price-desc':
        return [...out].sort((a, b) => priceOf(b) - priceOf(a));
      case 'rating-desc':
        return [...out].sort((a, b) => ratingOf(b) - ratingOf(a));
      case 'newest':
      default:
        return [...out].sort((a, b) => (savedAtById.get(b.id) || '').localeCompare(savedAtById.get(a.id) || ''));
    }
  }

  /** Category breakdown for the header — top 3 + "+N more". */
  get categoryBreakdown(): ICategoryCount[] {
    const counts = new Map<Category, number>();
    for (const l of this.listings) counts.set(l.category, (counts.get(l.category) || 0) + 1);
    return [...counts.entries()]
      .map(([category, count]) => ({ category, label: CATEGORY_META[category].label, count }))
      .sort((a, b) => b.count - a.count);
  }

  get filtersActive(): boolean { return this.selectedCategories.size > 0; }

  /** Categories the user actually has saves in — pills render only for these. */
  get availableCategories(): Category[] {
    return this.allCategories.filter(c => this.countFor(c) > 0);
  }

  /** Show the filter+sort row only when there's something to slice. */
  get showFilterRow(): boolean {
    return this.listings.length > 1 || this.availableCategories.length > 1;
  }

  /** Count of saved listings per category — drives chip badges. */
  countFor(category: Category): number {
    return this.listings.filter(l => l.category === category).length;
  }

  toggleCategory(category: Category): void {
    if (this.selectedCategories.has(category)) this.selectedCategories.delete(category);
    else this.selectedCategories.add(category);
    this.selectedCategories = new Set(this.selectedCategories);
    this.persistView();
  }

  resetFilters(): void {
    this.selectedCategories = new Set();
    this.sort = 'newest';
    this.persistView();
  }

  onSortChange(): void { this.persistView(); }

  isFavorite(id: number): boolean { return this.favoriteIds.has(id); }

  onFavoriteToggle(id: number, event: MouseEvent): void {
    event.stopPropagation();
    // Look up the listing in the merged pool to know its kind.
    const fav = this.favorites.find(f => f.id === id);
    const kind = fav?.kind || 'listing';
    removeFavorite(this.platformId, { kind, id });
    this.hydrate();
  }

  /** Clear-all → snapshot, wipe, allow Undo for 5s. */
  clearAll(): void {
    if (this.favorites.length === 0) return;
    this.clearedSnapshot = [...this.favorites];
    clearFavorites(this.platformId);
    this.hydrate();
    this.toasts.info(`Cleared ${this.clearedSnapshot.length} ${this.clearedSnapshot.length === 1 ? 'stay' : 'stays'}.`);
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => { this.clearedSnapshot = null; this.undoTimer = null; }, UNDO_WINDOW_MS);
  }

  undoClear(): void {
    if (!this.clearedSnapshot) return;
    writeFavorites(this.platformId, this.clearedSnapshot);
    this.hydrate();
    this.toasts.success('Wishlist restored.');
    this.clearedSnapshot = null;
    if (this.undoTimer) { clearTimeout(this.undoTimer); this.undoTimer = null; }
  }

  get mapLinkQueryParams() {
    return { ids: [...this.favoriteIds].join(',') };
  }

  /** Listen for storage events from other tabs/components so saves elsewhere surface here. */
  @HostListener('window:storage') onStorage(): void { this.hydrate(); }
}
