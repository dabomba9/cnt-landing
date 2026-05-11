import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { CinematicRollDirective } from '@cnt-workspace/ui';
import { MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

@Component({
  selector: 'cnt-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent implements OnInit, AfterViewInit, OnDestroy {
  lastUpdated = 'May 2019';
  totalSections = 10;
  // First section open by default — gives the page immediate context
  openIds = new Set<number>([1]);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Privacy Policy — CurbNTurf',
      description: 'How CurbNTurf collects, uses, and protects your personal information.',
      url: '/privacy',
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.legal-hero-content > *', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    gsap.fromTo('.legal-item',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.04, delay: 0.3 }
    );
  }

  toggleItem(id: number): void {
    if (this.openIds.has(id)) this.openIds.delete(id);
    else this.openIds.add(id);
  }
  isOpen(id: number): boolean {
    return this.openIds.has(id);
  }
  expandAll(): void {
    this.openIds = new Set(Array.from({ length: this.totalSections }, (_, i) => i + 1));
  }
  collapseAll(): void {
    this.openIds = new Set();
  }

  ngOnDestroy(): void {}
}
