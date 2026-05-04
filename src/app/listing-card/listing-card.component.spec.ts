import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ListingCardComponent } from './listing-card.component';
import { Listing, MOCK_LISTINGS } from '../search-results/mock-listings.data';

describe('ListingCardComponent', () => {
  let fixture: ComponentFixture<ListingCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ListingCardComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ListingCardComponent);
  });

  it('renders title, location, price, and rating from the listing', () => {
    // Use Heritage Oak (id=1) so the hand-authored detail (with photos) is available.
    const listing = MOCK_LISTINGS.find(l => l.id === 1) as Listing;
    fixture.componentRef.setInput('listing', listing);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain(listing.title);
    expect(text).toContain(listing.location);
    expect(text).toContain(`$${listing.price}`);
    expect(text).toContain(String(listing.rating));
  });

  it('emits favoriteToggle when the favorite button is clicked', () => {
    const listing = MOCK_LISTINGS.find(l => l.id === 1) as Listing;
    fixture.componentRef.setInput('listing', listing);
    fixture.detectChanges();

    const emitted: MouseEvent[] = [];
    fixture.componentInstance.favoriteToggle.subscribe(e => emitted.push(e));

    const favBtn = fixture.nativeElement.querySelector('.favorite-btn') as HTMLElement;
    favBtn.click();
    expect(emitted.length).toBe(1);
  });

  it('calls preventDefault and stopPropagation when chevron clicked', () => {
    const listing = MOCK_LISTINGS.find(l => l.id === 1) as Listing;
    fixture.componentRef.setInput('listing', listing);
    fixture.detectChanges();

    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as MouseEvent;
    fixture.componentInstance.nextImage(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
