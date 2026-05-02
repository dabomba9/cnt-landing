import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';
import { MagneticBtnDirective } from '../directives/magnetic-btn.directive';
import { SeoService } from '../seo.service';
import { gsap } from 'gsap';

export type TermsCategory = 'all' | 'guests' | 'hosts' | 'fees' | 'cancellation' | 'grow';

export interface TermsSection {
  id: number;
  category: Exclude<TermsCategory, 'all'>;
  title: string;
  date: string;
}

export const TERMS_CATEGORIES: { id: TermsCategory; label: string; icon: string }[] = [
  { id: 'all',          label: 'All',           icon: 'all_inclusive' },
  { id: 'guests',       label: 'For Guests',    icon: 'rv_hookup' },
  { id: 'hosts',        label: 'For Hosts',     icon: 'home_work' },
  { id: 'fees',         label: 'Cash & Fees',   icon: 'payments' },
  { id: 'cancellation', label: 'Cancellations', icon: 'event_busy' },
  { id: 'grow',         label: 'Grow Program',  icon: 'trending_up' },
];

export const TERMS_SECTIONS: TermsSection[] = [
  { id: 1, category: 'guests',       title: 'Guest Agreement',                     date: '06/2019' },
  { id: 2, category: 'hosts',        title: 'Host Agreement',                      date: '06/2019' },
  { id: 3, category: 'fees',         title: 'CurbNTurf Cash / Account Balance',    date: '02/2022' },
  { id: 4, category: 'fees',         title: 'Pricing, Payouts & Fees',             date: '06/2019' },
  { id: 5, category: 'cancellation', title: 'Cancellation & Refund Policy',        date: '02/2022' },
  { id: 6, category: 'grow',         title: 'GROW: Passive Recurring Income Program', date: '05/2024' },
];

@Component({
  selector: 'cnt-terms',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
})
export class TermsComponent implements OnInit, AfterViewInit, OnDestroy {
  TERMS_CATEGORIES = TERMS_CATEGORIES;
  TERMS_SECTIONS = TERMS_SECTIONS;
  selectedCategory: TermsCategory = 'all';
  openIds = new Set<number>();
  lastUpdated = 'May 2024';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Terms & Conditions — CurbNTurf',
      description: 'The terms governing use of CurbNTurf as a guest and as a host.',
      url: '/terms',
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.legal-hero-content > *', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    gsap.from('.terms-tabs', { y: 12, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.3 });
    gsap.fromTo('.legal-item',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.04, delay: 0.4 }
    );
  }

  get filteredSections(): TermsSection[] {
    if (this.selectedCategory === 'all') return TERMS_SECTIONS;
    return TERMS_SECTIONS.filter(s => s.category === this.selectedCategory);
  }

  selectCategory(cat: TermsCategory): void {
    this.selectedCategory = cat;
  }

  toggleItem(id: number): void {
    if (this.openIds.has(id)) this.openIds.delete(id);
    else this.openIds.add(id);
  }
  isOpen(id: number): boolean {
    return this.openIds.has(id);
  }
  expandAll(): void {
    this.openIds = new Set(this.filteredSections.map(s => s.id));
  }
  collapseAll(): void {
    this.openIds = new Set();
  }

  ngOnDestroy(): void {}
}
