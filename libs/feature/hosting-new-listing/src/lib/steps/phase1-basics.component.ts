import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDraftListing } from '@cnt-workspace/data-access';

/**
 * Step 1.3 — site basics. RV access (pull-through / back-in), max rig dimensions,
 * guest capacity, accessibility toggle.
 */
@Component({
  selector: 'cnt-phase1-basics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Site basics
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">Helps guests know if their rig will fit.</p>

      <!-- Access -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">How will guests access the site?</h3>
        <p class="text-xs font-body text-muted-text mb-4">Pick all that apply.</p>
        <div class="grid grid-cols-2 gap-3">
          <button type="button" (click)="toggleAccess('pullThrough')"
            [ngClass]="pullThrough ? 'border-trinidad bg-trinidad/8 text-trinidad' : 'border-dark-text/15 bg-white text-dark-text'"
            class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-body font-bold transition-colors">
            <span class="material-symbols-outlined text-base">trending_flat</span>
            Pull-through
          </button>
          <button type="button" (click)="toggleAccess('backIn')"
            [ngClass]="backIn ? 'border-trinidad bg-trinidad/8 text-trinidad' : 'border-dark-text/15 bg-white text-dark-text'"
            class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-body font-bold transition-colors">
            <span class="material-symbols-outlined text-base">undo</span>
            Back-in
          </button>
        </div>
      </div>

      <!-- Max rig size -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">Max rig size</h3>
        <p class="text-xs font-body text-muted-text mb-4">The biggest RV that fits comfortably.</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Length (ft)</span>
            <input type="number" min="0" [(ngModel)]="rigLength" name="length" (blur)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Width (ft)</span>
            <input type="number" min="0" [(ngModel)]="rigWidth" name="width" (blur)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Height (ft)</span>
            <input type="number" min="0" [(ngModel)]="rigHeight" name="height" (blur)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
        </div>
      </div>

      <!-- Capacity + wheelchair -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 flex flex-col sm:flex-row sm:items-end gap-5">
        <label class="flex flex-col gap-1.5 flex-1">
          <span class="text-xs font-button uppercase tracking-[0.1em] font-bold text-muted-text">Max guests</span>
          <input type="number" min="1" max="20" [(ngModel)]="capacity" name="capacity" (blur)="emit()"
            class="w-32 bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" [(ngModel)]="wheelchair" name="wheelchair" (change)="emit()"
            class="w-4 h-4 accent-trinidad">
          <span class="text-sm font-body text-dark-text">Wheelchair accessible</span>
        </label>
      </div>
    </div>
  `,
})
export class Phase1BasicsComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.pullThrough = !!value?.access?.pullThrough;
    this.backIn = !!value?.access?.backIn;
    this.rigLength = value?.maxRig?.length;
    this.rigWidth = value?.maxRig?.width;
    this.rigHeight = value?.maxRig?.height;
    this.capacity = value?.guestCapacity;
    this.wheelchair = !!value?.wheelchairAccessible;
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  pullThrough = false;
  backIn = false;
  rigLength?: number;
  rigWidth?: number;
  rigHeight?: number;
  capacity?: number;
  wheelchair = false;

  toggleAccess(field: 'pullThrough' | 'backIn'): void {
    this[field] = !this[field];
    this.emit();
  }

  emit(): void {
    this.patch.emit({
      access: { pullThrough: this.pullThrough, backIn: this.backIn },
      maxRig: {
        length: this.rigLength ?? 0,
        width: this.rigWidth ?? 0,
        height: this.rigHeight ?? 0,
      },
      guestCapacity: this.capacity,
      wheelchairAccessible: this.wheelchair,
    });
  }
}
