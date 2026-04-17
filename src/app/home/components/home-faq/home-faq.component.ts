import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-home-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-faq.component.html',
  styleUrl: './home-faq.component.scss'
})
export class HomeFaqComponent implements AfterViewInit, OnDestroy {
  openFaqIndex: number | null = null;
  private scrollTriggers: any[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initFaqSection();
    }
  }

  private initFaqSection(): void {
    const wrap = document.querySelector('.gsap-faq-section');
    const items = gsap.utils.toArray('.gsap-faq-item') as HTMLElement[];
    if (!items.length || !wrap) return;

    gsap.set(items, { y: 24, opacity: 0 });

    const st = ScrollTrigger.create({
      trigger: wrap,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out'
        });
      }
    });
    this.scrollTriggers.push(st);
  }

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(t => t?.kill());
  }
}
