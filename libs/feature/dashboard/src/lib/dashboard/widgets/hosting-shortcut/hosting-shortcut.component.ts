import { Component, Input, inject } from '@angular/core';

import { Router } from '@angular/router';
import { AuthService } from '@cnt-workspace/data-access';

/** Compact hosting shortcuts card on /dashboard for users who own
 *  at least one listing. Each CTA flips view → 'host' before routing
 *  so the host nav chrome renders immediately on landing. */
@Component({
  selector: 'cnt-hosting-shortcut',
  standalone: true,
  imports: [],
  template: `
    <div class="rounded-2xl bg-white border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="min-w-0">
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold block mb-1">Hosting</span>
          <h3 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight leading-tight">
            {{ ownedCount }} {{ ownedCount === 1 ? 'listing' : 'listings' }}
          </h3>
          <p class="text-xs text-muted-text font-body mt-1">Jump straight into managing your spaces.</p>
        </div>
        <span class="material-symbols-outlined text-3xl text-jungle-green/80 shrink-0" aria-hidden="true">cottage</span>
      </div>

      <div class="flex flex-wrap gap-2 mt-4">
        <button type="button" (click)="openCalendar()"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-trinidad text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)]">
          <span class="material-symbols-outlined text-base">date_range</span>
          Open calendar
        </button>
        <button type="button" (click)="openListings()"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-jungle-green hover:text-jungle-green transition-colors">
          <span class="material-symbols-outlined text-base">list_alt</span>
          All listings
        </button>
        <button type="button" (click)="openHostHome()"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-jungle-green hover:text-jungle-green transition-colors">
          <span class="material-symbols-outlined text-base">home</span>
          Host home
        </button>
      </div>
    </div>
  `,
})
export class HostingShortcutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  @Input() ownedCount = 0;

  private goAsHost(path: string): void {
    this.auth.setView('host');
    this.router.navigate([path]);
  }

  openCalendar(): void  { this.goAsHost('/hosting/calendar'); }
  openListings(): void  { this.goAsHost('/hosting/listings'); }
  openHostHome(): void  { this.goAsHost('/hosting'); }
}
