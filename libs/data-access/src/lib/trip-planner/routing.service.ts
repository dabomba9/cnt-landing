import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import type { ITripStop } from './trip-planner.service';

/** A single navigation step within a leg (e.g. "Continue onto I-15"). */
export interface IRouteStep {
  instruction: string;
  /** Distance covered by this step in miles. */
  distanceMiles: number;
  /** Estimated time for the step in minutes. */
  durationMinutes: number;
  maneuverType?: string;
  maneuverModifier?: string;
  /** Lat/lng pair where this step begins — used to "zoom to step" on click. */
  start: { lat: number; lng: number };
}

/** A leg = the segment between two consecutive stops. */
export interface IRouteLeg {
  distanceMiles: number;
  durationMinutes: number;
  steps: IRouteStep[];
}

/** A complete routed plan: full polyline + per-leg steps + totals. */
export interface IRoute {
  /** Road-following geometry as [lng, lat] pairs, ready for L.polyline. */
  coordinates: [number, number][];
  totalMiles: number;
  totalMinutes: number;
  legs: IRouteLeg[];
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const METERS_TO_MILES = 0.000621371;
const SEC_TO_MIN = 1 / 60;

/** Build the cache key from the ordered stops' coordinates. Trip name + dates
 *  don't change the route, so they're not part of the key. */
function cacheKey(stops: { lat: number; lng: number }[]): string {
  return stops.map(s => `${s.lng.toFixed(5)},${s.lat.toFixed(5)}`).join(';');
}

/**
 * OSRM response shape (only the fields we use). The public demo server returns
 * `routes[0].geometry.coordinates` as [lng, lat] pairs when `geometries=geojson`.
 */
interface IOsrmResponse {
  code: string;
  routes?: Array<{
    distance: number;       // meters
    duration: number;       // seconds
    geometry: { coordinates: [number, number][] };
    legs?: Array<{
      distance: number;
      duration: number;
      steps?: Array<{
        distance: number;
        duration: number;
        name?: string;
        maneuver?: {
          type?: string;
          modifier?: string;
          instruction?: string;
          location?: [number, number];
        };
      }>;
    }>;
  }>;
}

@Injectable({ providedIn: 'root' })
export class RoutingService {
  /** Cache of in-flight + completed routes keyed by ordered-coords. shareReplay
   * means a second subscriber gets the cached emission instead of a refetch. */
  private cache = new Map<string, Observable<IRoute | null>>();
  /** Loading-state stream consumers can subscribe to drive map shimmers. */
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  readonly loading$: Observable<boolean> = this._loading$.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Fetch (and cache) the road-following route through every stop in order.
   * Returns null for any case the routing fails or the trip is < 2 stops.
   * Falls back gracefully on network errors so the caller can degrade to a
   * straight-line render rather than a broken UI.
   */
  getRoute(stops: ITripStop[]): Observable<IRoute | null> {
    if (!stops || stops.length < 2) return of(null);
    const points = stops.map(s => ({ lat: s.lat, lng: s.lng }));
    const key = cacheKey(points);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `${OSRM_BASE}/${coords}?overview=full&steps=true&geometries=geojson&annotations=false`;
    this._loading$.next(true);

    const obs = this.http.get<IOsrmResponse>(url).pipe(
      map(res => this.normalize(res)),
      tap(() => this._loading$.next(false)),
      catchError(() => { this._loading$.next(false); return of(null); }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.cache.set(key, obs);
    return obs;
  }

  /** Format a step distance into a human label ("0.4 mi", "12 mi"). */
  formatDistance(miles: number): string {
    if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
  }

  formatDuration(minutes: number): string {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes - h * 60);
    return m === 0 ? `${h} h` : `${h} h ${m} m`;
  }

  /** Convert an OSRM response into our shape. Builds a human-readable
   *  instruction from `maneuver.type` + `modifier` + `name` so we never depend
   *  on OSRM's optional `maneuver.instruction` field. */
  private normalize(res: IOsrmResponse): IRoute | null {
    const r = res?.routes?.[0];
    if (!r) return null;
    const legs: IRouteLeg[] = (r.legs ?? []).map(leg => ({
      distanceMiles: (leg.distance ?? 0) * METERS_TO_MILES,
      durationMinutes: (leg.duration ?? 0) * SEC_TO_MIN,
      steps: (leg.steps ?? []).map(s => this.normalizeStep(s)).filter(Boolean) as IRouteStep[],
    }));
    return {
      coordinates: r.geometry?.coordinates ?? [],
      totalMiles: (r.distance ?? 0) * METERS_TO_MILES,
      totalMinutes: (r.duration ?? 0) * SEC_TO_MIN,
      legs,
    };
  }

  private normalizeStep(s: {
    distance: number; duration: number; name?: string;
    maneuver?: { type?: string; modifier?: string; instruction?: string; location?: [number, number] };
  } | undefined): IRouteStep | null {
    if (!s) return null;
    const m = s.maneuver;
    const loc = m?.location;
    return {
      instruction: this.buildInstruction(m?.type, m?.modifier, s.name),
      distanceMiles: (s.distance ?? 0) * METERS_TO_MILES,
      durationMinutes: (s.duration ?? 0) * SEC_TO_MIN,
      maneuverType: m?.type,
      maneuverModifier: m?.modifier,
      start: loc ? { lng: loc[0], lat: loc[1] } : { lat: 0, lng: 0 },
    };
  }

  /** OSRM doesn't give clean English; build one from the maneuver fields. */
  private buildInstruction(type?: string, modifier?: string, name?: string): string {
    const onName = name && name.trim() ? ` onto ${name}` : '';
    switch (type) {
      case 'depart':   return name ? `Head out on ${name}` : 'Start the trip';
      case 'arrive':   return 'Arrive at your destination';
      case 'turn':     return `Turn ${modifier || 'ahead'}${onName}`;
      case 'merge':    return `Merge ${modifier || ''}${onName}`.trim();
      case 'on ramp':  return `Take the on-ramp${onName}`;
      case 'off ramp': return `Take the off-ramp${onName}`;
      case 'fork':     return `Keep ${modifier || 'straight'}${onName}`;
      case 'roundabout':
      case 'rotary':   return `Take the roundabout${onName}`;
      case 'end of road': return `Continue ${modifier || 'straight'}${onName}`;
      case 'continue': return `Continue${onName}`;
      case 'new name': return `Continue${onName}`;
      default:         return modifier ? `${modifier}${onName}` : `Continue${onName}`;
    }
  }
}
