import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../navbar/navbar.component';
import { FooterComponent } from '../../footer/footer.component';
import { MiniMapComponent } from '../mini-map/mini-map.component';
import { SeoService } from '@cnt-workspace/data-access';
import { BookingService } from '@cnt-workspace/data-access';
import { Booking, STATUS_META } from '@cnt-workspace/models';
import { AuthService } from '@cnt-workspace/data-access';
import { MOCK_LISTINGS } from '@cnt-workspace/data-access';
import { ToastService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

@Component({
  selector: 'cnt-booking-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, MiniMapComponent],
  templateUrl: './booking-confirm.component.html',
  styleUrls: ['./booking-confirm.component.scss'],
})
export class BookingConfirmComponent implements OnInit, AfterViewInit, OnDestroy {
  booking: Booking | null = null;
  STATUS_META = STATUS_META;
  guestVerified = false;

  cancelOpen = false;
  cancelling = false;

  /** "0:28" countdown to host decision when status === 'pending'. */
  decisionCountdownLabel = '';
  private bookingsSub: Subscription | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    private router: Router,
    private bookingSvc: BookingService,
    private auth: AuthService,
    private seo: SeoService,
    private toasts: ToastService,
    private host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.booking = this.bookingSvc.getById(id);
    this.guestVerified = !!this.auth.currentUser?.verified;
    // Backfill lat/lng for bookings created before today's coords change.
    if (this.booking && (this.booking.lat == null || this.booking.lng == null)) {
      const listing = MOCK_LISTINGS.find(l => l.id === this.booking!.listingId);
      if (listing) {
        this.booking = { ...this.booking, lat: listing.lat, lng: listing.lng };
      }
    }
    this.seo.update({
      title: this.booking ? 'Booking confirmed — CurbNTurf' : 'Booking not found — CurbNTurf',
      description: 'Your CurbNTurf booking confirmation.',
      url: `/booking/confirm/${id}`,
      robots: 'noindex, nofollow',
    });

    // React to status flips (host decision) without requiring a refresh.
    this.bookingsSub = this.bookingSvc.bookings$.subscribe(all => {
      const updated = all.find(b => b.id === id);
      if (!updated || !this.booking) return;
      const prevStatus = this.booking.status;
      // Preserve any backfilled lat/lng we set in ngOnInit.
      this.booking = { lat: this.booking.lat, lng: this.booking.lng, ...updated };
      if (prevStatus === 'pending' && updated.status === 'approved') {
        this.fireConfetti();
      }
    });

    this.startCountdownIfPending();
  }

  /** Start a 1s ticker that updates the countdown chip while status === 'pending'. */
  private startCountdownIfPending(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    const tick = () => {
      if (!this.booking || this.booking.status !== 'pending' || !this.booking.decisionAt) {
        this.decisionCountdownLabel = '';
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        return;
      }
      const ms = new Date(this.booking.decisionAt).getTime() - Date.now();
      if (ms <= 0) {
        this.decisionCountdownLabel = 'Any moment now…';
        return;
      }
      const total = Math.ceil(ms / 1000);
      const m = Math.floor(total / 60);
      const s = total % 60;
      this.decisionCountdownLabel = `${m}:${s.toString().padStart(2, '0')}`;
    };
    tick();
    this.countdownInterval = setInterval(tick, 1000);
  }

  ngOnDestroy(): void {
    this.bookingsSub?.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.booking) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    // Entrance animation
    gsap.from('.confirm-anim', { opacity: 0, y: 18, duration: 0.55, ease: 'power3.out', stagger: 0.07, delay: 0.05, clearProps: 'opacity,transform' });
    gsap.from('.confirm-checkmark', { scale: 0.4, opacity: 0, duration: 0.5, ease: 'back.out(2)', delay: 0.2, clearProps: 'opacity,transform' });
    // Confetti — only on first render of a confirmed booking
    if (this.booking.status === 'confirmed') this.fireConfetti();
  }

  private fireConfetti(): void {
    const root = this.host.nativeElement.querySelector('.confetti-root') as HTMLElement | null;
    if (!root) return;
    const colors = ['#e3530d', '#fbd784', '#295d42', '#ffffff'];
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.background = colors[i % colors.length];
      piece.style.left = Math.random() * 100 + '%';
      root.appendChild(piece);
      const xDrift = (Math.random() - 0.5) * 240;
      const fall = 280 + Math.random() * 220;
      gsap.fromTo(piece,
        { y: -20, opacity: 1, rotate: Math.random() * 360 },
        { y: fall, x: xDrift, rotate: Math.random() * 720, opacity: 0, duration: 1.6 + Math.random() * 0.6, ease: 'power1.in', delay: Math.random() * 0.3, onComplete: () => piece.remove() }
      );
    }
  }

  get confirmationNumber(): string {
    return this.booking ? this.booking.id.slice(0, 8).toUpperCase() : '';
  }

  get hostInitials(): string {
    if (!this.booking) return '';
    const parts = this.booking.hostName.split(' ').filter(Boolean);
    return parts.map(s => s.charAt(0)).join('').slice(0, 2).toUpperCase();
  }

  get datesLabel(): string {
    if (!this.booking) return '';
    const start = new Date(this.booking.dates.start);
    const end = new Date(this.booking.dates.end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  }

  get isCancellable(): boolean {
    if (!this.booking) return false;
    if (this.booking.status === 'cancelled' || this.booking.status === 'declined') return false;
    return new Date(this.booking.dates.start).getTime() > Date.now();
  }

  /** ============ Action bar ============ */

  downloadIcs(): void {
    if (!this.booking || !isPlatformBrowser(this.platformId)) return;
    const b = this.booking;
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = fmt(new Date(b.dates.start));
    const end = fmt(new Date(b.dates.end));
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CurbNTurf//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${b.id}@curbnturf`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:CurbNTurf — ${b.listingTitle}`,
      `DESCRIPTION:Hosted by ${b.hostName}. Confirmation #${this.confirmationNumber}.`,
      `LOCATION:${b.listingLocation}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curbnturf-${this.confirmationNumber}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.toasts.success('Calendar event downloaded');
  }

  shareTrip(): void {
    if (!isPlatformBrowser(this.platformId) || !this.booking) return;
    const url = window.location.href;
    const text = `Booked ${this.booking.listingTitle} on CurbNTurf — ${this.datesLabel}`;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      nav.share({ title: 'My CurbNTurf trip', text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => this.toasts.success('Trip link copied to clipboard'));
    }
  }

  printReceipt(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.print();
  }

  openCancelModal(): void { this.cancelOpen = true; }
  closeCancelModal(): void { this.cancelOpen = false; }

  confirmCancel(): void {
    if (!this.booking) return;
    this.cancelling = true;
    setTimeout(() => {
      const updated = this.bookingSvc.cancel(this.booking!.id);
      this.cancelling = false;
      this.cancelOpen = false;
      if (updated) {
        this.booking = updated;
        this.toasts.info('Booking cancelled. A refund (if applicable) will appear within 5 business days.');
      } else {
        this.toasts.error('Could not cancel — please try again.');
      }
    }, 400);
  }
}
