import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { ArticlePreferencesService, SeoService } from '@cnt-workspace/data-access';
import { ARTICLES } from '../articles.data';
import { AUTHORS, CATEGORY_META, IArticle, IAuthor, authorInitials } from '../articles.types';
import { ARTICLE_IMAGE_HEIGHT, ARTICLE_IMAGE_WIDTH, buildArticleSchema } from '../article-schema.util';

interface ITocEntry {
  id: string;
  label: string;
}

@Component({
  selector: 'cnt-article-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './article-detail.component.html',
  styleUrls: ['./article-detail.component.scss'],
})
export class ArticleDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  article: IArticle | null = null;
  body: SafeHtml = '';
  prev: IArticle | null = null;
  next: IArticle | null = null;
  related: IArticle[] = [];
  readonly CATEGORY_META = CATEGORY_META;

  tocEntries: ITocEntry[] = [];
  activeSection: string | null = null;
  authorProfile: IAuthor | null = null;
  progress = 0;

  @ViewChild('bodyEl') bodyEl?: ElementRef<HTMLElement>;

  private sub: Subscription | null = null;
  private scrollHandler?: () => void;
  private rafId = 0;
  private io?: IntersectionObserver;
  private needsObserverRebind = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
    private sanitizer: DomSanitizer,
    public prefs: ArticlePreferencesService,
  ) {}

  toggleSave(): void {
    if (this.article) this.prefs.toggleSave(this.article.id);
  }

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => {
      const id = parseInt(params.get('id') ?? '0', 10);
      this.load(id);
    });

    if (isPlatformBrowser(this.platformId)) {
      this.scrollHandler = () => {
        if (this.rafId) return;
        this.rafId = window.requestAnimationFrame(() => {
          this.rafId = 0;
          this.updateProgress();
        });
      };
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
  }

  ngAfterViewChecked(): void {
    if (!this.needsObserverRebind) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.bodyEl) return;
    this.needsObserverRebind = false;
    this.bindSectionObserver();
    this.updateProgress();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (isPlatformBrowser(this.platformId)) {
      if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
      if (this.rafId) window.cancelAnimationFrame(this.rafId);
      this.io?.disconnect();
    }
    this.seo.setStructuredData(null);
  }

  private load(id: number): void {
    const idx = ARTICLES.findIndex(a => a.id === id);
    if (idx === -1) {
      this.article = null;
      this.body = '';
      this.prev = this.next = null;
      this.related = [];
      this.tocEntries = [];
      this.authorProfile = null;
      return;
    }
    const a = ARTICLES[idx];
    this.article = a;

    const { html, toc } = this.processBody(a.body);
    this.tocEntries = toc;
    this.body = this.sanitizer.bypassSecurityTrustHtml(html);

    this.authorProfile = AUTHORS[a.author] ?? {
      name: a.author,
      initials: authorInitials(a.author),
      bio: '',
    };

    this.prev = idx > 0 ? ARTICLES[idx - 1] : null;
    this.next = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;
    this.related = ARTICLES
      .filter(x => x.id !== a.id && x.category === a.category)
      .slice(0, 3);

    this.seo.update({
      title: `${a.title} | CurbNTurf`,
      description: a.excerpt,
      url: `/article/${a.id}/${a.slug}`,
      image: this.seo.absUrl(a.heroImage),
      imageAlt: a.heroAlt,
      imageWidth: ARTICLE_IMAGE_WIDTH,
      imageHeight: ARTICLE_IMAGE_HEIGHT,
      type: 'article',
    });
    this.seo.setStructuredData(buildArticleSchema(a, this.authorProfile, (p) => this.seo.absUrl(p)));

    this.activeSection = null;
    this.progress = 0;
    this.needsObserverRebind = true;

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      this.prefs.markRead(a.id, new Date().toISOString());
    }
  }

  /** Inject deterministic id="section-..." into every <h2> so the TOC
   *  can anchor-link, and collect the labels. Regex transform over the
   *  pre-sanitized body HTML (DOMParser is browser-only; this also
   *  needs to run during SSR). */
  private processBody(raw: string): { html: string; toc: ITocEntry[] } {
    const toc: ITocEntry[] = [];
    const used = new Set<string>();
    const slug = (text: string): string => {
      const base = text
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'section';
      let candidate = `section-${base}`;
      let n = 2;
      while (used.has(candidate)) candidate = `section-${base}-${n++}`;
      used.add(candidate);
      return candidate;
    };
    const html = raw.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (match, attrs: string | undefined, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!label) return match;
      const id = slug(label);
      toc.push({ id, label });
      const cleanedAttrs = (attrs ?? '').replace(/\sid="[^"]*"/i, '');
      return `<h2${cleanedAttrs} id="${id}">${inner}</h2>`;
    });
    return { html, toc };
  }

  private updateProgress(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.bodyEl?.nativeElement;
    if (!el) { this.progress = 0; return; }
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const height = rect.height;
    const vh = window.innerHeight;
    const denom = Math.max(1, height - vh);
    const p = (window.scrollY - top) / denom;
    this.progress = Math.max(0, Math.min(1, p));
  }

  private bindSectionObserver(): void {
    this.io?.disconnect();
    if (this.tocEntries.length < 3) return;
    const el = this.bodyEl?.nativeElement;
    if (!el) return;
    this.io = new IntersectionObserver((entries) => {
      const top = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) this.activeSection = (top.target as HTMLElement).id;
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
    for (const entry of this.tocEntries) {
      const node = el.querySelector(`#${entry.id}`);
      if (node) this.io.observe(node);
    }
  }

  scrollToSection(event: Event, id: string): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    const node = this.bodyEl?.nativeElement.querySelector(`#${id}`) as HTMLElement | null;
    if (!node) return;
    const y = node.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
    this.activeSection = id;
  }

  get authorQuery(): { author: string } | null {
    return this.authorProfile ? { author: this.authorProfile.name } : null;
  }

  formatDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
