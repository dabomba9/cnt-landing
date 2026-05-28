import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import {
  HostListingDraftService, IDraftListing,
  SeoService, ToastService,
} from '@cnt-workspace/data-access';
import { Phase3AddonsComponent } from './steps/phase3-addons.component';

/**
 * Standalone add-ons editor — mounts Phase3AddonsComponent outside the
 * full hosting wizard so existing hosts can add or update their add-ons
 * without re-walking every wizard step.
 *
 * Route: /hosting/listings/:id/addons (authGuard + editOwnerGuard).
 * Loads the listing snapshot via HostListingDraftService.loadForEdit(id),
 * delegates edits to Phase3AddonsComponent, and persists each patch
 * through the same saveDraft() path the wizard uses — so the standalone
 * surface stays bit-identical to what the wizard writes.
 */
@Component({
  selector: 'cnt-hosting-addons-standalone',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, Phase3AddonsComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream">
      <section class="px-[2%] py-6 md:py-10">
        <div class="max-w-[80rem] mx-auto px-4 md:px-8">

          <!-- Header -->
          <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <a routerLink="/hosting" class="inline-flex items-center gap-1 text-xs font-button font-bold uppercase tracking-[0.12em] text-muted-text hover:text-trinidad transition-colors mb-2">
                <span class="material-symbols-outlined text-base">arrow_back</span>
                Back to dashboard
              </a>
              <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block">Add-ons</span>
              <h1 class="font-headline font-bold text-dark-text text-3xl md:text-4xl leading-tight">{{ draft?.title || 'Edit add-ons' }}</h1>
              <p class="text-sm text-muted-text font-body mt-1">Add bookable extras like firewood, late check-out, or pet fees. Changes save automatically.</p>
              <p class="text-xs text-muted-text font-body mt-1">Adding the same add-on to multiple listings? <a routerLink="/hosting/addons" class="text-trinidad font-button font-bold uppercase tracking-[0.1em] text-[0.65rem] hover:underline ml-1">Try the bulk builder →</a></p>
            </div>
            <button type="button" (click)="done()"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_8px_20px_rgba(227,83,13,0.2)] shrink-0">
              <span class="material-symbols-outlined text-base">check</span>
              Done
            </button>
          </div>

          @if (!draft) {
            <div class="bg-white rounded-2xl border border-dark-text/8 p-10 text-center">
              <span class="material-symbols-outlined text-3xl text-muted-text">search_off</span>
              <h2 class="font-headline font-bold text-2xl mt-3 mb-2 text-dark-text">Listing not found</h2>
              <a routerLink="/hosting" class="text-trinidad text-sm font-button font-bold uppercase tracking-[0.12em] hover:underline">← Back to dashboard</a>
            </div>
          } @else {
            <cnt-phase3-addons [draft]="draft" (patch)="onPatch($event)"></cnt-phase3-addons>
          }
        </div>
      </section>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class HostingAddonsStandaloneComponent implements OnInit, OnDestroy {
  draft: IDraftListing | null = null;
  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private drafts: HostListingDraftService,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.subs.push(this.route.paramMap.subscribe(p => {
      const idRaw = p.get('id');
      const id = idRaw ? Number(idRaw) : NaN;
      if (!Number.isFinite(id)) {
        this.toasts.error('Listing not found.');
        this.router.navigate(['/hosting']);
        return;
      }
      const loaded = this.drafts.loadForEdit(id);
      if (!loaded) {
        this.toasts.error('Listing not found — it may have been removed.');
        this.router.navigate(['/hosting']);
        return;
      }
    }));
    this.seo.update({
      title: 'Edit add-ons — CurbNTurf',
      description: 'Add bookable extras to your CurbNTurf listing.',
      url: '/hosting/listings/addons',
      robots: 'noindex, nofollow',
    });
    this.subs.push(this.drafts.draft$.subscribe(d => { this.draft = d; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  /** Phase3AddonsComponent emits a full add-ons patch on every row change —
   *  hand it straight to the draft service to persist (snapshots in edit mode). */
  onPatch(patch: Partial<IDraftListing>): void {
    this.drafts.saveDraft(patch);
  }

  done(): void {
    this.toasts.success('Add-ons saved.');
    this.router.navigate(['/hosting']);
  }
}
