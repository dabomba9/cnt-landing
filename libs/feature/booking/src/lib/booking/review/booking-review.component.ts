import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DateRange, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { IdVerifyModalComponent } from '@cnt-workspace/auth';
import { SeoService } from '@cnt-workspace/data-access';
import { AuthService, IPublicUser } from '@cnt-workspace/data-access';
import { BookingService } from '@cnt-workspace/data-access';
import { ToastService } from '@cnt-workspace/data-access';
import { MOCK_LISTINGS, IListing, getListingDetail, IListingDetail, IAddOn } from '@cnt-workspace/data-access';
import { readMyRv, IMyRv, rvTypeLabel, isMyRvSet, isMyRvComplete, myRvMissingFields } from '@cnt-workspace/data-access';
import { PaymentMethodsService, IPaymentMethod } from '@cnt-workspace/data-access';
import { IBookingAddOn } from '@cnt-workspace/models';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';

@Component({
  selector: 'cnt-booking-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatDatepickerModule, MatNativeDateModule, NavbarComponent, FooterComponent, IdVerifyModalComponent],
  templateUrl: './booking-review.component.html',
  styleUrls: ['./booking-review.component.scss'],
})
export class BookingReviewComponent implements OnInit, OnDestroy, AfterViewInit {
  listing: IListing | null = null;
  detail: IListingDetail | null = null;
  user: IPublicUser | null = null;
  myRv: IMyRv | null = null;

  startDate: Date | null = null;
  endDate: Date | null = null;
  guests = 1;
  selectedDateRange: DateRange<Date> | null = null;

  /** Selected add-on IDs, hydrated from `?addOns=...` query param. */
  selectedAddOnIds = new Set<string>();

  /** Reward credit available to spend on this booking. */
  availableCredit = 0;

  /** Form */
  contactEmail = '';
  contactPhone = '';
  noteToHost = '';
  acceptedTerms = false;
  error: string | null = null;
  submitting = false;

  /** Edit-in-place popovers */
  openEditor: 'dates' | 'guests' | null = null;

  /** ID verify modal */
  idVerifyOpen = false;

  /** Saved payment methods — sourced from PaymentMethodsService. */
  selectedPaymentId = '';
  paymentMethods: IPaymentMethod[] = [];
  private paymentsSub: Subscription | null = null;

  /** Inline add-card form (mirrors /account → Payments). */
  addCardOpen = false;
  newCardBrand: IPaymentMethod['brand'] = 'visa';
  newCardLast4 = '';

  /** Promo code mock */
  promoOpen = false;
  promoCode = '';
  promoApplied: { code: string; amount: number } | null = null;

  readonly SERVICE_FEE_RATE = 0.15;
  readonly CLEANING_FEE = 35;
  readonly TAX_RATE = 0.08;

  /** Field-level validation errors (live). */
  fieldErrors: { email?: string; phone?: string } = {};
  emailTouched = false;
  phoneTouched = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private booking: BookingService,
    private seo: SeoService,
    private toasts: ToastService,
    private payments: PaymentMethodsService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Review your booking — CurbNTurf',
      description: 'Review and confirm your CurbNTurf reservation.',
      url: '/booking/review',
      robots: 'noindex, nofollow',
    });

    this.user = this.auth.currentUser;
    this.contactEmail = this.user?.email || '';
    this.contactPhone = this.user?.phone || '';
    this.myRv = readMyRv(this.platformId);

    const q = this.route.snapshot.queryParamMap;
    const listingId = parseInt(q.get('listingId') || '', 10);
    this.listing = MOCK_LISTINGS.find(l => l.id === listingId) || null;
    if (this.listing) this.detail = getListingDetail(this.listing);

    const start = q.get('start');
    const end = q.get('end');
    this.startDate = start ? this.parseIso(start) : null;
    this.endDate = end ? this.parseIso(end) : null;
    if (this.startDate && this.endDate) {
      this.selectedDateRange = new DateRange(this.startDate, this.endDate);
    }

    const g = parseInt(q.get('guests') || '', 10);
    if (Number.isFinite(g) && g > 0) this.guests = g;

    const addOnsParam = q.get('addOns');
    if (addOnsParam) {
      this.selectedAddOnIds = new Set(addOnsParam.split(',').filter(Boolean));
    }


    if (this.user) {
      this.availableCredit = this.booking.getAvailableCredit(this.user.email);
    }

    this.paymentsSub = this.payments.methods$.subscribe(methods => {
      this.paymentMethods = methods;
      if (!this.selectedPaymentId || !methods.some(m => m.id === this.selectedPaymentId)) {
        this.selectedPaymentId = (methods.find(m => m.isDefault) || methods[0])?.id || '';
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    gsap.from('.review-anim', { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out', stagger: 0.07, delay: 0.05 });
  }

  ngOnDestroy(): void {
    this.paymentsSub?.unsubscribe();
  }

  /** Inline add-card form (mirrors /account → Payments). */
  get canAddCard(): boolean { return /^\d{4}$/.test(this.newCardLast4); }
  cancelAddCard(): void {
    this.addCardOpen = false;
    this.newCardLast4 = '';
    this.newCardBrand = 'visa';
  }
  addCard(): void {
    if (!this.canAddCard) return;
    const added = this.payments.add({ brand: this.newCardBrand, last4: this.newCardLast4, makeDefault: false });
    this.selectedPaymentId = added.id;
    this.toasts.success('Card added.');
    this.cancelAddCard();
  }

  /** Total nights, integer ≥ 0. */
  get nights(): number {
    if (!this.startDate || !this.endDate) return 0;
    const ms = this.endDate.getTime() - this.startDate.getTime();
    return Math.max(0, Math.round(ms / 86_400_000));
  }

  get subtotal(): number {
    return (this.listing?.price || 0) * this.nights;
  }

  /** Mock weekly discount: 10% off when stay >= 7 nights. */
  get weeklyDiscount(): number {
    if (this.nights >= 7) return Math.round(this.subtotal * 0.10);
    return 0;
  }

  /** AddOn objects the user picked, in the order they appear on the listing. */
  get selectedAddOns(): IAddOn[] {
    if (!this.detail) return [];
    return this.detail.addOns.filter(a => this.selectedAddOnIds.has(a.id));
  }

  /** Per-line snapshot ({ ...AddOn, amount }) using the current nights/guests multipliers. */
  get addOnSnapshots(): IBookingAddOn[] {
    return this.selectedAddOns.map(a => ({
      id: a.id,
      label: a.label,
      unit: a.unit,
      unitPrice: a.price,
      amount: this.addOnAmount(a),
    }));
  }

  private addOnAmount(a: IAddOn): number {
    if (a.unit === 'per night') return a.price * Math.max(1, this.nights);
    if (a.unit === 'per person') return a.price * this.guests;
    return a.price;
  }

  get addOnsTotal(): number {
    return this.selectedAddOns.reduce((sum, a) => sum + this.addOnAmount(a), 0);
  }

  toggleAddOn(id: string): void {
    const next = new Set(this.selectedAddOnIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedAddOnIds = next;
  }

  isAddOnSelected(id: string): boolean { return this.selectedAddOnIds.has(id); }

  get serviceFee(): number {
    return Math.round((this.subtotal - this.weeklyDiscount + this.addOnsTotal + this.CLEANING_FEE) * this.SERVICE_FEE_RATE);
  }

  get taxes(): number {
    return Math.round((this.subtotal - this.weeklyDiscount + this.addOnsTotal + this.CLEANING_FEE + this.serviceFee) * this.TAX_RATE);
  }

  get promoDiscount(): number {
    return this.promoApplied?.amount || 0;
  }

  /** Pre-credit total used to cap the credit redemption. */
  get totalBeforeCredit(): number {
    return Math.max(0, this.subtotal - this.weeklyDiscount + this.addOnsTotal + this.CLEANING_FEE + this.serviceFee + this.taxes - this.promoDiscount);
  }

  /** Credit actually applied — capped at the pre-credit total. */
  get creditApplied(): number {
    return Math.min(this.availableCredit, this.totalBeforeCredit);
  }

  get total(): number {
    return Math.max(0, this.totalBeforeCredit - this.creditApplied);
  }

  get hasValidState(): boolean {
    return !!(this.listing && this.detail && this.nights > 0);
  }

  /** Rig completeness — required to book any stay. */
  get isMyRvComplete(): boolean { return !!this.myRv && isMyRvComplete(this.myRv); }
  get rigMissingLabel(): string {
    const missing = this.myRv ? myRvMissingFields(this.myRv) : ['RV type', 'length', 'height', 'width', 'license plate'];
    if (missing.length === 0) return '';
    if (missing.length === 1) return missing[0];
    return missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];
  }

  get rvSummary(): string {
    if (!this.myRv || !isMyRvSet(this.myRv)) return 'Not set';
    const type = rvTypeLabel(this.myRv.type);
    return this.myRv.length ? `${type} · ${this.myRv.length} ft` : type;
  }

  get datesLabel(): string {
    if (!this.startDate || !this.endDate) return 'Add dates';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${this.startDate.toLocaleDateString('en-US', opts)} – ${this.endDate.toLocaleDateString('en-US', opts)}`;
  }

  get checkInLabel(): string {
    return this.startDate ? this.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  }

  get checkOutLabel(): string {
    return this.endDate ? this.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  }

  /** Free-cancellation date = check-in minus 3 days. */
  get freeCancelDate(): string {
    if (!this.startDate) return '';
    const d = new Date(this.startDate);
    d.setDate(d.getDate() - 3);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** "You'll be charged" date = check-in. */
  get chargeDate(): string {
    if (!this.startDate) return 'check-in';
    return this.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** Field-level validation. */
  validateEmail(): void {
    this.emailTouched = true;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail.trim());
    this.fieldErrors.email = ok ? undefined : 'Enter a valid email address.';
  }

  validatePhone(): void {
    this.phoneTouched = true;
    if (!this.contactPhone.trim()) { this.fieldErrors.phone = undefined; return; }
    const digits = this.contactPhone.replace(/\D/g, '');
    this.fieldErrors.phone = digits.length >= 10 ? undefined : 'Phone number looks too short.';
  }

  /** Auto-format phone: (555) 123-4567 */
  onPhoneInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    else if (digits.length > 0) formatted = `(${digits}`;
    this.contactPhone = formatted;
    if (this.phoneTouched) this.validatePhone();
  }

  /** Computed validity for the Confirm CTA. */
  get isFormValid(): boolean {
    if (!this.hasValidState || !this.user) return false;
    if (!this.contactEmail || this.fieldErrors.email) return false;
    if (this.fieldErrors.phone) return false;
    if (!this.acceptedTerms) return false;
    if (!this.isMyRvComplete) return false;
    return true;
  }

  /** ============ Edit-in-place popovers ============ */
  toggleEditor(which: 'dates' | 'guests'): void {
    this.openEditor = this.openEditor === which ? null : which;
  }
  closeEditor(): void { this.openEditor = null; }

  onDateSelected(date: Date | null): void {
    if (!date) return;
    if (!this.selectedDateRange || !this.selectedDateRange.start || (this.selectedDateRange.start && this.selectedDateRange.end)) {
      this.selectedDateRange = new DateRange(date, null);
    } else if (date < this.selectedDateRange.start) {
      this.selectedDateRange = new DateRange(date, null);
    } else {
      this.selectedDateRange = new DateRange(this.selectedDateRange.start, date);
      this.startDate = this.selectedDateRange.start;
      this.endDate = this.selectedDateRange.end;
      setTimeout(() => this.closeEditor(), 200);
    }
  }

  adjustGuests(delta: number): void {
    const max = this.detail?.maxGuests || 8;
    this.guests = Math.max(1, Math.min(max, this.guests + delta));
  }

  /** ============ Promo ============ */
  applyPromo(): void {
    const code = this.promoCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'WELCOME10') {
      this.promoApplied = { code, amount: 25 };
      this.toasts.success('Promo applied — $25 off');
    } else if (code === 'TURF20') {
      this.promoApplied = { code, amount: 50 };
      this.toasts.success('Promo applied — $50 off');
    } else {
      this.toasts.error('Invalid promo code');
      this.promoApplied = null;
    }
    this.promoCode = '';
  }

  removePromo(): void {
    this.promoApplied = null;
    this.toasts.info('Promo removed');
  }

  /** ============ Confirm ============ */
  onConfirm(event: Event): void {
    event.preventDefault();
    this.error = null;
    this.validateEmail();
    this.validatePhone();
    if (!this.hasValidState || !this.listing || !this.detail || !this.user) {
      this.error = 'Missing booking details. Start over from the listing.';
      return;
    }
    if (!this.acceptedTerms) {
      this.error = 'Please accept the booking terms to continue.';
      return;
    }
    if (this.fieldErrors.email || !this.contactEmail) {
      this.error = 'A valid contact email is required.';
      return;
    }
    // Gate first booking on identity verification.
    if (!this.user.verified) {
      this.idVerifyOpen = true;
      return;
    }
    this.finalizeBooking();
  }

  onVerified(): void {
    this.idVerifyOpen = false;
    this.user = this.auth.currentUser;
    this.finalizeBooking();
  }

  private finalizeBooking(): void {
    if (!this.listing || !this.detail || !this.user) return;
    this.submitting = true;
    // Optimistic delay so the spinner reads as a real network request.
    setTimeout(() => {
      const created = this.booking.createBooking({
        userEmail: this.user!.email,
        listingId: this.listing!.id,
        listingTitle: this.listing!.title,
        listingLocation: this.listing!.location,
        listingPhoto: this.detail!.photos[0] || '',
        hostName: this.detail!.host.name,
        hostAddress: undefined,
        lat: this.listing!.lat,
        lng: this.listing!.lng,
        dates: { start: this.startDate!.toISOString(), end: this.endDate!.toISOString() },
        nights: this.nights,
        guests: this.guests,
        rvSummary: this.rvSummary,
        pricePerNight: this.listing!.price,
        subtotal: this.subtotal,
        cleaningFee: this.CLEANING_FEE,
        serviceFee: this.serviceFee,
        total: this.total,
        instantBook: this.listing!.instantBook,
        status: this.listing!.instantBook ? 'confirmed' : 'pending',
        contact: { email: this.contactEmail, phone: this.contactPhone || undefined },
        requestMessage: !this.listing!.instantBook && this.noteToHost.trim() ? this.noteToHost.trim() : undefined,
        addOns: this.addOnSnapshots.length > 0 ? this.addOnSnapshots : undefined,
        addOnsTotal: this.addOnsTotal || undefined,
        creditApplied: this.creditApplied > 0 ? this.creditApplied : undefined,
      });
      this.submitting = false;
      this.toasts.success(this.listing!.instantBook ? 'Booking confirmed!' : 'Request sent — host has 24h to respond.');
      this.router.navigate(['/booking/confirm', created.id]);
    }, 500);
  }

  private parseIso(s: string): Date | null {
    const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
    return isNaN(d.getTime()) ? null : d;
  }
}
