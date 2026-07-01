import { Component, EventEmitter, Input, Output } from '@angular/core';

import { FocusTrapDirective } from '@cnt-workspace/ui';
import type { IAddOn } from '@cnt-workspace/data-access';

/**
 * Photo-first lightbox for an add-on. Tapping a product thumbnail on the
 * listing detail or in the booking widget opens this so guests can see the
 * full image, description, and unit price before deciding.
 *
 * Read-only — selection is still toggled by the row click underneath.
 */
@Component({
  selector: 'cnt-addon-lightbox',
  standalone: true,
  imports: [FocusTrapDirective],
  template: `
    @if (open && addon) {
      <div class="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="addon-lb-title">
        <div class="absolute inset-0 bg-dark-text/70 backdrop-blur-sm" (click)="close.emit()"></div>
        <div cntFocusTrap (escape)="close.emit()"
          class="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.25)] max-w-md w-full max-h-[92vh] overflow-y-auto">
          @if (addon.photo) {
            <img [src]="addon.photo" [alt]="addon.label" class="w-full aspect-square object-cover rounded-t-3xl sm:rounded-t-2xl">
          }
          <div class="p-6">
            <div class="flex items-start justify-between gap-3 mb-2">
              <h2 id="addon-lb-title" class="font-headline font-bold text-dark-text text-xl tracking-tight">{{ addon.label }}</h2>
              <button type="button" (click)="close.emit()" class="w-9 h-9 -mr-2 -mt-2 rounded-full hover:bg-cream/60 inline-flex items-center justify-center shrink-0" aria-label="Close">
                <span class="material-symbols-outlined text-lg text-muted-text">close</span>
              </button>
            </div>
            <div class="flex items-baseline gap-1 mb-4">
              <span class="font-headline font-bold text-trinidad text-2xl">\${{ addon.price }}</span>
              <span class="text-sm font-body text-muted-text">/ {{ unitLabel }}</span>
            </div>
            @if (addon.description) {
              <p class="text-sm font-body text-dark-text leading-relaxed">{{ addon.description }}</p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class AddonLightboxComponent {
  @Input() open = false;
  @Input() addon: IAddOn | null = null;
  @Output() close = new EventEmitter<void>();

  get unitLabel(): string {
    switch (this.addon?.unit) {
      case 'per night':  return 'night';
      case 'per person': return 'person';
      case 'per unit':   return 'unit';
      default:           return 'stay';
    }
  }
}
