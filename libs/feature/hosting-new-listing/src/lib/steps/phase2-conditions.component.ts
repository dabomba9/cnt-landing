import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IDraftListing, VisibilityKind, NoiseLevel, RoadCondition,
} from '@cnt-workspace/data-access';

const VISIBILITY_OPTIONS: { key: VisibilityKind; label: string }[] = [
  { key: 'secluded', label: "It's secluded" },
  { key: 'home-visible', label: 'Your home' },
  { key: 'neighbors', label: 'Neighbors' },
  { key: 'other-guests', label: 'Other guests' },
];
const NOISE_OPTIONS: { key: NoiseLevel; label: string }[] = [
  { key: 'silence', label: 'Silence' },
  { key: 'sounds-of-nature', label: 'Sounds of nature' },
  { key: 'periodic', label: 'Periodic sounds' },
  { key: 'constant', label: 'Constant noise' },
];
const ROAD_OPTIONS: { key: RoadCondition; label: string }[] = [
  { key: 'paved', label: 'Paved' },
  { key: 'smooth-gravel', label: 'Smooth gravel' },
  { key: 'poor-gravel', label: 'Poor gravel' },
  { key: 'high-clearance', label: 'High clearance' },
  { key: 'off-road', label: 'Off-road path' },
];

/**
 * Step 2.3 — site conditions. Visibility (multi), noise (single), road
 * conditions (multi), and a hazards toggle with optional note.
 */
@Component({
  selector: 'cnt-phase2-conditions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Tell guests what to expect
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">Surroundings, noise, and the road in.</p>

      <!-- Visibility -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-5">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">What can guests see from the site?</h3>
        <p class="text-xs font-body mb-4" [ngClass]="visibility.size > 0 ? 'text-muted-text' : 'text-trinidad font-bold'">
          {{ visibility.size > 0 ? 'Multi-select.' : 'Pick at least one.' }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          @for (opt of visibilityOpts; track opt.key) {
            <button type="button" (click)="toggleVisibility(opt.key)"
              [ngClass]="visibility.has(opt.key) ? 'border-trinidad bg-trinidad/8 text-trinidad' : 'border-dark-text/15 bg-white text-dark-text'"
              class="px-4 py-2 rounded-full border-2 text-xs uppercase tracking-[0.1em] font-button font-bold transition-colors">
              {{ opt.label }}
            </button>
          }
        </div>
      </div>

      <!-- Noise -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-5">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">What's the noise level?</h3>
        <p class="text-xs font-body mb-4" [ngClass]="noise ? 'text-muted-text' : 'text-trinidad font-bold'">
          {{ noise ? 'Pick the closest match.' : 'Choose one.' }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          @for (opt of noiseOpts; track opt.key) {
            <button type="button" (click)="setNoise(opt.key)"
              [ngClass]="noise === opt.key ? 'border-trinidad bg-trinidad/8 text-trinidad' : 'border-dark-text/15 bg-white text-dark-text'"
              class="px-4 py-2 rounded-full border-2 text-xs uppercase tracking-[0.1em] font-button font-bold transition-colors">
              {{ opt.label }}
            </button>
          }
        </div>
      </div>

      <!-- Road -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-5">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">Road conditions to the site</h3>
        <p class="text-xs font-body mb-4" [ngClass]="roads.size > 0 ? 'text-muted-text' : 'text-trinidad font-bold'">
          {{ roads.size > 0 ? 'Multi-select.' : 'Pick at least one.' }}
        </p>
        <div class="flex flex-wrap gap-2">
          @for (opt of roadOpts; track opt.key) {
            <button type="button" (click)="toggleRoad(opt.key)"
              [ngClass]="roads.has(opt.key) ? 'border-trinidad bg-trinidad/8 text-trinidad' : 'border-dark-text/15 bg-white text-dark-text'"
              class="px-4 py-2 rounded-full border-2 text-xs uppercase tracking-[0.1em] font-button font-bold transition-colors">
              {{ opt.label }}
            </button>
          }
        </div>
      </div>

      <!-- Hazards -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <div class="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 class="font-headline font-bold text-dark-text text-base">Known hazards on-site?</h3>
            <p class="text-xs font-body text-muted-text mt-1">Wildlife, slopes, dangerous plants — anything worth flagging.</p>
          </div>
          <label class="inline-flex items-center cursor-pointer">
            <input type="checkbox" [(ngModel)]="hasHazards" name="hasHazards" (change)="emit()"
              class="w-5 h-5 accent-trinidad">
          </label>
        </div>
        @if (hasHazards) {
          <textarea [(ngModel)]="hazardsNote" name="hazardsNote" rows="3" maxlength="500"
            (input)="emit()"
            placeholder="Briefly describe the hazards so guests can prepare…"
            class="w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all resize-none"></textarea>
        }
      </div>
    </div>
  `,
})
export class Phase2ConditionsComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.visibility = new Set(value?.visibility ?? []);
    this.noise = value?.noiseLevel;
    this.roads = new Set(value?.roadConditions ?? []);
    this.hasHazards = !!value?.hasHazards;
    this.hazardsNote = value?.hazardsNote ?? '';
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  visibility = new Set<VisibilityKind>();
  noise?: NoiseLevel;
  roads = new Set<RoadCondition>();
  hasHazards = false;
  hazardsNote = '';
  readonly visibilityOpts = VISIBILITY_OPTIONS;
  readonly noiseOpts = NOISE_OPTIONS;
  readonly roadOpts = ROAD_OPTIONS;

  toggleVisibility(k: VisibilityKind): void {
    const next = new Set(this.visibility);
    if (next.has(k)) next.delete(k); else next.add(k);
    this.visibility = next;
    this.emit();
  }
  setNoise(k: NoiseLevel): void { this.noise = k; this.emit(); }
  toggleRoad(k: RoadCondition): void {
    const next = new Set(this.roads);
    if (next.has(k)) next.delete(k); else next.add(k);
    this.roads = next;
    this.emit();
  }

  emit(): void {
    this.patch.emit({
      visibility: [...this.visibility],
      noiseLevel: this.noise,
      roadConditions: [...this.roads],
      hasHazards: this.hasHazards,
      hazardsNote: this.hasHazards ? this.hazardsNote : undefined,
    });
  }
}
