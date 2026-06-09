import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { HostAvailabilityService } from './host-availability.service';

describe('HostAvailabilityService', () => {
  let svc: HostAvailabilityService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        HostAvailabilityService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    svc = TestBed.inject(HostAvailabilityService);
  });

  describe('setBlocked / unblock + block reasons', () => {
    it('blocks a set of dates and persists them sorted, deduped', () => {
      svc.setBlocked(1, ['2026-04-15', '2026-04-12', '2026-04-15'], true);
      expect(svc.get(1).blocked).toEqual(['2026-04-12', '2026-04-15']);
    });

    it('attaches a reason when provided and clears it on unblock', () => {
      svc.setBlocked(1, ['2026-04-12'], true, 'Cleaning');
      expect(svc.blockReasonFor(1, '2026-04-12')).toBe('Cleaning');
      svc.setBlocked(1, ['2026-04-12'], false);
      expect(svc.blockReasonFor(1, '2026-04-12')).toBeUndefined();
      expect(svc.get(1).blocked).toEqual([]);
    });

    it('trims whitespace-only reason away (treated as no reason)', () => {
      svc.setBlocked(1, ['2026-04-12'], true, '   ');
      expect(svc.get(1).blockReasons).toBeUndefined();
    });

    it('no-ops on empty dates array', () => {
      svc.setBlocked(1, [], true, 'Cleaning');
      expect(svc.get(1).blocked).toEqual([]);
    });
  });

  describe('setPrice / resetDates', () => {
    it('rounds and stores per-day price overrides', () => {
      svc.setPrice(1, ['2026-04-12', '2026-04-13'], 89.6);
      expect(svc.get(1).prices).toEqual({ '2026-04-12': 90, '2026-04-13': 90 });
    });

    it('null price clears the override', () => {
      svc.setPrice(1, ['2026-04-12'], 100);
      svc.setPrice(1, ['2026-04-12'], null);
      expect(svc.get(1).prices['2026-04-12']).toBeUndefined();
    });

    it('resetDates drops both blocks and overrides for the dates', () => {
      svc.setBlocked(1, ['2026-04-12'], true, 'Cleaning');
      svc.setPrice(1, ['2026-04-12'], 100);
      svc.resetDates(1, ['2026-04-12']);
      expect(svc.get(1).blocked).toEqual([]);
      expect(svc.get(1).prices['2026-04-12']).toBeUndefined();
    });
  });

  describe('bulk fan-out', () => {
    it('setBlockedBulk applies to every listing', () => {
      svc.setBlockedBulk([1, 2, 3], ['2026-04-12'], true, 'Private use');
      for (const id of [1, 2, 3]) {
        expect(svc.get(id).blocked).toEqual(['2026-04-12']);
        expect(svc.blockReasonFor(id, '2026-04-12')).toBe('Private use');
      }
    });

    it('setPriceBulk fans out + rounds', () => {
      svc.setPriceBulk([1, 2], ['2026-04-12'], 75.4);
      expect(svc.get(1).prices['2026-04-12']).toBe(75);
      expect(svc.get(2).prices['2026-04-12']).toBe(75);
    });

    it('resetDatesBulk clears blocks + overrides across listings', () => {
      svc.setBlockedBulk([1, 2], ['2026-04-12'], true);
      svc.setPriceBulk([1, 2], ['2026-04-12'], 50);
      svc.resetDatesBulk([1, 2], ['2026-04-12']);
      expect(svc.get(1).blocked).toEqual([]);
      expect(svc.get(2).prices['2026-04-12']).toBeUndefined();
    });
  });

  describe('external feeds + blocks', () => {
    it('upsertFeed inserts then updates by sourceLabel', () => {
      svc.upsertFeed(1, { sourceLabel: 'Airbnb', url: 'a' });
      svc.upsertFeed(1, { sourceLabel: 'Airbnb', url: 'b' });
      expect(svc.get(1).feeds?.length).toBe(1);
      expect(svc.get(1).feeds?.[0].url).toBe('b');
    });

    it('applyExternalBlocks replaces (does not merge) per source', () => {
      svc.applyExternalBlocks(1, 'Airbnb', ['2026-04-12', '2026-04-13']);
      svc.applyExternalBlocks(1, 'Airbnb', ['2026-04-20']);
      expect(svc.get(1).externalBlocks?.['Airbnb']).toEqual(['2026-04-20']);
    });

    it('removeFeed drops feed and its external blocks', () => {
      svc.upsertFeed(1, { sourceLabel: 'Airbnb' });
      svc.applyExternalBlocks(1, 'Airbnb', ['2026-04-12']);
      svc.removeFeed(1, 'Airbnb');
      expect(svc.get(1).feeds?.length ?? 0).toBe(0);
      expect(svc.get(1).externalBlocks).toBeUndefined();
    });
  });

  describe('stay rules', () => {
    it('upsertStayRule inserts then updates by id', () => {
      const r = svc.upsertStayRule(1, { start: '2026-06-01', end: '2026-08-31', minNights: 3 });
      expect(r?.id).toBeTruthy();
      const updated = svc.upsertStayRule(1, { id: r!.id, start: '2026-06-01', end: '2026-08-31', minNights: 5 });
      expect(updated?.minNights).toBe(5);
      expect(svc.get(1).stayRules?.length).toBe(1);
    });

    it('rejects invalid ranges and minNights < 1', () => {
      expect(svc.upsertStayRule(1, { start: '2026-08-01', end: '2026-07-01' })).toBeNull();
      expect(svc.upsertStayRule(1, { start: '2026-06-01', end: '2026-08-31', minNights: 0 })).toBeNull();
    });

    it('removeStayRule clears single + collapses array to undefined when empty', () => {
      const r = svc.upsertStayRule(1, { start: '2026-06-01', end: '2026-08-31', minNights: 3 })!;
      svc.removeStayRule(1, r.id);
      expect(svc.get(1).stayRules).toBeUndefined();
    });
  });

  describe('pricing tiers', () => {
    it('upsertPricingTier inserts then updates by id', () => {
      const t = svc.upsertPricingTier(1, { name: 'Peak', start: '2026-06-01', end: '2026-08-31', nightlyPrice: 120 })!;
      const updated = svc.upsertPricingTier(1, { id: t.id, name: 'Peak', start: '2026-06-01', end: '2026-08-31', nightlyPrice: 145 });
      expect(updated?.nightlyPrice).toBe(145);
      expect(svc.get(1).pricingTiers?.length).toBe(1);
    });

    it('rejects bad name / range / price', () => {
      expect(svc.upsertPricingTier(1, { name: '  ', start: '2026-06-01', end: '2026-08-31', nightlyPrice: 100 })).toBeNull();
      expect(svc.upsertPricingTier(1, { name: 'x', start: '2026-08-01', end: '2026-06-01', nightlyPrice: 100 })).toBeNull();
      expect(svc.upsertPricingTier(1, { name: 'x', start: '2026-06-01', end: '2026-08-31', nightlyPrice: 0 })).toBeNull();
    });

    it('removePricingTier collapses to undefined when last is removed', () => {
      const t = svc.upsertPricingTier(1, { name: 'Peak', start: '2026-06-01', end: '2026-08-31', nightlyPrice: 120 })!;
      svc.removePricingTier(1, t.id);
      expect(svc.get(1).pricingTiers).toBeUndefined();
    });
  });

  describe('aggregateDayState', () => {
    it('classifies each listing into open/booked/blocked and reports uniformPrice when all open match', () => {
      svc.setPriceBulk([1, 2], ['2026-04-12'], 100);
      svc.setBlocked(3, ['2026-04-12'], true);
      const bookedByListing: Record<number, Set<string>> = { 4: new Set(['2026-04-12']) };
      const agg = svc.aggregateDayState([1, 2, 3, 4], '2026-04-12', bookedByListing);
      expect(agg).toEqual({ open: 2, booked: 1, blocked: 1, priced: 2, uniformPrice: 100 });
    });

    it('uniformPrice is null when open listings have mixed (or partial) overrides', () => {
      svc.setPrice(1, ['2026-04-12'], 100);
      // listing 2 has no override -> open but unpriced
      const agg = svc.aggregateDayState([1, 2], '2026-04-12', {});
      expect(agg.uniformPrice).toBeNull();
    });

    it('external blocks count toward blocked', () => {
      svc.applyExternalBlocks(1, 'Airbnb', ['2026-04-12']);
      const agg = svc.aggregateDayState([1], '2026-04-12', {});
      expect(agg.blocked).toBe(1);
      expect(agg.open).toBe(0);
    });
  });

  describe('persistence', () => {
    it('writes to localStorage so a fresh service instance rehydrates', () => {
      svc.setBlocked(1, ['2026-04-12'], true, 'Cleaning');
      // Re-bootstrap: clear DI cache and re-inject.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          HostAvailabilityService,
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      const fresh = TestBed.inject(HostAvailabilityService);
      expect(fresh.get(1).blocked).toEqual(['2026-04-12']);
      expect(fresh.blockReasonFor(1, '2026-04-12')).toBe('Cleaning');
    });
  });
});
