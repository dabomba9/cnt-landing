import { Component, OnInit, OnDestroy, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DateRange, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { FocusTrapDirective } from '@cnt-workspace/ui';
import { IdVerifyModalComponent } from '@cnt-workspace/auth';
import { SeoService } from '@cnt-workspace/data-access';
import { AuthService, IPublicUser } from '@cnt-workspace/data-access';
import { BookingService } from '@cnt-workspace/data-access';
import { ToastService } from '@cnt-workspace/data-access';
import { parseIsoLocal, ListingAvailabilityService, isoKey } from '@cnt-workspace/data-access';
import { MOCK_LISTINGS, IPrivateListing, getListingDetail, IListingDetail, IAddOn, hasMyRvPhotos } from '@cnt-workspace/data-access';
import { readMyRv, IMyRv, IMyRvProfile, rvTypeLabel, isMyRvSet, isMyRvComplete, myRvMissingFields, listMyRvProfiles, getActiveRvProfileId, setActiveRvProfile, isTowableRv, towVehicleHasData } from '@cnt-workspace/data-access';
import { PaymentMethodsService, IPaymentMethod } from '@cnt-workspace/data-access';
import { computeServiceFee, computeFeedbackIncentive, FEEDBACK_INCENTIVE_PER_NIGHT } from '@cnt-workspace/data-access';
import { IBookingAddOn } from '@cnt-workspace/models';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';

@Component({
  selector: 'cnt-booking-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatDatepickerModule, MatNativeDateModule, NavbarComponent, FooterComponent, IdVerifyModalComponent, FocusTrapDirective],
  templateUrl: './booking-review.component.html',
  styleUrls: ['./booking-review.component.scss'],
})
export class BookingReviewComponent implements OnInit, OnDestroy, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private booking = inject(BookingService);
  private seo = inject(SeoService);
  private toasts = inject(ToastService);
  private payments = inject(PaymentMethodsService);
  private availability = inject(ListingAvailabilityService);

  listing: IPrivateListing | null = null;
  detail: IListingDetail | null = null;
  user: IPublicUser | null = null;
  myRv: IMyRv | null = null;

  /** Saved RV profiles + the one this booking is for. */
  rvProfiles: IMyRvProfile[] = [];
  selectedRvId: string | null = null;

  startDate: Date | null = null;
  endDate: Date | null = null;
  guests = 1;
  selectedDateRange: DateRange<Date> | null = null;

  /** Selected add-on IDs, hydrated from `?addOns=...` query param. */
  selectedAddOnIds = new Set<string>();
  /** Quantity per add-on id; only `per unit` rows use values > 1. */
  addOnQuantities = new Map<string, number>();

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

  readonly CLEANING_FEE = 35;
  readonly TAX_RATE = 0.08;
  readonly feedbackIncentivePerNight = FEEDBACK_INCENTIVE_PER_NIGHT;

  /** Field-level validation errors (live). */
  fieldErrors: { email?: string; phone?: string } = {};
  emailTouched = false;
  phoneTouched = false;

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
    this.rvProfiles = listMyRvProfiles(this.platformId);
    this.selectedRvId = getActiveRvProfileId(this.platformId);

    const q = this.route.snapshot.queryParamMap;
    const listingId = parseInt(q.get('listingId') || '', 10);
    this.listing = MOCK_LISTINGS.find(l => l.id === listingId) || null;
    // Boondocking ids (81-100) live in MOCK_BOONDOCKING and aren't reservable. Any unknown id
    // hits the same path — kick the user back to /search rather than render an empty form.
    if (!this.listing) {
      this.toasts.info('That listing is not bookable here.');
      this.router.navigate(['/search']);
      return;
    }
    this.detail = getListingDetail(this.listing);

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
      const ids = new Set<string>();
      const qty = new Map<string, number>();
      for (const tok of addOnsParam.split(',').filter(Boolean)) {
        const [id, qStr] = tok.split(':');
        if (!id) continue;
        ids.add(id);
        const q = parseInt(qStr, 10);
        if (Number.isFinite(q) && q > 0) qty.set(id, q);
      }
      this.selectedAddOnIds = ids;
      this.addOnQuantities = qty;
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
    if (!this.listing || !this.startDate || !this.endDate || this.nights === 0) {
      return (this.listing?.price || 0) * this.nights;
    }
    const prices = this.availability.effectivePricesForRange(
      this.listing.id,
      isoKey(this.startDate),
      isoKey(this.endDate),
      this.listing.price,
    );
    let sum = 0;
    for (const p of Object.values(prices)) sum += p;
    return sum;
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

  /** Per-line snapshot ({ ...AddOn, quantity, amount }) using the current multipliers. */
  get addOnSnapshots(): IBookingAddOn[] {
    return this.selectedAddOns.map(a => ({
      id: a.id,
      label: a.label,
      unit: a.unit,
      unitPrice: a.price,
      quantity: a.unit === 'per unit' ? this.addOnQty(a.id) : 1,
      amount: this.addOnAmount(a),
      icon: a.icon,
      photo: a.photo,
    }));
  }

  /** Quantity for an add-on; 1 by default. Only `per unit` rows can exceed 1. */
  addOnQty(id: string): number {
    return this.addOnQuantities.get(id) ?? 1;
  }

  /** Per-line total used by both totals and inline display. */
  addOnLineTotal(a: IAddOn): number {
    return this.addOnAmount(a);
  }

  private addOnAmount(a: IAddOn): number {
    if (a.unit === 'per night') return a.price * Math.max(1, this.nights);
    if (a.unit === 'per person') return a.price * this.guests;
    if (a.unit === 'per unit') return a.price * this.addOnQty(a.id);
    return a.price;
  }

  get addOnsTotal(): number {
    return this.selectedAddOns.reduce((sum, a) => sum + this.addOnAmount(a), 0);
  }

  toggleAddOn(id: string): void {
    const next = new Set(this.selectedAddOnIds);
    if (next.has(id)) {
      next.delete(id);
      this.addOnQuantities.delete(id);
    } else {
      next.add(id);
    }
    this.selectedAddOnIds = next;
  }

  isAddOnSelected(id: string): boolean { return this.selectedAddOnIds.has(id); }

  get serviceFee(): number {
    // Fee basis is the host's nightly subtotal only (after weekly discount).
    // Add-ons, cleaning, and taxes are NOT in the basis — see pricing.util.ts.
    return computeServiceFee(this.subtotal - this.weeklyDiscount, this.nights);
  }

  /** Charged at booking; refunded as CurbNTurf Cash when guest leaves a qualifying review. */
  get feedbackIncentive(): number {
    return computeFeedbackIncentive(this.nights);
  }

  get taxes(): number {
    // All-in pricing: service fee + feedback incentive are already inside `subtotal`.
    // Tax base = nightly portion (subtotal − weeklyDiscount − feedbackIncentive,
    // since the refundable incentive shouldn't be taxed) + add-ons + cleaning.
    const taxBase = this.subtotal - this.weeklyDiscount - this.feedbackIncentive + this.addOnsTotal + this.CLEANING_FEE;
    return Math.round(taxBase * this.TAX_RATE);
  }

  get promoDiscount(): number {
    return this.promoApplied?.amount || 0;
  }

  /** Pre-credit total used to cap the credit redemption. Service fee + feedback
   * incentive are not added on top — they're already inside subtotal. */
  get totalBeforeCredit(): number {
    return Math.max(0, this.subtotal - this.weeklyDiscount + this.addOnsTotal + this.CLEANING_FEE + this.taxes - this.promoDiscount);
  }

  /** User toggle — save credit for later vs. apply it to this booking (defaults on). */
  useCredit = true;

  /** Credit actually applied — capped at the pre-credit total. Honors the useCredit toggle. */
  get creditApplied(): number {
    if (!this.useCredit) return 0;
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

  /** Switch which saved RV this booking is for — sets it active so every
   * RV-derived getter (completeness, photo gate, summary) recomputes. */
  selectRv(id: string): void {
    setActiveRvProfile(this.platformId, id);
    this.selectedRvId = id;
    this.myRv = readMyRv(this.platformId);
  }

  get rvSummary(): string {
    if (!this.myRv || !isMyRvSet(this.myRv)) return 'Not set';
    const type = rvTypeLabel(this.myRv.type);
    let spec = this.myRv.length ? `${type} · ${this.myRv.length} ft` : type;
    // Towables: surface the tow vehicle (and combined length) for the host.
    const tow = this.myRv.towVehicle;
    if (isTowableRv(this.myRv.type) && towVehicleHasData(tow) && tow) {
      const towName = [tow.year, tow.make, tow.model].filter(Boolean).join(' ') || 'tow vehicle';
      spec += ` · towed by ${towName}`;
      if (this.myRv.length && tow.length) {
        spec += ` (~${this.myRv.length + tow.length} ft total)`;
      }
    }
    const name = this.rvProfiles.find(p => p.id === this.selectedRvId)?.name?.trim();
    return name ? `${name} — ${spec}` : spec;
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

  /** Cancellation timeline mirroring /listing/:id (P2.3 / C). Segments
   *  derive dates from the picked check-in + the listing's cancellation
   *  tier — keeping the trust signal coherent across the funnel. */
  get cancellationSegments(): Array<{ label: string; tone: 'good' | 'warn' | 'bad'; dateLabel: string }> {
    const tier = this.detail?.cancellationTier;
    if (!tier) return [];
    const start = this.startDate;
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const shift = (days: number): string => {
      if (!start) return '';
      const d = new Date(start);
      d.setDate(d.getDate() - days);
      return fmt(d);
    };
    if (tier === 'exclusive') {
      return [{ label: 'Non-refundable from booking', tone: 'bad', dateLabel: '' }];
    }
    if (tier === 'easy-goin') {
      return [
        { label: 'Full refund', tone: 'good', dateLabel: shift(1) || '1 day before check-in' },
        { label: 'No refund',   tone: 'bad',  dateLabel: '' },
      ];
    }
    if (tier === 'moderate') {
      return [
        { label: 'Full refund', tone: 'good', dateLabel: shift(3) || '3 days before check-in' },
        { label: 'No refund',   tone: 'bad',  dateLabel: '' },
      ];
    }
    // 'strict'
    return [
      { label: 'Full refund', tone: 'good', dateLabel: shift(7) || '7 days before check-in' },
      { label: '50% refund',  tone: 'warn', dateLabel: shift(2) || '2 days before check-in' },
      { label: 'No refund',   tone: 'bad',  dateLabel: '' },
    ];
  }

  /** "You'll be charged" date = check-in. */
  get chargeDate(): string {
    if (!this.startDate) return 'check-in';
    return this.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** Field-level validation. P58/D — toast on transition from valid →
   *  invalid only, so it fires once per error event without nagging on
   *  every blur. The inline `fieldErrors` text remains the primary
   *  feedback; the toast adds tone parity with /search. */
  validateEmail(): void {
    this.emailTouched = true;
    const wasInvalid = !!this.fieldErrors.email;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail.trim());
    this.fieldErrors.email = ok ? undefined : 'Enter a valid email address.';
    if (!ok && !wasInvalid) this.toasts.info('Email isn\'t in the right shape.');
  }

  validatePhone(): void {
    this.phoneTouched = true;
    if (!this.contactPhone.trim()) { this.fieldErrors.phone = undefined; return; }
    const wasInvalid = !!this.fieldErrors.phone;
    const digits = this.contactPhone.replace(/\D/g, '');
    const ok = digits.length >= 10;
    this.fieldErrors.phone = ok ? undefined : 'Phone number looks too short.';
    if (!ok && !wasInvalid) this.toasts.info('Phone number needs 10 digits.');
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
    // Re-entry guard — Angular CD disables the button after the next tick, but a fast
    // double-click can fire before that, and screen readers / a11y tools can auto-fire.
    if (this.submitting) return;
    this.submitting = true;
    this.error = null;
    this.validateEmail();
    this.validatePhone();
    // Re-read myRv at click time — the user may have edited it in another tab.
    this.myRv = readMyRv(this.platformId);
    if (!this.hasValidState || !this.listing || !this.detail || !this.user) {
      this.error = 'Missing booking details. Start over from the listing.';
      this.submitting = false;
      return;
    }
    if (!this.acceptedTerms) {
      this.error = 'Please accept the booking terms to continue.';
      this.submitting = false;
      return;
    }
    if (this.fieldErrors.email || !this.contactEmail) {
      this.error = 'A valid contact email is required.';
      this.submitting = false;
      return;
    }
    if (!this.isMyRvComplete) {
      this.error = `Add your ${this.rigMissingLabel} before booking.`;
      this.submitting = false;
      return;
    }
    // Photo gate — request-to-book listings require rig + plate photos. The booking widget
    // gates this on the listing page, but a deep-link can land directly here, so re-check.
    if (!this.listing.instantBook && !hasMyRvPhotos(this.myRv)) {
      this.error = 'Add your rig and license-plate photos in your profile before completing this booking.';
      this.submitting = false;
      return;
    }
    // Date availability — listing-side (unavailable dates) and user-side (self double-book).
    const range = { start: this.startDate!.toISOString(), end: this.endDate!.toISOString() };
    if (!this.isDateRangeAvailable(this.detail, this.startDate!, this.endDate!)) {
      this.error = 'Those dates are not available. Please pick a different range.';
      this.submitting = false;
      return;
    }
    if (this.booking.hasUserDateConflict(this.user.email, this.listing.id, range)) {
      this.error = 'You already have a booking at this listing during those dates.';
      this.submitting = false;
      return;
    }
    // Gate first booking on identity verification.
    if (!this.user.verified) {
      this.idVerifyOpen = true;
      this.submitting = false; // re-enables the button while the modal is up
      return;
    }
    this.finalizeBooking();
  }

  /** Check every day in [start, end) against the listing's unavailable-date set. */
  private isDateRangeAvailable(detail: IListingDetail, start: Date, end: Date): boolean {
    const unavailable = new Set(detail.unavailableDates);
    const day = new Date(start);
    day.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (day < endDay) {
      const iso = day.toISOString().slice(0, 10);
      if (unavailable.has(iso)) return false;
      day.setDate(day.getDate() + 1);
    }
    return true;
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
        feedbackIncentive: this.feedbackIncentive,
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

  private parseIso(s: string): Date | null { return parseIsoLocal(s); }
}
