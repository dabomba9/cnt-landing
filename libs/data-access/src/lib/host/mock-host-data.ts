import { IListing, IPrivateListing, MOCK_LISTINGS } from '../listings/mock-listings.data';
import { IBooking } from '@cnt-workspace/models';

const OWNED_LISTINGS_KEY = 'cnt-owned-listings';

/** Per-user map of listing IDs the user has published via the host wizard. */
type OwnedMap = Record<string, number[]>;

function readOwnedMap(): OwnedMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OWNED_LISTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as OwnedMap : {};
  } catch { return {}; }
}

function writeOwnedMap(map: OwnedMap): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(OWNED_LISTINGS_KEY, JSON.stringify(map)); } catch { /* quota */ }
}

/**
 * Mark a listing as owned by a host. Called by the publish flow in
 * HostListingDraftService so the new listing shows up on /hosting/listings.
 */
export function addOwnedListing(userEmail: string, listingId: number): void {
  if (!userEmail) return;
  const map = readOwnedMap();
  const existing = map[userEmail] ?? [];
  if (existing.includes(listingId)) return;
  map[userEmail] = [...existing, listingId];
  writeOwnedMap(map);
}

/**
 * Listings the current user hosts. Returns user-published listings (recorded
 * at publish time) plus the seeded first-3 fallback for demo continuity when
 * the user hasn't published anything yet.
 */
export function getMyListings(userEmail: string): IPrivateListing[] {
  const owned = new Set(readOwnedMap()[userEmail] ?? []);
  const fromOwned = MOCK_LISTINGS.filter(l => owned.has(l.id));
  // No published listings yet → fall back to the seeded demo trio so the host
  // dashboard isn't an empty state for first-time visitors.
  if (fromOwned.length === 0) return MOCK_LISTINGS.slice(0, 3);
  return fromOwned;
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
  // Hosts only own private listings — narrow to skip any boondocking accidentally passed in.
  const privates = listings.filter((l): l is IPrivateListing => l.kind !== 'boondocking');
  const totalReviews = privates.reduce((s, l) => s + l.reviewCount, 0);
  const averageRating = privates.length === 0
    ? 0
    : +(privates.reduce((s, l) => s + l.rating, 0) / privates.length).toFixed(2);

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
