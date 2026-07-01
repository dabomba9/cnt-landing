import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, map } from 'rxjs';

/** Persisted consent state. `null` = the visitor hasn't decided yet
 *  (banner should show); `true` = explicitly accepted non-essential
 *  cookies; `false` = explicitly declined. */
type ConsentChoice = boolean | null;

const STORAGE_KEY = 'cnt-cookie-consent';

/** Tracks whether the visitor has dismissed the cookie banner and
 *  whether they accepted or declined non-essential cookies (analytics,
 *  etc.). The banner gates on `hasDecided$`; any future analytics
 *  loader gates on `accepted$`. Persisted in localStorage so the
 *  banner doesn't re-appear on every page load. */
@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private platformId = inject(PLATFORM_ID);

  private readonly _choice$ = new BehaviorSubject<ConsentChoice>(null);

  readonly hasDecided$: Observable<boolean> = this._choice$.pipe(
    map(c => c !== null),
  );
  readonly accepted$: Observable<boolean> = this._choice$.pipe(
    map(c => c === true),
  );

  constructor() {
    this._choice$.next(this.read());
  }

  hasDecided(): boolean {
    return this._choice$.value !== null;
  }

  accepted(): boolean {
    return this._choice$.value === true;
  }

  accept(): void { this.write(true); }
  decline(): void { this.write(false); }
  /** Used by an account-level "manage cookies" surface to re-prompt
   *  the banner. Not currently wired into any page but exposed so
   *  later GDPR-rights flows can call it. */
  revoke(): void { this.write(null); }

  private read(): ConsentChoice {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return null;
    } catch {
      return null;
    }
  }

  private write(choice: ConsentChoice): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (choice === null) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, String(choice));
      } catch { /* quota — fallback to in-memory */ }
    }
    this._choice$.next(choice);
  }
}
