import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IDraftListing, RvType, RV_TYPES, TentMode,
} from '@cnt-workspace/data-access';

/**
 * Step 1.5 — vehicle types. Reuses the same `RvType` union + `RV_TYPES`
 * meta as /search and the booking flow. Adds:
 *   - Tent allowance row: "Tents allowed" toggle + "Tents only (no RVs)"
 *     follow-up. Tents-only disables + greys the RV grid.
 *   - Checkmark badge on each selected RV tile so selection is unambiguous.
 *   - "Select all" / "Clear" shortcuts (existing).
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

      <!-- Tent allowance row -->
      <div class="rounded-2xl border border-dark-text/10 bg-cream/30 p-4 mb-5">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-base text-jungle-green">camping</span>
            <span class="text-sm font-body font-bold text-dark-text">Tent allowance</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" (click)="toggleTentsAllowed()"
              [attr.aria-pressed]="!!tentMode"
              [ngClass]="tentMode
                ? 'border-trinidad bg-trinidad/10 text-trinidad'
                : 'border-dark-text/15 bg-white text-dark-text hover:border-trinidad/40'"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-body font-bold transition-colors">
              @if (tentMode) {
                <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              }
              Tents allowed
            </button>
            @if (tentMode) {
              <button type="button" (click)="toggleTentsOnly()"
                [attr.aria-pressed]="tentMode === 'tents-only'"
                [ngClass]="tentMode === 'tents-only'
                  ? 'border-trinidad bg-trinidad/10 text-trinidad'
                  : 'border-dark-text/15 bg-white text-dark-text hover:border-trinidad/40'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-body font-bold transition-colors">
                @if (tentMode === 'tents-only') {
                  <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                }
                Tents only (no RVs)
              </button>
            }
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 mb-5">
        <button type="button" (click)="selectAll()"
          [disabled]="rvLocked"
          class="px-3 py-1.5 rounded-full bg-jungle-green text-white text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed">
          Select all
        </button>
        <button type="button" (click)="clearAll()"
          [disabled]="rvLocked"
          class="px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text disabled:opacity-40 disabled:cursor-not-allowed">
          Clear
        </button>
      </div>

      @if (rvLocked) {
        <p class="mb-3 text-xs font-body text-trinidad inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-base">lock</span>
          RVs aren't accepted at this site (tents-only mode).
        </p>
      }

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        [class.opacity-50]="rvLocked"
        [class.pointer-events-none]="rvLocked">
        @for (opt of options; track opt.id) {
          <button type="button" (click)="toggle(opt.id)"
            [attr.aria-pressed]="isSelected(opt.id)"
            [disabled]="rvLocked"
            [ngClass]="isSelected(opt.id)
              ? 'border-trinidad bg-trinidad/8 text-trinidad shadow-[0_4px_12px_rgba(227,83,13,0.15)]'
              : 'border-dark-text/10 bg-white text-dark-text hover:border-trinidad/40'"
            class="relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all disabled:cursor-not-allowed">
            @if (isSelected(opt.id)) {
              <span class="absolute top-2 right-2 material-symbols-outlined text-lg text-trinidad" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            }
            <img [src]="opt.image" [alt]="opt.label" class="w-full h-20 object-contain">
            <span class="text-xs font-body font-bold uppercase tracking-[0.08em]">{{ opt.label }}</span>
          </button>
        }
      </div>

      @if (totalAccepted > 0) {
        <p class="mt-6 text-xs font-body text-muted-text text-center">
          @if (tentMode === 'tents-only') {
            Tents only
          } @else {
            {{ selected.size }} of {{ options.length }} rig{{ selected.size === 1 ? '' : 's' }} selected
            @if (tentMode === 'allowed') { · tents allowed }
          }
        </p>
      }
    </div>
  `,
})
export class Phase1VehiclesComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.selected = new Set(value?.vehicleTypes ?? []);
    this.tentMode = value?.tentMode;
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  selected = new Set<RvType>();
  tentMode?: TentMode;
  readonly options = RV_TYPES;

  /** True when RV picks are disabled — the grid is greyed out + clicks ignored. */
  get rvLocked(): boolean { return this.tentMode === 'tents-only'; }

  /** Total "things accepted" for the bottom caption — counts the tent mode too. */
  get totalAccepted(): number {
    if (this.tentMode === 'tents-only') return 1;
    return this.selected.size + (this.tentMode === 'allowed' ? 1 : 0);
  }

  isSelected(t: RvType): boolean { return this.selected.has(t); }

  toggle(t: RvType): void {
    if (this.rvLocked) return;
    const next = new Set(this.selected);
    if (next.has(t)) next.delete(t); else next.add(t);
    this.selected = next;
    this.emit();
  }

  selectAll(): void {
    if (this.rvLocked) return;
    this.selected = new Set(this.options.map(o => o.id));
    this.emit();
  }

  clearAll(): void {
    if (this.rvLocked) return;
    this.selected = new Set();
    this.emit();
  }

  /** Top pill — toggles tents on/off. Going off also exits tents-only. */
  toggleTentsAllowed(): void {
    this.tentMode = this.tentMode ? undefined : 'allowed';
    this.emit();
  }

  /** Second pill — switches into / out of tents-only. When entering, the
   * RV multi-select is cleared so the host can't accidentally keep stale picks. */
  toggleTentsOnly(): void {
    if (this.tentMode === 'tents-only') {
      this.tentMode = 'allowed';
    } else {
      this.tentMode = 'tents-only';
      this.selected = new Set();
    }
    this.emit();
  }

  private emit(): void {
    this.patch.emit({
      vehicleTypes: [...this.selected],
      tentMode: this.tentMode,
    });
  }
}
