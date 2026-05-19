import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface IHostListingMeta {
  paused: boolean;
  archived: boolean;
}

const META_KEY = 'cnt-host-listing-meta';

const EMPTY_META: IHostListingMeta = { paused: false, archived: false };

@Injectable({ providedIn: 'root' })
export class HostListingMetaService {
  private readonly _meta$ = new BehaviorSubject<Record<number, IHostListingMeta>>({});
  readonly meta$: Observable<Record<number, IHostListingMeta>> = this._meta$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._meta$.next(this.read());
  }

  get(listingId: number): IHostListingMeta {
    return this._meta$.value[listingId] || EMPTY_META;
  }

  setPaused(listingId: number, paused: boolean): void {
    this.patch(listingId, { paused });
  }

  setArchived(listingId: number, archived: boolean): void {
    this.patch(listingId, { archived });
  }

  /** Drop the meta entry for a listing. Called by the delete-listing flow. */
  clear(listingId: number): void {
    const next = { ...this._meta$.value };
    if (!(listingId in next)) return;
    delete next[listingId];
    this.write(next);
  }

  private patch(listingId: number, patch: Partial<IHostListingMeta>): void {
    const next = { ...this._meta$.value };
    next[listingId] = { ...(next[listingId] || EMPTY_META), ...patch };
    this.write(next);
  }

  private read(): Record<number, IHostListingMeta> {
    if (!isPlatformBrowser(this.platformId)) return {};
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private write(meta: Record<number, IHostListingMeta>): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
    }
    this._meta$.next(meta);
  }
}
