import { Component, OnInit, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

@Component({
  selector: 'cnt-cookies',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent, MagneticBtnDirective],
  templateUrl: './cookies.component.html',
  styleUrl: './cookies.component.scss',
})
export class CookiesComponent implements OnInit, AfterViewInit {
  private platformId = inject<object>(PLATFORM_ID);
  private seo = inject(SeoService);

  lastUpdated = 'April 29, 2026';
  totalSections = 6;
  // First two sections open by default — gives the page immediate context
  openIds = new Set<number>([1, 2]);

  ngOnInit(): void {
    this.seo.update({
      title: 'Cookies Policy — CurbNTurf',
      description: 'Which cookies CurbNTurf uses and how to manage them.',
      url: '/cookies',
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

}
