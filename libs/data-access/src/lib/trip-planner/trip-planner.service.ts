import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

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
