import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FocusTrapDirective } from '@cnt-workspace/ui';
import {
  IDraftListing,
  PrimaryPropertyType, PRIMARY_PROPERTY_TYPE_META,
  PrimaryPropertyGroup, PRIMARY_GROUP_LABELS,
  PropertyDescriptor, PROPERTY_DESCRIPTOR_META,
  MAX_CUSTOM_DESCRIPTORS,
  primaryDescriptorPhrase,
  CATEGORY_META,
} from '@cnt-workspace/data-access';

/**
 * Step 1.1 — property type. Split in two:
 *   - Primary (single-select, required): the business / what-it-is type.
 *     Drives the listing's category bucket + the "X stay in CITY" descriptor.
 *   - Secondary (multi-select, optional): setting/landscape descriptors.
 *
 * In edit mode, changing the primary type opens a confirm modal because
 * switching re-categorizes the listing (pennant + descriptor copy across
 * CurbNTurf change).
 *
 * A "Help me pick" link opens a focus-trapped modal explaining each primary
 * type, with sample listings where seeded.
 */
@Component({
  selector: 'cnt-phase1-descriptors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FocusTrapDirective],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        What's your place?
      </h2>
      <p class="text-sm font-body text-muted-text mb-1">
        Pick the primary type — this is what guests will see ("{{ leadPhrase }}"). Add other descriptors below to fill out the picture.
      </p>
      <button type="button" (click)="openHelp()"
        class="text-xs font-body font-bold text-trinidad hover:underline mb-8">
        Not sure which to pick? Help me decide →
      </button>

      <!-- Primary type (single-select, grouped) -->
      <div class="mb-8">
        <div class="flex items-baseline justify-between mb-4">
          <h3 class="font-headline font-bold text-dark-text text-base">Primary type</h3>
          <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad">Required</span>
        </div>

        @for (group of groupOrder; track group) {
          <div class="mb-5">
            <div class="text-[0.6rem] uppercase tracking-[0.14em] font-button font-bold text-muted-text mb-2 px-1">
              {{ groupLabels[group] }}
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              @for (key of primaryKeysByGroup[group]; track key) {
                <button type="button" (click)="attemptSetPrimary(key)"
                  [attr.aria-pressed]="primary === key"
                  [ngClass]="primary === key
                    ? 'border-trinidad bg-trinidad/8 text-trinidad shadow-[0_4px_12px_rgba(227,83,13,0.15)]'
                    : 'border-dark-text/10 bg-white text-dark-text hover:border-trinidad/40'"
                  class="flex flex-col items-center text-center gap-1.5 p-4 rounded-2xl border-2 transition-all">
                  <span class="material-symbols-outlined text-2xl"
                    [class.text-trinidad]="primary === key"
                    [style.font-variation-settings]="primary === key ? &quot;'FILL' 1&quot; : &quot;'FILL' 0&quot;">{{ primaryMeta[key].icon }}</span>
                  <span class="text-sm font-body font-bold leading-tight">{{ primaryMeta[key].label }}</span>
                  <span class="text-[0.65rem] font-body text-muted-text leading-snug">{{ primaryMeta[key].description }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Custom primary label input — appears only when "Other (custom)" is selected. -->
        @if (primary === 'custom') {
          <label class="mt-3 flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">What do you call your place?</span>
            <input type="text" [(ngModel)]="customPrimaryLabel" name="customPrimaryLabel"
              maxlength="40" (input)="emit()"
              placeholder="e.g. Drive-in theater, Pumpkin patch, Greenhouse"
              class="max-w-md bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
            <span class="text-[0.65rem] font-body text-muted-text">At least 2 characters. Appears in your listing's title line.</span>
          </label>
        }

        @if (primary) {
          <div class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-jungle-green/10 border border-jungle-green/30">
            <span class="material-symbols-outlined text-base text-jungle-green" style="font-variation-settings: 'FILL' 1;">verified</span>
            <span class="text-xs font-body text-jungle-green">
              This makes your listing a <strong>{{ descriptorPhrase }}</strong> · {{ categoryLabel }} category
            </span>
          </div>
        }
      </div>

      <!-- Secondary descriptors (multi-select) -->
      <div>
        <div class="flex items-baseline justify-between mb-4">
          <h3 class="font-headline font-bold text-dark-text text-base">Other descriptors</h3>
          <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Optional · pick any</span>
        </div>
        <div class="flex flex-wrap gap-2">
          @for (key of secondaryKeys; track key) {
            <button type="button" (click)="toggleSecondary(key)"
              [attr.aria-pressed]="selected.has(key)"
              [ngClass]="selected.has(key)
                ? 'border-trinidad bg-trinidad/8 text-trinidad'
                : 'border-dark-text/15 bg-white text-dark-text hover:border-trinidad/40'"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-sm font-body font-bold transition-colors">
              <span class="material-symbols-outlined text-base"
                [class.text-trinidad]="selected.has(key)">{{ secondaryMeta[key].icon }}</span>
              {{ secondaryMeta[key].label }}
            </button>
          }

          <!-- Custom secondary chips — each rendered with × remove. -->
          @for (custom of customDescriptorList; track custom; let i = $index) {
            <span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-trinidad bg-trinidad/8 text-trinidad text-sm font-body font-bold">
              <span class="material-symbols-outlined text-base">label</span>
              {{ custom }}
              <button type="button" (click)="removeCustomDescriptor(i)"
                class="-mr-1 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-trinidad/15"
                aria-label="Remove custom descriptor">
                <span class="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          }
        </div>

        <!-- Add custom descriptor input -->
        <div class="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <input type="text" [(ngModel)]="newCustomDescriptor" name="newCustomDescriptor"
            [disabled]="atCustomCap"
            maxlength="30"
            (keydown.enter)="addCustomDescriptor(); $event.preventDefault()"
            placeholder="Add a custom descriptor (e.g. Lake-view, Pet rescue)"
            class="flex-1 max-w-sm bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 disabled:opacity-50 transition-all">
          <button type="button" (click)="addCustomDescriptor()"
            [disabled]="!canAddCustomDescriptor"
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
            <span class="material-symbols-outlined text-base">add</span>
            Add custom
          </button>
        </div>
        @if (atCustomCap) {
          <p class="mt-2 text-[0.65rem] font-body text-muted-text">Limit reached ({{ customCap }} custom descriptors). Remove one to add another.</p>
        } @else if (newCustomDescriptor.trim() && isDuplicateCustom) {
          <p class="mt-2 text-[0.65rem] font-body text-trinidad">That descriptor is already in your list.</p>
        }

        @if (totalSecondaryCount > 0) {
          <p class="mt-4 text-xs font-body text-muted-text">{{ totalSecondaryCount }} additional descriptor{{ totalSecondaryCount === 1 ? '' : 's' }} selected</p>
        }
      </div>

      <!-- Edit-mode change-warning modal -->
      @if (pendingPrimary) {
        <div class="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="primary-change-title">
          <div class="absolute inset-0 bg-dark-text/60 backdrop-blur-sm" (click)="cancelChange()"></div>
          <div cntFocusTrap (escape)="cancelChange()"
            class="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.2)] max-w-md w-full p-6 md:p-8">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-trinidad/10 mb-4">
              <span class="material-symbols-outlined text-3xl text-trinidad">warning</span>
            </div>
            <h2 id="primary-change-title" class="font-headline font-bold text-dark-text text-2xl tracking-tight mb-2">Change primary type?</h2>
            <p class="text-sm font-body text-muted-text leading-relaxed mb-6">
              Switching from <strong class="text-dark-text">{{ primaryMeta[primary!].label }}</strong> to
              <strong class="text-dark-text">{{ primaryMeta[pendingPrimary].label }}</strong> re-categorizes your listing.
              The pennant, descriptor copy, and search-category placement all change across CurbNTurf.
            </p>
            <div class="flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <button type="button" (click)="cancelChange()"
                class="px-5 py-2.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">
                Keep current
              </button>
              <button type="button" (click)="confirmChange()"
                class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">
                <span class="material-symbols-outlined text-base">swap_horiz</span>
                Change anyway
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Help-me-pick explainer modal -->
      @if (helpOpen) {
        <div class="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <div class="absolute inset-0 bg-dark-text/60 backdrop-blur-sm" (click)="closeHelp()"></div>
          <div cntFocusTrap (escape)="closeHelp()"
            class="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.2)] max-w-2xl w-full max-h-[88vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-dark-text/8 px-6 md:px-8 py-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="help-title" class="font-headline font-bold text-dark-text text-xl tracking-tight">Picking your primary type</h2>
                <p class="text-xs font-body text-muted-text mt-1">Quick guide to each option, grouped by category.</p>
              </div>
              <button type="button" (click)="closeHelp()" class="w-9 h-9 rounded-full hover:bg-cream/60 inline-flex items-center justify-center shrink-0 -mr-2" aria-label="Close">
                <span class="material-symbols-outlined text-lg text-muted-text">close</span>
              </button>
            </div>
            <div class="p-6 md:p-8 space-y-6">
              @for (group of groupOrder; track group) {
                <section>
                  <h3 class="text-[0.6rem] uppercase tracking-[0.14em] font-button font-bold text-muted-text mb-3">
                    {{ groupLabels[group] }}
                  </h3>
                  <div class="space-y-3">
                    @for (key of primaryKeysByGroup[group]; track key) {
                      <div class="flex items-start gap-3 p-3 rounded-xl border border-dark-text/8 bg-cream/30">
                        <span class="shrink-0 w-10 h-10 rounded-lg bg-white border border-dark-text/10 inline-flex items-center justify-center">
                          <span class="material-symbols-outlined text-xl text-trinidad">{{ primaryMeta[key].icon }}</span>
                        </span>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-headline font-bold text-dark-text text-sm">{{ primaryMeta[key].label }}</span>
                            <span class="text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text">{{ primaryMeta[key].descriptorPhrase }}</span>
                          </div>
                          <p class="text-xs font-body text-muted-text mt-0.5 leading-snug">{{ primaryMeta[key].description }}</p>
                          @if (primaryMeta[key].sampleListingId) {
                            <a [routerLink]="['/listing']" [queryParams]="{ id: primaryMeta[key].sampleListingId }" target="_blank"
                              class="inline-flex items-center gap-1 mt-2 text-[0.65rem] font-button font-bold text-trinidad hover:underline">
                              See an example
                              <span class="material-symbols-outlined text-[12px]">open_in_new</span>
                            </a>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </section>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class Phase1DescriptorsComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.primary = value?.primaryType;
    this.customPrimaryLabel = value?.customPrimaryLabel ?? '';
    this.selected = new Set(value?.descriptors ?? []);
    this.customDescriptorList = [...(value?.customDescriptors ?? [])];
    this.draftCity = value?.address?.city ?? '';
    this.draftState = value?.address?.state ?? '';
  }
  /** True when the wizard is in edit mode — changing primary opens a confirm. */
  @Input() editing = false;
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  primary?: PrimaryPropertyType;
  customPrimaryLabel = '';
  selected = new Set<PropertyDescriptor>();
  customDescriptorList: string[] = [];
  newCustomDescriptor = '';
  draftCity = '';
  draftState = '';

  readonly customCap = MAX_CUSTOM_DESCRIPTORS;

  /** Pending swap target when editing — null when no confirmation in flight. */
  pendingPrimary: PrimaryPropertyType | null = null;
  /** Help-me-pick explainer modal flag. */
  helpOpen = false;

  readonly primaryMeta = PRIMARY_PROPERTY_TYPE_META;
  readonly secondaryMeta = PROPERTY_DESCRIPTOR_META;
  readonly secondaryKeys = Object.keys(PROPERTY_DESCRIPTOR_META) as PropertyDescriptor[];
  readonly groupLabels = PRIMARY_GROUP_LABELS;
  readonly groupOrder: PrimaryPropertyGroup[] = ['hospitality', 'land', 'other'];

  /** Pre-bucketed primary keys per group — used by template + help modal. */
  readonly primaryKeysByGroup: Record<PrimaryPropertyGroup, PrimaryPropertyType[]> = (() => {
    const out: Record<PrimaryPropertyGroup, PrimaryPropertyType[]> = { hospitality: [], land: [], other: [] };
    for (const k of Object.keys(PRIMARY_PROPERTY_TYPE_META) as PrimaryPropertyType[]) {
      out[PRIMARY_PROPERTY_TYPE_META[k].group].push(k);
    }
    return out;
  })();

  /** Descriptor phrase that includes the host's custom label when 'custom'. */
  get descriptorPhrase(): string {
    return primaryDescriptorPhrase({
      primaryType: this.primary,
      customPrimaryLabel: this.customPrimaryLabel,
    } as IDraftListing);
  }

  /** Live descriptor-phrase preview — uses draft city/state when available. */
  get leadPhrase(): string {
    const where = this.locationLabel || 'your city';
    return `${this.descriptorPhrase} in ${where}`;
  }

  get atCustomCap(): boolean {
    return this.customDescriptorList.length >= MAX_CUSTOM_DESCRIPTORS;
  }

  get isDuplicateCustom(): boolean {
    const t = this.newCustomDescriptor.trim().toLowerCase();
    if (!t) return false;
    // Block dupes against both custom + standard descriptor labels.
    if (this.customDescriptorList.some(c => c.toLowerCase() === t)) return true;
    return this.secondaryKeys.some(k => this.secondaryMeta[k].label.toLowerCase() === t);
  }

  get canAddCustomDescriptor(): boolean {
    return !this.atCustomCap && !!this.newCustomDescriptor.trim() && !this.isDuplicateCustom;
  }

  get totalSecondaryCount(): number {
    return this.selected.size + this.customDescriptorList.length;
  }

  /** "Minneapolis, MN" if both city + state set; just city if only one is. */
  get locationLabel(): string {
    if (this.draftCity && this.draftState) return `${this.draftCity}, ${this.draftState}`;
    return this.draftCity || this.draftState || '';
  }

  /** Friendly category label for the post-pick caption. */
  get categoryLabel(): string {
    if (!this.primary) return '';
    const cat = PRIMARY_PROPERTY_TYPE_META[this.primary].category;
    return CATEGORY_META[cat]?.label ?? cat;
  }

  /**
   * Edit-mode-aware primary click handler. New listings (or unchanged primary)
   * commit immediately. Edit-mode change to a different primary opens the
   * confirmation modal first.
   */
  attemptSetPrimary(key: PrimaryPropertyType): void {
    if (this.editing && this.primary && this.primary !== key) {
      this.pendingPrimary = key;
      return;
    }
    this.primary = key;
    this.emit();
  }

  confirmChange(): void {
    if (!this.pendingPrimary) return;
    this.primary = this.pendingPrimary;
    this.pendingPrimary = null;
    this.emit();
  }

  cancelChange(): void { this.pendingPrimary = null; }

  toggleSecondary(key: PropertyDescriptor): void {
    const next = new Set(this.selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    this.selected = next;
    this.emit();
  }

  addCustomDescriptor(): void {
    if (!this.canAddCustomDescriptor) return;
    this.customDescriptorList = [...this.customDescriptorList, this.newCustomDescriptor.trim()];
    this.newCustomDescriptor = '';
    this.emit();
  }

  removeCustomDescriptor(index: number): void {
    this.customDescriptorList = this.customDescriptorList.filter((_, i) => i !== index);
    this.emit();
  }

  openHelp(): void { this.helpOpen = true; }
  closeHelp(): void { this.helpOpen = false; }

  /** Called from the template's `(input)` on the custom-label field. */
  emit(): void {
    this.patch.emit({
      primaryType: this.primary,
      customPrimaryLabel: this.primary === 'custom' ? this.customPrimaryLabel.trim() : undefined,
      descriptors: [...this.selected],
      customDescriptors: this.customDescriptorList.length > 0 ? [...this.customDescriptorList] : undefined,
    });
  }
}
