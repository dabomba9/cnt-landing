import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { CinematicRollDirective } from '@cnt-workspace/ui';
import { MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

interface IResourceCard {
  title: string;
  body: string;
  icon: string;
  routerLink: string;
  accent: 'trinidad' | 'jungle-green';
}

@Component({
  selector: 'cnt-host-resources',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective],
  templateUrl: './host-resources.component.html',
  styleUrl: './host-resources.component.scss',
})
export class HostResourcesComponent implements OnInit, AfterViewInit, OnDestroy {
  resources: IResourceCard[] = [
    {
      title: 'Become a host',
      body: 'Start your listing in minutes. Earnings calculator, tier picker, and the full host onboarding flow.',
      icon: 'home_work',
      routerLink: '/host',
      accent: 'trinidad',
    },
    {
      title: 'Host FAQ',
      body: 'The most common host questions — bookings, payouts, insurance, taxes, neighbors, zoning, and more.',
      icon: 'quiz',
      routerLink: '/faq',
      accent: 'jungle-green',
    },
    {
      title: 'Grow Program',
      body: 'Earn 3% lifetime commission on every reservation by referring new hosts. Invite-only.',
      icon: 'trending_up',
      routerLink: '/grow',
      accent: 'trinidad',
    },
    {
      title: 'Get support',
      body: 'Reach our customer service team Monday – Friday, 9 am – 5 pm MST. Or send a message any time.',
      icon: 'support_agent',
      routerLink: '/contact',
      accent: 'jungle-green',
    },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Host Resources — CurbNTurf',
      description: 'Everything you need to host successfully on CurbNTurf — onboarding, FAQ, the Grow Program, and customer support.',
      url: '/host-resources',
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.hr-hero-content > *', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    gsap.from('.hr-card', { y: 32, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1, delay: 0.3 });
  }

  ngOnDestroy(): void {}
}
