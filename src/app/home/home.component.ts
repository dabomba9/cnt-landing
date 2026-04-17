import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../footer/footer.component';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-home',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') heroVideoRef!: ElementRef<HTMLVideoElement>;

  videoPlaying = true;
  isNavbarVisible = true;
  private lastScrollY = 0;

  openFaqIndex: number | null = null;
  locationsExpanded = true;

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  toggleLocations(): void {
    this.locationsExpanded = !this.locationsExpanded;
  }

  private scrollTriggers: any[] = [];
  private heroScrollHandler!: () => void;
  private cursorCleanup: (() => void) | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initHeroEntry();
      this.initHeroExpand();
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
      this.initCommunityMasonry();
      this.initFaqSection();
      this.initAppDownloadSection();
      this.initCustomCursor();

      this.heroVideoRef?.nativeElement?.play().catch(() => {});
    }
  }

  toggleVideo(event: Event): void {
    const target = event.target as HTMLElement;
    // Don't toggle video if user clicked inside the search bar
    if (target.closest('.search-hero-inner')) return;
    
    event.preventDefault();
    const video = this.heroVideoRef?.nativeElement;
    if (!video) return;
    if (this.videoPlaying) {
      video.pause();
      this.videoPlaying = false;
    } else {
      video.play();
      this.videoPlaying = true;
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


  private initHeroEntry(): void {
    const words = gsap.utils.toArray('.hero-span');
    gsap.set(words, { y: 150, rotateX: 20 });

    gsap.to(words, {
      y: 0,
      rotateX: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'back.out(1.5)',
      delay: 0.1
    });

    // Autonomous entrance for the perfect circle video
    const stickyContent = document.querySelector('.sticky-content');
    if (stickyContent) {
      gsap.fromTo(stickyContent,
        { scale: 0 },
        { scale: 1, duration: 1.5, ease: 'elastic.out(1, 0.5)', delay: 0.1 }
      );
    }
  }

  private initHeroExpand(): void {
    const stickyContent = document.querySelector('.sticky-content') as HTMLElement;
    const stickyWrap = document.querySelector('.sticky-wrap-hero') as HTMLElement;
    if (!stickyContent || !stickyWrap) return;

    const update = () => {
      const rect = stickyWrap.getBoundingClientRect();
      const totalScroll = stickyWrap.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / totalScroll));

      // Circle Math: Initial size is 50vmin (perfect circle). Final size is 100vw x 100vh.
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      const startPx = vmin * 0.50;

      const targetWidth = window.innerWidth;
      const targetHeight = window.innerHeight;

      const currentWidthPx = startPx + (targetWidth - startPx) * p;
      const currentHeightPx = startPx + (targetHeight - startPx) * p;

      // Radius starts at 50% (circle) and goes to 0% (rectangle)
      const currentRadiusPercent = 50 * (1 - p);

      stickyContent.style.width = `${currentWidthPx}px`;
      stickyContent.style.height = `${currentHeightPx}px`;
      stickyContent.style.borderRadius = `${currentRadiusPercent}%`;
      stickyContent.style.marginRight = `0`;

      // Slide the entire text/search layout towards the absolute visual center
      const searchHeroOuter = document.querySelector('.search-hero-outer') as HTMLElement;
      if (searchHeroOuter) {
        searchHeroOuter.style.transform = `translate(${12 * p}vw, ${15 * p}vh)`;

        if (p > 0.95) {
          const popScale = 1 + ((p - 0.95) * 5 * 0.03);
          searchHeroOuter.style.transform += ` scale(${popScale})`;
        }
      }

      const stickyElement = stickyWrap.querySelector('.sticky-element') as HTMLElement;
      if (stickyElement) {
        const excess = Math.max(0, scrolled - totalScroll);
        stickyElement.style.transform = `translateY(${-excess * 0.4}px)`;
      }
    };

    this.heroScrollHandler = update;
    window.addEventListener('scroll', update, { passive: true });
    update();
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
    const section = document.querySelector('.trust-dynamic-section');
    if (!section) return;

    // We interpolate the background of the section dynamically while scrolling through.
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 80%',
      scrub: 1,
      onEnter: () => gsap.to('.trust-dynamic-section', { backgroundColor: '#295D42', duration: 1.5, ease: 'power2.out' }),
      onLeaveBack: () => gsap.to('.trust-dynamic-section', { backgroundColor: 'transparent', duration: 1.5, ease: 'power2.out' }), // revert to global bg
      onUpdate: (self) => {
        // Scrub internal element colors locally for maximum isolation
        const progress = self.progress;
        
        // Dynamically shift headings from dark to white based on scroll progression securely
        if (progress > 0.1) {
          gsap.to('.trust-dynamic-section .text-dark-text', { color: '#ffffff', duration: 0.5 });
          gsap.to('.trust-dynamic-section .text-muted-text', { color: '#aaaaaa', duration: 0.5 });
          gsap.to('.trust-badge', { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', duration: 0.5 });
          gsap.to('.trust-card', { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)', duration: 0.5 });
        } else {
          gsap.to('.trust-dynamic-section .trust-heading, .trust-dynamic-section .trust-badge-text, .trust-dynamic-section .trust-card-text', { color: '#222222', duration: 0.5 });
          gsap.to('.trust-dynamic-section .trust-desc, .trust-dynamic-section .trust-muted-text', { color: '#666666', duration: 0.5 });
          gsap.to('.trust-badge', { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)', duration: 0.5 });
          gsap.to('.trust-card', { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)', duration: 0.5 });
        }
      }
    });
    this.scrollTriggers.push(st);
  }

  private initCommunityMasonry(): void {
    const wrap = document.querySelector('.gsap-masonry-grid-wrap');
    if (!wrap) return;

    const items = gsap.utils.toArray('.gsap-masonry-item');
    const images = gsap.utils.toArray('.gsap-masonry-parallax');

    // 1. Initial Stagger Reveal from bottom up
    const stReveal = ScrollTrigger.create({
      trigger: wrap,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.fromTo(items, 
          { y: 80, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2, stagger: 0.15, ease: 'power3.out' }
        );
      }
    });

    // 2. Continual Parallax scrubbing inside the boundaries
    const stParallax = ScrollTrigger.create({
      trigger: wrap,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
      animation: gsap.fromTo(images, 
        { yPercent: -10 }, 
        { yPercent: 10, ease: 'none' }
      )
    });

    this.scrollTriggers.push(stReveal, stParallax);
  }

  private initFaqSection(): void {
    const items = gsap.utils.toArray('.gsap-faq-item') as HTMLElement[];
    if (!items.length) return;

    gsap.set(items, { y: 24, opacity: 0 });

    const st = ScrollTrigger.create({
      trigger: '.gsap-faq-section',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
        });
      },
    });

    this.scrollTriggers.push(st);
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

  private initCustomCursor(): void {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    document.body.style.cursor = 'none';

    let ringX = 0, ringY = 0;
    let dotX = 0, dotY = 0;

    const onMouseMove = (e: MouseEvent) => {
      dotX = e.clientX;
      dotY = e.clientY;
      gsap.set(dot, { x: dotX, y: dotY });
    };

    const onMouseEnterHoverable = () => document.body.classList.add('cursor-hover');
    const onMouseLeaveHoverable = () => document.body.classList.remove('cursor-hover');

    document.addEventListener('mousemove', onMouseMove);

    const hoverables = document.querySelectorAll('a, button, [class*="cursor-pointer"], .magnetic-btn, .btn-3d-wrap');
    hoverables.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnterHoverable);
      el.addEventListener('mouseleave', onMouseLeaveHoverable);
    });

    // Ring follows with lerp via GSAP ticker
    const ticker = () => {
      ringX += (dotX - ringX) * 0.12;
      ringY += (dotY - ringY) * 0.12;
      gsap.set(ring, { x: ringX, y: ringY });
    };
    gsap.ticker.add(ticker);

    this.cursorCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      hoverables.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnterHoverable);
        el.removeEventListener('mouseleave', onMouseLeaveHoverable);
      });
      gsap.ticker.remove(ticker);
      document.body.style.cursor = '';
      document.body.classList.remove('cursor-hover');
    };
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
    if (this.heroScrollHandler) {
      window.removeEventListener('scroll', this.heroScrollHandler);
    }
    if (this.cursorCleanup) {
      this.cursorCleanup();
    }
  }
}
