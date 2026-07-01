import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  IDraftListing,
  PRIMARY_PROPERTY_TYPE_META,
  isAddressStepValid,
} from './draft-listing.types';
import {
  IPrivateListing,
  MOCK_LISTINGS,
  ALL_LISTINGS,
  type Category,
} from './mock-listings.data';
import { addOwnedListing, removeOwnedListing } from '../host/mock-host-data';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../toast/toast.service';
import { HostListingMetaService } from '../host/host-listing-meta.service';

const DRAFT_STORAGE_KEY = 'cnt-listing-draft';
const SHELVED_DRAFTS_KEY = 'cnt-shelved-drafts';

import { IPublishedSnapshot, readAllPublishedSnapshots, readPublishedSnapshot as readSnapshot, writePublishedSnapshot, deletePublishedSnapshot } from './published-snapshot.util';
import { MIN_VIABLE_LISTING_PRICE } from '../pricing/pricing.util';
// Re-export so existing consumers of '@cnt-workspace/data-access' keep working.
export { IPublishedSnapshot, readPublishedSnapshot } from './published-snapshot.util';

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
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);
  private toasts = inject(ToastService);
  private meta = inject(HostListingMetaService);

  private readonly _draft$ = new BehaviorSubject<IDraftListing | null>(null);
  readonly draft$: Observable<IDraftListing | null> = this._draft$.asObservable();

  /** Non-null while the wizard is editing an already-published listing. */
  private _editingListingId: number | null = null;
  /** Stash of the user's in-progress new-listing draft while in edit mode. */
  private _savedNewListingDraft: IDraftListing | null = null;
  /** LIFO stack of new-listing drafts shelved when the host duplicates a
   *  listing. Surfaced on the dashboard's resume-draft card. */
  private readonly _shelvedDrafts$ = new BehaviorSubject<IDraftListing[]>([]);
  readonly shelvedDrafts$: Observable<IDraftListing[]> = this._shelvedDrafts$.asObservable();

  get editingListingId(): number | null { return this._editingListingId; }
  get isEditing(): boolean { return this._editingListingId !== null; }
  get shelvedDrafts(): IDraftListing[] { return this._shelvedDrafts$.value; }
  /** Synchronous accessor for the in-flight draft — handy for callers that
   *  need to read once (e.g., compute a copy title) without subscribing. */
  get activeDraft(): IDraftListing | null { return this._draft$.value; }

  constructor() {
    this._draft$.next(this.read());
    this._shelvedDrafts$.next(this.readShelved());
    this.hydratePublishedListings();
  }

  /**
   * Rebuild user-published listings from `cnt-published-snapshots` so they
   * survive a hard refresh. `MOCK_LISTINGS` is module-scoped and resets on
   * reload — without this, `/search` and `findListing(id)` would lose
   * everything the host published in a previous session.
   */
  private hydratePublishedListings(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const snapshots = readAllPublishedSnapshots();
    for (const [idStr, snap] of Object.entries(snapshots)) {
      const id = Number(idStr);
      if (!Number.isFinite(id)) continue;
      if (ALL_LISTINGS.some(l => l.id === id)) continue;
      const listing = this.draftToListing(snap.draft, id);
      MOCK_LISTINGS.push(listing);
      ALL_LISTINGS.push(listing);
      if (snap.hostEmail) addOwnedListing(snap.hostEmail, id);
    }
  }

  /** Current draft snapshot (synchronous). */
  get current(): IDraftListing | null {
    return this._draft$.value;
  }

  /**
   * Per-step completion for the active draft. Drives the resume-card progress UI
   * shown on /hosting and /hosting/listings. Mirrors the phase-hub logic in the
   * wizard. Returns null when no draft exists.
   *
   * The "review" step is intentionally counted as the last actionable step but
   * is considered complete only when the publish gate would pass.
   */
  get completion(): {
    stepsDone: number;
    stepsTotal: number;
    pct: number;
    phasesDone: [boolean, boolean, boolean];
  } | null {
    return this.completionFor(this._draft$.value);
  }

  /** Per-step completion for an arbitrary draft — used by the shelved-card
   *  renderer so each saved copy shows its own progress without touching
   *  the in-flight slot. */
  completionFor(d: IDraftListing | null): {
    stepsDone: number;
    stepsTotal: number;
    pct: number;
    phasesDone: [boolean, boolean, boolean];
  } | null {
    if (!d) return null;
    const [phase1, phase2, phase3] = this.stepValidities(d);
    const allSteps = [...phase1, ...phase2, ...phase3];
    const stepsDone = allSteps.filter(Boolean).length;
    const stepsTotal = allSteps.length;
    return {
      stepsDone,
      stepsTotal,
      pct: Math.round((stepsDone / stepsTotal) * 100),
      phasesDone: [
        phase1.every(Boolean),
        phase2.every(Boolean),
        phase3.every(Boolean),
      ],
    };
  }

  /**
   * True when the active draft satisfies the requirements of the given (phase, step)
   * tuple. Drives the wizard's Next-button gate so users can't advance past a step
   * that hasn't met its minimum.
   */
  isStepValid(phase: 1 | 2 | 3, step: number): boolean {
    const d = this._draft$.value;
    if (!d) return false;
    const [p1, p2, p3] = this.stepValidities(d);
    const phaseSteps = phase === 1 ? p1 : phase === 2 ? p2 : p3;
    return phaseSteps[step] ?? false;
  }

  /** Human-readable hint shown when a step's Next is disabled. */
  stepValidationHint(phase: 1 | 2 | 3, step: number): string {
    const hints: Record<string, string> = {
      '1-0': 'Pick a primary property type to continue.',
      '1-1': "Add city, state, pin the map — and if you're not the owner, the landowner's details.",
      '1-2': 'Set the max guest count to continue.',
      '1-3': 'Pick at least one amenity (standard or custom) to continue.',
      '1-4': 'Pick at least one rig type, or switch to tents-only.',
      '2-0': 'Upload at least 3 photos to continue.',
      '2-1': 'Title needs 8+ chars and description needs 150+.',
      '2-2': 'Pick visibility, noise, and road conditions to continue.',
      '2-3': '',
      '3-0': 'Set check-in / check-out times and min nights.',
      '3-1': 'Save your house rules to continue.',
      '3-2': `Set a nightly price of at least $${MIN_VIABLE_LISTING_PRICE} and a cancellation policy to continue.`,
      '3-3': 'A few required fields are still missing.',
    };
    return hints[`${phase}-${step}`] ?? '';
  }

  /**
   * Per-phase step-validity arrays. Single source of truth so `completion`,
   * `isStepValid`, and `missingRequiredFields` all stay in sync.
   */
  private stepValidities(d: IDraftListing): [boolean[], boolean[], boolean[]] {
    const phase1 = [
      !!d.primaryType && (d.primaryType !== 'custom' || (d.customPrimaryLabel?.trim().length ?? 0) >= 2),
      isAddressStepValid(d),
      typeof d.guestCapacity === 'number' && d.guestCapacity > 0,
      (d.amenities?.length ?? 0) + (d.customAmenities?.length ?? 0) > 0,
      d.tentMode === 'tents-only' || (d.vehicleTypes?.length ?? 0) > 0,
    ];
    const phase2 = [
      (d.photos?.length ?? 0) >= 3,
      !!d.title && d.title.length >= 8 && !!d.description && d.description.length >= 150,
      !!d.visibility?.length && !!d.noiseLevel && !!d.roadConditions?.length,
      true, // profile photo is optional — counts as done
    ];
    const phase3 = [
      !!d.checkInTime && !!d.checkOutTime && typeof d.minNights === 'number',
      !!d.rules,
      typeof d.nightlyPrice === 'number' && d.nightlyPrice >= MIN_VIABLE_LISTING_PRICE && !!d.cancellationTier,
      this.missingRequiredFields(d).length === 0,
    ];
    return [phase1, phase2, phase3];
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
    if (this._editingListingId !== null) {
      this.persistEdit(this._editingListingId, next);
    } else {
      this.write(next);
    }
    this._draft$.next(next);
    return next;
  }

  /**
   * Begin editing an already-published listing. The wizard reads from this
   * draft and `saveDraft` writes back to the listing's snapshot in place
   * instead of the new-listing slot. Returns null when no snapshot exists.
   */
  loadForEdit(listingId: number): IDraftListing | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const snap = readSnapshot(listingId);
    if (!snap) return null;
    // Stash whatever draft was in flight so we can restore on exit.
    this._savedNewListingDraft = this._draft$.value;
    this._editingListingId = listingId;
    this._draft$.next(snap.draft);
    return snap.draft;
  }

  /**
   * Leave edit mode and restore the prior new-listing draft (if any). Called
   * when the wizard component unloads.
   */
  exitEdit(): void {
    if (this._editingListingId === null) return;
    this._editingListingId = null;
    this._draft$.next(this._savedNewListingDraft);
    this._savedNewListingDraft = null;
  }

  /**
   * Clone an existing listing's snapshot into a brand-new unpublished draft.
   * Used by the "Duplicate" action on /hosting cards so a host can spin up a
   * second site on the same property without re-walking the wizard from
   * scratch.
   *
   * - If currently in edit mode, exits first so the duplicate becomes the new
   *   in-flight new-listing draft (not an edit-mode write).
   * - If a meaningful new-listing draft is already in flight, it's pushed onto
   *   the shelved-drafts stack so the host doesn't lose work. The dashboard
   *   surfaces a "Resume shelved draft" hint while the stack is non-empty.
   * - Source resolves from the publish-time snapshot first (covers user-
   *   published + previously-edited listings); falls back to the seed
   *   `IPrivateListing` for unsnapshotted mock catalog entries.
   * - Every add-on gets a fresh id so future edits in the new draft don't
   *   bleed back to the source (same isolation pattern as the bulk builder).
   *
   * Returns the new draft, or null if no source could be resolved.
   */
  duplicateAsDraft(sourceListingId: number, customTitle?: string): IDraftListing | null {
    if (this._editingListingId !== null) this.exitEdit();

    const source = this.resolveDraftSource(sourceListingId);
    if (!source) return null;

    // Shelve the current in-flight draft if it has meaningful content so
    // the host doesn't lose it. "Meaningful" = anything beyond the bare
    // skeleton fields.
    const current = this._draft$.value;
    if (current && this.draftHasContent(current)) {
      this.writeShelved([...this._shelvedDrafts$.value, current]);
    }

    const now = new Date().toISOString();
    // Structured clone, then strip identity + status + regenerate fresh ids
    // anywhere ids are local to the draft (add-ons today; future per-site
    // ids would go here too).
    const clone: IDraftListing = JSON.parse(JSON.stringify(source));
    clone.id = this.newId();
    clone.createdAt = now;
    clone.updatedAt = now;
    clone.currentPhase = 1;
    clone.currentStep = 0;
    clone.title = customTitle?.trim() || this.suggestCopyTitle(clone.title);
    clone.clonedFromListingId = sourceListingId;
    delete clone.publishedAt;
    delete clone.publishedListingId;
    if (Array.isArray(clone.addOns)) {
      clone.addOns = clone.addOns.map(a => ({ ...a, id: `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }));
    }

    this._draft$.next(clone);
    this.write(clone);
    return clone;
  }

  /**
   * Clone an existing listing and publish it immediately in one shot —
   * powers the "Or publish as-is" link on the listing-card rename modal.
   *
   * Wraps the clone in stash/restore so the host's in-flight new-listing
   * draft isn't bulldozed by `publish()`'s draft-wiping side effects.
   * Returns the new listing, or null when the source can't be resolved or
   * the clone would fail validation.
   */
  duplicateAndPublish(sourceListingId: number, customTitle?: string): IPrivateListing | null {
    if (this._editingListingId !== null) this.exitEdit();
    const source = this.resolveDraftSource(sourceListingId);
    if (!source) return null;

    const now = new Date().toISOString();
    const clone: IDraftListing = JSON.parse(JSON.stringify(source));
    clone.id = this.newId();
    clone.createdAt = now;
    clone.updatedAt = now;
    clone.currentPhase = 1;
    clone.currentStep = 0;
    clone.title = customTitle?.trim() || this.suggestCopyTitle(clone.title);
    clone.clonedFromListingId = sourceListingId;
    delete clone.publishedAt;
    delete clone.publishedListingId;
    if (Array.isArray(clone.addOns)) {
      clone.addOns = clone.addOns.map(a => ({ ...a, id: `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }));
    }

    // Defensive: bail before mutating draft state if the clone wouldn't pass
    // publish-validation. Falls back gracefully via the caller.
    if (this.missingRequiredFields(clone).length > 0) return null;

    // Stash any in-flight draft so publish()'s wipe doesn't lose work.
    const stashed = this._draft$.value;
    this._draft$.next(clone);
    this.write(clone);

    let listing: IPrivateListing | null = null;
    try {
      listing = this.publish();
    } catch {
      listing = null;
    } finally {
      // publish() clears localStorage's draft key on success; restore both
      // the in-memory and persisted state from the stash either way.
      if (stashed) {
        this._draft$.next(stashed);
        this.write(stashed);
      } else {
        this._draft$.next(null);
      }
    }
    return listing;
  }

  /**
   * Like `duplicateAsDraft()` but writes the clone straight to the shelved-
   * drafts stack instead of swapping the in-flight draft. Powers the
   * "Save to drafts" branch on the listing-card rename modal — the host
   * stays where they are (typically /hosting) and the copy waits on the
   * shelf for later. Returns the new draft, or null when no source resolves.
   */
  duplicateAsShelvedDraft(sourceListingId: number, customTitle?: string): IDraftListing | null {
    const source = this.resolveDraftSource(sourceListingId);
    if (!source) return null;

    const now = new Date().toISOString();
    const clone: IDraftListing = JSON.parse(JSON.stringify(source));
    clone.id = this.newId();
    clone.createdAt = now;
    clone.updatedAt = now;
    clone.currentPhase = 1;
    clone.currentStep = 0;
    clone.title = customTitle?.trim() || this.suggestCopyTitle(clone.title);
    clone.clonedFromListingId = sourceListingId;
    delete clone.publishedAt;
    delete clone.publishedListingId;
    if (Array.isArray(clone.addOns)) {
      clone.addOns = clone.addOns.map(a => ({ ...a, id: `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }));
    }

    this.writeShelved([...this._shelvedDrafts$.value, clone]);
    return clone;
  }

  /**
   * Fork the in-flight new-listing draft — clone its current state with a
   * fresh id and shelve the clone so the host keeps editing the original
   * while the copy waits to be picked up later (via `resumeShelvedDraft()`).
   *
   * Returns the clone, or null when there's no draft or the draft is the
   * bare skeleton (no fields to be worth forking).
   */
  forkCurrentDraft(customTitle?: string): IDraftListing | null {
    const current = this._draft$.value;
    if (!current || !this.draftHasContent(current)) return null;

    const now = new Date().toISOString();
    const clone: IDraftListing = JSON.parse(JSON.stringify(current));
    clone.id = this.newId();
    clone.createdAt = now;
    clone.updatedAt = now;
    clone.title = customTitle?.trim() || this.suggestCopyTitle(clone.title);
    delete clone.publishedAt;
    delete clone.publishedListingId;
    if (Array.isArray(clone.addOns)) {
      clone.addOns = clone.addOns.map(a => ({ ...a, id: `addon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }));
    }

    this.writeShelved([...this._shelvedDrafts$.value, clone]);
    return clone;
  }

  /**
   * Mint N shelved copies of a listing in one pass — drives the inline
   * "Add another site" N-stepper on the dashboard. Each iteration reuses
   * the existing `duplicateAsShelvedDraft()` path; because
   * `suggestCopyTitle()` walks the shelved-drafts list to find unused
   * titles, the pattern-aware naming chains naturally (Pad 3, Pad 4,
   * Pad 5, …) without any explicit numbering.
   *
   * Returns the array of newly-shelved drafts, or [] if none were
   * created (bad source id or count ≤ 0).
   */
  duplicateAsShelvedDraftBatch(sourceListingId: number, count: number): IDraftListing[] {
    const n = Math.max(0, Math.min(20, Math.floor(count)));
    const drafts: IDraftListing[] = [];
    for (let i = 0; i < n; i++) {
      const d = this.duplicateAsShelvedDraft(sourceListingId);
      if (d) drafts.push(d);
    }
    return drafts;
  }

  /** Move a shelved draft from one index to another. Mutates the LIFO order
   *  the dashboard renders. Persists immediately via writeShelved(). */
  reorderShelvedDraft(fromIndex: number, toIndex: number): void {
    const stack = this._shelvedDrafts$.value.slice();
    if (fromIndex < 0 || fromIndex >= stack.length) return;
    const clampedTo = Math.max(0, Math.min(stack.length - 1, toIndex));
    if (fromIndex === clampedTo) return;
    const [moved] = stack.splice(fromIndex, 1);
    stack.splice(clampedTo, 0, moved);
    this.writeShelved(stack);
  }

  /** Patch a shelved draft's title in place — drives the inline title
   *  rename on the shelved card. Bumps `updatedAt` and persists. No-op if
   *  the draft id isn't on the shelf or the new title is empty. */
  renameShelvedDraft(draftId: string, newTitle: string): void {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const stack = this._shelvedDrafts$.value.slice();
    const idx = stack.findIndex(d => d.id === draftId);
    if (idx === -1) return;
    stack[idx] = { ...stack[idx], title: trimmed, updatedAt: new Date().toISOString() };
    this.writeShelved(stack);
  }

  /** Swap the in-flight new-listing draft with the most recently shelved one.
   *  The current in-flight draft (if meaningful) takes its slot on the stack. */
  resumeShelvedDraft(): IDraftListing | null {
    const stack = this._shelvedDrafts$.value;
    if (stack.length === 0) return null;
    return this.resumeShelvedDraftById(stack[stack.length - 1].id);
  }

  /** Swap a specific shelved draft (by its draft id) with the in-flight one —
   *  drives per-draft Resume buttons on the dashboard so the host can pick
   *  any draft, not just the top of the stack. */
  resumeShelvedDraftById(draftId: string): IDraftListing | null {
    const stack = this._shelvedDrafts$.value;
    const idx = stack.findIndex(d => d.id === draftId);
    if (idx === -1) return null;
    const next = stack[idx];
    const rest = stack.filter(d => d.id !== draftId);
    const current = this._draft$.value;
    const newStack = current && this.draftHasContent(current) ? [...rest, current] : rest;
    this.writeShelved(newStack);
    this._draft$.next(next);
    this.write(next);
    return next;
  }

  /** Discard the most recently shelved draft (host explicitly drops it). */
  discardShelvedDraft(): void {
    const stack = this._shelvedDrafts$.value;
    if (stack.length === 0) return;
    this.writeShelved(stack.slice(0, -1));
  }

  /** Discard a specific shelved draft (by its draft id). */
  discardShelvedDraftById(draftId: string): void {
    this.writeShelved(this._shelvedDrafts$.value.filter(d => d.id !== draftId));
  }

  /** Walk an owned listing's `clonedFromListingId` chain via publish-time
   *  snapshots until the chain terminates. Returns the *root* listing id of
   *  the property — single-listing properties return their own id. Bounded
   *  at 8 hops as a safety net against corrupted data forming a cycle. */
  lineageRootOf(listingId: number): number {
    let cursor = listingId;
    for (let i = 0; i < 8; i++) {
      const snap = readSnapshot(cursor);
      const parent = snap?.draft?.clonedFromListingId;
      if (parent == null || parent === cursor) return cursor;
      cursor = parent;
    }
    return cursor;
  }

  /** Group a host's owned listings by their property root so multi-site
   *  parcels (vineyard with three pads, brewery with two) render as a
   *  cohesive section on the dashboard. Single-site groups still appear —
   *  the caller decides whether to render them as sections or flat cards. */
  groupOwnedByProperty(listings: IPrivateListing[]): {
    rootId: number;
    rootTitle: string;
    sites: IPrivateListing[];
  }[] {
    const byRoot = new Map<number, IPrivateListing[]>();
    for (const l of listings) {
      const root = this.lineageRootOf(l.id);
      const arr = byRoot.get(root) ?? [];
      arr.push(l);
      byRoot.set(root, arr);
    }
    const result: { rootId: number; rootTitle: string; sites: IPrivateListing[] }[] = [];
    for (const [rootId, sites] of byRoot.entries()) {
      // Title-sort within a group so D1's pattern-aware names (Pad 1, Pad 2,
      // Pad 3) line up in numeric order.
      const ordered = [...sites].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
      const rootListing = ordered.find(l => l.id === rootId) ?? ordered[0];
      result.push({ rootId, rootTitle: rootListing.title, sites: ordered });
    }
    // Groups by most-recent member id (newest property to the top).
    return result.sort((a, b) => Math.max(...b.sites.map(l => l.id)) - Math.max(...a.sites.map(l => l.id)));
  }

  /** Smart copy-title suggestion. Hosts almost never want a literal "(copy)"
   *  — they want the next pad number / site letter. We detect common
   *  patterns in the source title and increment them:
   *
   *  - "Heritage Oak — Pad 1"  → "Heritage Oak — Pad 2"
   *  - "Site 12"               → "Site 13"
   *  - "Foo Site A"            → "Foo Site B" (single uppercase letter)
   *
   *  Falls back to the legacy "(copy)" / "(copy 2)" suffix when no pattern
   *  matches. In every case we walk known titles (published + in-flight +
   *  shelved) and keep incrementing until we mint an unused one, so the
   *  staircase never returns.
   */
  suggestCopyTitle(baseTitle: string | undefined): string {
    const raw = (baseTitle ?? '').trim();
    if (!raw) return '(copy)';

    const taken = new Set<string>();
    for (const l of ALL_LISTINGS) if (l.title) taken.add(l.title);
    const current = this._draft$.value;
    if (current?.title) taken.add(current.title);
    for (const d of this._shelvedDrafts$.value) if (d.title) taken.add(d.title);

    // 1) Trailing integer — strongest signal. "Pad 3" → "Pad 4".
    const numMatch = raw.match(/^(.*?)(\d+)\s*$/);
    if (numMatch) {
      const prefix = numMatch[1];
      let n = parseInt(numMatch[2], 10) + 1;
      // Bounded loop — find the next unused integer.
      for (let i = 0; i < 200; i++, n++) {
        const candidate = `${prefix}${n}`;
        if (!taken.has(candidate)) return candidate;
      }
    }

    // 2) Trailing single uppercase letter — "Site A" → "Site B".
    //    Stop at Z so we don't roll into "AA"; defer to the copy suffix.
    const letterMatch = raw.match(/^(.*?\s)([A-Y])\s*$/);
    if (letterMatch) {
      const prefix = letterMatch[1];
      let code = letterMatch[2].charCodeAt(0) + 1;
      for (let i = 0; i < 26 && code <= 'Z'.charCodeAt(0); i++, code++) {
        const candidate = `${prefix}${String.fromCharCode(code)}`;
        if (!taken.has(candidate)) return candidate;
      }
    }

    // 3) Fallback — strip an existing "(copy N?)" suffix from the base,
    //    then mint the smallest unused ordinal.
    const base = raw.replace(/\s*\(copy(?:\s*\d+)?\)\s*$/i, '');
    const first = `${base} (copy)`;
    if (!taken.has(first)) return first;
    for (let n = 2; n < 100; n++) {
      const candidate = `${base} (copy ${n})`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${base} (copy ${Date.now()})`;
  }

  /** Resolve a source draft for duplication. Prefers the publish-time snapshot
   *  (always present for user-published listings); falls back to a minimal
   *  seed built from the catalog row for unsnapshotted mock listings. */
  private resolveDraftSource(listingId: number): IDraftListing | null {
    const snap = readSnapshot(listingId);
    if (snap?.draft) return snap.draft;
    const seed = MOCK_LISTINGS.find(l => l.id === listingId);
    if (!seed) return null;
    // Minimal draft from a seed catalog row — enough so the wizard can open
    // and the host can fill in the gaps.
    const now = new Date().toISOString();
    return {
      id: this.newId(),
      createdAt: now,
      updatedAt: now,
      currentPhase: 1,
      currentStep: 0,
      title: seed.title,
      photos: seed.image ? [seed.image] : [],
      nightlyPrice: seed.price,
    };
  }

  /** A draft is "meaningful" once the host has filled in any user-visible
   *  field beyond the bare skeleton — drives the auto-shelve gate. */
  private draftHasContent(d: IDraftListing): boolean {
    return !!(d.primaryType || d.title || d.address || (d.photos?.length ?? 0) > 0 || d.description);
  }

  private readShelved(): IDraftListing[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(SHELVED_DRAFTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private writeShelved(stack: IDraftListing[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(SHELVED_DRAFTS_KEY, JSON.stringify(stack)); } catch { /* quota */ }
    }
    this._shelvedDrafts$.next(stack);
  }

  /**
   * Final "Save changes" step in edit mode — re-runs persistence against the
   * current draft and returns the refreshed listing. No-op when not editing.
   */
  saveEdit(): IPrivateListing | null {
    if (this._editingListingId === null) return null;
    const draft = this._draft$.value;
    if (!draft) return null;
    return this.persistEdit(this._editingListingId, draft);
  }

  /**
   * Write the snapshot for an edited listing and replace the existing entry
   * in MOCK_LISTINGS / ALL_LISTINGS so `/search` and the detail page reflect
   * the new state on the next read.
   */
  private persistEdit(listingId: number, draft: IDraftListing): IPrivateListing {
    const snap = readSnapshot(listingId);
    if (snap) {
      this.savePublishedSnapshot(listingId, { ...snap, draft });
    }
    const updated = this.draftToListing(draft, listingId);
    const idx = MOCK_LISTINGS.findIndex(l => l.id === listingId);
    if (idx >= 0) MOCK_LISTINGS[idx] = updated;
    const idxAll = ALL_LISTINGS.findIndex(l => l.id === listingId);
    if (idxAll >= 0) ALL_LISTINGS[idxAll] = updated;
    return updated;
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
    const user = this.auth.currentUser;
    if (user?.email) addOwnedListing(user.email, listing.id);
    // Persist a snapshot so /listing?id=N renders the host's real data
    // (photos, host name, rules) instead of the mock generators.
    this.savePublishedSnapshot(listing.id, {
      draft,
      hostName: this.hostNameFromUser(user),
      hostInitials: this.hostInitialsFromUser(user),
      hostAvatar: user?.photoUrl || 'assets/images/host_opportunity.webp',
      hostJoinedYear: new Date().getFullYear(),
      hostEmail: user?.email ?? '',
    });
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

  /**
   * Permanently remove a user-published listing. Coordinates four stores so
   * the listing disappears everywhere consistently:
   *   - MOCK_LISTINGS / ALL_LISTINGS (in-memory; affects /search + lookup)
   *   - cnt-published-snapshots in IDB (affects /listing?id=N detail hydration)
   *   - cnt-owned-listings (affects /hosting/listings membership)
   *   - cnt-host-listing-meta (paused/archived flags)
   *
   * Caller is responsible for confirming with the host first — this is
   * irreversible. Boondocking ids and seeded mock ids (1–80) are no-ops since
   * they aren't user-published.
   */
  async deletePublishedListing(listingId: number): Promise<void> {
    // Remove in-memory entries.
    const mockIdx = MOCK_LISTINGS.findIndex(l => l.id === listingId);
    if (mockIdx >= 0) MOCK_LISTINGS.splice(mockIdx, 1);
    const allIdx = ALL_LISTINGS.findIndex(l => l.id === listingId);
    if (allIdx >= 0) ALL_LISTINGS.splice(allIdx, 1);
    // Drop ownership for the current user (other emails likely never had it).
    const user = this.auth.currentUser;
    if (user?.email) removeOwnedListing(user.email, listingId);
    // Drop meta flags.
    this.meta.clear(listingId);
    // Async: drop snapshot from IDB. Don't block the caller, but surface a
    // toast if it fails so the host knows something's off.
    try {
      await deletePublishedSnapshot(listingId);
    } catch (err) {
      console.error('[draft] snapshot delete failed', err);
      this.toasts.error('Listing removed locally, but storage cleanup failed.');
    }
  }

  /** Required-field check used by the publish gate. */
  missingRequiredFields(draft: IDraftListing): string[] {
    const missing: string[] = [];
    if (!draft.primaryType) missing.push('primary property type');
    else if (draft.primaryType === 'custom' && (draft.customPrimaryLabel?.trim().length ?? 0) < 2) {
      missing.push('custom property-type label');
    }
    if (!draft.address?.city || !draft.address?.state) missing.push('address');
    if (typeof draft.lat !== 'number' || typeof draft.lng !== 'number') missing.push('location pin');
    if (draft.isLandowner === false && !isAddressStepValid(draft)) {
      missing.push('landowner details');
    }
    if ((draft.amenities?.length ?? 0) + (draft.customAmenities?.length ?? 0) === 0) {
      missing.push('amenities');
    }
    if (!draft.photos || draft.photos.length < 3) missing.push('at least 3 photos');
    if (!draft.title || draft.title.length < 8) missing.push('title');
    if (!draft.description || draft.description.length < 150) missing.push('description');
    if (typeof draft.nightlyPrice !== 'number' || draft.nightlyPrice < MIN_VIABLE_LISTING_PRICE) {
      missing.push(`price (at least $${MIN_VIABLE_LISTING_PRICE}/night)`);
    }
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
  private draftToListing(draft: IDraftListing, forcedId?: number): IPrivateListing {
    const id = forcedId ?? Math.max(0, ...MOCK_LISTINGS.map(l => l.id), ...ALL_LISTINGS.map(l => l.id)) + 1;
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

  /**
   * Map the host's selections to a platform Category bucket. Prefers the
   * single-select primaryType (new model); falls back to first descriptor for
   * legacy drafts that predate the primary/secondary split.
   */
  private inferCategory(draft: IDraftListing): Category {
    if (draft.primaryType) {
      return PRIMARY_PROPERTY_TYPE_META[draft.primaryType].category;
    }
    // Legacy fallback: first descriptor (kept for drafts created before the
    // primary/secondary split).
    const first = draft.descriptors?.[0] as string | undefined;
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

  /** "Dustin R." from the current user, or "New host" if unauthenticated. */
  private hostNameFromUser(user: { firstName?: string; lastName?: string } | null | undefined): string {
    const first = user?.firstName?.trim() ?? '';
    const last = user?.lastName?.trim() ?? '';
    if (!first && !last) return 'New host';
    if (!last) return first;
    return `${first} ${last.charAt(0).toUpperCase()}.`;
  }
  /** "DR" from "Dustin Reed". */
  private hostInitialsFromUser(user: { firstName?: string; lastName?: string } | null | undefined): string {
    const f = (user?.firstName?.trim() ?? '').charAt(0).toUpperCase();
    const l = (user?.lastName?.trim() ?? '').charAt(0).toUpperCase();
    return `${f}${l}` || 'NH';
  }

  /** Write the per-listing snapshot so /listing?id=N can hydrate the host's real data.
   * Fires a toast on storage failure (quota / IDB unavailable) instead of silently
   * dropping the write — the cache update has already happened in memory. */
  private savePublishedSnapshot(listingId: number, snapshot: IPublishedSnapshot): void {
    writePublishedSnapshot(listingId, snapshot).catch(err => {
      console.error('[draft] snapshot write failed', err);
      this.toasts.error('Could not save listing changes — storage may be full.');
    });
  }
}
