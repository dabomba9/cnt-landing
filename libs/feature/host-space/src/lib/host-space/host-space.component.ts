import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HomeLocationsComponent } from '@cnt-workspace/ui';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavbarComponent } from '@cnt-workspace/ui';
import { SeoService, HostListingDraftService, ToastService } from '@cnt-workspace/data-access';
import { FooterComponent } from '@cnt-workspace/ui';
import { MagneticBtnDirective, prefersReducedMotion } from '@cnt-workspace/ui';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-workspace-host-space',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, NavbarComponent, HomeLocationsComponent, MagneticBtnDirective],
  templateUrl: './host-space.component.html',
  styleUrl: './host-space.component.css',
})
export class HostSpaceComponent implements OnInit, AfterViewInit, OnDestroy {
  nightsPerWeek = 3;
  nightlyRate = 50;
  numberOfSites = 1;
  isVideoOpen = false;
  openFaqIndex: number | null = null;

  readonly addonCategories = [
    { id: 'meals',       icon: 'egg',       label: 'Meals & food',  description: 'Farm breakfasts, fresh eggs, baked goods, a bottle of your vineyard\'s wine', image: 'assets/images/addon_vineyard.webp',   alt: 'Vineyard wine and food experience' },
    { id: 'experiences', icon: 'explore',   label: 'Experiences',   description: 'Guided tours, horseback rides, fishing trips, stargazing nights',              image: 'assets/images/addon_stargazing.webp', alt: 'Stargazing by Airstream under the Milky Way' },
    { id: 'products',    icon: 'sell',      label: 'Products',      description: 'Firewood bundles, local honey, handmade goods',                                image: 'assets/images/addon-woodpile.webp',       alt: 'Stacked firewood bundle' },
    { id: 'services',    icon: 'handyman',  label: 'Services',      description: 'Laundry, propane refills, equipment rentals, private chef dinners',             image: 'assets/images/addon_propane_refill.webp', alt: 'Propane refill station' },
    { id: 'activities',  icon: 'terrain',   label: 'Activities',    description: 'ATV rentals, hunting access, vineyard tastings, ranch experiences',             image: 'assets/images/addon_atv.webp',            alt: 'ATV riding on ranch trails' },
  ];

  activeAddonId = 'meals';

  // ============================================================================
  // P50 — Host testimonial carousel
  // ============================================================================

  readonly testimonials = [
    {
      quote: "Hosting on CurbNTurf turned our unused back acreage into real income. Setup took less than 10 minutes and the guests have been wonderful. It's the easiest money we've ever made.",
      name: 'Sarah & Tom Mitchell',
      location: 'Napa Valley Vineyard, California',
      initials: 'SM',
    },
    {
      quote: "We had two unused pasture corners that brought in zero. After three months on CurbNTurf they cover the property tax. Guests show up respectful, leave the place spotless, and most send a thank-you note.",
      name: 'Marcus Reed',
      location: 'Cattle Ranch, Wyoming',
      initials: 'MR',
    },
    {
      quote: "Living on the coast we wanted to share the view without dealing with a vacation rental. Driveway hosting was perfect — quiet, low maintenance, real travelers who appreciate the spot.",
      name: 'Jenna Park',
      location: 'Coastal Homestead, Oregon',
      initials: 'JP',
    },
    {
      quote: "We added a single overnight pad next to the taproom. Guests grab a flight after they park and we get a built-in audience that already loves what we do. Win for everyone.",
      name: 'Carlos Vega',
      location: 'Hill Country Brewery, Texas',
      initials: 'CV',
    },
    {
      quote: "My kids meet families from all over the country in their own front yard. The income is great but watching them give farm tours might be my favorite part. Hands down our best decision this year.",
      name: 'Dawn & Eli Watson',
      location: 'Family Farm, North Carolina',
      initials: 'DW',
    },
  ];

  activeTestimonialIdx = 0;
  private testimonialTimer: ReturnType<typeof setInterval> | null = null;
  private testimonialPaused = false;

  private startTestimonialRotation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (prefersReducedMotion()) return;
    this.testimonialTimer = setInterval(() => {
      if (!this.testimonialPaused) this.nextTestimonial();
    }, 7000);
  }

  nextTestimonial(): void {
    this.activeTestimonialIdx = (this.activeTestimonialIdx + 1) % this.testimonials.length;
  }

  prevTestimonial(): void {
    this.activeTestimonialIdx = (this.activeTestimonialIdx - 1 + this.testimonials.length) % this.testimonials.length;
  }

  setTestimonialIdx(i: number): void {
    this.activeTestimonialIdx = i;
  }

  pauseTestimonialRotation(): void { this.testimonialPaused = true; }
  resumeTestimonialRotation(): void { this.testimonialPaused = false; }

  get activeAddon() {
    return this.addonCategories.find(c => c.id === this.activeAddonId)!;
  }

  selectAddon(id: string): void {
    this.activeAddonId = id;
  }

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }
  videoUrl!: SafeResourceUrl;
  private readonly youtubeEmbedBase = 'https://www.youtube.com/embed/T7CZGDXC9Ag?autoplay=1&mute=1&rel=0';
  private scrollTriggers: ScrollTrigger[] = [];

  constructor(
    private seo: SeoService,
    private sanitizer: DomSanitizer,
    private drafts: HostListingDraftService,
    private toasts: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ============================================================================
  // P46 — Earnings calculator share + export
  // ============================================================================

  /** P46 — single source of truth for both the clipboard copy
   *  and the mailto body. Re-renders on every change-detection
   *  because the sliders mutate primitive state; cheap to compute. */
  get earningsSummary(): string {
    const tier = this.activeTier[0].toUpperCase() + this.activeTier.slice(1);
    return [
      'CurbNTurf — Hosting Earnings Estimate',
      '',
      `Tier: ${tier}`,
      `${this.nightsPerWeek} night${this.nightsPerWeek === 1 ? '' : 's'}/wk · $${this.nightlyRate}/night · ${this.numberOfSites} site${this.numberOfSites === 1 ? '' : 's'}`,
      '',
      `≈ $${this.monthlyEarnings.toLocaleString()}/mo · $${this.annualEarnings.toLocaleString()}/year`,
      '',
      'https://curbnturf.com/host',
    ].join('\n');
  }

  copyEarningsEstimate(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard?.writeText(this.earningsSummary).then(
      () => this.toasts.success('Estimate copied to clipboard.'),
      () => this.toasts.info('Copy failed — select the text manually.'),
    );
  }

  emailEarningsEstimate(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const subject = encodeURIComponent('My CurbNTurf hosting estimate');
    const body = encodeURIComponent(this.earningsSummary);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  /** True when the visitor has an in-progress wizard draft they can resume. */
  get hasDraft(): boolean { return !!this.drafts.current; }
  /** Title of the in-progress draft if any, for the resume banner. */
  get draftTitle(): string {
    return this.drafts.current?.title || 'your unfinished listing';
  }

  openVideo(): void {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.youtubeEmbedBase);
    this.isVideoOpen = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.add('cnt-modal-open');
    }
  }

  closeVideo(): void {
    this.isVideoOpen = false;
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('cnt-modal-open');
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isVideoOpen) this.closeVideo();
  }

  get activeTier(): 'basic' | 'standard' | 'premium' {
    if (this.nightlyRate < 35) return 'basic';
    if (this.nightlyRate <= 65) return 'standard';
    return 'premium';
  }

  get monthlyEarnings(): number {
    return Math.round(this.nightsPerWeek * this.nightlyRate * 4.33 * this.numberOfSites);
  }

  get annualEarnings(): number {
    return this.monthlyEarnings * 12;
  }

  get nightsFillPct(): string {
    return `${((this.nightsPerWeek - 1) / 6) * 100}%`;
  }

  get rateFillPct(): string {
    return `${((this.nightlyRate - 15) / 185) * 100}%`;
  }

  get sitesFillPct(): string {
    return `${((this.numberOfSites - 1) / 9) * 100}%`;
  }

  selectTier(tier: 'basic' | 'standard' | 'premium'): void {
    const midpoints = { basic: 25, standard: 50, premium: 90 };
    this.nightlyRate = midpoints[tier];
  }

  onNightsChange(e: Event): void {
    this.nightsPerWeek = +(e.target as HTMLInputElement).value;
  }

  onRateChange(e: Event): void {
    this.nightlyRate = +(e.target as HTMLInputElement).value;
  }

  onSitesChange(e: Event): void {
    this.numberOfSites = +(e.target as HTMLInputElement).value;
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Host Your Space & Earn | CurbNTurf',
      description: 'Share your land and earn real money. Join thousands of hosts earning an average of $1,200/month on CurbNTurf. List in under 10 minutes.',
      url: '/host',
    });
    // P55/A — LocalBusiness JSON-LD for Google rich results on the
    // host-onboarding page. Same array-emission pattern set in P49/P53.
    // No street address (CurbNTurf is a platform marketplace, not a
    // physical location); areaServed substitutes for Google's purposes.
    this.seo.setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'CurbNTurf',
      url: 'https://www.curbnturf.com/host',
      description: 'CurbNTurf connects private landowners with RV travelers seeking unique places to stay. Hosts earn real income from unused acreage with no membership fees and full control over bookings.',
      priceRange: 'Free to list',
      areaServed: { '@type': 'Country', name: 'United States' },
      potentialAction: {
        '@type': 'JoinAction',
        target: 'https://www.curbnturf.com/hosting/new',
        name: 'Start hosting',
      },
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initHeroEntrance();
      this.initScrollAnimations();
      this.startTestimonialRotation();
    }
  }

  private initHeroEntrance(): void {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.host-hero-eyebrow', { y: -16, opacity: 0, duration: 0.5 })
      .from('.host-hero-h1',      { y: 44,  opacity: 0, duration: 0.85 }, '-=0.2')
      .from('.host-hero-sub',     { y: 28,  opacity: 0, duration: 0.65 }, '-=0.45')
      .from('.host-hero-stats',   { y: 16,  opacity: 0, duration: 0.5  }, '-=0.35')
      .from('.host-hero-actions', { y: 16,  opacity: 0, duration: 0.5  }, '-=0.3')
      .from('.host-hero-visual',  { x: 48,  opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.9')
      .from('.host-hero-earnings-card', { y: 20, opacity: 0, duration: 0.55, ease: 'back.out(1.4)' }, '-=0.2')
      .from('.host-hero-listed-badge',  { x: -16, opacity: 0, duration: 0.5, ease: 'back.out(1.4)' }, '-=0.35');
  }

  private initScrollAnimations(): void {
    this.addST('.host-property-section', () => {
      gsap.from('.host-property-eyebrow, .host-property-h2, .host-property-sub', {
        y: 24, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
      });
      gsap.from('.host-property-pill', {
        y: 20, opacity: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out', delay: 0.3,
      });
    });

    this.addST('.host-tiers-section', () => {
      gsap.from('.host-tiers-section h2', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.host-tier-card', { y: 32, opacity: 0, duration: 0.55, stagger: 0.15, ease: 'power2.out', delay: 0.2 });
    });

    this.addST('.host-addons-section', () => {
      gsap.from('.host-addons-left', { x: -32, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.from('.host-addons-photo', { y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
    });

    this.addST('.host-calc-section', () => {
      gsap.from('.host-calc-heading', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.host-calc-body',    { y: 32, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.15 });
    });

    this.addST('.host-steps-section', () => {
      gsap.from('.host-steps-intro', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.host-step', { x: -28, opacity: 0, duration: 0.65, stagger: 0.2, ease: 'power2.out', delay: 0.2 });
    });

    this.addST('.host-trust-section', () => {
      gsap.from('.host-trust-item', { y: 32, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out' });
    });

    this.addST('.host-testimonial-section', () => {
      gsap.from('.host-testimonial', { y: 36, opacity: 0, duration: 0.8, ease: 'power3.out' });
    });

    this.addST('.host-cta-section', () => {
      gsap.from('.host-cta-inner', { scale: 0.97, opacity: 0, duration: 0.7, ease: 'power3.out' });
    });

    this.addST('.host-app-section', () => {
      gsap.from('.host-app-section .bg-cream', { y: 32, opacity: 0, duration: 0.8, ease: 'power3.out' });
    });
  }

  private addST(trigger: string, onEnter: () => void): void {
    const el = document.querySelector(trigger);
    if (!el) return;
    const st = ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter });
    this.scrollTriggers.push(st);
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
    if (this.testimonialTimer) clearInterval(this.testimonialTimer);
  }
}
