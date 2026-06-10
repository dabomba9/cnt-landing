import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  IListing, IMyRvProfile, ReviewService,
} from '@cnt-workspace/data-access';
import { ListingCardComponent } from './listing-card.component';

/** Stub ReviewService — the card only calls aggregateRating. */
class ReviewServiceStub {
  aggregateRating(seededRating: number, seededCount: number, _listingId: number) {
    return { rating: seededRating, count: seededCount };
  }
}

function privateListing(over: Partial<IListing> = {}): IListing {
  return {
    id: 4,                  // 4 % 4 === 0 → easy-goin' tier
    kind: 'private',
    title: 'Maple Ridge',
    location: 'Bend, OR',
    lat: 44.05, lng: -121.31,
    category: 'vineyard' as any,
    amenities: ['water', 'electric', 'wifi'] as any,
    image: 'assets/images/host_vineyard.webp',
    price: 80,
    rating: 4.5,
    reviewCount: 12,
    instantBook: true,
    ...over,
  } as IListing;
}

function boondockingListing(): IListing {
  return {
    id: 81,
    kind: 'boondocking',
    title: 'BLM Land',
    location: 'Coconino, AZ',
    lat: 35.0, lng: -111.6,
    category: 'offgrid' as any,
    amenities: [] as any,
    image: '',
    agency: 'BLM',
  } as IListing;
}

@Component({
  template: `
    <cnt-listing-card
      [listing]="listing"
      [nights]="nights"
      [rvProfile]="rvProfile"
      [showAddToTrip]="showAddToTrip"
      [isFavorite]="isFavorite"
      (favoriteToggle)="favs = (favs ?? 0) + 1"
      (addToTripClick)="trips = (trips ?? 0) + 1">
    </cnt-listing-card>`,
  standalone: true,
  imports: [ListingCardComponent],
})
class HostComponent {
  listing: IListing = privateListing();
  nights = 0;
  rvProfile: IMyRvProfile | null = null;
  showAddToTrip = false;
  isFavorite = false;
  favs: number | null = null;
  trips: number | null = null;
}

describe('ListingCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: ReviewService, useClass: ReviewServiceStub },
        provideRouter([]),
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function html(): string {
    return fixture.nativeElement.innerHTML as string;
  }

  describe('price chip', () => {
    it('shows "$X / night" when no date range is set', () => {
      host.nights = 0;
      fixture.detectChanges();
      expect(html()).toContain('$80');
      expect(html()).toContain('/ night');
      expect(html()).not.toContain('total');
    });

    it('swaps to total + per-night when nights > 0 (always visible, not hover-only)', () => {
      host.nights = 3;
      fixture.detectChanges();
      const out = html();
      expect(out).toContain('$240');                 // 80 × 3
      expect(out).toContain('total · 3 nights');
      expect(out).toContain('$80 / night');
    });

    it('renders no price chip for boondocking listings', () => {
      host.listing = boondockingListing();
      host.nights = 3;
      fixture.detectChanges();
      expect(html()).not.toContain('/ night');
      expect(html()).not.toContain('total · ');
    });
  });

  describe('free-cancel chip', () => {
    it('renders for easy-goin tier (listing id 4)', () => {
      // id 4 % 4 = 0 → easy-goin
      expect(html()).toContain("Easy Goin'");
      expect(html()).toContain('Free cancel');
    });

    it('renders for moderate tier (id 5)', () => {
      host.listing = privateListing({ id: 5 });
      fixture.detectChanges();
      expect(html()).toContain('Moderate');
      expect(html()).toContain('Free cancel');
    });

    it('skipped for strict tier (id 6)', () => {
      host.listing = privateListing({ id: 6 });
      fixture.detectChanges();
      expect(html()).not.toContain('Free cancel');
    });

    it('skipped for exclusive tier (id 7)', () => {
      host.listing = privateListing({ id: 7 });
      fixture.detectChanges();
      expect(html()).not.toContain('Free cancel');
    });

    it('skipped for boondocking listings', () => {
      host.listing = boondockingListing();
      fixture.detectChanges();
      expect(html()).not.toContain('Free cancel');
    });
  });

  describe('mobile aspect ratio', () => {
    it('uses 16/10 on mobile, 4/3 from md up', () => {
      const hero = fixture.nativeElement.querySelector('.relative.aspect-\\[16\\/10\\]');
      expect(hero).toBeTruthy();
    });
  });

  describe('instant-book / boondocking chips', () => {
    it('renders Instant Book chip for private + instantBook=true', () => {
      expect(html()).toContain('Instant Book');
    });

    it('omits Instant Book chip when instantBook=false', () => {
      host.listing = privateListing({ instantBook: false });
      fixture.detectChanges();
      expect(html()).not.toContain('Instant Book');
    });

    it('renders agency chip instead of instant-book for boondocking', () => {
      host.listing = boondockingListing();
      fixture.detectChanges();
      expect(html()).toContain('BLM');
      expect(html()).not.toContain('Instant Book');
    });
  });

  describe('favorite toggle', () => {
    it('reflects aria-pressed from input', () => {
      host.isFavorite = true;
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('.favorite-btn') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('emits favoriteToggle on click', () => {
      const btn = fixture.nativeElement.querySelector('.favorite-btn') as HTMLButtonElement;
      btn.click();
      expect(host.favs).toBe(1);
    });
  });

  describe('add-to-trip pill', () => {
    it('omitted by default', () => {
      expect(html()).not.toContain('Add to trip');
    });

    it('renders + emits when showAddToTrip is true', () => {
      host.showAddToTrip = true;
      fixture.detectChanges();
      expect(html()).toContain('Add to trip');
      const btn = Array.from(fixture.nativeElement.querySelectorAll('button'))
        .find(b => (b as HTMLElement).textContent?.includes('Add to trip')) as HTMLButtonElement | undefined;
      expect(btn).toBeTruthy();
      btn!.click();
      expect(host.trips).toBe(1);
    });
  });

  describe('rv-fit pill', () => {
    it('omitted when no rv profile', () => {
      expect(html()).not.toContain('Fits your');
      expect(html()).not.toContain('Too long for');
    });

    it('renders "Fits your <name>" when profile length <= max', () => {
      host.rvProfile = { name: 'My Class C', type: 'class-c', length: 20 } as IMyRvProfile;
      fixture.detectChanges();
      expect(html()).toContain('Fits your');
    });

    it('renders "Too long for your <name>" when profile too long', () => {
      host.rvProfile = { name: 'Big Rig', type: 'class-a', length: 80 } as IMyRvProfile;
      fixture.detectChanges();
      expect(html()).toContain('Too long for');
    });
  });
});
