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
  /** Origin and final destination. Same shape as a stop but logically pinned. */
  startPoint?: ITripStop;
  endPoint?: ITripStop;
  /** Intermediate stops in route order (cdkDrag reorders this array). */
  stops: ITripStop[];
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

/** Nearest-neighbor ordering of `stops` between fixed start and end points.
 * Used by the (future) "Optimize route" button. Returns a new array. */
export function nearestNeighborOrder(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  stops: ITripStop[],
): ITripStop[] {
  const remaining = stops.slice();
  const ordered: ITripStop[] = [];
  let cursor: { lat: number; lng: number } = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(cursor, remaining[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cursor = next;
  }
  // End point is already pinned outside this list; we just return the inner order.
  void end;
  return ordered;
}

@Injectable({ providedIn: 'root' })
export class TripPlannerService {
  private readonly _plans$ = new BehaviorSubject<ITripPlan[]>([]);
  readonly plans$: Observable<ITripPlan[]> = this._plans$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._plans$.next(this.read());
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
      createdAt: now,
      updatedAt: now,
    };
    const all = this.read();
    all.push(plan);
    this.write(all);
    this.setActiveId(plan.id);
    return plan;
  }

  /** Shallow-merge a patch into the plan. Bumps updatedAt automatically. */
  update(id: string, patch: Partial<Omit<ITripPlan, 'id' | 'createdAt'>>): ITripPlan | null {
    const all = this.read();
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

  /** Move a stop within the ordered list. Uses CDK drag conventions. */
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

  setStartPoint(planId: string, stop: Omit<ITripStop, 'id'> | null): ITripPlan | null {
    const withId = stop ? { ...stop, id: newId('s') } : undefined;
    return this.update(planId, { startPoint: withId });
  }

  setEndPoint(planId: string, stop: Omit<ITripStop, 'id'> | null): ITripPlan | null {
    const withId = stop ? { ...stop, id: newId('s') } : undefined;
    return this.update(planId, { endPoint: withId });
  }

  /** Reorder the inner stops via nearest-neighbor from start. Start and end
   * are pinned. Returns the updated plan (or null when start/end missing). */
  optimizeRoute(planId: string): ITripPlan | null {
    const plan = this.get(planId);
    if (!plan?.startPoint || !plan.endPoint || plan.stops.length <= 1) return plan;
    const ordered = nearestNeighborOrder(plan.startPoint, plan.endPoint, plan.stops);
    return this.update(planId, { stops: ordered });
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
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private write(plans: ITripPlan[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(TRIP_PLANS_KEY, JSON.stringify(plans)); } catch { /* noop */ }
    }
    this._plans$.next(plans);
  }
}
