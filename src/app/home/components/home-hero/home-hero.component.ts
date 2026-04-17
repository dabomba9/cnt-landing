import { Component, AfterViewInit, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-home-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss'
})
export class HomeHeroComponent implements AfterViewInit {
  @ViewChild('heroVideo') heroVideoRef!: ElementRef<HTMLVideoElement>;

  searchMode: 'destination' | 'roadtrip' = 'destination';
  videoPlaying = true;
  private heroScrollHandler!: () => void;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  setSearchMode(mode: 'destination' | 'roadtrip'): void {
    this.searchMode = mode;
  }

  toggleVideo(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('.btn-3d-wrap') || target.closest('button')) {
      return; 
    }

    if (this.heroVideoRef && this.heroVideoRef.nativeElement) {
      if (this.videoPlaying) {
        this.heroVideoRef.nativeElement.pause();
      } else {
        this.heroVideoRef.nativeElement.play();
      }
      this.videoPlaying = !this.videoPlaying;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initHeroEntry();
      this.initHeroExpand();
      
      // Force native video playback internally bypassing restrictive browser DOM policies
      this.heroVideoRef?.nativeElement?.play().catch(() => {});
    }
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

      const vmin = Math.min(window.innerWidth, window.innerHeight);
      const startPx = vmin * 0.50;

      const targetWidth = window.innerWidth;
      const targetHeight = window.innerHeight;

      const currentW = startPx + (targetWidth - startPx) * (Math.pow(p, 2));
      let currentH = startPx + (targetHeight - startPx) * (Math.pow(p, 2));
      
      const vhOffset = window.innerHeight * 0.5 * p;
      currentH += vhOffset;

      const clampH = Math.min(currentH, targetHeight);

      const borderRadius = 50 * (1 - p);

      if (stickyContent) {
        gsap.set(stickyContent, {
          width: currentW + 'px',
          height: clampH + 'px',
          borderRadius: borderRadius + '%',
          overwrite: 'auto'
        });
      }
    };

    update();
    this.heroScrollHandler = update;
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }
}
