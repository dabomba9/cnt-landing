import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SeoService } from '../seo.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-workspace-host-space',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-space.component.html',
  styleUrl: './host-space.component.css',
})
export class HostSpaceComponent implements OnInit, AfterViewInit, OnDestroy {
  isMobileNavOpen = false;
  private scrollTriggers: any[] = [];

  constructor(
    private seo: SeoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Host Your Space & Earn | CurbNTurf',
      description: 'Turn your open land into an RV destination. Join thousands of hosts earning passive income with CurbNTurf. List your space in under 10 minutes — no experience needed.',
      url: '/host',
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initHeroEntrance();
      this.initStatCounters();
      this.initSafetySection();
      this.initTestimonial();
      this.initCta();
    }
  }

  private initHeroEntrance(): void {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.host-anim-badge',  { y: -20, opacity: 0, duration: 0.5 })
      .from('.host-anim-h1',     { y: 32,  opacity: 0, duration: 0.7 }, '-=0.2')
      .from('.host-anim-p',      { y: 24,  opacity: 0, duration: 0.6 }, '-=0.4')
      .from('.host-anim-btns',   { y: 20,  opacity: 0, duration: 0.5 }, '-=0.3')
      .from('.host-anim-img',    { x: 40,  opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.7');
  }

  private initStatCounters(): void {
    const statNums = document.querySelectorAll('.host-stat-num');
    const targets = [
      { el: statNums[0], from: 0, to: 1200, prefix: '$', suffix: '',   round: true  },
      { el: statNums[1], from: 0, to: 150,  prefix: '',  suffix: 'k+', round: true  },
      { el: statNums[2], from: 0, to: 4.9,  prefix: '',  suffix: '',   round: false },
    ];

    const cards = document.querySelectorAll('.host-stat-card');
    if (!cards.length) return;

    const st = ScrollTrigger.create({
      trigger: '.host-stat-card',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        // Cards stagger in
        gsap.from(cards, {
          y: 40, opacity: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
        });

        // Counter roll-up
        targets.forEach(({ el, from, to, prefix, suffix, round }) => {
          if (!el) return;
          const proxy = { val: from };
          gsap.to(proxy, {
            val: to,
            duration: 1.8,
            ease: 'power2.out',
            delay: 0.3,
            onUpdate: () => {
              const v = round ? Math.round(proxy.val) : proxy.val.toFixed(1);
              el.textContent = `${prefix}${v}${suffix}`;
            },
          });
        });
      },
    });
    this.scrollTriggers.push(st);

    // Also animate the section heading
    const st2 = ScrollTrigger.create({
      trigger: '.host-anim-earnings-heading',
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.from('.host-anim-earnings-heading', {
          y: 24, opacity: 0, duration: 0.6, ease: 'power3.out',
        });
      },
    });
    this.scrollTriggers.push(st2);
  }

  private initSafetySection(): void {
    const st1 = ScrollTrigger.create({
      trigger: '.host-safety-heading',
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.from('.host-safety-heading', {
          x: -30, opacity: 0, duration: 0.7, ease: 'power3.out',
        });
        gsap.from('.host-safety-item', {
          x: -24, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out', delay: 0.2,
        });
      },
    });
    this.scrollTriggers.push(st1);

    // Image grid columns stagger
    const imgCols = document.querySelectorAll('.host-safety-img-col');
    if (imgCols.length) {
      const st2 = ScrollTrigger.create({
        trigger: imgCols[0],
        start: 'top 82%',
        once: true,
        onEnter: () => {
          gsap.from(imgCols, {
            y: 30, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'power3.out',
          });
        },
      });
      this.scrollTriggers.push(st2);
    }
  }

  private initTestimonial(): void {
    const st = ScrollTrigger.create({
      trigger: '.host-testimonial',
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.from('.host-testimonial', {
          y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
        });
      },
    });
    this.scrollTriggers.push(st);
  }

  private initCta(): void {
    const st = ScrollTrigger.create({
      trigger: '.host-cta-heading',
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.from('.host-cta-heading', {
          y: 28, opacity: 0, duration: 0.7, ease: 'power3.out',
        });
        gsap.from('.host-cta-heading ~ div', {
          y: 20, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.2,
        });
      },
    });
    this.scrollTriggers.push(st);
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
    ScrollTrigger.getAll().forEach(st => st.kill());
  }
}
