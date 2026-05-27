import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import type { IBooking } from '@cnt-workspace/models';
import type { IListing } from '../listings/mock-listings.data';

/** Kinds of stop a guest can add to a trip plan. */
export type TripStopKind = 'private' | 'boondocking' | 'poi' | 'custom';

export interface ITripStop {
  id: string;
  kind: TripStopKind;
  /** Source id when the stop references an existing listing or POI.
   *  `number` for listings (1-80 private, 81-100 boondocking), `string` for POIs.
   *  Undefined for `custom` pin-drop stops. */
  refId?: number | string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  /** Optional photo data-URL or asset path. */
  photo?: string;
  /** Per-stop dates, when planned. Both optional; format YYYY-MM-DD. */
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
}

export interface ITripPlan {
  id: string;
  name: string;
  /** Trip-level window. Per-stop dates must fall inside it when both are set. */
  startDate?: string;
  endDate?: string;
  /** Ordered list of stops. First = trip start, last = trip finish. */
  stops: ITripStop[];
  /** Corridor radius (miles) for filtering autocomplete results to candidates
   *  within X miles of the existing route polyline. 0 = no filter. */
  corridorMiles?: number;
  createdAt: string;
  updatedAt: string;
}

const TRIP_PLANS_KEY = 'cnt-trip-plans';
const TRIP_ACTIVE_ID_KEY = 'cnt-trip-active-id';

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Default auto-name for a freshly created trip — date-based, e.g.
 *  "Trip — May 26, 2026". Inline-renameable wherever the trip surfaces. */
export function autoTripName(now: Date = new Date()): string {
  return `Trip — ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

/** Parse 'YYYY-MM-DD' or full ISO into a Date; null on garbage. */
export function parseIsoDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → 'YYYY-MM-DD' — matches how trip plans store dates. */
export function formatIsoDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Short human label for a date pill, e.g. "May 27" or "May 27, 2026" when
 *  the year differs from the current year. */
export function shortDateLabel(d: Date | null | undefined, now: Date = new Date()): string {
  if (!d) return '';
  const opts: Intl.DateTimeFormatOptions = d.getFullYear() === now.getFullYear()
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', opts);
}

/** Minimal trip payload baked into shareable URLs — strips ids, timestamps,
 *  photo blobs. lat/lng rounded to 5 decimals (~1m precision) to shrink the URL. */
export interface ITripShareV1 {
  v: 1;
  n: string;
  s?: string;
  e?: string;
  c?: number;
  S: Array<{
    k: TripStopKind;
    r?: number | string;
    n: string;
    a: number;
    g: number;
    d?: string;
    i?: string;
    o?: string;
    t?: string;
  }>;
}

/** Encode an ITripPlan into a URL-safe base64 string for sharing. */
export function encodeTripShare(plan: ITripPlan): string {
  const payload: ITripShareV1 = {
    v: 1,
    n: plan.name,
    s: plan.startDate,
    e: plan.endDate,
    c: plan.corridorMiles,
    S: plan.stops.map(s => ({
      k: s.kind,
      r: s.refId,
      n: s.name,
      a: Math.round(s.lat * 1e5) / 1e5,
      g: Math.round(s.lng * 1e5) / 1e5,
      d: s.address,
      i: s.checkInDate,
      o: s.checkOutDate,
      t: s.notes,
    })),
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a share-link payload back into stop data the viewer can render. */
export function decodeTripShare(payload: string): ITripShareV1 | null {
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 ? '='.repeat(4 - (padded.length % 4)) : '';
    const b64 = padded + pad;
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json);
    if (parsed?.v !== 1 || !Array.isArray(parsed?.S)) return null;
    return parsed as ITripShareV1;
  } catch {
    return null;
  }
}

/** Great-circle distance between two points in miles. */
export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance (miles) from a point to a line segment, using an equirectangular
 *  projection valid at small scales (well within a continental road trip). */
export function pointToSegmentMiles(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const midLat = ((a.lat + b.lat) / 2) * Math.PI / 180;
  const kx = 69.172 * Math.cos(midLat);
  const ky = 69.172;
  const ax = a.lng * kx, ay = a.lat * ky;
  const bx = b.lng * kx, by = b.lat * ky;
  const px = p.lng * kx, py = p.lat * ky;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Minimum distance (miles) from a candidate point to any segment of a route
 *  polyline. Used for corridor filtering of autocomplete results. */
export function pointToRouteMiles(
  p: { lat: number; lng: number },
  route: { lat: number; lng: number }[],
): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) return haversineMiles(p, route[0]);
  let best = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const d = pointToSegmentMiles(p, route[i], route[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Find the live booking (if any) that this stop already represents — drives
 * the "Booked ✓" / "Request out" badges on private-listing stops in the
 * planner. Only matches private listings (boondocking and POIs aren't
 * bookable). Prefers a date-overlapping booking when stop dates are set;
 * falls back to the newest active booking on the listing.
 *
 * Returns null when there's no match or the stop isn't a private listing.
 */
export function bookingForStop(
  stop: Pick<ITripStop, 'kind' | 'refId' | 'checkInDate' | 'checkOutDate'>,
  bookings: readonly IBooking[],
): IBooking | null {
  if (stop.kind !== 'private' || typeof stop.refId !== 'number') return null;
  const live = bookings.filter(b =>
    b.listingId === stop.refId && b.status !== 'cancelled' && b.status !== 'declined'
  );
  if (live.length === 0) return null;
  if (stop.checkInDate && stop.checkOutDate) {
    const sStart = new Date(stop.checkInDate + 'T00:00:00').getTime();
    const sEnd = new Date(stop.checkOutDate + 'T00:00:00').getTime();
    const overlap = live.find(b => {
      const bs = new Date(b.dates.start).getTime();
      const be = new Date(b.dates.end).getTime();
      return bs <= sEnd && be >= sStart;
    });
    if (overlap) return overlap;
  }
  return live.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/**
 * Generic "along the route" filter — returns the candidates within
 * `corridorMiles` of the polyline through `routePoints`, sorted by distance,
 * excluding any whose lat/lng matches an existing stop (so the same place
 * isn't suggested twice). Used by both /search drawer and the focused editor
 * to power the "Suggested stops along your route" panel.
 *
 * Generic so it works for IListing, IPoi, and anything with lat/lng.
 */
export function suggestionsAlongRoute<T extends { lat: number; lng: number }>(
  candidates: readonly T[],
  routePoints: readonly { lat: number; lng: number }[],
  corridorMiles: number,
  existingStops: readonly { lat: number; lng: number }[],
  max = 5,
): T[] {
  if (corridorMiles <= 0 || routePoints.length < 2 || candidates.length === 0) return [];
  const dupe = new Set(existingStops.map(s => `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`));
  const scored: { c: T; d: number }[] = [];
  for (const c of candidates) {
    if (dupe.has(`${c.lat.toFixed(4)},${c.lng.toFixed(4)}`)) continue;
    const d = pointToRouteMiles(c, routePoints as { lat: number; lng: number }[]);
    if (d <= corridorMiles) scored.push({ c, d });
  }
  scored.sort((a, b) => a.d - b.d);
  return scored.slice(0, max).map(s => s.c);
}

export interface ITripCost {
  /** Nights across all stops that have both check-in and check-out set. */
  totalNights: number;
  /** Subset of totalNights that fall at private listings (the only paid kind). */
  paidNights: number;
  /** Sum of paidNights × listing.price across matched private stops. */
  totalCost: number;
  /** True when a private stop's refId didn't match any listing — pricing is incomplete. */
  unknownPrice: boolean;
}

/** Estimate trip cost from stop check-in/out dates × matched listing prices.
 *  Boondocking, POIs, and custom pins contribute nights but no cost. */
export function tripCostSummary(plan: Pick<ITripPlan, 'stops'>, listings: readonly IListing[]): ITripCost {
  let totalNights = 0;
  let paidNights = 0;
  let totalCost = 0;
  let unknownPrice = false;
  for (const s of plan.stops) {
    const ci = parseIsoDate(s.checkInDate);
    const co = parseIsoDate(s.checkOutDate);
    if (!ci || !co) continue;
    const nights = Math.max(0, Math.round((co.getTime() - ci.getTime()) / 86_400_000));
    if (nights === 0) continue;
    totalNights += nights;
    if (s.kind !== 'private') continue;
    const listing = listings.find(l => l.id === s.refId && l.kind !== 'boondocking');
    if (!listing) { unknownPrice = true; continue; }
    const price = (listing as { price?: number }).price ?? 0;
    paidNights += nights;
    totalCost += nights * price;
  }
  return { totalNights, paidNights, totalCost, unknownPrice };
}

/** A leg longer than this (in minutes) is flagged as a "long drive" — the
 *  default ~6h matches federal commercial-driver fatigue guidance and is a
 *  reasonable single-day RV ceiling. Future: per-RV-profile override. */
export const LONG_LEG_MINUTES = 360;

/** True when this leg's driving time pushes past the long-drive threshold. */
export function isLongLeg(minutes: number): boolean {
  return minutes > 0 && minutes >= LONG_LEG_MINUTES;
}

/** Total trip distance — sum of haversine between consecutive stops. */
export function totalTripMiles(plan: Pick<ITripPlan, 'stops'>): number {
  let total = 0;
  for (let i = 0; i < plan.stops.length - 1; i++) {
    total += haversineMiles(plan.stops[i], plan.stops[i + 1]);
  }
  return Math.round(total);
}

/** Nearest-neighbor reorder of the middle stops, keeping first and last pinned. */
export function nearestNeighborMiddle(stops: ITripStop[]): ITripStop[] {
  if (stops.length <= 3) return stops.slice();
  const first = stops[0];
  const last = stops[stops.length - 1];
  const middle = stops.slice(1, -1);
  const ordered: ITripStop[] = [];
  let cursor: { lat: number; lng: number } = first;
  while (middle.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < middle.length; i++) {
      const d = haversineMiles(cursor, middle[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = middle.splice(bestIdx, 1)[0];
    ordered.push(next);
    cursor = next;
  }
  return [first, ...ordered, last];
}

/** One-time migration from the old startPoint/endPoint shape into the
 *  unified stops list. Idempotent. */
type LegacyShape = { startPoint?: ITripStop; endPoint?: ITripStop };
function migratePlan(raw: ITripPlan & LegacyShape): ITripPlan {
  const stops = Array.isArray(raw.stops) ? raw.stops.slice() : [];
  if (raw.startPoint) stops.unshift(raw.startPoint);
  if (raw.endPoint) stops.push(raw.endPoint);
  const { startPoint: _s, endPoint: _e, ...rest } = raw;
  void _s; void _e;
  return { ...rest, stops };
}

@Injectable({ providedIn: 'root' })
export class TripPlannerService {
  private readonly _plans$ = new BehaviorSubject<ITripPlan[]>([]);
  readonly plans$: Observable<ITripPlan[]> = this._plans$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    const migrated = this.read();
    this._plans$.next(migrated);
    // Persist the migrated shape back so future reads skip the work.
    this.write(migrated, /* skipBus */ true);
  }

  list(): ITripPlan[] { return this._plans$.value; }

  get(id: string): ITripPlan | null {
    return this._plans$.value.find(p => p.id === id) ?? null;
  }

  create(name: string): ITripPlan {
    const now = new Date().toISOString();
    const plan: ITripPlan = {
      id: newId('tp'),
      name: name?.trim() || 'Untitled trip',
      stops: [],
      corridorMiles: 0,
      createdAt: now,
      updatedAt: now,
    };
    const all = this._plans$.value.slice();
    all.push(plan);
    this.write(all);
    this.setActiveId(plan.id);
    return plan;
  }

  update(id: string, patch: Partial<Omit<ITripPlan, 'id' | 'createdAt'>>): ITripPlan | null {
    const all = this._plans$.value.slice();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, id: all[idx].id, createdAt: all[idx].createdAt, updatedAt: new Date().toISOString() };
    this.write(all);
    return all[idx];
  }

  /** Clone an existing plan with fresh ids — stop list, dates, corridor are
   *  all carried over; the name gets a "(copy)" suffix. */
  duplicate(id: string): ITripPlan | null {
    const original = this.get(id);
    if (!original) return null;
    const now = new Date().toISOString();
    const copy: ITripPlan = {
      ...original,
      id: newId('tp'),
      name: `${original.name} (copy)`,
      stops: original.stops.map(s => ({ ...s, id: newId('s') })),
      createdAt: now,
      updatedAt: now,
    };
    const all = this._plans$.value.slice();
    all.push(copy);
    this.write(all);
    this.setActiveId(copy.id);
    return copy;
  }

  /** Materialize a decoded share payload into a new plan in localStorage and
   *  mark it active. Returns the new plan id. */
  importShare(payload: ITripShareV1): ITripPlan {
    const now = new Date().toISOString();
    const plan: ITripPlan = {
      id: newId('tp'),
      name: payload.n || 'Shared trip',
      startDate: payload.s,
      endDate: payload.e,
      corridorMiles: payload.c ?? 0,
      stops: payload.S.map(s => ({
        id: newId('s'),
        kind: s.k,
        refId: s.r,
        name: s.n,
        lat: s.a,
        lng: s.g,
        address: s.d,
        checkInDate: s.i,
        checkOutDate: s.o,
        notes: s.t,
      })),
      createdAt: now,
      updatedAt: now,
    };
    const all = this._plans$.value.slice();
    all.push(plan);
    this.write(all);
    this.setActiveId(plan.id);
    return plan;
  }

  delete(id: string): void {
    const next = this._plans$.value.filter(p => p.id !== id);
    this.write(next);
    if (this.getActiveId() === id) this.setActiveId(null);
  }

  addStop(planId: string, stop: Omit<ITripStop, 'id'>): ITripPlan | null {
    const plan = this.get(planId);
    if (!plan) return null;
    const withId: ITripStop = { ...stop, id: newId('s') };
    return this.update(planId, { stops: [...plan.stops, withId] });
  }

  removeStop(planId: string, stopId: string): ITripPlan | null {
    const plan = this.get(planId);
    if (!plan) return null;
    return this.update(planId, { stops: plan.stops.filter(s => s.id !== stopId) });
  }

  /** Patch one stop in-place — for per-stop dates, notes, name edits. */
  updateStop(planId: string, stopId: string, patch: Partial<Omit<ITripStop, 'id'>>): ITripPlan | null {
    const plan = this.get(planId);
    if (!plan) return null;
    const stops = plan.stops.map(s => s.id === stopId ? { ...s, ...patch } : s);
    return this.update(planId, { stops });
  }

  /** Move a stop within the ordered list. CDK drag conventions. */
  reorderStops(planId: string, fromIndex: number, toIndex: number): ITripPlan | null {
    const plan = this.get(planId);
    if (!plan) return null;
    const next = plan.stops.slice();
    if (fromIndex < 0 || fromIndex >= next.length) return plan;
    const clampedTo = Math.max(0, Math.min(next.length - 1, toIndex));
    const [moved] = next.splice(fromIndex, 1);
    next.splice(clampedTo, 0, moved);
    return this.update(planId, { stops: next });
  }

  /** Nearest-neighbor optimization on the middle stops; first + last are pinned. */
  optimizeRoute(planId: string): ITripPlan | null {
    const plan = this.get(planId);
    if (!plan || plan.stops.length <= 3) return plan;
    return this.update(planId, { stops: nearestNeighborMiddle(plan.stops) });
  }

  /** Last-edited plan id — drives the "resume" CTA on the list page. */
  getActiveId(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try { return localStorage.getItem(TRIP_ACTIVE_ID_KEY); } catch { return null; }
  }
  setActiveId(id: string | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (id) localStorage.setItem(TRIP_ACTIVE_ID_KEY, id);
      else localStorage.removeItem(TRIP_ACTIVE_ID_KEY);
    } catch { /* noop */ }
  }

  private read(): ITripPlan[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(TRIP_PLANS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p: ITripPlan & LegacyShape) => migratePlan(p));
    } catch { return []; }
  }

  private write(plans: ITripPlan[], skipBus = false): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(TRIP_PLANS_KEY, JSON.stringify(plans)); } catch { /* noop */ }
    }
    if (!skipBus) this._plans$.next(plans);
  }
}
