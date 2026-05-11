import { Listing, MOCK_LISTINGS } from '../listings/mock-listings.data';
import { Booking } from '@cnt-workspace/models';

/** Listings the current user "hosts" — picks the first 3 listings from the
 *  mock pool. Stable per-user (deterministic by ID) for demo consistency. */
export function getMyListings(_userEmail: string): Listing[] {
  return MOCK_LISTINGS.slice(0, 3);
}

/** Real bookings (from BookingService) whose listing belongs to the host. */
export function getHostBookings(hostUserEmail: string, allBookings: Booking[]): Booking[] {
  const listingIds = new Set(getMyListings(hostUserEmail).map(l => l.id));
  return allBookings
    .filter(b => listingIds.has(b.listingId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface HostStats {
  earningsThisMonth: number;
  earningsYearToDate: number;
  upcomingNights: number;
  occupancyRate: number; // 0-100
  averageRating: number;
  totalReviews: number;
}

export function getHostStats(listings: Listing[]): HostStats {
  if (listings.length === 0) {
    return { earningsThisMonth: 0, earningsYearToDate: 0, upcomingNights: 0, occupancyRate: 0, averageRating: 0, totalReviews: 0 };
  }
  // Mock formulas based on listing data
  const avgPrice = listings.reduce((s, l) => s + l.price, 0) / listings.length;
  const totalReviews = listings.reduce((s, l) => s + l.reviewCount, 0);
  const averageRating = +(listings.reduce((s, l) => s + l.rating, 0) / listings.length).toFixed(2);
  return {
    earningsThisMonth: Math.round(avgPrice * listings.length * 4),
    earningsYearToDate: Math.round(avgPrice * listings.length * 32),
    upcomingNights: 12,
    occupancyRate: 78,
    averageRating,
    totalReviews,
  };
}

export interface HostRequest {
  id: string;
  guestName: string;
  guestInitials: string;
  guestVerified: boolean;
  listingId: number;
  listingTitle: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  nights: number;
  guests: number;
  rigSummary: string;
  total: number;
  receivedAt: string; // ISO
  message?: string;
}

/** A few seeded mock pending requests for demo. */
export function getPendingRequests(listings: Listing[]): HostRequest[] {
  if (listings.length === 0) return [];
  const now = Date.now();
  return [
    {
      id: 'req-1',
      guestName: 'Sarah & Mike',
      guestInitials: 'SM',
      guestVerified: true,
      listingId: listings[0].id,
      listingTitle: listings[0].title,
      startDate: new Date(now + 7 * 86_400_000).toISOString(),
      endDate: new Date(now + 10 * 86_400_000).toISOString(),
      nights: 3,
      guests: 2,
      rigSummary: 'Class C · 28 ft',
      total: listings[0].price * 3,
      receivedAt: new Date(now - 2 * 3_600_000).toISOString(),
      message: 'Hi! Looks beautiful — does the dump station accommodate Class C?',
    },
    {
      id: 'req-2',
      guestName: 'Marcus B.',
      guestInitials: 'MB',
      guestVerified: false,
      listingId: listings[Math.min(1, listings.length - 1)].id,
      listingTitle: listings[Math.min(1, listings.length - 1)].title,
      startDate: new Date(now + 14 * 86_400_000).toISOString(),
      endDate: new Date(now + 17 * 86_400_000).toISOString(),
      nights: 3,
      guests: 4,
      rigSummary: 'Travel Trailer · 24 ft',
      total: listings[Math.min(1, listings.length - 1)].price * 3,
      receivedAt: new Date(now - 26 * 3_600_000).toISOString(),
    },
  ];
}
