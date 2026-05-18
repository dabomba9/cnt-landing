import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  IDraftListing,
} from './draft-listing.types';
import {
  IPrivateListing,
  MOCK_LISTINGS,
  ALL_LISTINGS,
  type Category,
} from './mock-listings.data';
import { addOwnedListing } from '../host/mock-host-data';
import { AuthService } from '../auth/auth.service';

const DRAFT_STORAGE_KEY = 'cnt-listing-draft';

/**
 * Persists the in-progress listing for the host onboarding wizard at `/hosting/new`
 * and, on publish, mints a real `IPrivateListing` and pushes it into the mock
 * data so `/search` and `/listing?id=N` pick it up.
 *
 * Only one in-progress draft per user. Resuming the wizard reads from
 * `localStorage[cnt-listing-draft]`.
 */
@Injectable({ providedIn: 'root' })
export class HostListingDraftService {
  private readonly _draft$ = new BehaviorSubject<IDraftListing | null>(null);
  readonly draft$: Observable<IDraftListing | null> = this._draft$.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
  ) {
    this._draft$.next(this.read());
  }

  /** Current draft snapshot (synchronous). */
  get current(): IDraftListing | null {
    return this._draft$.value;
  }

  /**
   * Merge a partial update into the current draft (or create a fresh one if
   * none exists). Bumps `updatedAt`, persists, and emits.
   */
  saveDraft(patch: Partial<IDraftListing>): IDraftListing {
    const now = new Date().toISOString();
    const existing = this._draft$.value;
    const next: IDraftListing = existing
      ? { ...existing, ...patch, updatedAt: now }
      : {
          id: this.newId(),
          createdAt: now,
          updatedAt: now,
          currentPhase: 1,
          currentStep: 0,
          ...patch,
        };
    this.write(next);
    this._draft$.next(next);
    return next;
  }

  /** Wipe any in-progress draft. */
  discardDraft(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }
    this._draft$.next(null);
  }

  /**
   * Validate required fields and, if satisfied, transform the draft to a
   * `IPrivateListing` + push into `MOCK_LISTINGS` (and the union `ALL_LISTINGS`)
   * so the new listing is reachable from `/search` and `/listing?id=N`.
   *
   * Returns the new listing on success, throws an Error otherwise. The wizard's
   * Phase 3 review screen calls this only after its own validation passes, so
   * thrown errors should be rare and indicate either a corrupt draft or a logic
   * gap upstream.
   */
  publish(): IPrivateListing {
    const draft = this._draft$.value;
    if (!draft) throw new Error('No draft to publish');
    const missing = this.missingRequiredFields(draft);
    if (missing.length > 0) {
      throw new Error(`Cannot publish — missing: ${missing.join(', ')}`);
    }
    const listing = this.draftToListing(draft);
    MOCK_LISTINGS.push(listing);
    ALL_LISTINGS.push(listing);
    // Record ownership so /hosting/listings surfaces this listing for the host.
    const userEmail = this.auth.currentUser?.email;
    if (userEmail) addOwnedListing(userEmail, listing.id);
    const next: IDraftListing = {
      ...draft,
      publishedAt: new Date().toISOString(),
      publishedListingId: listing.id,
    };
    // Clear the in-progress slot so the user can start a fresh draft next time.
    // We keep the storage key empty rather than rewriting the published state —
    // the wizard's "create another" flow starts from scratch.
    this.discardDraft();
    this._draft$.next(next); // emit the final state once so callers can read publishedListingId
    return listing;
  }

  /** Required-field check used by the publish gate. */
  missingRequiredFields(draft: IDraftListing): string[] {
    const missing: string[] = [];
    if (!draft.descriptors || draft.descriptors.length === 0) missing.push('property type');
    if (!draft.address?.city || !draft.address?.state) missing.push('address');
    if (typeof draft.lat !== 'number' || typeof draft.lng !== 'number') missing.push('location pin');
    if (!draft.amenities || draft.amenities.length === 0) missing.push('amenities');
    if (!draft.photos || draft.photos.length < 3) missing.push('at least 3 photos');
    if (!draft.title || draft.title.length < 8) missing.push('title');
    if (!draft.description || draft.description.length < 150) missing.push('description');
    if (typeof draft.nightlyPrice !== 'number' || draft.nightlyPrice <= 0) missing.push('price');
    if (!draft.cancellationTier) missing.push('cancellation policy');
    return missing;
  }

  // ─────────────────────── internals ───────────────────────

  private read(): IDraftListing | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as IDraftListing;
      return parsed && typeof parsed.id === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  private write(draft: IDraftListing): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Quota exceeded (likely photo data URLs). Surface via toast at the call site
      // when we wire the photos step; for now just swallow.
    }
  }

  private newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Build a real `IPrivateListing` from the draft. Picks a `category` from the
   * first descriptor where possible (with a generic 'offgrid' fallback). Auto-
   * assigns id = max existing id + 1.
   */
  private draftToListing(draft: IDraftListing): IPrivateListing {
    const id = Math.max(0, ...MOCK_LISTINGS.map(l => l.id), ...ALL_LISTINGS.map(l => l.id)) + 1;
    const category = this.inferCategory(draft);
    const location = draft.address
      ? `${draft.address.city}, ${draft.address.state}`
      : 'Location TBD';
    return {
      id,
      kind: 'private',
      title: draft.title ?? `Listing ${id}`,
      location,
      lat: draft.lat ?? 0,
      lng: draft.lng ?? 0,
      price: draft.nightlyPrice ?? 0,
      rating: 0,                    // no reviews yet — listing renders without a star chip
      reviewCount: 0,
      category,
      amenities: draft.amenities ?? [],
      image: draft.photos?.[0] ?? 'assets/images/host_opportunity.webp',
      instantBook: draft.bookability === 'instant',
    };
  }

  /** Map the first selected descriptor to one of the existing Category buckets. */
  private inferCategory(draft: IDraftListing): Category {
    const first = draft.descriptors?.[0];
    switch (first) {
      case 'winery':                 return 'vineyard';
      case 'brewery':                return 'brewery';
      case 'distillery':             return 'brewery';
      case 'farmland':
      case 'orchard':                return 'farm';
      case 'urban':
      case 'suburban':               return 'attraction';
      default:                       return 'offgrid';
    }
  }
}
