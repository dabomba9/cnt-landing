import { Component, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent, ListingCardComponent } from '@cnt-workspace/ui';
import { Listing, MOCK_LISTINGS, SeoService, ToastService } from '@cnt-workspace/data-access';

const FAV_KEY = 'cnt-favorites';

@Component({
  selector: 'cnt-wishlists',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, ListingCardComponent],
  templateUrl: './wishlists.component.html',
})
export class WishlistsComponent implements OnInit {
  favoriteIds = new Set<number>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Wishlists — CurbNTurf',
      description: 'Stays you saved on CurbNTurf.',
      url: '/wishlists',
      robots: 'noindex, nofollow',
    });
    this.hydrate();
  }

  private hydrate(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      this.favoriteIds = new Set(Array.isArray(ids) ? ids : []);
    } catch { this.favoriteIds = new Set(); }
  }

  get listings(): Listing[] {
    return MOCK_LISTINGS.filter(l => this.favoriteIds.has(l.id));
  }

  isFavorite(id: number): boolean { return this.favoriteIds.has(id); }

  onFavoriteToggle(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteIds.delete(id);
    this.favoriteIds = new Set(this.favoriteIds);
    this.persist();
  }

  clearAll(): void {
    if (this.favoriteIds.size === 0) return;
    if (isPlatformBrowser(this.platformId) && !window.confirm('Remove all stays from your wishlist?')) return;
    this.favoriteIds = new Set();
    this.persist();
    this.toasts.info('Wishlist cleared.');
  }

  private persist(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...this.favoriteIds])); } catch {}
  }

  get mapLinkQueryParams() {
    return { ids: [...this.favoriteIds].join(',') };
  }

  /** Listen for the listing-card's storage event so adds in other tabs surface here too. */
  @HostListener('window:storage') onStorage(): void { this.hydrate(); }
}
