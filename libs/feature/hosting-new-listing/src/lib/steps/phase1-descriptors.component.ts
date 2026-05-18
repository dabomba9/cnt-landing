import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IDraftListing, PropertyDescriptor, PROPERTY_DESCRIPTOR_META,
} from '@cnt-workspace/data-access';

/**
 * Step 1.1 — descriptor tiles (multi-select). Drives the listing's category
 * (via `inferCategory` in the draft service) and powers downstream search filters.
 */
@Component({
  selector: 'cnt-phase1-descriptors',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Which best describes your property?
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">Pick as many as apply. Guests will see this on your listing.</p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (key of keys; track key) {
          <button type="button" (click)="toggle(key)"
            [attr.aria-pressed]="isSelected(key)"
            [ngClass]="isSelected(key)
              ? 'border-trinidad bg-trinidad/8 text-trinidad shadow-[0_4px_12px_rgba(227,83,13,0.15)]'
              : 'border-dark-text/10 bg-white text-dark-text hover:border-trinidad/40'"
            class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-sm font-body font-bold">
            <span class="material-symbols-outlined text-2xl"
              [class.text-trinidad]="isSelected(key)"
              [style.font-variation-settings]="isSelected(key) ? &quot;'FILL' 1&quot; : &quot;'FILL' 0&quot;">{{ meta[key].icon }}</span>
            {{ meta[key].label }}
          </button>
        }
      </div>

      @if (selected.size > 0) {
        <p class="mt-6 text-xs font-body text-muted-text text-center">
          {{ selected.size }} selected
        </p>
      }
    </div>
  `,
})
export class Phase1DescriptorsComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.selected = new Set(value?.descriptors ?? []);
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  selected = new Set<PropertyDescriptor>();
  readonly meta = PROPERTY_DESCRIPTOR_META;
  readonly keys = Object.keys(PROPERTY_DESCRIPTOR_META) as PropertyDescriptor[];

  isSelected(key: PropertyDescriptor): boolean { return this.selected.has(key); }

  toggle(key: PropertyDescriptor): void {
    const next = new Set(this.selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    this.selected = next;
    this.patch.emit({ descriptors: [...next] });
  }
}
