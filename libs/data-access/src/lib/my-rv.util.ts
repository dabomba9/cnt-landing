import { isPlatformBrowser } from '@angular/common';
import { RvType, RV_TYPES } from './listings/mock-listings.data';

/** Legacy single-RV key — still read once for one-time migration. */
export const MY_RV_KEY = 'cnt-my-rv';
/** Current key — holds the full multi-profile state. */
export const MY_RV_PROFILES_KEY = 'cnt-my-rv-profiles';

/** The vehicle that tows a trailer-style rig (fifth-wheel, travel-trailer, …). */
export interface ITowVehicle {
  year: number | null;
  make: string | null;
  model: string | null;
  licensePlate: string | null;
  length: number | null;   // feet — optional; powers the combined-length note
  photo: string | null;    // data URL — optional
}

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
  /** Tow vehicle — only meaningful for towable rig types (see TOWABLE_RV_TYPES). */
  towVehicle: ITowVehicle | null;
  /** Fuel economy in miles-per-gallon. Drives the trip-planner fuel estimate. */
  mpg: number | null;
  /** Fuel tank capacity in gallons. Drives per-leg range warnings in the planner. */
  fuelTankGallons: number | null;
}

/** A named, saveable RV — a guest can keep several (a Class A, a teardrop, …). */
export interface IMyRvProfile extends IMyRv {
  id: string;
  name: string;
}

export interface IMyRvProfilesState {
  profiles: IMyRvProfile[];
  activeId: string | null;
}

export function emptyMyRv(): IMyRv {
  return { type: null, length: null, height: null, width: null, year: null, make: null, model: null, licensePlate: null, rvPhoto: null, licensePhoto: null, towVehicle: null, mpg: null, fuelTankGallons: null };
}

export function emptyTowVehicle(): ITowVehicle {
  return { year: null, make: null, model: null, licensePlate: null, length: null, photo: null };
}

function newRvId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'rv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function emptyMyRvProfile(name = 'My RV'): IMyRvProfile {
  return { ...emptyMyRv(), id: newRvId(), name };
}

function normalizeTowVehicle(raw: unknown): ITowVehicle | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Partial<ITowVehicle>;
  return {
    year:   typeof t.year   === 'number' ? t.year   : null,
    make:   typeof t.make   === 'string' ? t.make   : null,
    model:  typeof t.model  === 'string' ? t.model  : null,
    licensePlate: typeof t.licensePlate === 'string' ? t.licensePlate : null,
    length: typeof t.length === 'number' ? t.length : null,
    photo:  typeof t.photo  === 'string' ? t.photo  : null,
  };
}

/** Per-field coercion for anything read out of localStorage. */
function normalizeRv(parsed: Partial<IMyRv>): IMyRv {
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
    towVehicle: normalizeTowVehicle(parsed.towVehicle),
    mpg: typeof parsed.mpg === 'number' ? parsed.mpg : null,
    fuelTankGallons: typeof parsed.fuelTankGallons === 'number' ? parsed.fuelTankGallons : null,
  };
}

function normalizeProfile(p: Partial<IMyRvProfile>): IMyRvProfile {
  return {
    ...normalizeRv(p),
    id: typeof p.id === 'string' ? p.id : newRvId(),
    name: typeof p.name === 'string' && p.name.trim() ? p.name : 'My RV',
  };
}

/**
 * The single source of truth for RV profiles. Reads the multi-profile key;
 * if it's absent but the legacy single-RV key exists, migrates it once into a
 * one-profile state (leaving the legacy key as a rollback safety net).
 */
export function readMyRvProfiles(platformId: object): IMyRvProfilesState {
  if (!isPlatformBrowser(platformId)) return { profiles: [], activeId: null };

  try {
    const raw = localStorage.getItem(MY_RV_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { profiles?: unknown; activeId?: unknown };
      const rawProfiles: unknown[] = Array.isArray(parsed.profiles) ? parsed.profiles : [];
      const profiles = rawProfiles
        .filter((p): p is Partial<IMyRvProfile> => !!p && typeof (p as { id?: unknown }).id === 'string')
        .map(normalizeProfile);
      let activeId = typeof parsed.activeId === 'string' ? parsed.activeId : null;
      if (!profiles.some(p => p.id === activeId)) activeId = profiles[0]?.id ?? null;
      return { profiles, activeId };
    }
  } catch {
    // corrupt new-format data — fall through to migration / empty
  }

  // One-time migration from the legacy single-RV object.
  try {
    const legacyRaw = localStorage.getItem(MY_RV_KEY);
    if (legacyRaw) {
      const profile: IMyRvProfile = { ...normalizeRv(JSON.parse(legacyRaw) as Partial<IMyRv>), id: newRvId(), name: 'My RV' };
      const state: IMyRvProfilesState = { profiles: [profile], activeId: profile.id };
      writeMyRvProfiles(platformId, state);
      return state;
    }
  } catch {
    // corrupt legacy data — fall to empty
  }

  return { profiles: [], activeId: null };
}

export function writeMyRvProfiles(platformId: object, state: IMyRvProfilesState): void {
  if (!isPlatformBrowser(platformId)) return;
  if (state.profiles.length === 0) {
    localStorage.removeItem(MY_RV_PROFILES_KEY);
    return;
  }
  try {
    localStorage.setItem(MY_RV_PROFILES_KEY, JSON.stringify(state));
  } catch {
    // QuotaExceeded — drop photos from inactive profiles first, keeping the
    // active rig's photos (the one a booking is most likely to need).
    const trimmed: IMyRvProfilesState = {
      activeId: state.activeId,
      profiles: state.profiles.map(p => p.id === state.activeId ? p : { ...p, rvPhoto: null, licensePhoto: null }),
    };
    try {
      localStorage.setItem(MY_RV_PROFILES_KEY, JSON.stringify(trimmed));
    } catch {
      // Still too large — drop all photos, keep specs.
      const specsOnly: IMyRvProfilesState = {
        activeId: state.activeId,
        profiles: state.profiles.map(p => ({ ...p, rvPhoto: null, licensePhoto: null })),
      };
      localStorage.setItem(MY_RV_PROFILES_KEY, JSON.stringify(specsOnly));
    }
  }
}

export function listMyRvProfiles(platformId: object): IMyRvProfile[] {
  return readMyRvProfiles(platformId).profiles;
}

export function getActiveRvProfileId(platformId: object): string | null {
  return readMyRvProfiles(platformId).activeId;
}

export function getActiveRvProfile(platformId: object): IMyRvProfile | null {
  const state = readMyRvProfiles(platformId);
  return state.profiles.find(p => p.id === state.activeId) ?? null;
}

/** Appends a fresh, blank profile. Becomes active if it's the first one. */
export function addMyRvProfile(platformId: object, name = 'My RV'): IMyRvProfile {
  const state = readMyRvProfiles(platformId);
  const profile = emptyMyRvProfile(name);
  state.profiles.push(profile);
  if (!state.activeId) state.activeId = profile.id;
  writeMyRvProfiles(platformId, state);
  return profile;
}

/** Merges field changes into one profile by id. Name falls back to 'My RV' when blank. */
export function updateMyRvProfile(platformId: object, id: string, patch: Partial<IMyRv> & { name?: string }): void {
  const state = readMyRvProfiles(platformId);
  const idx = state.profiles.findIndex(p => p.id === id);
  if (idx === -1) return;
  const merged: IMyRvProfile = { ...state.profiles[idx], ...patch };
  if (!merged.name || !merged.name.trim()) merged.name = 'My RV';
  state.profiles[idx] = merged;
  writeMyRvProfiles(platformId, state);
}

/** Removes a profile; reassigns active to the first remaining one when needed. */
export function deleteMyRvProfile(platformId: object, id: string): void {
  const state = readMyRvProfiles(platformId);
  const profiles = state.profiles.filter(p => p.id !== id);
  let activeId = state.activeId;
  if (activeId === id || !profiles.some(p => p.id === activeId)) {
    activeId = profiles[0]?.id ?? null;
  }
  writeMyRvProfiles(platformId, { profiles, activeId });
}

export function setActiveRvProfile(platformId: object, id: string): void {
  const state = readMyRvProfiles(platformId);
  if (!state.profiles.some(p => p.id === id)) return;
  writeMyRvProfiles(platformId, { ...state, activeId: id });
}

/**
 * Reads the ACTIVE profile as a plain IMyRv. Back-compat shim: every existing
 * consumer that called readMyRv() keeps working — it now sees the active rig.
 */
export function readMyRv(platformId: object): IMyRv {
  const active = getActiveRvProfile(platformId);
  // normalizeRv copies only the 10 IMyRv fields — drops id/name cleanly.
  return active ? normalizeRv(active) : emptyMyRv();
}

/**
 * Writes IMyRv fields into the ACTIVE profile (back-compat shim). If there is
 * no active profile yet and the data is non-empty, lazily materializes one so
 * first-time callers (e.g. the booking widget photo-attach) still "just work".
 * Clearing every field no longer deletes the profile — deletion is explicit.
 */
export function writeMyRv(platformId: object, rv: IMyRv): void {
  if (!isPlatformBrowser(platformId)) return;
  const state = readMyRvProfiles(platformId);
  const activeId = state.activeId;
  const idx = activeId ? state.profiles.findIndex(p => p.id === activeId) : -1;

  if (idx === -1) {
    const isEmpty = !isMyRvSet(rv) && !rv.rvPhoto && !rv.licensePhoto;
    if (isEmpty) { writeMyRvProfiles(platformId, state); return; }
    const fresh: IMyRvProfile = { ...emptyMyRv(), ...rv, id: newRvId(), name: 'My RV' };
    state.profiles.push(fresh);
    state.activeId = fresh.id;
    writeMyRvProfiles(platformId, state);
    return;
  }

  state.profiles[idx] = { ...state.profiles[idx], ...rv };
  writeMyRvProfiles(platformId, state);
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

/** Rig types that are towed and so have a separate tow vehicle. */
export const TOWABLE_RV_TYPES: RvType[] = ['fifth-wheel', 'travel-trailer', 'teardrop', 'popup'];

export function isTowableRv(type: RvType | null): boolean {
  return !!type && TOWABLE_RV_TYPES.includes(type);
}

/** True when a tow vehicle carries any entered detail. */
export function towVehicleHasData(t: ITowVehicle | null | undefined): boolean {
  return !!t && !!(t.year || t.make || t.model || t.licensePlate || t.length || t.photo);
}
