import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';
import { ARTICLES } from './articles.data';
import { ArticleCategoryKey, CATEGORY_META, IArticle } from './articles.types';

type FilterKey = 'all' | ArticleCategoryKey;

@Component({
  selector: 'cnt-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss',
})
export class ArticlesComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly CATEGORY_META = CATEGORY_META;
  /** All filter chips: "All" + the 10 canonical category keys, but
   *  only categories that actually have at least one article are
   *  rendered (so empty buckets don't clutter the rail). */
  filterTabs: { key: FilterKey; label: string; icon: string; count: number }[] = [];

  selectedCategory: FilterKey = 'all';
  searchQuery = '';

  /** The top 3 most-recent articles render as a featured mosaic
   *  at the top (1 big + 2 stacked). Picked up at ngOnInit. */
  featuredArticles: IArticle[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Articles & Stories — CurbNTurf | The RV Freedom Experience',
      description: 'Travel tips, host stories, gear reviews, boondocking guides, and destination roundups for the modern RVer. Brought to you by CurbNTurf.',
      url: '/articles',
    });

    this.featuredArticles = ARTICLES.slice(0, 3);
    this.buildFilterTabs();
  }

  private buildFilterTabs(): void {
    const tabs: { key: FilterKey; label: string; icon: string; count: number }[] = [
      { key: 'all', label: 'All', icon: 'all_inclusive', count: ARTICLES.length },
    ];
    for (const meta of Object.values(CATEGORY_META)) {
      const count = ARTICLES.filter(a => a.category === meta.key).length;
      if (count === 0) continue;
      tabs.push({ key: meta.key, label: meta.label, icon: meta.icon, count });
    }
    this.filterTabs = tabs;
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.articles-hero-content > *', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    gsap.from('.articles-tabs', { y: 12, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.3 });
    gsap.fromTo('.article-card',
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.05, delay: 0.4 }
    );
  }

  /** Excludes the featured articles from the grid so we don't
   *  render them twice on the unfiltered default view. */
  get gridArticles(): IArticle[] {
    const q = this.searchQuery.trim().toLowerCase();
    const featuredIds = this.showFeatured ? new Set(this.featuredArticles.map(a => a.id)) : null;
    return ARTICLES.filter(a => {
      if (featuredIds?.has(a.id)) return false;
      if (this.selectedCategory !== 'all' && a.category !== this.selectedCategory) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
    });
  }

  /** True when the featured mosaic should render — only on the
   *  unfiltered, unsearched default view. */
  get showFeatured(): boolean {
    return this.featuredArticles.length > 0 && this.selectedCategory === 'all' && !this.searchQuery.trim();
  }

  selectCategory(cat: FilterKey): void { this.selectedCategory = cat; }
  clearSearch(): void { this.searchQuery = ''; }

  formatDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  ngOnDestroy(): void {}
}
