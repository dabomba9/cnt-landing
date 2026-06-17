import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ISavedSearch {
  id: string;
  name: string;
  createdAt: string;
  /** Snapshot of the /search URL's query params at save time. */
  query: Record<string, string>;
}

const STORAGE_KEY = 'cnt-saved-searches';

/** Persists named /search filter snapshots to localStorage so the visitor
 *  can jump back to "Boondocking on the Olympic Peninsula" without
 *  rebuilding every chip. Mirrors the CookieConsentService SSR-safe
 *  storage pattern. */
@Injectable({ providedIn: 'root' })
export class SavedSearchesService {
  private readonly _searches$ = new BehaviorSubject<ISavedSearch[]>([]);
  readonly searches$: Observable<ISavedSearch[]> = this._searches$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._searches$.next(this.read());
  }

  list(): ISavedSearch[] {
    return this._searches$.value;
  }

  add(name: string, query: Record<string, string>): ISavedSearch {
    const trimmed = name.trim() || 'Untitled search';
    const entry: ISavedSearch = {
      id: cryptoId(),
      name: trimmed,
      createdAt: new Date().toISOString(),
      query: { ...query },
    };
    const next = [entry, ...this._searches$.value];
    this.write(next);
    return entry;
  }

  remove(id: string): void {
    const next = this._searches$.value.filter(s => s.id !== id);
    this.write(next);
  }

  get(id: string): ISavedSearch | undefined {
    return this._searches$.value.find(s => s.id === id);
  }

  private read(): ISavedSearch[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((s): s is ISavedSearch =>
        typeof s?.id === 'string' &&
        typeof s?.name === 'string' &&
        typeof s?.createdAt === 'string' &&
        s?.query && typeof s.query === 'object',
      );
    } catch {
      return [];
    }
  }

  private write(next: ISavedSearch[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
    }
    this._searches$.next(next);
  }
}

/** crypto.randomUUID() with a safe fallback for very old browsers. */
function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto & { randomUUID(): string }).randomUUID();
  }
  return `ss-${Math.random().toString(36).slice(2, 10)}`;
}
