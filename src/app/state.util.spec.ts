import { listingStateSlug, listingsInState } from './state.util';
import { Listing } from './search-results/mock-listings.data';

const make = (overrides: Partial<Listing>): Listing => ({
  id: 999, title: 't', location: 'Napa, CA', lat: 0, lng: 0,
  price: 0, rating: 0, reviewCount: 0, category: 'vineyard',
  amenities: [], image: '', instantBook: false,
  ...overrides,
});

describe('state.util', () => {
  it('listingStateSlug parses a known abbreviation', () => {
    expect(listingStateSlug(make({ location: 'Napa, CA' }))).toBe('california');
  });

  it('listingStateSlug returns null for unknown abbreviation', () => {
    expect(listingStateSlug(make({ location: 'Foo, ZZ' }))).toBeNull();
  });

  it('listingsInState returns only listings in that state', () => {
    const out = listingsInState('california');
    expect(out.length).toBeGreaterThan(0);
    for (const l of out) {
      expect(listingStateSlug(l)).toBe('california');
    }
  });
});
