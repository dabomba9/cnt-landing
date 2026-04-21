import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HomeLocationsComponent } from '../home/components/home-locations/home-locations.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavbarComponent } from '../navbar/navbar.component';
import { SeoService } from '../seo.service';
import { FooterComponent } from '../footer/footer.component';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-workspace-host-space',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, NavbarComponent, HomeLocationsComponent],
  templateUrl: './host-space.component.html',
  styleUrl: './host-space.component.css',
})
export class HostSpaceComponent implements OnInit, AfterViewInit, OnDestroy {
  nightsPerWeek = 3;
  nightlyRate = 50;
  numberOfSites = 1;
  isVideoOpen = false;
  openFaqIndex: number | null = null;

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }
  videoUrl!: SafeResourceUrl;
  private readonly youtubeEmbedBase = 'https://www.youtube.com/embed/T7CZGDXC9Ag?autoplay=1&mute=1&rel=0';
  private scrollTriggers: any[] = [];

  constructor(
    private seo: SeoService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  openVideo(): void {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.youtubeEmbedBase);
    this.isVideoOpen = true;
  }

  closeVideo(): void {
    this.isVideoOpen = false;
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
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
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initHeroEntrance();
      this.initScrollAnimations();
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
  }

  private addST(trigger: string, onEnter: () => void): void {
    const el = document.querySelector(trigger);
    if (!el) return;
    const st = ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter });
    this.scrollTriggers.push(st);
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
  }
}
