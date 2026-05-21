import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type IDraftListing, isAddressStepValid } from '@cnt-workspace/data-access';

/**
 * Phase landing screen — shown before the user starts a phase, and as a
 * "you're here" summary if they jump back. Lists the sub-steps with
 * completion indicators and a single Start/Continue CTA.
 */
@Component({
  selector: 'cnt-phase-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-center pt-4 md:pt-8">
      <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold mb-3 block">
        Phase {{ phase }} of 3
      </span>
      <h1 class="font-headline font-bold text-dark-text text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight mb-4">
        {{ phaseLabel }}
      </h1>
      <p class="text-base md:text-lg font-body text-muted-text leading-relaxed max-w-xl mx-auto mb-10">
        {{ description }}
      </p>

      <!-- Step list — each row is a button that jumps to that step. -->
      <ol class="text-left max-w-md mx-auto mb-10 space-y-3">
        @for (step of steps; track step; let i = $index) {
          <li>
            <button type="button" (click)="jump.emit(i)"
              class="w-full flex items-center gap-3 p-3 rounded-lg bg-white border border-dark-text/8 hover:border-trinidad hover:bg-trinidad/5 transition-colors text-left">
              <span class="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 text-[0.7rem] font-button font-bold"
                [ngClass]="completed[i] ? 'bg-jungle-green text-white' : 'bg-dark-text/8 text-muted-text'">
                @if (completed[i]) {
                  <span class="material-symbols-outlined text-[14px]">check</span>
                } @else {
                  {{ i + 1 }}
                }
              </span>
              <span class="font-body text-sm text-dark-text flex-1">{{ step }}</span>
              <span class="material-symbols-outlined text-base text-muted-text shrink-0">arrow_forward</span>
            </button>
          </li>
        }
      </ol>

      <button type="button" (click)="start.emit()"
        class="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_12px_28px_rgba(227,83,13,0.3)] transition-opacity">
        {{ hasProgress ? 'Continue' : 'Start' }}
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </button>
    </div>
  `,
})
export class PhaseHubComponent {
  @Input({ required: true }) phase!: 1 | 2 | 3;
  @Input({ required: true }) phaseLabel!: string;
  @Input({ required: true }) steps!: string[];
  @Input() draft: IDraftListing | null = null;
  @Output() start = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  /** Emitted with the step index when the host clicks a specific step row. */
  @Output() jump = new EventEmitter<number>();

  /** Completion bitmap for each step in the current phase. Logic per phase below. */
  get completed(): boolean[] {
    const d = this.draft;
    if (!d) return this.steps.map(() => false);
    switch (this.phase) {
      case 1: return [
        !!d.primaryType,
        isAddressStepValid(d),
        typeof d.guestCapacity === 'number' && d.guestCapacity > 0,
        (d.amenities?.length ?? 0) + (d.customAmenities?.length ?? 0) > 0,
        d.tentMode === 'tents-only' || (d.vehicleTypes?.length ?? 0) > 0,
      ];
      case 2: return [
        (d.photos?.length ?? 0) >= 3,
        !!d.title && !!d.description && d.description.length >= 150,
        !!d.visibility?.length && !!d.noiseLevel && !!d.roadConditions?.length,
        true,                                                          // profile photo is optional
      ];
      case 3: return [
        !!d.checkInTime && !!d.checkOutTime && typeof d.minNights === 'number',
        !!d.rules,
        typeof d.nightlyPrice === 'number' && d.nightlyPrice > 0 && !!d.cancellationTier,
        false,                                                         // review = the publish step itself
      ];
    }
  }

  get hasProgress(): boolean {
    return this.completed.some(c => c);
  }

  get description(): string {
    switch (this.phase) {
      case 1: return 'A few quick details about where your land is and what it offers. About 5 minutes.';
      case 2: return 'Photos and a description that help guests see what makes your spot special. About 5 minutes.';
      case 3: return 'Set your check-in rules, pricing, and house rules — then publish.';
    }
  }
}
