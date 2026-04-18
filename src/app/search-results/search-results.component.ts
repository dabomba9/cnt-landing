import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SeoService } from '../seo.service';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-workspace-search-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.css',
})
export class SearchResultsComponent implements OnInit, AfterViewInit, OnDestroy {
  searchParams: any = {};
  isNavbarVisible = true;
  isMobileNavOpen = false;
  private lastScrollY = 0;
  private scrollTriggers: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService
  ) {}

  mockListings = [
    {
      title: 'Heritage Oak Vineyard',
      location: 'St. Helena, California',
      rating: 4.9,
      price: 125,
      features: ['50 Amp', 'Water Hookup', 'Dual Slide-outs'],
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMSSzTn9kqF7c6BEuajUgT8dut_ocHYwPVRRor8bRpR4-m06iktLYln_ODD4T5QRJFXOO1hd15MvRe2UC03d4P4v6n_cKge5IXhjmKDeYv7KIHpVSWpBjG1aMmTEuNbfc_-jSOZdBYaobQm1lgIiZ1KQ458IfO-PLgxBgEiakSO9ZKNv_cjJur5xoCT2gJrk2gabkF6zobnfGfM-L6wFDhJDTtA9dZmlteolLjPNEYUG1snlCDlJc9aRuASHJmPSalkDe4LAdCi9Q'
    },
    {
      title: 'Whispering Pines Winery',
      location: 'Alexander Valley, CA',
      rating: 4.7,
      price: 95,
      features: ['30 Amp', 'Pet Friendly'],
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAy57M8LTuVo1cPFh1N51jC1f9qJtX7CKzBO4T5i6CkDPX1IuhohB7bHQ49QL5aZrNIoMbyqifLH_xk_sshBzDijZOXDQrTzIJfotUTeODGYXx0a8XRjjkVacgbdn_-Br5Brg3uDkJ4hgQextQOwGfiZa5XvX24gxKa1OlQkXO7spqwwsJYxe4q9Umx1sUl8Is4K9EHTqnvfhseGHdSbyl5rEV1d-XXCsEkzEFWaOkT_Px-sh1bywBYs2LyypgMqT0IFX0fAXbaCjE'
    },
    {
      title: 'Summit Crest Estate',
      location: 'Sonoma Coast, CA',
      rating: 5.0,
      price: 165,
      features: ['Full Hookups', 'Wifi'],
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk-eXO_c9sj-x37mx1Fi7buhf7yoxFTzbnoDt8ziktTo2PlUgVvNPuIPXHBeKnhb4qd0InqRr799fxAs0JsDCUIqTo3TkVY2APxP7-osJmsrCSsn6EWJPaaZnO_CVqc7Rsc-X4-eBb42_p1BSvlDjkoG8GaOY6bb02UHdJ1reeVbYnh0AsHkx5L6LQWR2YC9aRjsxOslldfQVwvOsvgf1uYIwfGI0sVGVYxQ3-e3i9fBI3R7nZvRQ6MsuJt1ttewNZyerNzRVPcFs'
    }
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Search RV Spots & Campsites | CurbNTurf',
      description: 'Browse hundreds of unique private RV spots across the US. Filter by state, amenities, and hookups. Book directly with hosts — no membership fees.',
      url: '/search',
    });
    this.route.queryParams.subscribe(params => {
      this.searchParams = params;
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initListingAnimations();
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    this.isNavbarVisible = !(currentScrollY > this.lastScrollY && currentScrollY > 100);
    this.lastScrollY = currentScrollY;
  }

  private initListingAnimations(): void {
    // Header entrance
    gsap.from('.search-header', {
      y: 24,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    });

    // Listing cards staggered scroll reveal
    const cards = document.querySelectorAll('.listing-card');
    cards.forEach((card, i) => {
      const st = ScrollTrigger.create({
        trigger: card,
        start: 'top 88%',
        onEnter: () => {
          gsap.fromTo(card,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out', delay: i * 0.08 }
          );
        },
        once: true,
      });
      this.scrollTriggers.push(st);
    });

    // Filter bar slide down
    gsap.from('.filters-bar', {
      y: -12,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      delay: 0.2,
    });
  }

  get headerTitle(): string {
    if (this.searchParams.mode === 'roadtrip') {
      return 'Roadtrip Route';
    } else if (this.searchParams.dest) {
      return `Stays near ${this.searchParams.dest}`;
    } else if (this.searchParams.state) {
      return `Stays in ${this.searchParams.state.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
    }
    return 'Curated Collection';
  }

  get resultCount(): string {
    const n = this.mockListings.length;
    return `${n} stay${n !== 1 ? 's' : ''} found`;
  }

  clearFilter(key: string): void {
    const updated = { ...this.searchParams };
    delete updated[key];
    this.searchParams = updated;
    this.router.navigate([], { queryParams: updated, replaceUrl: true });
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLElement;
    img.classList.add('img-loaded');
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
  }
}
