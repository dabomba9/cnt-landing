import { Component, Inject, Input, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
  IDraftListing, HostListingDraftService, ToastService,
  CANCELLATION_TIER_META, PROPERTY_DESCRIPTOR_META, AMENITY_LABELS, RV_TYPES,
} from '@cnt-workspace/data-access';

/**
 * Step 3.4 — review + publish. Shows a summary of the draft, surfaces any
 * remaining required-field gaps, and calls `HostListingDraftService.publish()`
 * to mint a real IPrivateListing in MOCK_LISTINGS.
 */
@Component({
  selector: 'cnt-phase3-review',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Review your listing
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">A preview of what guests will see. Publish when you're ready.</p>

      @if (!draft) {
        <div class="rounded-2xl border border-dark-text/10 bg-white p-8 text-center text-muted-text font-body">
          Nothing to review yet — head back and fill in the earlier steps.
        </div>
      } @else {
        <!-- Hero preview card -->
        <div class="rounded-2xl overflow-hidden border border-dark-text/10 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)] mb-6">
          <div class="aspect-[16/9] bg-cream/40 relative overflow-hidden">
            @if (draft.photos && draft.photos.length > 0) {
              <img [src]="draft.photos[0]" alt="" class="w-full h-full object-cover">
            } @else {
              <div class="w-full h-full inline-flex items-center justify-center text-muted-text">
                <span class="material-symbols-outlined text-4xl">image</span>
              </div>
            }
          </div>
          <div class="p-5 md:p-6">
            <h3 class="font-headline font-bold text-dark-text text-2xl mb-1">
              {{ draft.title || 'Untitled listing' }}
            </h3>
            <p class="text-sm font-body text-muted-text mb-3">
              {{ draft.address?.city }}@if (draft.address?.state) {, {{ draft.address?.state }}}
            </p>
            <p class="text-sm font-body text-dark-text leading-relaxed line-clamp-3">
              {{ draft.description }}
            </p>
            <div class="mt-4 flex items-baseline justify-between">
              <div>
                <span class="font-headline font-bold text-trinidad text-2xl">$\{{ draft.nightlyPrice ?? 0 }}</span>
                <span class="text-sm font-body text-muted-text"> / night</span>
              </div>
              <span class="text-xs font-button uppercase tracking-[0.12em] font-bold text-jungle-green">
                {{ draft.bookability === 'instant' ? 'Instant Book' : 'Request to book' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Fact strip -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div class="rounded-xl bg-white border border-dark-text/10 p-3 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-1">Type</div>
            <div class="text-xs font-body font-bold text-dark-text">
              {{ firstDescriptorLabel || '—' }}
            </div>
          </div>
          <div class="rounded-xl bg-white border border-dark-text/10 p-3 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-1">Photos</div>
            <div class="text-xs font-body font-bold text-dark-text">{{ draft.photos?.length ?? 0 }}</div>
          </div>
          <div class="rounded-xl bg-white border border-dark-text/10 p-3 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-1">Amenities</div>
            <div class="text-xs font-body font-bold text-dark-text">{{ draft.amenities?.length ?? 0 }}</div>
          </div>
          <div class="rounded-xl bg-white border border-dark-text/10 p-3 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-1">Cancellation</div>
            <div class="text-xs font-body font-bold text-dark-text">
              {{ draft.cancellationTier ? cancellationMeta[draft.cancellationTier].label : '—' }}
            </div>
          </div>
        </div>

        @if (missing.length > 0) {
          <div class="rounded-2xl border border-trinidad/30 bg-trinidad/8 p-4 mb-6">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-trinidad mt-0.5">warning</span>
              <div class="flex-1">
                <div class="font-body font-bold text-dark-text text-sm mb-1">Before you can publish:</div>
                <ul class="text-xs font-body text-dark-text space-y-0.5">
                  @for (m of missing; track m) {
                    <li>• {{ m }}</li>
                  }
                </ul>
              </div>
            </div>
          </div>
        }

        <div class="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button type="button" (click)="publish()"
            [disabled]="missing.length > 0 || publishing"
            class="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_28px_rgba(227,83,13,0.3)] transition-opacity">
            @if (publishing) {
              <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Publishing…
            } @else {
              <span class="material-symbols-outlined text-base">rocket_launch</span>
              Publish my listing
            }
          </button>
        </div>
      }
    </div>
  `,
})
export class Phase3ReviewComponent {
  @Input() draft: IDraftListing | null = null;

  publishing = false;
  readonly cancellationMeta = CANCELLATION_TIER_META;
  readonly descriptorMeta = PROPERTY_DESCRIPTOR_META;
  readonly amenityLabels = AMENITY_LABELS;
  readonly vehicleMeta = RV_TYPES;

  constructor(
    private drafts: HostListingDraftService,
    private toasts: ToastService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  get firstDescriptorLabel(): string {
    const first = this.draft?.descriptors?.[0];
    return first ? this.descriptorMeta[first].label : '';
  }

  get missing(): string[] {
    return this.draft ? this.drafts.missingRequiredFields(this.draft) : [];
  }

  publish(): void {
    if (!this.draft || this.publishing || this.missing.length > 0) return;
    this.publishing = true;
    try {
      const listing = this.drafts.publish();
      this.toasts.success('Your listing is live!');
      // Navigate after a tick so the toast has time to render.
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.router.navigate(['/listing'], { queryParams: { id: listing.id } }), 400);
      }
    } catch (err) {
      this.publishing = false;
      this.toasts.error(err instanceof Error ? err.message : 'Publish failed.');
    }
  }
}
