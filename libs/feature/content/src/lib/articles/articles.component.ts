import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { buildCollectionSchema } from './article-schema.util';
import { NavbarComponent, FooterComponent, MagneticBtnDirective } from '@cnt-workspace/ui';
import { ArticlePreferencesService, SeoService } from '@cnt-workspace/data-access';
import { NewsletterSignupComponent } from '../newsletter-signup/newsletter-signup.component';
import { gsap } from 'gsap';
import { ARTICLES } from './articles.data';
import { EDITOR_PICK_IDS } from './articles.curation';
import { ArticleCategoryKey, CATEGORY_INTRO, CATEGORY_META, IArticle, isNewArticle } from './articles.types';

type FilterKey = 'all' | ArticleCategoryKey;
type SortKey = 'newest' | 'oldest' | 'shortest' | 'longest';

const INITIAL_PAGE_SIZE = 12;
const PAGE_SIZE = 12;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',   label: 'Newest' },
  { key: 'oldest',   label: 'Oldest' },
  { key: 'shortest', label: 'Quick reads' },
  { key: 'longest',  label: 'Long reads' },
];

@Component({
  selector: 'cnt-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, MagneticBtnDirective, NewsletterSignupComponent],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss',
})
export class ArticlesComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly CATEGORY_META = CATEGORY_META;
  readonly SORT_OPTIONS = SORT_OPTIONS;
  filterTabs: { key: FilterKey; label: string; icon: string; count: number }[] = [];

  selectedCategory: FilterKey = 'all';
  searchQuery = '';
  authorFilter = '';
  sortKey: SortKey = 'newest';
  visibleGridCount = INITIAL_PAGE_SIZE;

  savedView = false;
  categoryView: { key: ArticleCategoryKey; label: string; icon: string; intro: string } | null = null;
  savedIds = new Set<number>();

  private routeSub: Subscription | null = null;
  private prefsSub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
    private route: ActivatedRoute,
    private router: Router,
    public prefs: ArticlePreferencesService,
  ) {}

  ngOnInit(): void {
    const mode = this.route.snapshot.data?.['mode'];
    this.savedView = mode === 'saved';

    if (mode === 'category') {
      const rawKey = (this.route.snapshot.paramMap.get('key') ?? '').toLowerCase();
      const meta = (CATEGORY_META as Record<string, typeof CATEGORY_META[ArticleCategoryKey] | undefined>)[rawKey];
      if (!meta) {
        this.router.navigate(['/articles']);
        return;
      }
      this.categoryView = { key: meta.key, label: meta.label, icon: meta.icon, intro: CATEGORY_INTRO[meta.key] };
      this.selectedCategory = meta.key;
    }

    if (this.categoryView) {
      this.seo.update({
        title: `${this.categoryView.label} — Room2Roam | CurbNTurf`,
        description: this.categoryView.intro,
        url: `/article/category/${this.categoryView.key}`,
      });
    } else {
      this.seo.update({
        title: this.savedView
          ? 'Your reading list — CurbNTurf'
          : 'Articles & Stories — CurbNTurf | The RV Freedom Experience',
        description: 'Travel tips, host stories, gear reviews, boondocking guides, and destination roundups for the modern RVer. Brought to you by CurbNTurf.',
        url: this.savedView ? '/articles/saved' : '/articles',
        ...(this.savedView ? { robots: 'noindex, nofollow' } : {}),
      });
    }

    this.buildFilterTabs();

    if (this.categoryView) {
      const cv = this.categoryView;
      this.seo.setStructuredData(buildCollectionSchema(
        cv.label,
        cv.intro,
        ARTICLES.filter(a => a.category === cv.key),
        (p) => this.seo.absUrl(p),
        `/article/category/${cv.key}`,
      ));
    }

    this.routeSub = this.route.queryParamMap.subscribe(params => {
      this.authorFilter = params.get('author')?.trim() ?? '';
    });

    this.prefsSub = this.prefs.saved$.subscribe(ids => {
      this.savedIds = new Set(ids);
    });
  }

  clearAuthorFilter(): void { this.authorFilter = ''; this.resetPagination(); }

  /** Bookmark click on an article card. preventDefault + stopPropagation
   *  so the routerLink wrapper doesn't navigate. */
  onToggleSave(event: MouseEvent, id: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.prefs.toggleSave(id);
  }

  isNew(article: IArticle): boolean { return isNewArticle(article); }

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

  /** The featured article hero on the magazine cover. Newest first.
   *  Renders only on the default unfiltered, unsearched magazine view —
   *  saved view + category view + chip-filtered view all skip it. */
  get featuredArticle(): IArticle | null {
    if (!this.isMagazineDefault) return null;
    return ARTICLES[0] ?? null;
  }

  /** Three editor's picks below the featured hero. Dedups against
   *  the featured article so cards don't appear twice. */
  get editorPicks(): IArticle[] {
    if (!this.isMagazineDefault) return [];
    const featuredId = this.featuredArticle?.id;
    return EDITOR_PICK_IDS
      .filter(id => id !== featuredId)
      .map(id => ARTICLES.find(a => a.id === id))
      .filter((a): a is IArticle => !!a)
      .slice(0, 3);
  }

  /** The grid of remaining articles. On the magazine default view this
   *  excludes the featured + editor picks; on filtered / category /
   *  saved views the gates relax so the grid shows everything that
   *  matches the active filter. */
  get gridArticles(): IArticle[] {
    const q = this.searchQuery.trim().toLowerCase();
    const author = this.authorFilter.toLowerCase();
    const excludeIds: Set<number> | null = this.isMagazineDefault
      ? new Set([
          ...(this.featuredArticle ? [this.featuredArticle.id] : []),
          ...this.editorPicks.map(a => a.id),
        ])
      : null;
    const filtered = ARTICLES.filter(a => {
      if (this.savedView && !this.savedIds.has(a.id)) return false;
      if (excludeIds?.has(a.id)) return false;
      if (this.selectedCategory !== 'all' && a.category !== this.selectedCategory) return false;
      if (author && a.author.toLowerCase() !== author) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
    });
    return this.sortArticles(filtered);
  }

  /** The slice of `gridArticles` actually rendered. Drives the
   *  load-more pagination — the rest reveal on click. */
  get visibleGridArticles(): IArticle[] {
    return this.gridArticles.slice(0, this.visibleGridCount);
  }

  /** True when there are more articles to reveal — drives the
   *  "Load more" button visibility. */
  get hasMoreGridArticles(): boolean {
    return this.gridArticles.length > this.visibleGridCount;
  }

  loadMore(): void {
    this.visibleGridCount += PAGE_SIZE;
  }

  /** Reset pagination on any state change that re-shapes the grid.
   *  Avoids the "I was on page 3 but the order changed" surprise. */
  private resetPagination(): void { this.visibleGridCount = INITIAL_PAGE_SIZE; }

  setSort(next: SortKey): void {
    this.sortKey = next;
    this.resetPagination();
  }

  private sortArticles(list: IArticle[]): IArticle[] {
    switch (this.sortKey) {
      case 'oldest':
        return [...list].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      case 'shortest':
        return [...list].sort((a, b) => a.readTimeMinutes - b.readTimeMinutes);
      case 'longest':
        return [...list].sort((a, b) => b.readTimeMinutes - a.readTimeMinutes);
      case 'newest':
      default:
        // ARTICLES is already newest-first; preserve order through
        // any prior filtering.
        return list;
    }
  }

  /** True when /articles is being rendered in its default magazine
   *  state — no saved/category route, no chip filter, no search, no
   *  author query. Drives the featured hero + editor's picks gates. */
  get isMagazineDefault(): boolean {
    return !this.savedView
      && !this.categoryView
      && this.selectedCategory === 'all'
      && !this.searchQuery.trim()
      && !this.authorFilter;
  }

  /** Most-recently-opened article. Drives the "Pick up where you left
   *  off" strip on the default magazine view. */
  get continueReading(): IArticle | null {
    if (!this.isMagazineDefault) return null;
    const id = this.prefs.mostRecentReadId();
    if (id == null) return null;
    return ARTICLES.find(a => a.id === id) ?? null;
  }

  selectCategory(cat: FilterKey): void { this.selectedCategory = cat; this.resetPagination(); }
  clearSearch(): void { this.searchQuery = ''; this.resetPagination(); }

  /** Filter-chip click handler. Same as setCategory + one extra
   *  affordance: when the tapped chip is partially offscreen in the
   *  mobile scroll rail, slide it into the center so the user sees
   *  what they just picked. No-op on lg+ where the rail wraps. */
  onChipClick(event: MouseEvent, cat: FilterKey): void {
    this.selectCategory(cat);
    if (!isPlatformBrowser(this.platformId)) return;
    const btn = event.currentTarget as HTMLElement | null;
    if (!btn || typeof btn.scrollIntoView !== 'function') return;
    btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  formatDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.prefsSub?.unsubscribe();
    this.seo.setStructuredData(null);
  }
}
