import type { IDraftListing } from './draft-listing.types';

/**
 * Per-listing snapshot persisted at publish time so `/listing?id=N` can
 * hydrate the host's real data (photos, host name, rules) instead of falling
 * through to the mock generators in `getListingDetail`.
 *
 * Lives in its own file (not the host-listing-draft.service) so
 * `mock-listings.data.ts` can read snapshots without creating a circular
 * import — the service already imports from `mock-listings.data.ts`.
 */
export const PUBLISHED_SNAPSHOTS_KEY = 'cnt-published-snapshots';

export interface IPublishedSnapshot {
  draft: IDraftListing;
  hostName: string;
  hostInitials: string;
  hostAvatar: string;
  hostJoinedYear: number;
  hostEmail: string;
}

/** Browser-only; returns {} on SSR or when no snapshots exist. */
export function readAllPublishedSnapshots(): Record<string, IPublishedSnapshot> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PUBLISHED_SNAPSHOTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, IPublishedSnapshot>) : {};
  } catch {
    return {};
  }
}

/** Browser-only; returns null on SSR or when no snapshot exists for the id. */
export function readPublishedSnapshot(listingId: number): IPublishedSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PUBLISHED_SNAPSHOTS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, IPublishedSnapshot>;
    return map[String(listingId)] ?? null;
  } catch {
    return null;
  }
}

/** Browser-only; silently no-ops on quota errors (listing still publishes). */
export function writePublishedSnapshot(listingId: number, snapshot: IPublishedSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PUBLISHED_SNAPSHOTS_KEY);
    const map: Record<string, IPublishedSnapshot> = raw ? JSON.parse(raw) : {};
    map[String(listingId)] = snapshot;
    localStorage.setItem(PUBLISHED_SNAPSHOTS_KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded — listing is still in MOCK_LISTINGS, just falls back to mock detail.
  }
}
