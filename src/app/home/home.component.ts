import { Component, AfterViewInit, OnDestroy, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../footer/footer.component';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';
import { NavbarComponent } from '../navbar/navbar.component';
import { HomeLocationsComponent } from './components/home-locations/home-locations.component';
import { HomeFaqComponent } from './components/home-faq/home-faq.component';
import { HomeMasonryComponent } from './components/home-masonry/home-masonry.component';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { SeoService } from '../seo.service';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, CinematicRollDirective, HomeLocationsComponent, HomeFaqComponent, HomeMasonryComponent, HomeHeroComponent, NavbarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  isNavbarVisible = true;
  private lastScrollY = 0;
  private scrollTriggers: any[] = [];

  isVideoOpen = false;
  videoUrl!: SafeResourceUrl;
  private readonly brandVideoEmbed = 'https://www.youtube.com/embed/vuisyx-U944?autoplay=1&rel=0';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
    private sanitizer: DomSanitizer
  ) {}

  openVideo(): void {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.brandVideoEmbed);
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

  ngOnInit(): void {
    this.seo.update({
      title: 'CurbNTurf | Find Your RV Spot — Private Land Camping & Stays',
      description: 'Find unique private RV spots on farms, vineyards, and ranches across the US. Book directly with hosts. No membership fees. The RV Freedom Experience.',
      url: '/',
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initStickyScroll();
      this.initLineAnimations();

      
      // GSAP interactions
      this.initStaggeredCards();
      this.initHowItWorks();
      this.initMagneticButtons();
      this.initStatsCounters();
      this.initNetworkAnimatedSection();
      this.initCardPhysics();
      this.initTrustColorShift();
      this.initAppDownloadSection();
      this.initCtaSection();
    }
  }

  // -----------------------------

  toggleMobileNav(): void {
    const navMenu = document.querySelector('.nav-menu');
    navMenu?.classList.toggle('is-open');
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    
    // Hide navbar if scrolling down and past 100px. Show if scrolling up.
    if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
      this.isNavbarVisible = false;
    } else {
      this.isNavbarVisible = true;
    }
    
    this.lastScrollY = currentScrollY;
  }


  private initStickyScroll(): void {
    const sectionHeight = document.querySelector('.section-height') as HTMLElement;
    const trackFlex = document.querySelector('.track-flex') as HTMLElement;
    if (!sectionHeight || !trackFlex) return;

    const panelNames = ['one', 'two', 'three', 'four', 'five'];
    const root = document.documentElement;

    // Initialize SVG line offsets to hidden state
    panelNames.forEach(name => {
      root.style.setProperty(`--panel_${name}_line_offset`, '-400%');
    });

    // Horizontal scroll: move .track left as user scrolls through .section-height
    const st = gsap.to('.track', {
      x: () => -(trackFlex.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: '.section-height',
        scrub: 1,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self: { progress: number }) => {
          // Animate SVG line offsets panel by panel
          const progress = self.progress;
          panelNames.forEach((name, i) => {
            const panelStart = i / 5;
            const panelEnd = (i + 1) / 5;
            const local = Math.max(0, Math.min(1, (progress - panelStart) / (panelEnd - panelStart)));
            const offset = (1 - local) * -400;
            root.style.setProperty(`--panel_${name}_line_offset`, `${offset}%`);
          });
        }
      }
    });

    if (st.scrollTrigger) {
      this.scrollTriggers.push(st.scrollTrigger);
    }
  }

  private initLineAnimations(): void {
    const lines = document.querySelectorAll('.line_animation');
    lines.forEach((line) => {
      const st = ScrollTrigger.create({
        trigger: line,
        start: 'top 85%',
        onEnter: () => line.classList.add('is-visible')
      });
      this.scrollTriggers.push(st);
    });

    this.initFavoriteHosts();
  }

  private initFavoriteHosts(): void {
    const hostsWrap = document.querySelector('.gsap-favorite-hosts-wrap');
    if (hostsWrap) {
      const hostCards = gsap.utils.toArray('.gsap-favorite-host-card');
      const hostAnimation = gsap.from(hostCards, {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        paused: true
      });
      const stHosts = ScrollTrigger.create({
        trigger: hostsWrap,
        start: 'top 85%',
        onEnter: () => hostAnimation.play()
      });
      this.scrollTriggers.push(stHosts);
    }
  }

  private initStaggeredCards(): void {
    const wrap = document.querySelector('.gsap-collections-wrap');
    if (!wrap) return;
    const cards = gsap.utils.toArray('.gsap-collection-card');
    
    // Bottom-up entrance reveal
    gsap.from(cards, {
      y: 60,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: wrap,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  private initHowItWorks(): void {
    const wrap = document.querySelector('.gsap-how-works-wrap');
    if (!wrap) return;
    const steps = gsap.utils.toArray('.gsap-how-step');

    // Slow, luxuriant cinematic fade sequence
    gsap.from(steps, {
      y: 60,
      opacity: 0,
      duration: 1.2,
      stagger: 0.3,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: wrap,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });

    // Weaving SVG Thread Micro-Animation
    const maskPaths = gsap.utils.toArray('.journey-mask-path') as SVGPathElement[];
    maskPaths.forEach(path => {
      const length = path.getTotalLength() || 1000;

      // Completely hide the mask
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length
      });

      // Dynamically scrub the mask stroke back into view
      gsap.to(path, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top 60%',
          end: 'bottom 80%',
          scrub: 1
        }
      });
    });
  }

  private initMagneticButtons(): void {
    const buttons = document.querySelectorAll('.magnetic-btn');
    buttons.forEach((btn: any) => {
      btn.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        // Calculate offset from current center
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        // Move element physically slightly towards the mouse
        gsap.to(btn, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.6,
          ease: 'power3.out'
        });
      });

      // Snap back to 0 immediately with elastic bounce when mouse leaves
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.3)'
        });
      });
    });
  }

  private initStatsCounters(): void {
    const wrap = document.querySelector('.gsap-stats-wrap');
    if (!wrap) return;
    const stats = gsap.utils.toArray('.gsap-stat-number');
    
    stats.forEach((stat: any) => {
      const targetStr = stat.getAttribute('data-target');
      if (!targetStr) return;
      
      const targetVal = parseFloat(targetStr);
      const isInteger = targetVal % 1 === 0;
      const suffix = stat.getAttribute('data-suffix') || '';
      
      const proxy = { val: 0 };

      const st = ScrollTrigger.create({
        trigger: wrap,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(proxy, {
            val: targetVal,
            duration: 2,
            ease: 'power2.out',
            onUpdate: () => {
              const formatted = isInteger ? Math.round(proxy.val).toString() : proxy.val.toFixed(1);
              stat.innerHTML = formatted + suffix;
            }
          });
        }
      });
      this.scrollTriggers.push(st);
    });
  }

  private initNetworkAnimatedSection(): void {
    const container = document.querySelector('.network-text-container') as HTMLElement;
    const btnContainer = document.querySelector('.network-btn-container') as HTMLElement;
    if (!container) return;

    // Helper to safely split text nodes into words and chars without destroying HTML tags
    const splitTextNodes = (element: HTMLElement) => {
      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (!text || !text.trim().length) return;
          
          const words = text.split(/(\s+)/); // keep spaces separate
          const fragment = document.createDocumentFragment();
          
          words.forEach(wordText => {
            if (wordText.trim() === '') {
              fragment.appendChild(document.createTextNode(wordText));
            } else {
              const wordSpan = document.createElement('span');
              wordSpan.className = 'word inline-block whitespace-nowrap';
              
              const chars = wordText.split('');
              chars.forEach(char => {
                const charSpan = document.createElement('span');
                charSpan.className = 'char inline-block opacity-0';
                // Use a starting transform for the blur reveal
                charSpan.style.transform = 'translateY(20px) scale(1.1)';
                charSpan.style.filter = 'blur(10px)';
                charSpan.textContent = char;
                wordSpan.appendChild(charSpan);
              });
              fragment.appendChild(wordSpan);
            }
          });
          node.parentNode?.replaceChild(fragment, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.classList.contains('category-pill')) {
            el.classList.add('char', 'opacity-0');
            el.style.transform = 'translateY(20px) scale(1.1)';
            el.style.filter = 'blur(10px)';
            // We consciously do NOT parse child nodes here so the entire pill pops in as one sequence step.
          } else if (el.classList.contains('material-symbols-outlined')) {
            // Apply character animation classes to icons so they stagger in sequence
            el.classList.add('char', 'inline-block', 'opacity-0');
            el.style.transform = 'translateY(20px) scale(1.1)';
            el.style.filter = 'blur(10px)';
          } else {
            Array.from(el.childNodes).forEach(processNode);
          }
        }
      };
      
      Array.from(element.childNodes).forEach(processNode);
    };

    // 1. Split the text
    splitTextNodes(container);

    // 2. Animate it
    const chars = container.querySelectorAll('.char');
    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(chars, {
          y: 0,
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          stagger: 0.015,
          duration: 1.2,
          ease: 'power3.out'
        });
        if (btnContainer) {
          gsap.to(btnContainer, {
            y: 0,
            opacity: 1,
            duration: 1,
            delay: 0.5,
            ease: 'power3.out'
          });
        }
      },
      once: true
    });
    this.scrollTriggers.push(st);
  }

  private initTrustColorShift(): void {
    const section = document.querySelector('.trust-dynamic-section') as HTMLElement;
    const track = document.querySelector('.trust-marquee-track') as HTMLElement;
    if (!section) return;

    // Scrub the Right Column Cards vertically on scroll so they float up endlessly
    if (track) {
      const stCards = ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        end: 'bottom top',
        scrub: 1,
        animation: gsap.fromTo(track,
          { y: 50 },
          { y: -150, ease: 'none' }
        )
      });
      this.scrollTriggers.push(stCards);
    }
  }


  private initAppDownloadSection(): void {
    const wrap = document.querySelector('.gsap-app-download-wrap');
    if (!wrap) return;

    // Reveal animation
    const stReveal = ScrollTrigger.create({
      trigger: wrap,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to('.gsap-app-left', { y: 0, opacity: 1, duration: 1, ease: 'power3.out' });
        gsap.to('.gsap-app-right', { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: 'power3.out' });
      }
    });

    // Floating yoyo physics for phones
    gsap.to('.gsap-app-phones', {
      y: -15,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    this.scrollTriggers.push(stReveal);
  }

  initCardPhysics() {
    setTimeout(() => {
      const scrollSection = document.querySelector('.horizontal-cards-section') as HTMLElement;
      const scrollWrap = document.querySelector('.exhibit-list-wrap') as HTMLElement;

      if (scrollSection && scrollWrap) {
        const introEl = document.querySelector('.card-stack-intro') as HTMLElement;
        const cardWrappers = gsap.utils.toArray('.exhibit-card-wrapper') as HTMLElement[];
        const scrollDistance = scrollWrap.scrollWidth + window.innerWidth;

        // Programmatically generate random motion per card so no two scrolls look alike
        const easePool = [
          'sine.inOut', 'power1.inOut', 'power2.inOut', 'power3.inOut',
          'circ.inOut', 'expo.out', 'back.out(1.2)', 'power1.out',
          'power2.out', 'sine.out', 'power3.out',
        ];
        const randEase     = () => easePool[Math.floor(Math.random() * easePool.length)];
        const randBetween  = (min: number, max: number) => min + Math.random() * (max - min);
        const randSign     = () => Math.random() > 0.5 ? 1 : -1;

        const variants = cardWrappers.map(() => {
          const xDrift    = randBetween(30, 110) * randSign();
          const frameCount = 2 + Math.floor(Math.random() * 4); // 2–5 keyframes
          const motion = Array.from({ length: frameCount }, () => ({
            y:        randBetween(25, 90) * randSign(),
            rotation: randBetween(3, 16)  * randSign(),
            ease:     randEase(),
          }));
          return { xDrift, motion };
        });

        const tl = gsap.timeline();
        const panPosition = 0;

        // Fade out intro headline steadily as cards begin scrolling over it
        if (introEl) {
          tl.to(introEl, { opacity: 0, ease: 'none', duration: 0.3 }, panPosition);
        }

        // Main wrapper pans all cards horizontally together
        tl.fromTo(scrollWrap,
          { x: () => window.innerWidth },
          { x: () => -(scrollWrap.scrollWidth + window.innerWidth * 0.2), ease: 'none', duration: 1 },
          panPosition
        );

        // Reveal the nested Outro block as the cards slide off the left side
        const outroReveal = document.querySelector('.mo-outro-reveal') as HTMLElement;
        if (outroReveal) {
          // Fade it in earlier in the scroll scrub (while final cards are sweeping over it)
          tl.to(outroReveal, { opacity: 1, duration: 0.25, ease: 'power2.inOut' }, 0.55);
          // Enable inner pointer events for the button only when fully revealed
          tl.set(outroReveal, { pointerEvents: 'auto' }, 0.55);
        }

        // Layer per-card variance on top of the wrapper pan
        cardWrappers.forEach((card, i) => {
          const v = variants[i];
          if (!v) return;
          // X drift — constant speed offset (linear so it doesn't fight the wrapper ease)
          tl.to(card, { x: v.xDrift, ease: 'none', duration: 1 }, panPosition);
          // Combined y / rotation / scale path — fully unique per card
          tl.to(card, { keyframes: v.motion, duration: 1 }, panPosition);
        });

        // Give the outro text and button a moment to breathe, then overlap section slides up
        tl.fromTo('.content-overlap-wrap',
          { marginTop: '0px' },
          { marginTop: () => `-${window.innerHeight}px`, ease: 'none', duration: 0.5 },
          1.2 // Starts at 1.2, which is slightly after the 1s card transition completes
        );

        const overlapWrap = document.querySelector('.content-overlap-wrap') as HTMLElement;

        const scrollPinSt = ScrollTrigger.create({
          trigger: scrollSection,
          pin: true,
          anticipatePin: 1,
          scrub: 1,
          start: 'top top',
          end: () => `+=${scrollDistance}`, // Standardized scrub distance
          animation: tl,
          invalidateOnRefresh: true
        });
        this.scrollTriggers.push(scrollPinSt);
      }
    }, 100);
  }

  private initCtaSection(): void {
    const el = document.querySelector('.home-cta-inner');
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        gsap.from('.home-cta-inner', { y: 32, opacity: 0, duration: 0.8, ease: 'power3.out' });
      }
    });
    this.scrollTriggers.push(st);
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
  }
}
