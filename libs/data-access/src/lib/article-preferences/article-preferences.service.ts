import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, map } from 'rxjs';

interface IArticlePreferences {
  savedArticleIds: number[];
  readArticleIds: number[];
  /** ISO timestamps keyed by article id — drives the "Pick up where
   *  you left off" surface (most-recent read wins). */
  lastReadAt: Record<number, string>;
}

const STORAGE_KEY = 'cnt-article-prefs';
const EMPTY: IArticlePreferences = { savedArticleIds: [], readArticleIds: [], lastReadAt: {} };

/** Tracks per-visitor article state — which articles they've bookmarked
 *  for later and which they've opened. Drives the bookmark icon on
 *  cards, the `/articles/saved` reading list, and the "Pick up where
 *  you left off" strip on `/articles`. Local-only; SSR returns the
 *  empty state so the server-render is stable. */
@Injectable({ providedIn: 'root' })
export class ArticlePreferencesService {
  private platformId = inject(PLATFORM_ID);

  private readonly _state$ = new BehaviorSubject<IArticlePreferences>(EMPTY);

  readonly saved$: Observable<number[]> = this._state$.pipe(map(s => s.savedArticleIds));
  readonly read$: Observable<number[]> = this._state$.pipe(map(s => s.readArticleIds));
  readonly state$: Observable<IArticlePreferences> = this._state$.asObservable();

  constructor() {
    this._state$.next(this.read());
  }

  isSaved(id: number): boolean {
    return this._state$.value.savedArticleIds.includes(id);
  }

  isRead(id: number): boolean {
    return this._state$.value.readArticleIds.includes(id);
  }

  /** Most-recently-read article id, or null if the visitor hasn't
   *  opened anything yet. */
  mostRecentReadId(): number | null {
    const last = this._state$.value.lastReadAt;
    let bestId: number | null = null;
    let bestAt = '';
    for (const [id, at] of Object.entries(last)) {
      if (at > bestAt) { bestAt = at; bestId = parseInt(id, 10); }
    }
    return bestId;
  }

  toggleSave(id: number): void {
    const cur = this._state$.value;
    const has = cur.savedArticleIds.includes(id);
    const savedArticleIds = has
      ? cur.savedArticleIds.filter(x => x !== id)
      : [...cur.savedArticleIds, id];
    this.write({ ...cur, savedArticleIds });
  }

  markRead(id: number, isoNow: string): void {
    const cur = this._state$.value;
    const readArticleIds = cur.readArticleIds.includes(id)
      ? cur.readArticleIds
      : [...cur.readArticleIds, id];
    const lastReadAt = { ...cur.lastReadAt, [id]: isoNow };
    this.write({ ...cur, readArticleIds, lastReadAt });
  }

  private read(): IArticlePreferences {
    if (!isPlatformBrowser(this.platformId)) return EMPTY;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return EMPTY;
      const parsed = JSON.parse(raw);
      return {
        savedArticleIds: Array.isArray(parsed?.savedArticleIds) ? parsed.savedArticleIds.filter((n: unknown): n is number => typeof n === 'number') : [],
        readArticleIds: Array.isArray(parsed?.readArticleIds) ? parsed.readArticleIds.filter((n: unknown): n is number => typeof n === 'number') : [],
        lastReadAt: parsed?.lastReadAt && typeof parsed.lastReadAt === 'object' ? parsed.lastReadAt : {},
      };
    } catch {
      return EMPTY;
    }
  }

  private write(state: IArticlePreferences): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch { /* quota — keep in-memory state */ }
    }
    this._state$.next(state);
  }
}
