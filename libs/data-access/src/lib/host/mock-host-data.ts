import { IListing, MOCK_LISTINGS } from '../listings/mock-listings.data';
import { IBooking } from '@cnt-workspace/models';

/** Listings the current user "hosts" — picks the first 3 listings from the
 *  mock pool. Stable per-user (deterministic by ID) for demo consistency. */
export function getMyListings(_userEmail: string): IListing[] {
  return MOCK_LISTINGS.slice(0, 3);
}

/** Real bookings (from BookingService) whose listing belongs to the host. */
export function getHostBookings(hostUserEmail: string, allBookings: IBooking[]): IBooking[] {
  const listingIds = new Set(getMyListings(hostUserEmail).map(l => l.id));
  return allBookings
    .filter(b => listingIds.has(b.listingId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface IHostStats {
  earningsThisMonth: number;
  earningsYearToDate: number;
  upcomingNights: number;
  occupancyRate: number; // 0-100
  averageRating: number;
  totalReviews: number;
}

/** Derive host KPIs from real bookings + listings. No formula filler. */
export function getHostStats(listings: IListing[], hostBookings: IBooking[]): IHostStats {
  const totalReviews = listings.reduce((s, l) => s + l.reviewCount, 0);
  const averageRating = listings.length === 0
    ? 0
    : +(listings.reduce((s, l) => s + l.rating, 0) / listings.length).toFixed(2);

  if (listings.length === 0) {
    return { earningsThisMonth: 0, earningsYearToDate: 0, upcomingNights: 0, occupancyRate: 0, averageRating, totalReviews };
  }

  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  const ninetyDaysAgo = now - 90 * 86_400_000;

  const counted = hostBookings.filter(b => b.status === 'confirmed' || b.status === 'approved');

  let earningsThisMonth = 0;
  let earningsYearToDate = 0;
  let upcomingNights = 0;
  let bookedNightsLast90 = 0;

  for (const b of counted) {
    const start = new Date(b.dates.start).getTime();
    const end = new Date(b.dates.end).getTime();
    if (start >= monthStart.getTime()) earningsThisMonth += b.total || 0;
    if (start >= yearStart) earningsYearToDate += b.total || 0;
    if (start >= now) upcomingNights += b.nights || 0;
    // Occupancy: overlap of [start, end] with [ninetyDaysAgo, now]
    const overlapStart = Math.max(start, ninetyDaysAgo);
    const overlapEnd = Math.min(end, now);
    if (overlapEnd > overlapStart) {
      bookedNightsLast90 += Math.ceil((overlapEnd - overlapStart) / 86_400_000);
    }
  }

  const availableNights = listings.length * 90;
  const occupancyRate = availableNights === 0
    ? 0
    : Math.min(100, Math.round((bookedNightsLast90 / availableNights) * 100));

  return {
    earningsThisMonth: Math.round(earningsThisMonth),
    earningsYearToDate: Math.round(earningsYearToDate),
    upcomingNights,
    occupancyRate,
    averageRating,
    totalReviews,
  };
}

export interface IHostRequest {
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

/** Reserved — seeded demo requests removed in favor of real pending bookings. */
export function getPendingRequests(_listings: IListing[]): IHostRequest[] {
  return [];
}
