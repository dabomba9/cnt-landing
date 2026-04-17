import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-home-masonry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-masonry.component.html',
  styleUrl: './home-masonry.component.scss'
})
export class HomeMasonryComponent implements AfterViewInit, OnDestroy {
  private scrollTriggers: any[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initCommunityMasonry();
    }
  }

  private initCommunityMasonry(): void {
    const wrap = document.querySelector('.gsap-masonry-grid-wrap');
    if (!wrap) return;

    const items = gsap.utils.toArray('.gsap-masonry-item');
    const images = gsap.utils.toArray('.gsap-masonry-parallax');

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

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(t => t?.kill());
  }
}
