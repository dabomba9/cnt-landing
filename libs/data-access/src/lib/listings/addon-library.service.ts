import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import type { IAddOn } from './mock-listings.data';

/**
 * One entry in a host's personal add-on library — the same shape as IAddOn
 * minus the per-listing id, plus a libraryId of its own so the same item
 * can live in the library AND be attached to one or more listings (each
 * attach mints a fresh listing-side id).
 */
export interface IAddOnLibraryItem extends Omit<IAddOn, 'id'> {
  libraryId: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'cnt-addon-library';
const GUEST_KEY = `${STORAGE_KEY_PREFIX}-guest`;

function makeLibraryId(): string {
  return `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Per-user library of add-on drafts. Stored in localStorage keyed by the
 * signed-in user's email so each host keeps their own; guests fall back to
 * a shared bucket whose entries migrate forward on sign-in. Library items
 * are never published on their own — they're one-click attached as a real
 * add-on into any listing via Phase3AddonsComponent, the standalone editor,
 * or the bulk builder.
 */
@Injectable({ providedIn: 'root' })
export class AddonLibraryService {
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);

  private readonly _library$ = new BehaviorSubject<IAddOnLibraryItem[]>([]);
  readonly library$: Observable<IAddOnLibraryItem[]> = this._library$.asObservable();

  private storageKey = GUEST_KEY;

  constructor() {
    this.refreshKey();
    this.auth.currentUser$.subscribe(() => this.refreshKey());
    this._library$.next(this.read());
  }

  list(): IAddOnLibraryItem[] {
    return this._library$.value;
  }

  add(item: Omit<IAddOnLibraryItem, 'libraryId' | 'createdAt' | 'updatedAt'>): IAddOnLibraryItem {
    const now = new Date().toISOString();
    const next: IAddOnLibraryItem = { ...item, libraryId: makeLibraryId(), createdAt: now, updatedAt: now };
    const all = [...this._library$.value, next];
    this.write(all);
    return next;
  }

  update(libraryId: string, patch: Partial<Omit<IAddOnLibraryItem, 'libraryId' | 'createdAt'>>): IAddOnLibraryItem | null {
    const all = this._library$.value.slice();
    const idx = all.findIndex(i => i.libraryId === libraryId);
    if (idx === -1) return null;
    const updated: IAddOnLibraryItem = { ...all[idx], ...patch, libraryId: all[idx].libraryId, createdAt: all[idx].createdAt, updatedAt: new Date().toISOString() };
    all[idx] = updated;
    this.write(all);
    return updated;
  }

  remove(libraryId: string): void {
    const all = this._library$.value.filter(i => i.libraryId !== libraryId);
    this.write(all);
  }

  /** Swap the storage key when the signed-in user changes. Guest drafts
   *  migrate to the new key on first sign-in so unsigned work survives. */
  private refreshKey(): void {
    const email = this.auth.currentUser?.email;
    const newKey = email ? `${STORAGE_KEY_PREFIX}-${email}` : GUEST_KEY;
    if (newKey === this.storageKey) return;
    if (email && isPlatformBrowser(this.platformId)) {
      try {
        const guest = localStorage.getItem(GUEST_KEY);
        const target = localStorage.getItem(newKey);
        if (guest && !target) {
          localStorage.setItem(newKey, guest);
          localStorage.removeItem(GUEST_KEY);
        }
      } catch { /* noop */ }
    }
    this.storageKey = newKey;
    this._library$.next(this.read());
  }

  private read(): IAddOnLibraryItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private write(items: IAddOnLibraryItem[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(this.storageKey, JSON.stringify(items)); } catch { /* noop */ }
    }
    this._library$.next(items);
  }
}
