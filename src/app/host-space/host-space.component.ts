import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../seo.service';
import { FooterComponent } from '../footer/footer.component';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-workspace-host-space',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
  templateUrl: './host-space.component.html',
  styleUrl: './host-space.component.css',
})
export class HostSpaceComponent implements OnInit, AfterViewInit, OnDestroy {
  isMobileNavOpen = false;
  nightsPerWeek = 3;
  nightlyRate = 45;
  private scrollTriggers: any[] = [];

  constructor(
    private seo: SeoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get monthlyEarnings(): number {
    return Math.round(this.nightsPerWeek * this.nightlyRate * 4.33);
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

  onNightsChange(e: Event): void {
    this.nightsPerWeek = +(e.target as HTMLInputElement).value;
  }

  onRateChange(e: Event): void {
    this.nightlyRate = +(e.target as HTMLInputElement).value;
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
      .from('.host-hero-visual',  { x: 48,  opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.9');
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
