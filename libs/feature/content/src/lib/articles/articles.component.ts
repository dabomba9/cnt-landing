import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { CinematicRollDirective } from '@cnt-workspace/ui';
import { MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

export type ArticleCategory = 'all' | 'travel-tips' | 'host-stories' | 'rv-life' | 'gear-reviews' | 'destinations';

export interface IArticleCard {
  id: number;
  category: Exclude<ArticleCategory, 'all'>;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
  image: string;
}

export const ARTICLE_CATEGORIES: { id: ArticleCategory; label: string; icon: string }[] = [
  { id: 'all',           label: 'All',            icon: 'all_inclusive' },
  { id: 'travel-tips',   label: 'Travel Tips',    icon: 'tips_and_updates' },
  { id: 'host-stories',  label: 'Host Stories',   icon: 'campaign' },
  { id: 'rv-life',       label: 'RV Life',        icon: 'rv_hookup' },
  { id: 'gear-reviews',  label: 'Gear Reviews',   icon: 'inventory_2' },
  { id: 'destinations',  label: 'Destinations',   icon: 'explore' },
];

const ARTICLES: IArticleCard[] = [
  { id:1, category:'destinations', title:'The Best Hidden RV Stays in Wine Country', excerpt:'Forty miles of vineyards, working farms, and quiet ranches across Napa, Sonoma, and Paso Robles — far from the crowds.', readTime:'8 min read', date:'2026-04-22', image:'assets/images/host_vineyard.webp' },
  { id:2, category:'travel-tips', title:'Boondocking 101: Everything First-Timers Need', excerpt:'Power management, water conservation, choosing the right site, and the unwritten etiquette of off-grid camping.', readTime:'12 min read', date:'2026-04-15', image:'assets/images/host_opportunity.webp' },
  { id:3, category:'host-stories', title:'How a Family Farm Turned Hosting into Their Best Crop', excerpt:'Meet the Hartleys — a fourth-generation Iowa farm now welcoming RVers and earning more than corn ever did.', readTime:'6 min read', date:'2026-04-08', image:'assets/images/host_farm.webp' },
  { id:4, category:'rv-life', title:'Living Full-Time in 200 Square Feet, Six Years Strong', excerpt:'Honest reflections on what works, what breaks, and what we wish we knew before going full-time.', readTime:'10 min read', date:'2026-03-30', image:'assets/images/host_village.webp' },
  { id:5, category:'gear-reviews', title:'2026 Solar Panel Roundup: What Actually Works', excerpt:'We tested twelve portable solar setups in real conditions. Here are the four worth your money.', readTime:'14 min read', date:'2026-03-22', image:'assets/images/host_hops.webp' },
  { id:6, category:'destinations', title:'Six Underrated Brewery Stays Across the Pacific Northwest', excerpt:'From Bend to Walla Walla, breweries that double as some of the best overnight RV spots on the map.', readTime:'7 min read', date:'2026-03-14', image:'assets/images/host_brewery.webp' },
  { id:7, category:'host-stories', title:'From Empty Pasture to Full Calendar in One Season', excerpt:'A first-year host shares exactly what they listed, what they charged, and what made guests come back.', readTime:'9 min read', date:'2026-03-05', image:'assets/images/host_alpaca.webp' },
  { id:8, category:'travel-tips', title:'How to Plan a 30-Day Roadtrip Without Burning Out', excerpt:'Pacing, pre-booking strategy, layover days, and the rule we wish we followed on our first cross-country trip.', readTime:'11 min read', date:'2026-02-26', image:'assets/images/host_dairy.webp' },
];

@Component({
  selector: 'cnt-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss',
})
export class ArticlesComponent implements OnInit, AfterViewInit, OnDestroy {
  ARTICLE_CATEGORIES = ARTICLE_CATEGORIES;
  selectedCategory: ArticleCategory = 'all';
  searchQuery = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Articles & Stories — CurbNTurf | The RV Freedom Experience',
      description: 'Travel tips, host stories, gear reviews, and destination guides for the modern RVer. Brought to you by CurbNTurf.',
      url: '/articles',
      robots: 'noindex, nofollow',
    });
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

  get filteredArticles(): IArticleCard[] {
    const q = this.searchQuery.trim().toLowerCase();
    return ARTICLES.filter(a => {
      if (this.selectedCategory !== 'all' && a.category !== this.selectedCategory) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
    });
  }

  selectCategory(cat: ArticleCategory): void {
    this.selectedCategory = cat;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  ngOnDestroy(): void {}
}
