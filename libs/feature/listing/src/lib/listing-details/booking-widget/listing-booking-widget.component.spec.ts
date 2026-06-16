import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DateRange } from '@angular/material/datepicker';
import {
  CANCELLATION_TIER_META, IListingDetail, IPrivateListing,
} from '@cnt-workspace/data-access';
import { ListingBookingWidgetComponent } from './listing-booking-widget.component';
import { BookingStateService } from '../booking-state.service';

/** Writable stub for the in-component BookingStateService — the
 *  widget template touches ~15 properties + methods. Each spec
 *  flips the fields it cares about and the rest stay neutral. */
class BookingStateStub {
  // Getters the spec drives via fields
  canBook = false;
  nights = 0;
  total = 0;
  subtotal = 0;
  serviceFee = 0;

  guestCount = 1;
  showCalendar = false;
  showAddOns = false;
  selectedAddOns = new Set<string>();
  selectedDateRange: DateRange<Date> | null = null;
  dateDisplay = 'Add dates';
  dateRangeError: string | null = null;
  refundPreview: { label: string; tone: 'good' | 'warn' | 'bad'; date: string | null } = {
    label: '', tone: 'good', date: null,
  };

  readonly today = new Date();
  dateFilter = (_d: Date | null): boolean => true;

  // Methods invoked from template — no-ops; spec doesn't drive interactions.
  toggleCalendar(): void { /* no-op */ }
  closeCalendar(): void { /* no-op */ }
  clearDates(): void { /* no-op */ }
  toggleAddOnsPanel(): void { /* no-op */ }
  adjustGuests(_d: number): void { /* no-op */ }
  toggleAddOn(_id: string): void { /* no-op */ }
  addOnQty(_id: string): number { return 1; }
  addOnLineTotal(_id: string): number { return 0; }
  onDateSelected(_d: Date | null): void { /* no-op */ }
}

function mkListing(over: Partial<IPrivateListing> = {}): IPrivateListing {
  return {
    id: 1,
    kind: 'private',
    title: 'Maple Ridge',
    location: 'Bend, OR',
    lat: 44.05, lng: -121.31,
    category: 'vineyard' as any,
    amenities: [] as any,
    image: '',
    price: 80,
    rating: 4.8,
    reviewCount: 12,
    instantBook: false,
    ...over,
  } as IPrivateListing;
}

function mkDetail(over: Partial<IListingDetail> = {}): IListingDetail {
  return {
    description: 'A quiet stay.',
    host: {
      name: 'Sam', initials: 'S', avatar: '', joinedYear: 2024,
      bio: 'Host bio', responseHours: 2,
    },
    photos: [], photoCaptions: [], houseRules: [],
    cancellationTier: 'easy-goin',
    maxGuests: 4, maxStayNights: 14,
    subScores: { cleanliness: 5, communication: 5, location: 5, hookups: 5, value: 5 },
    reviews: [],
    nearby: [],
    trustBadges: [],
    unavailableDates: [],
    siteSpecs: {} as any,
    addOns: [],
    faqs: [],
    ...over,
  } as IListingDetail;
}

@Component({
  template: `
    <cnt-listing-booking-widget
      [listing]="listing"
      [detail]="detail"
      [cancellationMeta]="meta">
    </cnt-listing-booking-widget>`,
  standalone: true,
  imports: [ListingBookingWidgetComponent],
})
class HostComponent {
  listing = mkListing();
  detail = mkDetail();
  meta = CANCELLATION_TIER_META;
}

describe('ListingBookingWidgetComponent (P6/A + P8/B locks)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let booking: BookingStateStub;

  beforeEach(() => {
    booking = new BookingStateStub();
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([]),
        { provide: BookingStateService, useValue: booking },
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function html(): string {
    return fixture.nativeElement.innerHTML as string;
  }

  describe('headline swap (P6/A)', () => {
    it('renders "$X / night" + trust copy when canBook=false', () => {
      // Default: booking.canBook = false
      expect(html()).toContain('$80');
      expect(html()).toContain('/ night');
      expect(html()).toContain('Prices include all fees — no surprises at checkout.');
      expect(html()).not.toContain('for 0 nights');
    });

    it('renders "$total for N nights" + per-night math when canBook=true (3 nights)', () => {
      booking.canBook = true;
      booking.nights = 3;
      booking.total = 240;
      fixture.detectChanges();
      const out = html();
      expect(out).toContain('$240');
      expect(out).toContain('for 3 nights');
      expect(out).toContain('$80 × 3 nights · all fees included');
      expect(out).not.toContain('Prices include all fees — no surprises at checkout.');
    });

    it('uses the singular "night" when nights=1', () => {
      booking.canBook = true;
      booking.nights = 1;
      booking.total = 80;
      fixture.detectChanges();
      const out = html();
      expect(out).toContain('for 1 night');
      expect(out).not.toContain('for 1 nights');
      expect(out).toContain('$80 × 1 night · all fees included');
    });

    it('headline container uses the P8/B flex-wrap reflow safety classes', () => {
      const container = fixture.nativeElement.querySelector('.flex.flex-wrap.items-baseline');
      expect(container).toBeTruthy();
    });
  });

  describe('instant-book vs request-mode signal', () => {
    it('renders the trinidad Instant Book pill when listing.instantBook=true', () => {
      host.listing = mkListing({ instantBook: true });
      fixture.detectChanges();
      const out = html();
      expect(out).toContain('Instant Book — confirm now');
      expect(out).toContain('bg-trinidad/10');
    });

    it('renders the jungle-green response-time pill when instantBook=false', () => {
      // Default: instantBook=false; responseHours=2
      const out = html();
      expect(out).toContain('Replies within 2h');
      expect(out).toContain('bg-jungle-green/10');
    });
  });

  describe('Review Reward callout', () => {
    it('shows the per-night incentive default copy when nights=0', () => {
      // Default state.
      expect(html()).toContain('Earn $5 per night Review Reward');
    });

    it('shows $X Review Reward with $5 × N nights when nights > 0', () => {
      booking.nights = 3;
      fixture.detectChanges();
      const out = html();
      expect(out).toContain('$15 Review Reward');
      expect(out).toContain('($5 × 3 nights)');
    });

    it('singular reward copy at nights=1', () => {
      booking.nights = 1;
      fixture.detectChanges();
      const out = html();
      expect(out).toContain('$5 Review Reward');
      expect(out).toContain('($5 × 1 night)');
    });
  });
});
