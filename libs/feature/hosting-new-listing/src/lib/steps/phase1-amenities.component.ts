import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IDraftListing, Amenity, AMENITY_LABELS, AMENITY_ICONS, AMENITY_GROUP,
} from '@cnt-workspace/data-access';

/**
 * Step 1.4 — amenities multi-select. Reuses the existing `Amenity` union
 * + display dictionaries so the same chips render in /search and /listing.
 */
@Component({
  selector: 'cnt-phase1-amenities',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        What amenities are at your site?
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">Pick everything that applies. Guests rely on this to plan.</p>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        @for (a of options; track a) {
          <button type="button" (click)="toggle(a)"
            [attr.aria-pressed]="isSelected(a)"
            [ngClass]="isSelected(a)
              ? 'border-trinidad bg-trinidad/8 text-trinidad'
              : 'border-dark-text/10 bg-white text-dark-text hover:border-trinidad/40'"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left">
            <span class="material-symbols-outlined text-xl shrink-0"
              [class.text-trinidad]="isSelected(a)"
              [class.text-jungle-green]="!isSelected(a)"
              [style.font-variation-settings]="isSelected(a) ? &quot;'FILL' 1&quot; : &quot;'FILL' 0&quot;">{{ icons[a] }}</span>
            <span class="text-sm font-body font-bold">{{ labels[a] }}</span>
          </button>
        }
      </div>

      @if (selected.size > 0) {
        <p class="mt-6 text-xs font-body text-muted-text text-center">{{ selected.size }} selected</p>
      }
    </div>
  `,
})
export class Phase1AmenitiesComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.selected = new Set(value?.amenities ?? []);
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  selected = new Set<Amenity>();
  readonly options = AMENITY_GROUP;
  readonly labels = AMENITY_LABELS;
  readonly icons = AMENITY_ICONS;

  isSelected(a: Amenity): boolean { return this.selected.has(a); }

  toggle(a: Amenity): void {
    const next = new Set(this.selected);
    if (next.has(a)) next.delete(a); else next.add(a);
    this.selected = next;
    this.patch.emit({ amenities: [...next] });
  }
}
