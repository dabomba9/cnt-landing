import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IDraftListing, CancellationTier, CANCELLATION_TIER_META,
} from '@cnt-workspace/data-access';

/** Platform fee + minimum guest fee from the wireframes. */
const HOST_FEE = 5;     // CurbNTurf platform fee per night
const DEPOSIT_HELD = 5; // CurbNTurf cash held back per night (returned to guest on review)

/**
 * Step 3.3 — pricing + cancellation tier. Live take-home math + tier picker.
 */
@Component({
  selector: 'cnt-phase3-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Set your price
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">Price low to start — you can always adjust later.</p>

      <!-- Cancellation tier -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">Cancellation policy</h3>
        <p class="text-xs font-body text-muted-text mb-4">More flexible = more bookings, but more cancellations.</p>
        <div class="space-y-2">
          @for (tier of tiers; track tier) {
            <button type="button" (click)="setTier(tier)"
              [ngClass]="cancellationTier === tier ? 'border-trinidad bg-trinidad/8' : 'border-dark-text/15 bg-white'"
              class="w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors">
              <span class="w-3 h-3 rounded-full mt-1.5 shrink-0"
                [style.background]="meta[tier].color"></span>
              <div class="flex-1">
                <div class="font-body font-bold text-sm text-dark-text">{{ meta[tier].label }}</div>
                <div class="text-xs text-muted-text mt-0.5">{{ meta[tier].summary }}</div>
              </div>
              @if (cancellationTier === tier) {
                <span class="material-symbols-outlined text-base text-trinidad mt-0.5">check</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- Price calculator -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-4">Nightly rate</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-button uppercase tracking-[0.1em] font-bold text-muted-text">Listed price</span>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-trinidad font-bold">$</span>
              <input type="number" min="0" [(ngModel)]="price" name="price" (input)="emit()"
                class="w-full bg-cream/60 border border-dark-text/15 rounded-md pl-7 pr-3 py-2 text-base font-body font-bold text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
            </div>
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">per night</span>
          </label>

          <div class="hidden sm:flex flex-col items-center text-muted-text text-xs font-body">
            <span class="material-symbols-outlined text-base mb-0.5">remove</span>
            <span class="text-center">$\{{ fees }} fees</span>
          </div>

          <div class="rounded-lg bg-jungle-green/8 border border-jungle-green/30 p-3 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-jungle-green mb-1">You take home</div>
            <div class="font-headline font-bold text-jungle-green text-2xl">$\{{ takeHome }}</div>
            <div class="text-[0.6rem] font-body text-muted-text mt-0.5">per night</div>
          </div>
        </div>
        <p class="mt-4 text-xs font-body text-muted-text">
          We charge a $\{{ HOST_FEE }} platform fee + hold \${{ DEPOSIT_HELD }}/night in guest review deposit
          (returned to the guest as CurbNTurf Cash when they review).
        </p>
      </div>
    </div>
  `,
})
export class Phase3PricingComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.price = value?.nightlyPrice ?? 0;
    this.cancellationTier = value?.cancellationTier ?? 'moderate';
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  price = 0;
  cancellationTier: CancellationTier = 'moderate';
  readonly tiers: CancellationTier[] = ['easy-goin', 'moderate', 'strict', 'exclusive'];
  readonly meta = CANCELLATION_TIER_META;
  readonly HOST_FEE = HOST_FEE;
  readonly DEPOSIT_HELD = DEPOSIT_HELD;

  get fees(): number { return HOST_FEE + DEPOSIT_HELD; }
  get takeHome(): number { return Math.max(0, (Number(this.price) || 0) - this.fees); }

  setTier(t: CancellationTier): void { this.cancellationTier = t; this.emit(); }

  emit(): void {
    this.patch.emit({
      nightlyPrice: Number(this.price) || 0,
      cancellationTier: this.cancellationTier,
    });
  }
}
