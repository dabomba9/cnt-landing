import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPoi, POI_KIND_META, POI_KIND_PHOTO } from '@cnt-workspace/data-access';
import { FocusTrapDirective } from '@cnt-workspace/ui';

/**
 * Modal dialog for a public POI (dump station / rest area / propane / water).
 * Click outside or Escape closes; the focus-trap directive handles keyboard.
 *
 * Layout:
 *   header  — kind pill + name + close
 *   photos  — 1–3 thumbnails (or kind-glyph placeholder)
 *   address + cost callout + Get Directions button
 *   amenity chips
 *   notes
 *   "Last verified" footer
 */
@Component({
  selector: 'cnt-poi-modal',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  template: `
    @if (poi) {
      <div class="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog" aria-modal="true" [attr.aria-labelledby]="'poi-title-' + poi.id">
        <div class="absolute inset-0 bg-dark-text/60 backdrop-blur-sm" (click)="close.emit()"></div>
        <div cntFocusTrap (escape)="close.emit()"
          class="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.2)] max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] overflow-y-auto">

          <!-- Mobile pull handle -->
          <div class="sm:hidden pt-2 pb-1 flex justify-center" aria-hidden="true">
            <span class="block w-10 h-1 rounded-full bg-dark-text/15"></span>
          </div>

          <!-- Header -->
          <div class="flex items-start justify-between gap-3 px-5 md:px-6 pt-4 pb-3 border-b border-dark-text/8">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <span class="shrink-0 w-10 h-10 rounded-full inline-flex items-center justify-center"
                [style.background]="POI_KIND_META[poi.kind].color + '22'"
                [style.color]="POI_KIND_META[poi.kind].color">
                <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">{{ POI_KIND_META[poi.kind].icon }}</span>
              </span>
              <div class="min-w-0">
                <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold"
                  [style.color]="POI_KIND_META[poi.kind].color">{{ POI_KIND_META[poi.kind].label }}</div>
                <h2 [id]="'poi-title-' + poi.id" class="font-headline font-bold text-dark-text text-lg md:text-xl leading-tight">{{ poi.name }}</h2>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" (click)="onFavoriteClick()"
                [attr.aria-label]="isFavorite ? 'Remove from favorites' : 'Save to favorites'"
                [attr.aria-pressed]="isFavorite"
                class="w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-cream/60 transition-colors">
                <span class="material-symbols-outlined text-xl"
                  [class.text-trinidad]="isFavorite"
                  [class.text-muted-text]="!isFavorite"
                  [style.font-variation-settings]="isFavorite ? &quot;'FILL' 1&quot; : &quot;'FILL' 0&quot;">favorite</span>
              </button>
              <button type="button" (click)="close.emit()" aria-label="Close"
                class="w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-cream/60 transition-colors">
                <span class="material-symbols-outlined text-xl text-muted-text">close</span>
              </button>
            </div>
          </div>

          <div class="px-5 md:px-6 py-4 space-y-4">

            <!-- Photo gallery / placeholder. Falls back to per-kind stock image, then glyph. -->
            @if (poi.photos.length > 0) {
              <div class="grid grid-cols-3 gap-2">
                @for (src of poi.photos.slice(0, 3); track src) {
                  <img [src]="src" [alt]="poi.name" class="w-full h-24 object-cover rounded-lg">
                }
              </div>
            } @else if (kindPhoto) {
              <img [src]="kindPhoto" [alt]="POI_KIND_META[poi.kind].label" class="w-full h-44 object-cover rounded-xl">
            } @else {
              <div class="aspect-[3/1] rounded-xl flex items-center justify-center"
                [style.background]="POI_KIND_META[poi.kind].color + '14'">
                <span class="material-symbols-outlined text-5xl" style="font-variation-settings: 'FILL' 1;"
                  [style.color]="POI_KIND_META[poi.kind].color">{{ POI_KIND_META[poi.kind].icon }}</span>
              </div>
            }

            <!-- Address + cost + directions -->
            <div class="space-y-3">
              <div class="flex items-start gap-2 text-sm text-dark-text font-body">
                <span class="material-symbols-outlined text-base text-muted-text shrink-0 mt-0.5">location_on</span>
                <span class="flex-1">{{ poi.address }}</span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-bold"
                  [ngClass]="costClass">
                  <span class="material-symbols-outlined text-[14px]">{{ costIcon }}</span>
                  {{ costLabel }}
                </span>
                @if (poi.hours) {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream border border-dark-text/10 text-dark-text text-xs font-body">
                    <span class="material-symbols-outlined text-[14px] text-muted-text">schedule</span>
                    {{ poi.hours }}
                  </span>
                }
              </div>

              <a [href]="directionsHref" target="_blank" rel="noopener"
                class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_8px_20px_rgba(227,83,13,0.25)]">
                <span class="material-symbols-outlined text-base">directions</span>
                Get directions
              </a>
            </div>

            <!-- Amenities chips -->
            @if (poi.amenities.length > 0 || poi.maxRigLength || poi.cellSignal) {
              <div class="pt-4 border-t border-dark-text/8">
                <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2">Details</div>
                <div class="flex flex-wrap gap-1.5">
                  @if (poi.maxRigLength) {
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream/60 border border-dark-text/10 text-[0.65rem] uppercase tracking-[0.1em] font-button font-bold text-dark-text">
                      <span class="material-symbols-outlined text-[12px]">straighten</span>
                      Up to {{ poi.maxRigLength }}ft
                    </span>
                  }
                  @if (poi.cellSignal) {
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream/60 border border-dark-text/10 text-[0.65rem] uppercase tracking-[0.1em] font-button font-bold text-dark-text">
                      <span class="material-symbols-outlined text-[12px]">signal_cellular_alt</span>
                      {{ poi.cellSignal }}/5 bars
                    </span>
                  }
                  @for (a of poi.amenities; track a) {
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-cream/60 border border-dark-text/10 text-[0.65rem] uppercase tracking-[0.1em] font-button font-bold text-dark-text">
                      {{ amenityLabel(a) }}
                    </span>
                  }
                </div>
              </div>
            }

            <!-- Notes -->
            @if (poi.notes) {
              <p class="text-sm text-dark-text font-body leading-relaxed italic border-l-2 border-trinidad/30 pl-3">{{ poi.notes }}</p>
            }

            <!-- Last verified. Amber chip when >90 days — community data may be out of date. -->
            <div class="pt-3 border-t border-dark-text/8 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold"
              [ngClass]="isStale ? 'text-[#8a5a00]' : 'text-muted-text'">
              <span class="material-symbols-outlined text-[14px]">{{ isStale ? 'schedule' : 'verified' }}</span>
              Last verified {{ verifiedLabel }}
              @if (isStale) {
                <span class="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-gold/30 text-[0.55rem] font-button font-bold normal-case tracking-normal">May be out of date</span>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class PoiModalComponent {
  @Input() poi: IPoi | null = null;
  @Input() isFavorite = false;
  @Output() close = new EventEmitter<void>();
  @Output() favoriteToggle = new EventEmitter<IPoi>();

  POI_KIND_META = POI_KIND_META;

  onFavoriteClick(): void {
    if (this.poi) this.favoriteToggle.emit(this.poi);
  }

  /** Per-kind stock photo fallback when the POI has no `photos[]` of its own. */
  get kindPhoto(): string | null {
    return this.poi ? POI_KIND_PHOTO[this.poi.kind] : null;
  }

  /** True when the POI's last verification was more than 90 days ago. */
  get isStale(): boolean {
    if (!this.poi) return false;
    const t = Date.parse(this.poi.lastVerified);
    if (Number.isNaN(t)) return false;
    return (Date.now() - t) > 90 * 86_400_000;
  }

  get directionsHref(): string {
    if (!this.poi) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${this.poi.lat},${this.poi.lng}`;
  }

  get costLabel(): string {
    if (!this.poi) return '';
    if (this.poi.priceNote) return this.poi.priceNote;
    switch (this.poi.cost) {
      case 'free':            return 'Free';
      case 'paid':            return 'Paid';
      case 'free-with-fuel':  return 'Free with fill-up';
      default:                return 'Cost unknown';
    }
  }

  get costIcon(): string {
    if (!this.poi) return 'paid';
    return this.poi.cost === 'free' ? 'savings' : 'paid';
  }

  get costClass(): string {
    if (!this.poi) return '';
    return this.poi.cost === 'free' || this.poi.cost === 'free-with-fuel'
      ? 'bg-jungle-green/10 text-jungle-green'
      : 'bg-gold/20 text-[#b3760e]';
  }

  get verifiedLabel(): string {
    if (!this.poi) return '';
    try {
      return new Date(this.poi.lastVerified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return this.poi.lastVerified; }
  }

  amenityLabel(amenity: string): string {
    // Pretty-print machine tags: 'potable' → 'Potable', 'rinse-water' → 'Rinse water'
    return amenity.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
