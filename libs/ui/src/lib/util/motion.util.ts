/** Motion helpers shared by every GSAP entrypoint. Two pure functions
 *  that pair with the global `prefers-reduced-motion` CSS rule added
 *  in P5/C — components that drive JS animations check this before
 *  registering any tweens / scroll triggers. */

/** True when the user has asked the OS for reduced motion. Safe to
 *  call in SSR — returns false off the browser. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Defer a callback until the browser is idle (~50ms of nothing-going-on).
 *  Falls back to a short setTimeout in browsers without
 *  requestIdleCallback (Safari today). The intent is to keep below-fold
 *  animation setup off the LCP critical path. */
export function runWhenIdle(fn: () => void, fallbackMs = 16): void {
  if (typeof window === 'undefined') { fn(); return; }
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn);
  } else {
    setTimeout(fn, fallbackMs);
  }
}
