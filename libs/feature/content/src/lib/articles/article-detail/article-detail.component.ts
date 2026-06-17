import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { ArticlePreferencesService, SeoService, ToastService } from '@cnt-workspace/data-access';
import { ARTICLES } from '../articles.data';
import { AUTHORS, CATEGORY_CTA, CATEGORY_META, IArticle, IAuthor, ICategoryCta, authorInitials } from '../articles.types';
import { NewsletterSignupComponent } from '../../newsletter-signup/newsletter-signup.component';
import { ARTICLE_IMAGE_HEIGHT, ARTICLE_IMAGE_WIDTH, buildArticleSchema } from '../article-schema.util';

interface ITocEntry {
  id: string;
  label: string;
}

@Component({
  selector: 'cnt-article-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, NewsletterSignupComponent],
  templateUrl: './article-detail.component.html',
  styleUrls: ['./article-detail.component.scss'],
})
export class ArticleDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  article: IArticle | null = null;
  body: SafeHtml = '';
  prev: IArticle | null = null;
  next: IArticle | null = null;
  related: IArticle[] = [];
  /** The oldest article in the same category, excluding the current
   *  one. Drives the "From the archive" callout at the foot of the
   *  reading panel. */
  archiveArticle: IArticle | null = null;
  readonly CATEGORY_META = CATEGORY_META;

  tocEntries: ITocEntry[] = [];
  activeSection: string | null = null;
  authorProfile: IAuthor | null = null;
  progress = 0;
  /** True for ~1.5s after a successful copy-link — flips the share
   *  bar's copy icon to a check. */
  justCopied = false;

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
    private toasts: ToastService,
  ) {}

  toggleSave(): void {
    if (this.article) this.prefs.toggleSave(this.article.id);
  }

  /** Absolute URL for the article — used by all three share buttons. */
  private get shareUrl(): string {
    if (!this.article) return '';
    return this.seo.absUrl(`/article/${this.article.id}/${this.article.slug}`);
  }

  shareTwitter(): void {
    if (!this.article || !isPlatformBrowser(this.platformId)) return;
    const text = encodeURIComponent(this.article.title);
    const url = encodeURIComponent(this.shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  }

  shareLinkedIn(): void {
    if (!this.article || !isPlatformBrowser(this.platformId)) return;
    const url = encodeURIComponent(this.shareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  }

  copyLink(): void {
    if (!this.article || !isPlatformBrowser(this.platformId)) return;
    const url = this.shareUrl;
    navigator.clipboard?.writeText(url).then(
      () => {
        this.toasts.success('Link copied to clipboard.');
        this.justCopied = true;
        window.setTimeout(() => { this.justCopied = false; }, 1500);
      },
      () => this.toasts.info('Copy failed — select and copy manually.'),
    );
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
      this.archiveArticle = null;
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

    // From the archive: oldest sibling in the same category, if any.
    this.archiveArticle = ARTICLES
      .filter(x => x.id !== a.id && x.category === a.category)
      .sort((x, y) => x.publishedAt.localeCompare(y.publishedAt))[0] ?? null;

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
    let html = raw.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (match, attrs: string | undefined, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!label) return match;
      const id = slug(label);
      toc.push({ id, label });
      const cleanedAttrs = (attrs ?? '').replace(/\sid="[^"]*"/i, '');
      return `<h2${cleanedAttrs} id="${id}">${inner}</h2>`;
    });

    // Detect Webflow-baked "Key Takeaways" intro blocks — the imported
    // bodies ship them as <p><strong>Key Takeaways</strong></p><ul>…</ul>.
    // Wrap the pair in an <aside class="key-takeaways"> so the SCSS
    // can promote the block into a styled callout box. Only the first
    // occurrence per body is wrapped (the pattern is an intro idiom).
    html = html.replace(
      /<p>\s*<strong>\s*Key\s*Takeaways\s*<\/strong>\s*<\/p>\s*<ul[\s\S]*?<\/ul>/i,
      (m) => `<aside class="key-takeaways">${m}</aside>`,
    );

    // Rewrite curbnturf.com URLs. Article links become relative paths
    // looked up against the local catalog so they SPA-navigate via
    // onBodyClick(). Known top-level routes (/, /host, /search, etc.)
    // collapse to the bare path. Unknown paths
    // (/rv-camping, /article-documents/*.pdf, /sign-up, etc.) stay
    // absolute and gain target="_blank" so they open in a new tab.
    html = this.rewriteCurbnturfUrls(html);

    return { html, toc };
  }

  /** Convert article-body anchors that point at curbnturf.com to
   *  in-app routes where possible. Pure string transform; safe in SSR. */
  private rewriteCurbnturfUrls(html: string): string {
    const INTERNAL_PATHS = new Set(['/', '/host', '/search', '/articles', '/faq', '/contact', '/terms']);

    return html.replace(
      /<a([^>]*)href="https?:\/\/(?:www\.)?curbnturf\.com([^"]*)"([^>]*)>/gi,
      (match, before: string, rawPath: string, after: string) => {
        const path = rawPath || '/';
        // Article links — look up the local slug by id so the URL is
        // canonical even if the live-site slug drifted.
        const articleMatch = /^\/article\/(\d+)(?:\/|$)/.exec(path);
        if (articleMatch) {
          const id = parseInt(articleMatch[1], 10);
          const local = ARTICLES.find(a => a.id === id);
          const href = local ? `/article/${id}/${local.slug}` : `/article/${id}`;
          return `<a${before}href="${href}"${after}>`;
        }
        // Bare top-level routes that exist locally.
        if (INTERNAL_PATHS.has(path)) {
          return `<a${before}href="${path}"${after}>`;
        }
        // Unknown paths (PDFs, marketing pages we don't host yet) —
        // keep the absolute URL but force a new tab.
        const combinedAttrs = `${before}${after}`;
        const hasTarget = /\starget=/.test(combinedAttrs);
        const hasRel = /\srel=/.test(combinedAttrs);
        const extra = `${hasTarget ? '' : ' target="_blank"'}${hasRel ? '' : ' rel="noopener noreferrer"'}`;
        return `<a${before}href="https://www.curbnturf.com${path}"${after}${extra}>`;
      },
    );
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

  /** Delegated click handler on the body container. Lets the Angular
   *  router handle relative links (rewritten by processBody) so a
   *  click stays an SPA navigation instead of a full page reload.
   *  External / new-tab / modifier-key clicks fall through to the
   *  browser. */
  onBodyClick(event: MouseEvent): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    const href = anchor.getAttribute('href') ?? '';
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
    if (!isPlatformBrowser(this.platformId)) return;
    event.preventDefault();
    this.router.navigateByUrl(href);
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

  /** Per-category end-of-body conversion card — null for editorial-
   *  only categories where no funnel link makes sense. */
  get categoryCta(): ICategoryCta | null {
    return this.article ? CATEGORY_CTA[this.article.category] : null;
  }

  /** "Read this next" single-card pick. Heuristic v1: the second-most-
   *  recent article in the same category (skipping the current article
   *  and the archive pick). Falls back to the next-most-recent article
   *  overall if the category is thin. Null when nothing fits. */
  get readNextArticle(): IArticle | null {
    if (!this.article) return null;
    const currentId = this.article.id;
    const archiveId = this.archiveArticle?.id;
    const sameCategory = ARTICLES.filter(x =>
      x.id !== currentId && x.id !== archiveId && x.category === this.article!.category,
    );
    if (sameCategory.length > 0) return sameCategory[0];
    const anyOther = ARTICLES.find(x => x.id !== currentId && x.id !== archiveId);
    return anyOther ?? null;
  }

  formatDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
