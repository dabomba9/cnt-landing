import {
  isoKey, parseIsoLocal, nextDayIso, priorDayIso, addDaysIso,
  eachDateIso, nightsBetween,
} from './iso-date.util';

describe('iso-date.util', () => {
  describe('isoKey', () => {
    it('formats a local Date as YYYY-MM-DD with zero-padded month/day', () => {
      expect(isoKey(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(isoKey(new Date(2026, 10, 30))).toBe('2026-11-30');
    });

    it('uses local time, not UTC (an evening date stays on the same day)', () => {
      // Even at 23:00 local, the calendar day is 2026-04-12.
      expect(isoKey(new Date(2026, 3, 12, 23, 0, 0))).toBe('2026-04-12');
    });

    it('handles leap day', () => {
      expect(isoKey(new Date(2024, 1, 29))).toBe('2024-02-29');
    });
  });

  describe('parseIsoLocal', () => {
    it('parses YYYY-MM-DD into a local Date anchored at noon', () => {
      const d = parseIsoLocal('2026-04-12');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(3);
      expect(d!.getDate()).toBe(12);
      expect(d!.getHours()).toBe(12);
    });

    it('accepts a full ISO timestamp and keeps the date portion', () => {
      const d = parseIsoLocal('2026-04-12T08:30:00Z');
      expect(d).not.toBeNull();
      expect(isoKey(d!)).toBe('2026-04-12');
    });

    it('returns null for empty / null / undefined input', () => {
      expect(parseIsoLocal('')).toBeNull();
      expect(parseIsoLocal(null)).toBeNull();
      expect(parseIsoLocal(undefined)).toBeNull();
    });

    it('returns null for malformed input', () => {
      expect(parseIsoLocal('not-a-date')).toBeNull();
      expect(parseIsoLocal('2026-13-01')).toBeNull();   // bad month
      expect(parseIsoLocal('2026-04')).toBeNull();      // incomplete
    });
  });

  describe('nextDayIso / priorDayIso', () => {
    it('advances and rewinds by one day', () => {
      expect(nextDayIso('2026-04-12')).toBe('2026-04-13');
      expect(priorDayIso('2026-04-12')).toBe('2026-04-11');
    });

    it('rolls across month boundary', () => {
      expect(nextDayIso('2026-04-30')).toBe('2026-05-01');
      expect(priorDayIso('2026-05-01')).toBe('2026-04-30');
    });

    it('rolls across year boundary', () => {
      expect(nextDayIso('2026-12-31')).toBe('2027-01-01');
      expect(priorDayIso('2026-01-01')).toBe('2025-12-31');
    });

    it('handles leap day correctly', () => {
      expect(nextDayIso('2024-02-28')).toBe('2024-02-29');
      expect(nextDayIso('2024-02-29')).toBe('2024-03-01');
      expect(priorDayIso('2024-03-01')).toBe('2024-02-29');
    });
  });

  describe('addDaysIso', () => {
    it('adds positive days', () => {
      expect(addDaysIso('2026-04-12', 5)).toBe('2026-04-17');
      expect(addDaysIso('2026-04-12', 30)).toBe('2026-05-12');
    });

    it('subtracts with negative days', () => {
      expect(addDaysIso('2026-04-12', -3)).toBe('2026-04-09');
    });

    it('returns the same iso for delta 0', () => {
      expect(addDaysIso('2026-04-12', 0)).toBe('2026-04-12');
    });
  });

  describe('eachDateIso', () => {
    it('returns inclusive list start through end', () => {
      expect(eachDateIso('2026-04-12', '2026-04-15')).toEqual([
        '2026-04-12', '2026-04-13', '2026-04-14', '2026-04-15',
      ]);
    });

    it('returns single-element array when start === end', () => {
      expect(eachDateIso('2026-04-12', '2026-04-12')).toEqual(['2026-04-12']);
    });

    it('returns empty when start > end', () => {
      expect(eachDateIso('2026-04-15', '2026-04-12')).toEqual([]);
    });

    it('returns empty on missing inputs', () => {
      expect(eachDateIso('', '2026-04-12')).toEqual([]);
      expect(eachDateIso('2026-04-12', '')).toEqual([]);
    });
  });

  describe('nightsBetween', () => {
    it('counts nights between two iso keys', () => {
      // 3 nights between Apr 12 and Apr 15 (12→13, 13→14, 14→15).
      expect(nightsBetween('2026-04-12', '2026-04-15')).toBe(3);
    });

    it('returns 0 when start === end', () => {
      expect(nightsBetween('2026-04-12', '2026-04-12')).toBe(0);
    });

    it('returns 0 when end < start (non-negative guarantee)', () => {
      expect(nightsBetween('2026-04-15', '2026-04-12')).toBe(0);
    });

    it('handles month + year boundaries (DST-safe via noon anchor)', () => {
      expect(nightsBetween('2026-04-30', '2026-05-02')).toBe(2);
      expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3);
    });
  });
});
