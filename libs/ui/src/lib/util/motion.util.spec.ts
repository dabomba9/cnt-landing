import { prefersReducedMotion, runWhenIdle } from './motion.util';

/** Helpers for stashing/restoring properties on window so each test
 *  stays hermetic. matchMedia + requestIdleCallback get swapped in
 *  per test; the saved value is restored in afterEach. */
function withWindowProp<K extends keyof Window>(
  key: K,
  value: Window[K] | undefined,
  test: () => void,
): void {
  const original = (window as unknown as Record<string, unknown>)[key as string];
  (window as unknown as Record<string, unknown>)[key as string] = value as unknown;
  try {
    test();
  } finally {
    (window as unknown as Record<string, unknown>)[key as string] = original;
  }
}

describe('motion.util (P7/C helpers)', () => {
  describe('prefersReducedMotion', () => {
    it('returns true when matchMedia(reduce) matches', () => {
      withWindowProp('matchMedia', ((q: string) => ({
        matches: q.includes('reduce'),
        media: q, addEventListener: () => { /* noop */ }, removeEventListener: () => { /* noop */ },
        addListener: () => { /* noop */ }, removeListener: () => { /* noop */ },
        onchange: null, dispatchEvent: () => false,
      })) as unknown as Window['matchMedia'], () => {
        expect(prefersReducedMotion()).toBe(true);
      });
    });

    it('returns false when matchMedia does not match', () => {
      withWindowProp('matchMedia', ((q: string) => ({
        matches: false,
        media: q, addEventListener: () => { /* noop */ }, removeEventListener: () => { /* noop */ },
        addListener: () => { /* noop */ }, removeListener: () => { /* noop */ },
        onchange: null, dispatchEvent: () => false,
      })) as unknown as Window['matchMedia'], () => {
        expect(prefersReducedMotion()).toBe(false);
      });
    });

    it('returns false when matchMedia throws (legacy/locked-down UAs)', () => {
      withWindowProp('matchMedia', (() => { throw new Error('blocked'); }) as unknown as Window['matchMedia'], () => {
        expect(prefersReducedMotion()).toBe(false);
      });
    });

    it('returns false when matchMedia is undefined (SSR-shaped UA)', () => {
      withWindowProp('matchMedia', undefined, () => {
        expect(prefersReducedMotion()).toBe(false);
      });
    });
  });

  describe('runWhenIdle', () => {
    it('uses requestIdleCallback when available', () => {
      const ric = jest.fn((cb: () => void) => { cb(); return 1; });
      withWindowProp('requestIdleCallback', ric as unknown as Window['requestIdleCallback'], () => {
        const fn = jest.fn();
        runWhenIdle(fn);
        expect(ric).toHaveBeenCalled();
        expect(fn).toHaveBeenCalled();
      });
    });

    it('falls back to setTimeout when requestIdleCallback is missing', () => {
      jest.useFakeTimers();
      try {
        withWindowProp('requestIdleCallback', undefined, () => {
          const fn = jest.fn();
          runWhenIdle(fn);
          expect(fn).not.toHaveBeenCalled();      // queued, not synchronous
          jest.advanceTimersByTime(16);
          expect(fn).toHaveBeenCalled();
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('honors the custom fallbackMs on the setTimeout path', () => {
      jest.useFakeTimers();
      try {
        withWindowProp('requestIdleCallback', undefined, () => {
          const fn = jest.fn();
          runWhenIdle(fn, 250);
          jest.advanceTimersByTime(249);
          expect(fn).not.toHaveBeenCalled();
          jest.advanceTimersByTime(1);
          expect(fn).toHaveBeenCalled();
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
