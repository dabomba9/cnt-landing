import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
}

const BASE_URL = 'https://www.curbnturf.com';
const DEFAULT_IMAGE = `${BASE_URL}/assets/images/og-default.jpg`;
const JSONLD_ID = 'cnt-jsonld';

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  /** Build absolute URLs from project-relative paths, leaving full URLs untouched. */
  absUrl(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return `${BASE_URL}/${path.replace(/^\/+/, '')}`;
  }

  /** Insert or replace a JSON-LD structured data <script> in <head>. Pass null to clear. */
  setStructuredData(data: object | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const head = document.head;
    if (!head) return;
    let script = head.querySelector<HTMLScriptElement>(`script#${JSONLD_ID}`);
    if (!data) {
      if (script) script.remove();
      return;
    }
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = JSONLD_ID;
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  update(config: SeoConfig): void {
    const ogType = config.type ?? 'website';
    const ogImage = config.image ?? DEFAULT_IMAGE;
    const fullUrl = `${BASE_URL}${config.url}`;

    this.title.setTitle(config.title);

    this.meta.updateTag({ name: 'description', content: config.description });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:url', content: fullUrl });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:site_name', content: 'CurbNTurf' });

    // Twitter / X Cards
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:site', content: '@curbnturf' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });

    // Canonical
    this.updateCanonical(fullUrl);
  }

  private updateCanonical(url: string): void {
    const head = document.querySelector('head');
    if (!head) return;
    let link: HTMLLinkElement | null = head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
