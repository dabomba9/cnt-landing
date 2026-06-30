import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

type ContactReason = 'general' | 'guest-support' | 'host-support' | 'press-media' | 'partnerships' | 'bug-report';

@Component({
  selector: 'cnt-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, MagneticBtnDirective],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit, AfterViewInit, OnDestroy {
  form = {
    name: '',
    email: '',
    reason: 'general' as ContactReason,
    subject: '',
    message: '',
  };

  reasons: { id: ContactReason; label: string }[] = [
    { id: 'general',         label: 'General question' },
    { id: 'guest-support',   label: 'Guest / booking support' },
    { id: 'host-support',    label: 'Host support' },
    { id: 'press-media',     label: 'Press & media' },
    { id: 'partnerships',    label: 'Partnerships' },
    { id: 'bug-report',      label: 'Report a bug' },
  ];

  submitted = false;
  submitting = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Contact Us — CurbNTurf',
      description: 'Reach the CurbNTurf team. Guest and host support, partnerships, press inquiries, and general questions — all answered within 4 business hours.',
      url: '/contact',
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.contact-hero-content > *', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    gsap.from('.contact-card', { y: 32, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1, delay: 0.3 });
    gsap.from('.contact-form-wrap', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.5 });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.form.name || !this.form.email || !this.form.message) return;
    this.submitting = true;
    // Stub: in production this would POST to /api/contact
    setTimeout(() => {
      this.submitting = false;
      this.submitted = true;
    }, 800);
  }

  reset(): void {
    this.form = { name: '', email: '', reason: 'general', subject: '', message: '' };
    this.submitted = false;
  }

  ngOnDestroy(): void {}
}
