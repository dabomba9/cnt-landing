import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IDraftListing, CancellationTier, CANCELLATION_TIER_META,
  computeServiceFee, computeHostTakeHome,
  SERVICE_FEE_RATE, MINIMUM_FEE_PER_NIGHT, FEEDBACK_INCENTIVE_PER_NIGHT,
  MIN_VIABLE_LISTING_PRICE,
} from '@cnt-workspace/data-access';

interface ISample {
  nights: number;
  guestPays: number;
  takeHome: number;
}

/**
 * Step 3.3 — pricing + cancellation tier.
 *
 * All-in pricing model: the host's listed price IS what guests pay per night.
 * Service fee (15%, min $5/night) and feedback incentive ($5/night, refunds
 * to guest via review) come OUT of that listed price. Host take-home is the
 * residual, clamped at $0.
 *
 *   serviceFee/night   = max(listedPrice × 15%, $5)
 *   feedback/night     = $5
 *   takeHome/night     = max(0, listedPrice − serviceFee/night − $5)
 *   guestPays/night    = listedPrice
 *
 * Below $10/night listed, the fee + incentive exceed the listed price and
 * take-home clamps at $0 — host sees a soft warning.
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
        <div class="space-y-2" role="radiogroup" aria-label="Cancellation policy">
          @for (tier of tiers; track tier) {
            <button type="button" (click)="setTier(tier)" role="radio"
              [attr.aria-checked]="cancellationTier === tier"
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

      <!-- Pricing card -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-5">Nightly rate</h3>

        <!-- Panel 1: Big listed-price input -->
        <div class="text-center mb-6">
          <label class="inline-flex flex-col items-center gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.14em] font-button font-bold text-muted-text">Your listed price</span>
            <div class="relative inline-flex items-baseline">
              <span class="absolute -left-5 top-1/2 -translate-y-1/2 text-trinidad font-headline font-bold text-2xl">$</span>
              <input type="number" [min]="minViable" [(ngModel)]="price" name="price" (input)="emit()"
                class="w-32 text-center bg-transparent border-b-2 border-dark-text/15 focus:border-trinidad font-headline font-bold text-dark-text text-4xl pb-1 focus:outline-none transition-colors"
                placeholder="0">
            </div>
            <span class="text-[0.65rem] font-body text-muted-text">per night · what guests pay</span>
          </label>
        </div>

        <!-- Below-floor warning -->
        @if (belowMinimum) {
          <div class="rounded-xl border border-trinidad/30 bg-trinidad/8 p-3 mb-5 flex items-start gap-2">
            <span class="material-symbols-outlined text-base text-trinidad mt-0.5">warning</span>
            <div class="text-xs font-body text-dark-text leading-snug">
              <strong>Your take-home is $0 at this price.</strong>
              Our \${{ minPerNight }}/night service fee + \${{ feedbackPerNight }}/night feedback incentive add up to \${{ minViable }}/night.
              List at <strong>\${{ minViable }}/night</strong> or more to start earning.
            </div>
          </div>
        }

        <!-- Panel 2: Math strip (you list → guests pay → you take home) -->
        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3 mb-6">
          <!-- You list -->
          <div class="rounded-xl border-2 border-trinidad/30 bg-trinidad/5 p-4 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad mb-1">You list</div>
            <div class="font-headline font-bold text-dark-text text-xl leading-tight">\${{ priceNum }}<span class="text-xs text-muted-text font-body font-normal">/night</span></div>
          </div>
          <!-- Arrow -->
          <div class="hidden md:flex items-center justify-center text-muted-text">
            <span class="material-symbols-outlined text-2xl">arrow_forward</span>
          </div>
          <!-- Guests pay -->
          <div class="rounded-xl bg-cream/60 border border-dark-text/10 p-4 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-1">Guests pay</div>
            <div class="font-headline font-bold text-dark-text text-xl leading-tight">\${{ priceNum }}<span class="text-xs text-muted-text font-body font-normal">/night</span></div>
            <div class="text-[0.65rem] text-muted-text font-body mt-1.5">All-in · no fees added</div>
          </div>
          <!-- Equals -->
          <div class="hidden md:flex items-center justify-center text-muted-text">
            <span class="material-symbols-outlined text-2xl">drag_handle</span>
          </div>
          <!-- You take home -->
          <div class="rounded-xl bg-jungle-green/10 border-2 border-jungle-green/40 p-4 text-center">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-jungle-green mb-1">You take home</div>
            <div class="font-headline font-bold text-jungle-green text-xl leading-tight">\${{ takeHomePerNight }}<span class="text-xs text-muted-text font-body font-normal">/night</span></div>
            <div class="text-[0.6rem] text-muted-text font-body mt-1.5">
              after \${{ serviceFeePerNight }} fee {{ serviceFeeNote }} + \${{ feedbackPerNight }} incentive
            </div>
          </div>
        </div>

        <!-- Panel 3: Sample totals -->
        <div class="rounded-md border border-dark-text/10 overflow-hidden">
          <div class="grid grid-cols-3 bg-cream/40 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text px-4 py-2">
            <span>Stay length</span>
            <span class="text-right">Guests pay</span>
            <span class="text-right">You earn</span>
          </div>
          @for (s of samples; track s.nights) {
            <div class="grid grid-cols-3 px-4 py-2.5 text-sm font-body"
              [ngClass]="$first ? '' : 'border-t border-dark-text/8'">
              <span class="text-dark-text">{{ s.nights }} {{ s.nights === 1 ? 'night' : 'nights' }}</span>
              <span class="text-right text-dark-text">\${{ s.guestPays }}</span>
              <span class="text-right font-bold text-jungle-green">\${{ s.takeHome }}</span>
            </div>
          }
        </div>

        <!-- Footer copy -->
        <p class="mt-5 text-xs font-body text-muted-text leading-relaxed">
          Guests pay one clean number per night — your listed price. We cover our
          <strong>{{ percentLabel }} service fee</strong> (minimum <strong>\${{ minPerNight }}/night</strong>) and the
          <strong>\${{ feedbackPerNight }}/night feedback incentive</strong> out of that.
          <strong class="text-jungle-green">You take home what's left.</strong>
          The feedback incentive refunds to guests as <strong>CurbNTurf Cash</strong> when they leave a review.
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
  readonly minPerNight = MINIMUM_FEE_PER_NIGHT;
  readonly feedbackPerNight = FEEDBACK_INCENTIVE_PER_NIGHT;
  readonly minViable = MIN_VIABLE_LISTING_PRICE;
  readonly percentLabel = `${Math.round(SERVICE_FEE_RATE * 100)}%`;
  readonly sampleNights = [1, 3, 7];

  get priceNum(): number { return Number(this.price) || 0; }

  /** Per-night service fee — uses the same helper as the booking flow. */
  get serviceFeePerNight(): number {
    return computeServiceFee(this.priceNum, 1);
  }

  /** True when the $5/night floor is the binding constraint (price ≤ $33.33). */
  get serviceFeeIsFloor(): boolean {
    return this.priceNum * SERVICE_FEE_RATE < MINIMUM_FEE_PER_NIGHT;
  }

  get serviceFeeNote(): string {
    return this.serviceFeeIsFloor ? '(min)' : `(${this.percentLabel})`;
  }

  /** Per-night host take-home, clamped at $0. */
  get takeHomePerNight(): number {
    return computeHostTakeHome(this.priceNum, 1);
  }

  /** True when the listed price can't cover both the fee floor + incentive. */
  get belowMinimum(): boolean {
    return this.priceNum > 0 && this.priceNum < MIN_VIABLE_LISTING_PRICE;
  }

  /** Sample totals row — common stay lengths. */
  get samples(): ISample[] {
    return this.sampleNights.map(n => ({
      nights: n,
      guestPays: this.priceNum * n,
      takeHome: computeHostTakeHome(this.priceNum, n),
    }));
  }

  setTier(t: CancellationTier): void { this.cancellationTier = t; this.emit(); }

  emit(): void {
    this.patch.emit({
      nightlyPrice: this.priceNum,
      cancellationTier: this.cancellationTier,
    });
  }
}
