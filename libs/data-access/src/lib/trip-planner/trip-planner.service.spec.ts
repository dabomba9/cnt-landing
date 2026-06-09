import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import {
  TripPlannerService, ITripStop,
  parseIsoDate, formatIsoDate, haversineMiles, pointToRouteMiles,
  nearestNeighborMiddle,
} from './trip-planner.service';

function stop(over: Partial<ITripStop>): Omit<ITripStop, 'id'> {
  return {
    kind: 'private',
    refId: 1,
    name: 'Stop',
    lat: 44.05, lng: -121.31,
    ...over,
  } as ITripStop;
}

describe('TripPlannerService', () => {
  let svc: TripPlannerService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        TripPlannerService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    svc = TestBed.inject(TripPlannerService);
  });

  describe('pure helpers', () => {
    it('parseIsoDate handles YYYY-MM-DD and full ISO; returns null on garbage', () => {
      expect(parseIsoDate('2027-04-12')).toBeInstanceOf(Date);
      expect(parseIsoDate('2027-04-12T12:00:00Z')).toBeInstanceOf(Date);
      expect(parseIsoDate(undefined)).toBeNull();
      expect(parseIsoDate('not-a-date')).toBeNull();
    });

    it('formatIsoDate rounds a Date back to YYYY-MM-DD (local)', () => {
      const d = new Date(2027, 3, 12, 12, 0, 0);
      expect(formatIsoDate(d)).toBe('2027-04-12');
      expect(formatIsoDate(null)).toBeUndefined();
    });

    it('haversineMiles returns 0 for identical points and positive for distinct', () => {
      const a = { lat: 44.05, lng: -121.31 };
      expect(haversineMiles(a, a)).toBeCloseTo(0);
      expect(haversineMiles(a, { lat: 45.05, lng: -121.31 })).toBeGreaterThan(60);
    });

    it('pointToRouteMiles returns Infinity for empty route, distance for single-point', () => {
      const p = { lat: 44.05, lng: -121.31 };
      expect(pointToRouteMiles(p, [])).toBe(Infinity);
      expect(pointToRouteMiles(p, [p])).toBeCloseTo(0);
    });

    it('nearestNeighborMiddle pins first + last, reorders middle', () => {
      const first = { id: 's1', kind: 'private', name: 'A', lat: 0, lng: 0 } as ITripStop;
      const far   = { id: 's2', kind: 'private', name: 'Far', lat: 10, lng: 10 } as ITripStop;
      const near  = { id: 's3', kind: 'private', name: 'Near', lat: 0.5, lng: 0.5 } as ITripStop;
      const last  = { id: 's4', kind: 'private', name: 'Z', lat: 11, lng: 11 } as ITripStop;
      const out = nearestNeighborMiddle([first, far, near, last]);
      expect(out[0]).toBe(first);
      expect(out[out.length - 1]).toBe(last);
      // 'Near' should land before 'Far' (closer to start).
      expect(out[1].name).toBe('Near');
    });
  });

  describe('create / update / delete', () => {
    it('create assigns id + timestamps, makes the plan active', () => {
      const plan = svc.create('Oregon coast');
      expect(plan.id).toBeTruthy();
      expect(plan.createdAt).toBeTruthy();
      expect(svc.list().map(p => p.id)).toContain(plan.id);
      expect(svc.getActiveId()).toBe(plan.id);
    });

    it('create falls back to "Untitled trip" when name is blank', () => {
      const plan = svc.create('  ');
      expect(plan.name).toBe('Untitled trip');
    });

    it('update patches fields and bumps updatedAt', async () => {
      const a = svc.create('A');
      await new Promise(r => setTimeout(r, 5));
      const updated = svc.update(a.id, { name: 'B' });
      expect(updated?.name).toBe('B');
      expect((updated?.updatedAt ?? '') >= a.updatedAt).toBe(true);
    });

    it('update returns null for unknown id', () => {
      expect(svc.update('missing', { name: 'x' })).toBeNull();
    });

    it('delete removes the plan and clears active id if it was active', () => {
      const a = svc.create('A');
      svc.setActiveId(a.id);
      svc.delete(a.id);
      expect(svc.list()).toEqual([]);
      expect(svc.getActiveId()).toBeNull();
    });
  });

  describe('stops + reorder + optimize', () => {
    it('addStop assigns a fresh id and appends', () => {
      const plan = svc.create('A');
      const after = svc.addStop(plan.id, stop({ name: 'X' }));
      expect(after?.stops.length).toBe(1);
      expect(after?.stops[0].id).toBeTruthy();
    });

    it('removeStop drops by id', () => {
      const plan = svc.create('A');
      const after = svc.addStop(plan.id, stop({ name: 'X' }));
      const id = after!.stops[0].id;
      const removed = svc.removeStop(plan.id, id);
      expect(removed?.stops).toEqual([]);
    });

    it('updateStop patches in place', () => {
      const plan = svc.create('A');
      const after = svc.addStop(plan.id, stop({ name: 'X' }));
      const id = after!.stops[0].id;
      const updated = svc.updateStop(plan.id, id, { notes: 'hi' });
      expect(updated?.stops[0].notes).toBe('hi');
    });

    it('reorderStops moves an item to the new index', () => {
      const plan = svc.create('A');
      svc.addStop(plan.id, stop({ name: 'X' }));
      svc.addStop(plan.id, stop({ name: 'Y' }));
      svc.addStop(plan.id, stop({ name: 'Z' }));
      const after = svc.reorderStops(plan.id, 0, 2);
      expect(after?.stops.map(s => s.name)).toEqual(['Y', 'Z', 'X']);
    });

    it('reorderStops is a no-op for an out-of-range fromIndex', () => {
      const plan = svc.create('A');
      svc.addStop(plan.id, stop({ name: 'X' }));
      const before = svc.get(plan.id);
      const after = svc.reorderStops(plan.id, 99, 0);
      expect(after?.stops).toEqual(before?.stops);
    });
  });

  describe('duplicate', () => {
    it('produces a fresh plan with new ids on every stop', () => {
      const plan = svc.create('A');
      svc.addStop(plan.id, stop({ name: 'X' }));
      const copy = svc.duplicate(plan.id);
      expect(copy?.id).not.toBe(plan.id);
      expect(copy?.name).toBe('A (copy)');
      expect(copy?.stops[0].id).not.toBe(svc.get(plan.id)?.stops[0].id);
    });
  });

  describe('active id', () => {
    it('setActiveId persists to localStorage; null clears it', () => {
      const a = svc.create('A');
      svc.setActiveId(a.id);
      expect(localStorage.getItem('cnt-trip-active-id')).toBe(a.id);
      svc.setActiveId(null);
      expect(localStorage.getItem('cnt-trip-active-id')).toBeNull();
    });
  });
});
