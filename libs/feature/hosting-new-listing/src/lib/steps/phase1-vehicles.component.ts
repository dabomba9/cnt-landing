import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IDraftListing, RvType, RV_TYPES,
} from '@cnt-workspace/data-access';

/**
 * Step 1.5 — vehicle types. Reuses the same `RvType` union + `RV_TYPES`
 * meta as /search and the booking flow. Includes "Select all" / "Clear"
 * shortcuts since most hosts accept everything.
 */
@Component({
  selector: 'cnt-phase1-vehicles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        What rigs can park here?
      </h2>
      <p class="text-sm font-body text-muted-text mb-6">Pick every type that comfortably fits.</p>

      <div class="flex items-center gap-2 mb-5">
        <button type="button" (click)="selectAll()"
          class="px-3 py-1.5 rounded-full bg-jungle-green text-white text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95">
          Select all
        </button>
        <button type="button" (click)="clearAll()"
          class="px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text">
          Clear
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (opt of options; track opt.id) {
          <button type="button" (click)="toggle(opt.id)"
            [attr.aria-pressed]="isSelected(opt.id)"
            [ngClass]="isSelected(opt.id)
              ? 'border-trinidad bg-trinidad/8 text-trinidad shadow-[0_4px_12px_rgba(227,83,13,0.15)]'
              : 'border-dark-text/10 bg-white text-dark-text hover:border-trinidad/40'"
            class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all">
            <img [src]="opt.image" [alt]="opt.label" class="w-full h-20 object-contain">
            <span class="text-xs font-body font-bold uppercase tracking-[0.08em]">{{ opt.label }}</span>
          </button>
        }
      </div>

      @if (selected.size > 0) {
        <p class="mt-6 text-xs font-body text-muted-text text-center">{{ selected.size }} of {{ options.length }} selected</p>
      }
    </div>
  `,
})
export class Phase1VehiclesComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.selected = new Set(value?.vehicleTypes ?? []);
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  selected = new Set<RvType>();
  readonly options = RV_TYPES;

  isSelected(t: RvType): boolean { return this.selected.has(t); }

  toggle(t: RvType): void {
    const next = new Set(this.selected);
    if (next.has(t)) next.delete(t); else next.add(t);
    this.selected = next;
    this.emit();
  }
  selectAll(): void {
    this.selected = new Set(this.options.map(o => o.id));
    this.emit();
  }
  clearAll(): void {
    this.selected = new Set();
    this.emit();
  }
  private emit(): void {
    this.patch.emit({ vehicleTypes: [...this.selected] });
  }
}
