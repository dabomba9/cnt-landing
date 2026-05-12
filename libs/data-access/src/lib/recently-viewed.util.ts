import { isPlatformBrowser } from '@angular/common';

export const RECENTLY_VIEWED_KEY = 'cnt-recently-viewed';
const MAX_ENTRIES = 12;

/** Listing ids the user has visited on the detail page, newest first. */
export function readRecentlyViewed(platformId: object): number[] {
  if (!isPlatformBrowser(platformId)) return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((n): n is number => typeof n === 'number');
  } catch { return []; }
}

/** Push a listing id to the front, de-duping any prior occurrence, capped at 12. */
export function pushRecentlyViewed(platformId: object, id: number): void {
  if (!isPlatformBrowser(platformId)) return;
  const current = readRecentlyViewed(platformId).filter(n => n !== id);
  current.unshift(id);
  const next = current.slice(0, MAX_ENTRIES);
  try { localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next)); } catch { /* quota */ }
}
