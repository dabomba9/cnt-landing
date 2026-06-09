import { IListing, IPrivateListing, MOCK_LISTINGS, getListingDetail } from '../listings/mock-listings.data';
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

/** True when the user has published at least one listing of their own.
 * Distinct from getMyListings(), which falls back to the seeded demo trio. */
export function hasOwnedListings(userEmail: string): boolean {
  if (!userEmail) return false;
  return (readOwnedMap()[userEmail] ?? []).length > 0;
}

/** Inverse of addOwnedListing — used by the delete-listing flow. */
export function removeOwnedListing(userEmail: string, listingId: number): void {
  if (!userEmail) return;
  const map = readOwnedMap();
  const existing = map[userEmail];
  if (!existing) return;
  const next = existing.filter(id => id !== listingId);
  if (next.length === existing.length) return;
  if (next.length === 0) delete map[userEmail];
  else map[userEmail] = next;
  writeOwnedMap(map);
}

/**
 * Returns true when the listing was published by the given user (recorded
 * via `addOwnedListing` at publish time). Drives owner-only UI like the
 * "Edit listing" CTA on /listing?id=N.
 */
export function isOwnedByUser(userEmail: string, listingId: number): boolean {
  if (!userEmail) return false;
  return (readOwnedMap()[userEmail] ?? []).includes(listingId);
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

// ─────────────────────── Per-add-on analytics ───────────────────────

/**
 * Per-add-on performance summary surfaced on the host dashboard. One row per
 * add-on the host currently offers across their listings (so unbooked rows
 * still appear with 0 metrics — hosts can spot the under-performers).
 */
export interface IAddOnPerformance {
  id: string;
  label: string;
  icon?: string;
  photo?: string;
  /** Number of confirmed/approved bookings that included this add-on. */
  bookingsCount: number;
  /** Total confirmed/approved bookings for the host — denominator for attachRate. */
  totalEligible: number;
  /** 0–100 (rounded). */
  attachRate: number;
  /** Sum of IBookingAddOn.amount across qualifying bookings. */
  totalRevenue: number;
  /** Sum of IBookingAddOn.quantity (useful for per-unit products). */
  totalUnits: number;
  /** ISO timestamp of the most recent qualifying booking; null when never booked. */
  lastBookedAt: string | null;
}

/**
 * Aggregate add-on performance across the host's listings + bookings.
 * Returns one entry per add-on the host *currently offers* (so the host can
 * see "Pet fee: 0%" and decide to drop or reprice). Sorted by revenue desc
 * with unbooked rows at the bottom.
 */
export function getAddOnPerformance(
  listings: IListing[],
  hostBookings: IBooking[],
): IAddOnPerformance[] {
  // Build the catalog: every add-on the host currently offers, keyed by id.
  // Boondocking listings can't carry user add-ons; narrow to private and read
  // from the snapshot-aware getListingDetail so we see what guests would see.
  const catalog = new Map<string, IAddOnPerformance>();
  for (const l of listings) {
    if (l.kind === 'boondocking') continue;
    let addOns;
    try { addOns = getListingDetail(l).addOns; } catch { continue; }
    for (const a of addOns) {
      if (catalog.has(a.id)) continue; // first listing wins; ids are unique within a draft
      catalog.set(a.id, {
        id: a.id,
        label: a.label,
        icon: a.icon,
        photo: a.photo,
        bookingsCount: 0,
        totalEligible: 0,
        attachRate: 0,
        totalRevenue: 0,
        totalUnits: 0,
        lastBookedAt: null,
      });
    }
  }

  // Eligible bookings are the host's confirmed/approved set.
  const eligible = hostBookings.filter(b => b.status === 'confirmed' || b.status === 'approved');
  const totalEligible = eligible.length;

  for (const b of eligible) {
    if (!b.addOns?.length) continue;
    for (const a of b.addOns) {
      const row = catalog.get(a.id);
      // If a host removed an add-on after it was booked, we drop it from
      // the dashboard — the editor catalog wins. Matches "what's currently
      // offered" framing on the dashboard.
      if (!row) continue;
      row.bookingsCount += 1;
      row.totalRevenue += a.amount || 0;
      row.totalUnits += a.quantity || 1;
      if (!row.lastBookedAt || b.createdAt > row.lastBookedAt) {
        row.lastBookedAt = b.createdAt;
      }
    }
  }

  // Finalize attach rates and sort.
  const rows = [...catalog.values()];
  for (const r of rows) {
    r.totalEligible = totalEligible;
    r.attachRate = totalEligible === 0 ? 0 : Math.round((100 * r.bookingsCount) / totalEligible);
  }
  rows.sort((a, b) => {
    // Booked rows above unbooked; within each group sort by revenue desc.
    if ((a.bookingsCount > 0) !== (b.bookingsCount > 0)) return a.bookingsCount > 0 ? -1 : 1;
    return b.totalRevenue - a.totalRevenue;
  });
  return rows;
}

/** Per-listing breakdown of one add-on's performance. Drives the
 *  P3.2 / B drill-in on the host dashboard so the host can answer
 *  "which sites is this add-on actually selling on?" */
export interface IAddOnPerListingRow {
  listingId: number;
  title: string;
  /** True when the listing currently offers this add-on (the editor catalog wins). */
  offered: boolean;
  /** Bookings on this listing that included this add-on. */
  bookingsCount: number;
  /** Per-listing eligible bookings — denominator for attachRate. */
  eligibleCount: number;
  attachRate: number;             // 0–100, rounded
  totalUnits: number;
  totalRevenue: number;
}

/** Invert getAddOnPerformance for one add-on: rows are listings, not
 *  add-ons. Returns one row per listing the host owns — listings that
 *  don't offer the add-on appear with offered=false so the host can
 *  spot uneven coverage. */
export function getAddOnPerListingBreakdown(
  addOnId: string,
  listings: IListing[],
  hostBookings: IBooking[],
): IAddOnPerListingRow[] {
  const rows = new Map<number, IAddOnPerListingRow>();
  for (const l of listings) {
    if (l.kind === 'boondocking') continue;
    let offered = false;
    try {
      offered = getListingDetail(l).addOns.some(a => a.id === addOnId);
    } catch { offered = false; }
    rows.set(l.id, {
      listingId: l.id,
      title: l.title,
      offered,
      bookingsCount: 0,
      eligibleCount: 0,
      attachRate: 0,
      totalUnits: 0,
      totalRevenue: 0,
    });
  }

  // Walk eligible bookings per listing, tallying both the eligible
  // denominator + the per-add-on numerator.
  const eligible = hostBookings.filter(b => b.status === 'confirmed' || b.status === 'approved');
  for (const b of eligible) {
    const row = rows.get(b.listingId);
    if (!row) continue;
    row.eligibleCount += 1;
    if (!b.addOns?.length) continue;
    for (const a of b.addOns) {
      if (a.id !== addOnId) continue;
      row.bookingsCount += 1;
      row.totalRevenue += a.amount || 0;
      row.totalUnits += a.quantity || 1;
    }
  }

  const out = [...rows.values()];
  for (const r of out) {
    r.attachRate = r.eligibleCount === 0 ? 0 : Math.round((100 * r.bookingsCount) / r.eligibleCount);
  }
  // Listings that don't offer the add-on sink to the bottom; within each
  // group, sort by revenue then attach rate.
  out.sort((a, b) => {
    if (a.offered !== b.offered) return a.offered ? -1 : 1;
    if (a.totalRevenue !== b.totalRevenue) return b.totalRevenue - a.totalRevenue;
    return b.attachRate - a.attachRate;
  });
  return out;
}
