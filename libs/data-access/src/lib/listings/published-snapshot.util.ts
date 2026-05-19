import type { IDraftListing } from './draft-listing.types';

/**
 * Per-listing snapshot persisted at publish time so `/listing?id=N` can
 * hydrate the host's real data (photos, host name, rules) instead of falling
 * through to the mock generators in `getListingDetail`.
 *
 * Backed by IndexedDB (~50 MB+ quota, designed for blob-ish data like the
 * photo data URLs we keep here) with a synchronous in-memory cache so the
 * existing consumers (`getListingDetail`, `hydratePublishedListings`) don't
 * need to become async.
 *
 * Bootstrap order:
 *   - `initPublishedSnapshots()` runs once via APP_INITIALIZER and populates
 *     the cache from IDB (migrating from the legacy localStorage key on
 *     first run).
 *   - Reads (`readPublishedSnapshot`, `readAllPublishedSnapshots`) are
 *     synchronous and hit the cache.
 *   - Writes (`writePublishedSnapshot`) update the cache immediately and
 *     return a Promise that resolves once the IDB write lands — callers can
 *     `await` it (for publish flows where we want to know it stuck) or
 *     fire-and-forget (for autosave).
 */
export const PUBLISHED_SNAPSHOTS_KEY = 'cnt-published-snapshots';
const DB_NAME = 'cnt-landing';
const STORE = 'published-snapshots';
const DB_VERSION = 1;

export interface IPublishedSnapshot {
  draft: IDraftListing;
  hostName: string;
  hostInitials: string;
  hostAvatar: string;
  hostJoinedYear: number;
  hostEmail: string;
}

const cache = new Map<number, IPublishedSnapshot>();
let initPromise: Promise<void> | null = null;

function isBrowser(): boolean {
  return typeof indexedDB !== 'undefined' && typeof window !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
  });
}

function reqDone<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('idb transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('idb transaction aborted'));
  });
}

/**
 * Idempotent boot loader. Migrates the legacy `cnt-published-snapshots`
 * localStorage map into IDB on first run, then drops the legacy key. Safe
 * to call multiple times — only the first call does work.
 */
export function initPublishedSnapshots(): Promise<void> {
  if (!isBrowser()) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const db = await openDb();
      // One-time migration from localStorage.
      try {
        const legacy = localStorage.getItem(PUBLISHED_SNAPSHOTS_KEY);
        if (legacy) {
          const map = JSON.parse(legacy) as Record<string, IPublishedSnapshot>;
          const tx = db.transaction(STORE, 'readwrite');
          for (const [k, v] of Object.entries(map)) tx.objectStore(STORE).put(v, String(k));
          await txDone(tx);
          localStorage.removeItem(PUBLISHED_SNAPSHOTS_KEY);
        }
      } catch {
        // Legacy parse failure — skip migration; IDB load below still wins.
      }
      // Hydrate the in-memory cache from IDB.
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const [keys, values] = await Promise.all([
        reqDone(store.getAllKeys()),
        reqDone(store.getAll()),
      ]);
      const klist = keys as IDBValidKey[];
      const vlist = values as IPublishedSnapshot[];
      for (let i = 0; i < klist.length; i++) {
        const id = Number(klist[i]);
        if (Number.isFinite(id)) cache.set(id, vlist[i]);
      }
    } catch (err) {
      // IDB unavailable (private browsing on some platforms, etc.) — fall
      // back to a read-only view of the legacy localStorage key.
      console.warn('[published-snapshots] IDB unavailable, falling back to localStorage', err);
      try {
        const raw = localStorage.getItem(PUBLISHED_SNAPSHOTS_KEY);
        if (raw) {
          const map = JSON.parse(raw) as Record<string, IPublishedSnapshot>;
          for (const [k, v] of Object.entries(map)) {
            const id = Number(k);
            if (Number.isFinite(id)) cache.set(id, v);
          }
        }
      } catch { /* swallow */ }
    }
  })();
  return initPromise;
}

/** Synchronous; returns null when no snapshot exists for the id. */
export function readPublishedSnapshot(listingId: number): IPublishedSnapshot | null {
  return cache.get(listingId) ?? null;
}

/** Synchronous; returns a fresh plain object so callers can mutate freely. */
export function readAllPublishedSnapshots(): Record<string, IPublishedSnapshot> {
  const out: Record<string, IPublishedSnapshot> = {};
  for (const [k, v] of cache) out[String(k)] = v;
  return out;
}

/**
 * Persist a snapshot. Updates the synchronous cache immediately and queues
 * the IDB write. The returned promise resolves once IDB acknowledges the
 * write; reject path means storage is full or unavailable.
 */
export async function writePublishedSnapshot(listingId: number, snapshot: IPublishedSnapshot): Promise<void> {
  cache.set(listingId, snapshot);
  if (!isBrowser()) return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(snapshot, String(listingId));
  await txDone(tx);
}
