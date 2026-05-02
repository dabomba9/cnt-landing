import { isPlatformBrowser } from '@angular/common';
import { RvType, RV_TYPES } from './search-results/mock-listings.data';

export const MY_RV_KEY = 'cnt-my-rv';

export interface MyRv {
  type: RvType | null;
  length: number | null;   // feet
  height: number | null;
  width: number | null;
}

export function emptyMyRv(): MyRv {
  return { type: null, length: null, height: null, width: null };
}

export function readMyRv(platformId: Object): MyRv {
  if (!isPlatformBrowser(platformId)) return emptyMyRv();
  try {
    const raw = localStorage.getItem(MY_RV_KEY);
    if (!raw) return emptyMyRv();
    const parsed = JSON.parse(raw) as Partial<MyRv>;
    return {
      type: parsed.type ?? null,
      length: typeof parsed.length === 'number' ? parsed.length : null,
      height: typeof parsed.height === 'number' ? parsed.height : null,
      width:  typeof parsed.width  === 'number' ? parsed.width  : null,
    };
  } catch {
    return emptyMyRv();
  }
}

export function writeMyRv(platformId: Object, rv: MyRv): void {
  if (!isPlatformBrowser(platformId)) return;
  const isEmpty = !rv.type && !rv.length && !rv.height && !rv.width;
  if (isEmpty) {
    localStorage.removeItem(MY_RV_KEY);
    return;
  }
  localStorage.setItem(MY_RV_KEY, JSON.stringify(rv));
}

export function isMyRvSet(rv: MyRv): boolean {
  return !!(rv.type || rv.length || rv.height || rv.width);
}

export function rvTypeLabel(type: RvType | null): string {
  if (!type) return 'RV';
  return RV_TYPES.find(t => t.id === type)?.label ?? 'RV';
}
