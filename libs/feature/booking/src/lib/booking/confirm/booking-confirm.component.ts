import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateRange, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { FocusTrapDirective } from '@cnt-workspace/ui';
import { MiniMapComponent } from '../mini-map/mini-map.component';
import { SeoService } from '@cnt-workspace/data-access';
import { BookingService } from '@cnt-workspace/data-access';
import { IBooking, IBookingAddOn, STATUS_META } from '@cnt-workspace/models';
import { AuthService } from '@cnt-workspace/data-access';
import { MOCK_LISTINGS, getListingDetail, IAddOn } from '@cnt-workspace/data-access';
import { ToastService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

@Component({
  selector: 'cnt-booking-confirm',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDatepickerModule, MatNativeDateModule, RouterLink, NavbarComponent, FooterComponent, MiniMapComponent, FocusTrapDirective],
  templateUrl: './booking-confirm.component.html',
  styleUrls: ['./booking-confirm.component.scss'],
})
export class BookingConfirmComponent implements OnInit, AfterViewInit, OnDestroy {
  booking: IBooking | null = null;
  STATUS_META = STATUS_META;
  guestVerified = false;

  cancelOpen = false;
  cancelling = false;
  cancelReason = '';

  modifyOpen = false;
  modifying = false;
  modifyRange: DateRange<Date> | null = null;
  modifyGuests = 1;
  modifyEditor: 'dates' | null = null;
  readonly today = new Date();

  /** Add-ons currently checked in the modify editor (mirrors booking.addOns when opened). */
  editingAddOnIds = new Set<string>();

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
        // Foreground-tab safety net: if the deadline has passed but the timer hasn't fired
        // (background-tab throttling or any other delay), nudge the service to apply now.
        // recheckPending() is idempotent and a no-op once the decision has resolved.
        this.bookingSvc.recheckPending();
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

  openCancelModal(): void {
    this.cancelOpen = true;
    this.cancelReason = '';
  }

  /** Hours from now until check-in. Negative when check-in has passed. */
  get hoursUntilCheckIn(): number {
    if (!this.booking) return 0;
    return Math.floor((new Date(this.booking.dates.start).getTime() - Date.now()) / 3_600_000);
  }
  /** True when we're outside the 72-hour free-cancel window (i.e., refund may not be full). */
  get pastFreeCancelWindow(): boolean {
    return this.hoursUntilCheckIn < 72;
  }
  /** Human-readable countdown to the free-cancel cutoff. */
  get freeCancelDeadlineLabel(): string {
    const h = this.hoursUntilCheckIn - 72;
    if (h <= 0) return 'Free-cancellation window has passed';
    if (h < 24) return `Free cancellation for ${h} more ${h === 1 ? 'hour' : 'hours'}`;
    const d = Math.floor(h / 24);
    return `Free cancellation for ${d} more ${d === 1 ? 'day' : 'days'}`;
  }
  closeCancelModal(): void {
    if (this.cancelling) return;
    this.cancelOpen = false;
    this.cancelReason = '';
  }

  confirmCancel(): void {
    if (!this.booking) return;
    this.cancelling = true;
    setTimeout(() => {
      const updated = this.bookingSvc.cancel(this.booking!.id, this.cancelReason);
      this.cancelling = false;
      this.cancelOpen = false;
      this.cancelReason = '';
      if (updated) {
        this.booking = updated;
        this.toasts.info('Booking cancelled. A refund (if applicable) will appear within 5 business days.');
      } else {
        this.toasts.error('Could not cancel — please try again.');
      }
    }, 400);
  }

  // ============ Modify dates ============

  /** Same eligibility window as cancel — pre-check-in and not cancelled/declined. */
  get isModifiable(): boolean { return this.isCancellable; }

  openModifyModal(): void {
    if (!this.booking) return;
    this.modifyRange = new DateRange<Date>(new Date(this.booking.dates.start), new Date(this.booking.dates.end));
    this.modifyGuests = this.booking.guests;
    this.editingAddOnIds = new Set((this.booking.addOns || []).map(a => a.id));
    this.modifyEditor = null;
    this.modifyOpen = true;
  }

  closeModifyModal(): void {
    if (this.modifying) return;
    this.modifyOpen = false;
    this.modifyEditor = null;
  }

  toggleModifyDatesEditor(): void {
    this.modifyEditor = this.modifyEditor === 'dates' ? null : 'dates';
  }

  closeModifyDatesEditor(): void { this.modifyEditor = null; }

  /** Range picker: first click sets start, second click sets end (mat-calendar pattern). */
  onModifyDateSelected(date: Date | null): void {
    if (!date) return;
    const r = this.modifyRange;
    if (!r || !r.start || (r.start && r.end)) {
      this.modifyRange = new DateRange<Date>(date, null);
    } else if (date < r.start) {
      this.modifyRange = new DateRange<Date>(date, null);
    } else {
      this.modifyRange = new DateRange<Date>(r.start, date);
      // Auto-close popover when range is complete (matches booking-review behavior).
      setTimeout(() => this.closeModifyDatesEditor(), 200);
    }
  }

  /** Nights derived from the current modify-modal date range. */
  get modifyNights(): number {
    const r = this.modifyRange;
    if (!r?.start || !r?.end) return 0;
    return Math.max(1, Math.round((r.end.getTime() - r.start.getTime()) / 86_400_000));
  }

  /** Live preview of what the new total will be after modification. */
  get modifyPreviewTotal(): number {
    if (!this.booking) return 0;
    const nights = this.modifyNights;
    if (nights === 0) return this.booking.total;
    return (this.booking.pricePerNight * nights)
      + this.modifyAddOnsTotal
      + this.booking.cleaningFee
      + this.booking.serviceFee;
  }

  get modifyHasChanges(): boolean {
    if (!this.booking || !this.modifyRange?.start || !this.modifyRange?.end) return false;
    const startIso = this.modifyRange.start.toISOString();
    const endIso = this.modifyRange.end.toISOString();
    return startIso !== this.booking.dates.start
        || endIso !== this.booking.dates.end
        || this.modifyGuests !== this.booking.guests
        || this.hasAddOnChanges;
  }

  get modifyCanSave(): boolean {
    return this.modifyNights > 0 && this.modifyHasChanges;
  }

  stepGuests(delta: number): void {
    this.modifyGuests = Math.max(1, this.modifyGuests + delta);
  }

  // ============ Add-ons (inside modify modal) ============

  /** All add-ons available on this booking's listing. */
  get availableAddOns(): IAddOn[] {
    if (!this.booking) return [];
    const listing = MOCK_LISTINGS.find(l => l.id === this.booking!.listingId);
    return listing ? getListingDetail(listing).addOns : [];
  }

  toggleEditingAddOn(id: string): void {
    const next = new Set(this.editingAddOnIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.editingAddOnIds = next;
  }

  isEditingAddOnSelected(id: string): boolean { return this.editingAddOnIds.has(id); }

  /** Compute the billed amount for an add-on against the *modified* nights/guests.
   * `per unit` add-ons are quantity-locked to 1 in the modify flow (no stepper here). */
  private addOnAmount(a: IAddOn, nights: number, guests: number): number {
    if (a.unit === 'per night') return a.price * Math.max(1, nights);
    if (a.unit === 'per person') return a.price * guests;
    return a.price;
  }

  /** Snapshot of currently-checked add-ons priced against the modified trip shape. */
  private buildAddOnSnapshot(nights: number, guests: number): IBookingAddOn[] {
    return this.availableAddOns
      .filter(a => this.editingAddOnIds.has(a.id))
      .map(a => ({
        id: a.id,
        label: a.label,
        unit: a.unit,
        unitPrice: a.price,
        quantity: 1,
        amount: this.addOnAmount(a, nights, guests),
        icon: a.icon,
        photo: a.photo,
      }));
  }

  /** Live add-on subtotal for the modify-modal preview. */
  get modifyAddOnsTotal(): number {
    const nights = this.modifyNights || this.booking?.nights || 1;
    return this.buildAddOnSnapshot(nights, this.modifyGuests)
      .reduce((sum, a) => sum + a.amount, 0);
  }

  get hasAddOnChanges(): boolean {
    const before = new Set((this.booking?.addOns || []).map(a => a.id));
    if (before.size !== this.editingAddOnIds.size) return true;
    for (const id of this.editingAddOnIds) if (!before.has(id)) return true;
    return false;
  }

  confirmModify(): void {
    if (!this.booking || !this.modifyCanSave || !this.modifyRange?.start || !this.modifyRange?.end) return;
    this.modifying = true;
    const startIso = this.modifyRange.start.toISOString();
    const endIso = this.modifyRange.end.toISOString();
    const addOns = this.buildAddOnSnapshot(this.modifyNights, this.modifyGuests);
    setTimeout(() => {
      const updated = this.bookingSvc.modify(this.booking!.id, {
        start: startIso,
        end: endIso,
        guests: this.modifyGuests,
        addOns,
      });
      this.modifying = false;
      this.modifyOpen = false;
      if (updated) {
        this.booking = updated;
        this.toasts.success('Trip updated.');
      } else {
        this.toasts.error('Could not update — check the dates and try again.');
      }
    }, 300);
  }
}
