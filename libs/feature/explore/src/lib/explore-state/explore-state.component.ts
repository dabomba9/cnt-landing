import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { ListingCardComponent } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { readFavoriteIds, addFavorite, removeFavorite } from '@cnt-workspace/data-access';
import {
  Category,
  CATEGORY_META,
  IListing,
} from '@cnt-workspace/data-access';
import { listingsInState, SLUG_TO_NAME } from '@cnt-workspace/data-access';
import { STATE_CONTENT, IStateContent } from './state-content.data';
import { ExploreMapComponent } from './explore-map.component';

interface ICategoryPill {
  id: Category;
  label: string;
  count: number;
}

@Component({
  selector: 'cnt-explore-state',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    ListingCardComponent,
    ExploreMapComponent,
  ],
  templateUrl: './explore-state.component.html',
})
export class ExploreStateComponent implements OnInit, OnDestroy {
  private favoriteSet = new Set<number>();
  private routeSub?: Subscription;

  state: IStateContent | null = null;
  allInState: IListing[] = [];
  filteredListings: IListing[] = [];
  selectedCategory: Category | null = null;
  categoryPills: ICategoryPill[] = [];

  // Stat strip values
  listingCount = 0;
  avgRating = 0;
  minPrice = 0;

  CATEGORY_META = CATEGORY_META;
  SLUG_TO_NAME = SLUG_TO_NAME;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    this.hydrateFavorites();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const slug = (params.get('state') ?? '').toLowerCase();
      const content = STATE_CONTENT[slug];

      if (!content) {
        // Unknown state slug → fall back to search.
        this.router.navigate(['/search']);
        return;
      }

      this.state = content;
      this.allInState = listingsInState(slug);
      this.selectedCategory = null;
      this.applyFilter();
      this.computeStats();
      this.buildCategoryPills();

      this.applySeo(content);

      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.seo.setStructuredData(null);
  }

  // ---- Filtering --------------------------------------------------------

  selectCategory(cat: Category | null): void {
    this.selectedCategory = cat;
    this.applyFilter();
  }

  private applyFilter(): void {
    this.filteredListings = this.selectedCategory
      ? this.allInState.filter((l) => l.category === this.selectedCategory)
      : this.allInState.slice();
  }

  private buildCategoryPills(): void {
    const counts = new Map<Category, number>();
    for (const l of this.allInState) {
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    }
    this.categoryPills = Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        label: CATEGORY_META[id].label,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computeStats(): void {
    this.listingCount = this.allInState.length;
    if (this.listingCount === 0) {
      this.avgRating = 0;
      this.minPrice = 0;
      return;
    }
    const sum = this.allInState.reduce((acc, l) => acc + l.rating, 0);
    this.avgRating = Math.round((sum / this.listingCount) * 10) / 10;
    this.minPrice = Math.min(...this.allInState.map((l) => l.price));
  }

  // ---- Favorites --------------------------------------------------------

  isFavorite(id: number): boolean {
    return this.favoriteSet.has(id);
  }

  toggleFavorite(id: number, _event: MouseEvent): void {
    if (this.favoriteSet.has(id)) {
      removeFavorite(this.platformId, id);
      this.favoriteSet.delete(id);
    } else {
      addFavorite(this.platformId, id);
      this.favoriteSet.add(id);
    }
    this.favoriteSet = new Set(this.favoriteSet);
  }

  private hydrateFavorites(): void {
    this.favoriteSet = readFavoriteIds(this.platformId);
  }

  // ---- SEO --------------------------------------------------------------

  private applySeo(content: IStateContent): void {
    const heroImg = this.seo.absUrl(content.heroImage);

    this.seo.update({
      title: `RV Stays in ${content.name} | CurbNTurf`,
      description: (content.intro[0] ?? content.tagline).slice(0, 160),
      url: `/explore/${content.slug}`,
      image: heroImg,
      type: 'website',
    });

    this.seo.setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'TouristDestination',
      name: `${content.name} — RV Stays`,
      description: (content.intro[0] ?? content.tagline).slice(0, 300),
      address: {
        '@type': 'PostalAddress',
        addressRegion: content.name,
        addressCountry: 'US',
      },
      url: `https://www.curbnturf.com/explore/${content.slug}`,
      ...(this.listingCount > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: this.avgRating,
              reviewCount: this.listingCount,
              bestRating: 5,
            },
          }
        : {}),
    });
  }
}
