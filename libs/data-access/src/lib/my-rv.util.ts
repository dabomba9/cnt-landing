import { isPlatformBrowser } from '@angular/common';
import { RvType, RV_TYPES } from './listings/mock-listings.data';

export const MY_RV_KEY = 'cnt-my-rv';

export interface IMyRv {
  type: RvType | null;
  length: number | null;   // feet
  height: number | null;
  width: number | null;
  year: number | null;
  make: string | null;
  model: string | null;
  licensePlate: string | null;
  /** Data URL of an RV/rig photo. Required by hosts on non-instant-book reservations. */
  rvPhoto: string | null;
  /** Data URL of a license-plate photo. Required by hosts on non-instant-book reservations. */
  licensePhoto: string | null;
}

export function emptyMyRv(): IMyRv {
  return { type: null, length: null, height: null, width: null, year: null, make: null, model: null, licensePlate: null, rvPhoto: null, licensePhoto: null };
}

export function readMyRv(platformId: Object): IMyRv {
  if (!isPlatformBrowser(platformId)) return emptyMyRv();
  try {
    const raw = localStorage.getItem(MY_RV_KEY);
    if (!raw) return emptyMyRv();
    const parsed = JSON.parse(raw) as Partial<IMyRv>;
    return {
      type: parsed.type ?? null,
      length: typeof parsed.length === 'number' ? parsed.length : null,
      height: typeof parsed.height === 'number' ? parsed.height : null,
      width:  typeof parsed.width  === 'number' ? parsed.width  : null,
      year:   typeof parsed.year   === 'number' ? parsed.year   : null,
      make:   typeof parsed.make   === 'string' ? parsed.make   : null,
      model:  typeof parsed.model  === 'string' ? parsed.model  : null,
      licensePlate: typeof parsed.licensePlate === 'string' ? parsed.licensePlate : null,
      rvPhoto: typeof parsed.rvPhoto === 'string' ? parsed.rvPhoto : null,
      licensePhoto: typeof parsed.licensePhoto === 'string' ? parsed.licensePhoto : null,
    };
  } catch {
    return emptyMyRv();
  }
}

export function writeMyRv(platformId: Object, rv: IMyRv): void {
  if (!isPlatformBrowser(platformId)) return;
  const isEmpty = !rv.type && !rv.length && !rv.height && !rv.width && !rv.year && !rv.make && !rv.model && !rv.licensePlate && !rv.rvPhoto && !rv.licensePhoto;
  if (isEmpty) {
    localStorage.removeItem(MY_RV_KEY);
    return;
  }
  try {
    localStorage.setItem(MY_RV_KEY, JSON.stringify(rv));
  } catch {
    // Likely QuotaExceeded from a large photo data URL — fall back to specs only.
    const specsOnly: IMyRv = { ...rv, rvPhoto: null, licensePhoto: null };
    localStorage.setItem(MY_RV_KEY, JSON.stringify(specsOnly));
  }
}

/** Lightweight "anything filled" check — used for UI hints. */
export function isMyRvSet(rv: IMyRv): boolean {
  return !!(rv.type || rv.length || rv.height || rv.width || rv.year || rv.make || rv.model || rv.licensePlate);
}

/** Strict completeness check — every field a host needs to confirm fit. Required to book any listing. */
export function isMyRvComplete(rv: IMyRv): boolean {
  return !!(
    rv.type &&
    typeof rv.length === 'number' && rv.length > 0 &&
    typeof rv.height === 'number' && rv.height > 0 &&
    typeof rv.width  === 'number' && rv.width  > 0 &&
    rv.licensePlate && rv.licensePlate.trim().length > 0
  );
}

/** Itemized list of the fields still missing for full completeness — drives error copy. */
export function myRvMissingFields(rv: IMyRv): string[] {
  const missing: string[] = [];
  if (!rv.type) missing.push('RV type');
  if (!(typeof rv.length === 'number' && rv.length > 0)) missing.push('length');
  if (!(typeof rv.height === 'number' && rv.height > 0)) missing.push('height');
  if (!(typeof rv.width  === 'number' && rv.width  > 0)) missing.push('width');
  if (!(rv.licensePlate && rv.licensePlate.trim().length > 0)) missing.push('license plate');
  return missing;
}

/** True when both required photos are attached to the My RV profile. */
export function hasMyRvPhotos(rv: IMyRv): boolean {
  return !!(rv.rvPhoto && rv.licensePhoto);
}

export function rvTypeLabel(type: RvType | null): string {
  if (!type) return 'RV';
  return RV_TYPES.find(t => t.id === type)?.label ?? 'RV';
}
