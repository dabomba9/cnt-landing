import { Component, OnDestroy, OnInit } from '@angular/core';

import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CookieConsentService } from '@cnt-workspace/data-access';

/** Auto-dismissing cookie consent banner. Renders once at app shell
 *  level and hides the moment the visitor accepts or declines. Sits
 *  above the bottom-nav (which is itself `fixed bottom-0`) by using
 *  a z-index higher than the nav, with safe-area padding so iPhone
 *  notches don't clip it. */
@Component({
  selector: 'cnt-cookie-consent',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (visible) {
      <aside role="region" aria-label="Cookie consent"
        class="fixed left-0 right-0 z-[60] bg-white border-t border-dark-text/10 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] px-4 md:px-8 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        [style.bottom.px]="bottomOffset">
        <div class="max-w-[80rem] mx-auto flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <span class="material-symbols-outlined text-trinidad shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;" aria-hidden="true">cookie</span>
            <p class="text-sm font-body text-dark-text leading-relaxed">
              We use cookies to make the site work and remember your preferences.
              <a routerLink="/cookies" class="text-trinidad font-bold hover:underline">Read the policy</a>.
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <button type="button" (click)="decline()"
              class="flex-1 md:flex-initial px-4 py-2.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">
              Decline
            </button>
            <button type="button" (click)="accept()"
              class="flex-1 md:flex-initial px-6 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-90 transition-opacity">
              Accept
            </button>
          </div>
        </div>
      </aside>
    }
  `,
})
export class CookieConsentComponent implements OnInit, OnDestroy {
  visible = false;
  /** Bottom offset so the banner doesn't sit on top of the mobile
   *  bottom-nav. Bottom-nav is 64 px tall + safe area; we add 64 px
   *  on mobile via a media query in the template via a getter. */
  bottomOffset = 0;

  private sub: Subscription | null = null;
  private resizeHandler: (() => void) | null = null;

  constructor(private consent: CookieConsentService) {}

  ngOnInit(): void {
    this.sub = this.consent.hasDecided$.subscribe(decided => {
      this.visible = !decided;
    });
    this.updateBottomOffset();
    this.resizeHandler = () => this.updateBottomOffset();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
  }

  /** Bottom-nav is `md:hidden` so we offset only on mobile. The bar
   *  is roughly 64 px tall + safe area; we leave 64 px of room. */
  private updateBottomOffset(): void {
    this.bottomOffset = window.innerWidth < 768 ? 64 : 0;
  }

  accept(): void { this.consent.accept(); }
  decline(): void { this.consent.decline(); }
}
