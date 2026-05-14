import { isPlatformBrowser } from '@angular/common';

export const FAV_STORAGE_KEY = 'cnt-favorites';

export interface IFavorite {
  id: number;
  /** ISO timestamp the listing was favorited. Backfilled for legacy entries. */
  savedAt: string;
}

/** Reads favorites in newest-first order. Migrates the legacy `number[]` shape on first read. */
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
      out.push({ id: entry, savedAt: now });
      didMigrate = true;
    } else if (entry && typeof entry === 'object' && typeof (entry as IFavorite).id === 'number') {
      const f = entry as IFavorite;
      out.push({ id: f.id, savedAt: typeof f.savedAt === 'string' ? f.savedAt : now });
    }
  }
  if (didMigrate) {
    try { localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(out)); } catch { /* quota */ }
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function readFavoriteIds(platformId: object): Set<number> {
  return new Set(readFavorites(platformId).map(f => f.id));
}

export function isFavorite(platformId: object, id: number): boolean {
  return readFavoriteIds(platformId).has(id);
}

/** Add a listing to favorites (dedupe, push newest-first). Returns the updated list. */
export function addFavorite(platformId: object, id: number): IFavorite[] {
  if (!isPlatformBrowser(platformId)) return [];
  const current = readFavorites(platformId).filter(f => f.id !== id);
  current.unshift({ id, savedAt: new Date().toISOString() });
  writeFavorites(platformId, current);
  return current;
}

export function removeFavorite(platformId: object, id: number): IFavorite[] {
  if (!isPlatformBrowser(platformId)) return [];
  const next = readFavorites(platformId).filter(f => f.id !== id);
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
