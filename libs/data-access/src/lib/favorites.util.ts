import { isPlatformBrowser } from '@angular/common';

export const FAV_STORAGE_KEY = 'cnt-favorites';

/**
 * Favorites can reference three kinds of entities now:
 * - 'listing'      — private host stays (numeric id)
 * - 'boondocking'  — public-land stays (numeric id)
 * - 'poi'          — utility POIs (string id, e.g. 'dump-001')
 *
 * Stored as `{ kind, id, savedAt }[]`. We migrate both legacy shapes:
 * - `number[]`                            → `{ kind: 'listing', id, savedAt: now }`
 * - `{ id: number, savedAt: string }[]`   → `{ kind: 'listing', id, savedAt }`
 *
 * Callers can subsequently reclassify a 'listing' entry to 'boondocking' if they look
 * up the id and find it in the boondocking array — that's done at the call site so this
 * util stays decoupled from the listing data.
 */

export type FavoriteKind = 'listing' | 'boondocking' | 'poi';

export interface IFavorite {
  kind: FavoriteKind;
  /** number for stays + boondocking, string for POIs. */
  id: number | string;
  /** ISO timestamp the entry was favorited. Backfilled for legacy entries. */
  savedAt: string;
}

export interface IFavoriteKey {
  kind: FavoriteKind;
  id: number | string;
}

/** Canonical Set key — "listing:81" / "poi:dump-001". */
export function favoriteKey(kind: FavoriteKind, id: number | string): string {
  return `${kind}:${id}`;
}

/** Reads favorites in newest-first order. Migrates legacy shapes on first read. */
export function readFavorites(platformId: object): IFavorite[] {
  if (!isPlatformBrowser(platformId)) return [];
  let raw: string | null = null;
  try { raw = localStorage.getItem(FAV_STORAGE_KEY); } catch { return []; }
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];

  const now = new Date().toISOString();
  const out: IFavorite[] = [];
  let didMigrate = false;
  for (const entry of parsed) {
    if (typeof entry === 'number') {
      out.push({ kind: 'listing', id: entry, savedAt: now });
      didMigrate = true;
    } else if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      const id = obj['id'];
      const savedAt = typeof obj['savedAt'] === 'string' ? obj['savedAt'] : now;
      const rawKind = obj['kind'];
      const kind: FavoriteKind | null =
        rawKind === 'listing' || rawKind === 'boondocking' || rawKind === 'poi' ? rawKind : null;
      if (kind && (typeof id === 'number' || typeof id === 'string')) {
        out.push({ kind, id, savedAt });
      } else if (typeof id === 'number') {
        // Pre-kind shape — default to 'listing'.
        out.push({ kind: 'listing', id, savedAt });
        didMigrate = true;
      }
    }
  }
  if (didMigrate) {
    try { localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(out)); } catch { /* quota */ }
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Set of canonical keys ("listing:81" / "poi:dump-001") for `has(...)` checks. */
export function readFavoriteKeys(platformId: object): Set<string> {
  return new Set(readFavorites(platformId).map(f => favoriteKey(f.kind, f.id)));
}

/**
 * BACK-COMPAT: numeric-id Set of stays (skips POIs). Existing /search, listing-card,
 * and listing-details code paths still expect this shape — they don't render POI hearts.
 */
export function readFavoriteIds(platformId: object): Set<number> {
  const out = new Set<number>();
  for (const f of readFavorites(platformId)) {
    if (typeof f.id === 'number') out.add(f.id);
  }
  return out;
}

export function isFavorite(platformId: object, key: IFavoriteKey): boolean {
  return readFavoriteKeys(platformId).has(favoriteKey(key.kind, key.id));
}

/** Add a favorite (dedupe by kind+id, push newest-first). Returns the updated list. */
export function addFavorite(platformId: object, key: IFavoriteKey): IFavorite[] {
  if (!isPlatformBrowser(platformId)) return [];
  const k = favoriteKey(key.kind, key.id);
  const current = readFavorites(platformId).filter(f => favoriteKey(f.kind, f.id) !== k);
  current.unshift({ kind: key.kind, id: key.id, savedAt: new Date().toISOString() });
  writeFavorites(platformId, current);
  return current;
}

export function removeFavorite(platformId: object, key: IFavoriteKey): IFavorite[] {
  if (!isPlatformBrowser(platformId)) return [];
  const k = favoriteKey(key.kind, key.id);
  const next = readFavorites(platformId).filter(f => favoriteKey(f.kind, f.id) !== k);
  writeFavorites(platformId, next);
  return next;
}

export function clearFavorites(platformId: object): void {
  if (!isPlatformBrowser(platformId)) return;
  try { localStorage.removeItem(FAV_STORAGE_KEY); } catch { /* ignore */ }
}

/** Replace the favorites list wholesale (used by Undo on Clear). */
export function writeFavorites(platformId: object, favorites: IFavorite[]): void {
  if (!isPlatformBrowser(platformId)) return;
  try { localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favorites)); } catch { /* quota */ }
}
