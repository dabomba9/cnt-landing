import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { ARTICLES } from '../articles.data';
import { CATEGORY_META, IArticle } from '../articles.types';

@Component({
  selector: 'cnt-article-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './article-detail.component.html',
  styleUrls: ['./article-detail.component.scss'],
})
export class ArticleDetailComponent implements OnInit, OnDestroy {
  article: IArticle | null = null;
  body: SafeHtml = '';
  prev: IArticle | null = null;
  next: IArticle | null = null;
  related: IArticle[] = [];
  readonly CATEGORY_META = CATEGORY_META;

  private sub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => {
      const id = parseInt(params.get('id') ?? '0', 10);
      this.load(id);
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private load(id: number): void {
    const idx = ARTICLES.findIndex(a => a.id === id);
    if (idx === -1) {
      this.article = null;
      this.body = '';
      this.prev = this.next = null;
      this.related = [];
      return;
    }
    const a = ARTICLES[idx];
    this.article = a;
    this.body = this.sanitizer.bypassSecurityTrustHtml(a.body);
    // ARTICLES is sorted newest-first, so prev (newer) is at idx-1
    // and next (older) is at idx+1.
    this.prev = idx > 0 ? ARTICLES[idx - 1] : null;
    this.next = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;
    this.related = ARTICLES
      .filter(x => x.id !== a.id && x.category === a.category)
      .slice(0, 3);

    this.seo.update({
      title: `${a.title} | CurbNTurf`,
      description: a.excerpt,
      url: `/article/${a.id}/${a.slug}`,
      image: a.heroImage,
    });

    if (isPlatformBrowser(this.platformId)) {
      // Scroll to top on article change — important when the user
      // hits prev/next.
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }

  formatDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
