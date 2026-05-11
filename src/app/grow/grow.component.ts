import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';
import { MagneticBtnDirective } from '../directives/magnetic-btn.directive';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

@Component({
  selector: 'cnt-grow',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective],
  templateUrl: './grow.component.html',
  styleUrl: './grow.component.scss',
})
export class GrowComponent implements OnInit, AfterViewInit, OnDestroy {
  steps = [
    { num: 1, title: 'Get invited to Grow', body: 'Grow is invite-only. Tell us about your audience and we\'ll review.' },
    { num: 2, title: 'Refer property owners', body: 'Share your unique referral link with potential hosts.' },
    { num: 3, title: 'Wait for bookings', body: 'When your referred host lists a site and a guest completes a stay, you\'re in.' },
    { num: 4, title: 'Earn for the lifetime', body: '3% of every reservation on that property — for as long as it\'s published.' },
  ];

  scenarios = [
    { label: '250 host signups',          earnings: '$20,250',  detail: 'Annual commission' },
    { label: '500 days of reservations',  earnings: '$47,250',  detail: 'Annual commission' },
    { label: '1,000 days of reservations', earnings: '$108,000', detail: 'Annual commission' },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Grow Program — CurbNTurf | Earn 3% Lifetime Commission',
      description: 'CurbNTurf\'s Grow Program lets advocates earn 3% recurring commission on every reservation by referring new hosts. Invite-only.',
      url: '/grow',
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.grow-hero-content > *', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    gsap.from('.grow-stat', { y: 16, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.3 });
    gsap.from('.grow-step', { y: 24, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08, delay: 0.5 });
    gsap.from('.grow-scenario', { y: 32, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1, delay: 0.7 });
  }

  ngOnDestroy(): void {}
}
