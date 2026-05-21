import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IDraftListing, Amenity, AMENITY_LABELS, AMENITY_ICONS,
  AmenityGroup, AMENITY_GROUP_LABELS, AMENITY_GROUPS_ORDER, AMENITY_GROUP_FOR,
  AMENITY_PRESETS, IAmenityPreset, MAX_CUSTOM_AMENITIES,
  ElectricityAmps, WifiSpeed, PetsPolicy,
} from '@cnt-workspace/data-access';

/**
 * Step 1.4 — amenities. Three parts:
 *   1. Quick-pick presets (additive bundles).
 *   2. Five grouped sections (Site access / Power & water / Connectivity /
 *      Comfort / Outdoor life), each with a (N/M) selected counter and
 *      sub-detail disclosures on electricity / wifi / pets / shower.
 *   3. Custom amenities chip list + add-row (max 8).
 *
 * Either a standard amenity OR a custom amenity counts toward the "at least
 * one" validation in the draft service.
 */
@Component({
  selector: 'cnt-phase1-amenities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        What amenities are at your site?
      </h2>
      <p class="text-sm font-body text-muted-text mb-6">
        Pick everything that applies. Guests rely on this to plan their stay.
      </p>

      <!-- Quick-pick presets -->
      <div class="mb-8">
        <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2">
          Start fast — apply a preset
        </div>
        <div class="flex flex-wrap gap-2">
          @for (p of presets; track p.key) {
            <button type="button" (click)="applyPreset(p)"
              class="inline-flex items-start gap-2 px-3 py-2 rounded-xl border-2 border-dark-text/15 bg-white hover:border-trinidad hover:bg-trinidad/5 transition-colors text-left">
              <span class="material-symbols-outlined text-base text-trinidad shrink-0 mt-0.5">{{ p.icon }}</span>
              <span class="flex flex-col">
                <span class="text-xs font-body font-bold text-dark-text leading-tight">{{ p.label }}</span>
                <span class="text-[0.65rem] font-body text-muted-text leading-snug">{{ p.description }}</span>
              </span>
            </button>
          }
        </div>
        <p class="mt-2 text-[0.65rem] font-body text-muted-text">
          Presets add to your current picks — they never remove anything.
        </p>
      </div>

      <!-- Grouped amenity tiles -->
      @for (group of groupsOrder; track group) {
        <div class="mb-7">
          <div class="flex items-baseline justify-between mb-3 gap-3">
            <h3 class="font-headline font-bold text-dark-text text-base">{{ groupLabels[group] }}</h3>
            <div class="inline-flex items-center gap-3 shrink-0">
              <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">
                {{ countInGroup(group) }} / {{ amenitiesByGroup[group].length }} selected
              </span>
              @if (countInGroup(group) > 0) {
                <button type="button" (click)="clearGroup(group)"
                  class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad hover:underline transition-colors">
                  Clear
                </button>
              }
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (a of amenitiesByGroup[group]; track a) {
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

          <!-- Sub-detail disclosures, only when the parent amenity is selected. -->
          @if (group === 'power-water' && isSelected('electricity')) {
            <div class="mt-3 ml-2 pl-3 border-l-2 border-trinidad/30">
              <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2">Power available</div>
              <div class="flex flex-wrap gap-2">
                @for (amp of ampOptions; track amp) {
                  <button type="button" (click)="toggleAmp(amp)"
                    [ngClass]="hasAmp(amp)
                      ? 'border-trinidad bg-trinidad/10 text-trinidad'
                      : 'border-dark-text/15 bg-white text-dark-text hover:border-trinidad/40'"
                    class="px-3 py-1.5 rounded-full border-2 text-xs font-body font-bold transition-colors">
                    {{ amp }}
                  </button>
                }
              </div>
            </div>
          }

          @if (group === 'connectivity' && isSelected('wifi')) {
            <div class="mt-3 ml-2 pl-3 border-l-2 border-trinidad/30">
              <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2">Wifi speed</div>
              <div class="flex flex-wrap gap-2">
                @for (s of wifiSpeedOptions; track s.value) {
                  <button type="button" (click)="setWifiSpeed(s.value)"
                    [ngClass]="wifiSpeed === s.value
                      ? 'border-trinidad bg-trinidad/10 text-trinidad'
                      : 'border-dark-text/15 bg-white text-dark-text hover:border-trinidad/40'"
                    class="px-3 py-1.5 rounded-full border-2 text-xs font-body font-bold transition-colors">
                    {{ s.label }}
                  </button>
                }
              </div>
            </div>
          }

          @if (group === 'outdoor' && isSelected('pets')) {
            <div class="mt-3 ml-2 pl-3 border-l-2 border-trinidad/30">
              <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2">Pets policy</div>
              <div class="flex flex-wrap gap-2">
                @for (p of petsPolicyOptions; track p.value) {
                  <button type="button" (click)="setPetsPolicy(p.value)"
                    [ngClass]="petsPolicy === p.value
                      ? 'border-trinidad bg-trinidad/10 text-trinidad'
                      : 'border-dark-text/15 bg-white text-dark-text hover:border-trinidad/40'"
                    class="px-3 py-1.5 rounded-full border-2 text-xs font-body font-bold transition-colors">
                    {{ p.label }}
                  </button>
                }
              </div>
            </div>
          }

          @if (group === 'comfort' && isSelected('shower')) {
            <div class="mt-3 ml-2 pl-3 border-l-2 border-trinidad/30">
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="showerHotWater" name="showerHotWater" (change)="emit()"
                  class="w-4 h-4 accent-trinidad">
                <span class="text-xs font-body text-dark-text">Hot water available</span>
              </label>
            </div>
          }
        </div>
      }

      <!-- Custom amenities -->
      <div class="rounded-2xl border border-dark-text/10 bg-cream/30 p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">Custom amenities</h3>
        <p class="text-xs font-body text-muted-text mb-4">
          Got something the list doesn't cover? Mini fridge, hammock spot, sauna — add up to {{ customCap }}.
        </p>
        @if (customList.length > 0) {
          <div class="flex flex-wrap gap-2 mb-3">
            @for (c of customList; track c; let i = $index) {
              <span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-trinidad bg-trinidad/8 text-trinidad text-sm font-body font-bold">
                <span class="material-symbols-outlined text-base">label</span>
                {{ c }}
                <button type="button" (click)="removeCustom(i)"
                  class="-mr-1 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-trinidad/15"
                  [attr.aria-label]="'Remove ' + c">
                  <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            }
          </div>
        }
        <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <input type="text" [(ngModel)]="newCustomAmenity" name="newCustomAmenity"
            [disabled]="atCustomCap"
            maxlength="40"
            (keydown.enter)="addCustom(); $event.preventDefault()"
            placeholder="e.g. Mini fridge, Outdoor sauna, Hammock spot"
            class="flex-1 max-w-md bg-white border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 disabled:opacity-50 transition-all">
          <button type="button" (click)="addCustom()"
            [disabled]="!canAddCustom"
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
            <span class="material-symbols-outlined text-base">add</span>
            Add custom
          </button>
        </div>
        @if (atCustomCap) {
          <p class="mt-2 text-[0.65rem] font-body text-muted-text">Limit reached ({{ customCap }}). Remove one to add another.</p>
        } @else if (newCustomAmenity.trim() && isDuplicateCustom) {
          <p class="mt-2 text-[0.65rem] font-body text-trinidad">That amenity is already on your list.</p>
        }
      </div>

      <div class="mt-6 flex items-center justify-center gap-3 text-xs font-body text-muted-text">
        <span>{{ totalSelected }} {{ totalSelected === 1 ? 'amenity' : 'amenities' }} selected</span>
        @if (totalSelected > 0) {
          <span class="text-muted-text/40">·</span>
          <button type="button" (click)="clearAll()"
            class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad hover:underline transition-colors">
            Clear all selections
          </button>
        }
      </div>
    </div>
  `,
})
export class Phase1AmenitiesComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.selected = new Set(value?.amenities ?? []);
    this.customList = [...(value?.customAmenities ?? [])];
    this.electricityAmps = [...(value?.electricityAmps ?? [])];
    this.wifiSpeed = value?.wifiSpeed;
    this.petsPolicy = value?.petsPolicy;
    this.showerHotWater = !!value?.showerHotWater;
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  selected = new Set<Amenity>();
  customList: string[] = [];
  newCustomAmenity = '';

  // Sub-detail state
  electricityAmps: ElectricityAmps[] = [];
  wifiSpeed?: WifiSpeed;
  petsPolicy?: PetsPolicy;
  showerHotWater = false;

  readonly labels = AMENITY_LABELS;
  readonly icons = AMENITY_ICONS;
  readonly groupLabels = AMENITY_GROUP_LABELS;
  readonly groupsOrder = AMENITY_GROUPS_ORDER;
  readonly presets = AMENITY_PRESETS;
  readonly customCap = MAX_CUSTOM_AMENITIES;
  readonly ampOptions: ElectricityAmps[] = ['20A', '30A', '50A'];
  readonly wifiSpeedOptions: { value: WifiSpeed; label: string }[] = [
    { value: 'slow',   label: 'Slow (messaging only)' },
    { value: 'decent', label: 'Decent (browsing)' },
    { value: 'fast',   label: 'Fast (video calls)' },
  ];
  readonly petsPolicyOptions: { value: PetsPolicy; label: string }[] = [
    { value: 'free',       label: 'Free' },
    { value: 'fee',        label: 'Fee applies' },
    { value: 'size-limit', label: 'Size limit' },
  ];

  /** Group → list of amenities in that group, built once from AMENITY_GROUP_FOR. */
  readonly amenitiesByGroup: Record<AmenityGroup, Amenity[]> = (() => {
    const out: Record<AmenityGroup, Amenity[]> = {
      'site-access': [], 'power-water': [], 'connectivity': [], 'comfort': [], 'outdoor': [],
    };
    for (const a of Object.keys(AMENITY_GROUP_FOR) as Amenity[]) {
      out[AMENITY_GROUP_FOR[a]].push(a);
    }
    return out;
  })();

  isSelected(a: Amenity): boolean { return this.selected.has(a); }

  countInGroup(group: AmenityGroup): number {
    let n = 0;
    for (const a of this.amenitiesByGroup[group]) if (this.selected.has(a)) n++;
    return n;
  }

  get totalSelected(): number { return this.selected.size + this.customList.length; }

  toggle(a: Amenity): void {
    const next = new Set(this.selected);
    if (next.has(a)) next.delete(a); else next.add(a);
    this.selected = next;
    this.emit();
  }

  /** Apply a preset additively — never removes existing picks. */
  applyPreset(p: IAmenityPreset): void {
    const next = new Set(this.selected);
    for (const a of p.amenities) next.add(a);
    this.selected = next;
    this.emit();
  }

  /** Clear a single group's selections + any sub-detail tied to amenities in it. */
  clearGroup(group: AmenityGroup): void {
    const inGroup = new Set(this.amenitiesByGroup[group]);
    this.selected = new Set([...this.selected].filter(a => !inGroup.has(a)));
    if (group === 'power-water')  this.electricityAmps = [];
    if (group === 'connectivity') this.wifiSpeed = undefined;
    if (group === 'outdoor')      this.petsPolicy = undefined;
    if (group === 'comfort')      this.showerHotWater = false;
    this.emit();
  }

  /** Wipe every selection on the step (standard, custom, sub-details). */
  clearAll(): void {
    this.selected = new Set();
    this.customList = [];
    this.electricityAmps = [];
    this.wifiSpeed = undefined;
    this.petsPolicy = undefined;
    this.showerHotWater = false;
    this.newCustomAmenity = '';
    this.emit();
  }

  // ─── Sub-detail handlers ───
  hasAmp(amp: ElectricityAmps): boolean { return this.electricityAmps.includes(amp); }
  toggleAmp(amp: ElectricityAmps): void {
    this.electricityAmps = this.hasAmp(amp)
      ? this.electricityAmps.filter(a => a !== amp)
      : [...this.electricityAmps, amp];
    this.emit();
  }
  setWifiSpeed(s: WifiSpeed): void {
    this.wifiSpeed = this.wifiSpeed === s ? undefined : s;
    this.emit();
  }
  setPetsPolicy(p: PetsPolicy): void {
    this.petsPolicy = this.petsPolicy === p ? undefined : p;
    this.emit();
  }

  // ─── Custom amenities ───
  get atCustomCap(): boolean { return this.customList.length >= MAX_CUSTOM_AMENITIES; }
  get isDuplicateCustom(): boolean {
    const t = this.newCustomAmenity.trim().toLowerCase();
    if (!t) return false;
    if (this.customList.some(c => c.toLowerCase() === t)) return true;
    // Block against standard labels too.
    return Object.values(AMENITY_LABELS).some(label => label.toLowerCase() === t);
  }
  get canAddCustom(): boolean {
    return !this.atCustomCap && !!this.newCustomAmenity.trim() && !this.isDuplicateCustom;
  }
  addCustom(): void {
    if (!this.canAddCustom) return;
    this.customList = [...this.customList, this.newCustomAmenity.trim()];
    this.newCustomAmenity = '';
    this.emit();
  }
  removeCustom(index: number): void {
    this.customList = this.customList.filter((_, i) => i !== index);
    this.emit();
  }

  emit(): void {
    this.patch.emit({
      amenities: [...this.selected],
      customAmenities: this.customList.length > 0 ? [...this.customList] : undefined,
      electricityAmps: this.selected.has('electricity') && this.electricityAmps.length > 0
        ? [...this.electricityAmps] : undefined,
      wifiSpeed: this.selected.has('wifi') ? this.wifiSpeed : undefined,
      petsPolicy: this.selected.has('pets') ? this.petsPolicy : undefined,
      showerHotWater: this.selected.has('shower') ? this.showerHotWater : undefined,
    });
  }
}
