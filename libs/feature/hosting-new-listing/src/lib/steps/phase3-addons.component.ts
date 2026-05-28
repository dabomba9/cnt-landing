import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { IDraftListing, IAddOn, downscalePhoto } from '@cnt-workspace/data-access';

const DEFAULT_UNIT: IAddOn['unit'] = 'per stay';
export const ADDON_DEFAULT_ICON = 'add_shopping_cart';
const DEFAULT_ICON = ADDON_DEFAULT_ICON;

/** Curated icon set — Material Symbols names. Picked to cover the common
 * add-on categories hosts ask about: services, food, products, experiences. */
export const ADDON_ICON_CHOICES: string[] = [
  'add_shopping_cart', 'local_fire_department', 'pets', 'directions_car', 'login', 'logout',
  'restaurant', 'wine_bar', 'sports_bar', 'coffee', 'local_pizza', 'cake',
  'kayaking', 'hiking', 'directions_bike', 'surfing', 'fishing', 'campaign',
  'cleaning_services', 'iron', 'local_laundry_service', 'wifi', 'electric_bolt', 'shower',
];
const ICON_CHOICES = ADDON_ICON_CHOICES;

/** Curated unit options. Surfaced both in the wizard row editor and the bulk builder. */
export const ADDON_UNIT_CHOICES: IAddOn['unit'][] = ['per stay', 'per night', 'per person', 'per unit'];

/** One-click presets so an empty add-ons list has an obvious starting point. */
export const ADDON_STARTER_TEMPLATES: Omit<IAddOn, 'id'>[] = [
  { label: 'Firewood bundle',  description: 'A bundle of seasoned firewood, ready to burn.',     icon: 'local_fire_department', price: 15, unit: 'per unit' },
  { label: 'Late check-out',   description: 'Stay a few hours past the standard departure time.', icon: 'logout',                price: 25, unit: 'per stay' },
  { label: 'Early check-in',   description: 'Arrive ahead of the standard check-in time.',        icon: 'login',                 price: 25, unit: 'per stay' },
  { label: 'Pet fee',          description: 'Bring along well-behaved pets.',                     icon: 'pets',                  price: 20, unit: 'per stay' },
  { label: 'Extra vehicle',    description: 'Park a second vehicle on the site.',                 icon: 'directions_car',        price: 15, unit: 'per night' },
  { label: 'Mid-stay cleaning',description: 'A refresh of the site partway through your stay.',    icon: 'cleaning_services',     price: 40, unit: 'per stay' },
];
const STARTER_TEMPLATES = ADDON_STARTER_TEMPLATES;

let nextId = 1;
function makeId(): string {
  return `addon-${Date.now().toString(36)}-${nextId++}`;
}

/**
 * Edit-only step — extra services / products hosts offer at checkout (firewood,
 * late check-out, ATV rental, etc.). Only rendered when the wizard is opened
 * from `/hosting/listings/:id/edit`.
 */
@Component({
  selector: 'cnt-phase3-addons',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Add-ons
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">
        Extras guests can purchase at checkout. Leave empty if you don't offer any.
      </p>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 items-start">

        <!-- ───────────── Editor column ───────────── -->
        <div>
          @if (rows.length === 0) {
            <div class="rounded-2xl border border-dashed border-dark-text/15 bg-white p-8 text-center">
              <p class="text-sm font-body text-muted-text mb-4">No add-ons yet — start from a common one:</p>
              <div class="flex flex-wrap justify-center gap-2 mb-5">
                @for (t of starterTemplates; track t.label) {
                  <button type="button" (click)="addFromTemplate(t)" [disabled]="hasLabel(t.label)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dark-text/15 bg-cream/50 text-xs font-body font-bold text-dark-text hover:border-trinidad hover:text-trinidad disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <span class="material-symbols-outlined text-sm">{{ t.icon }}</span>
                    {{ t.label }}
                  </button>
                }
              </div>
              <button type="button" (click)="addRow()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-trinidad text-white text-sm font-button font-bold hover:bg-trinidad/90 transition-colors">
                <span class="material-symbols-outlined text-base">add</span>
                Start from scratch
              </button>
            </div>
          } @else {
            <div class="space-y-3 mb-4" cdkDropList (cdkDropListDropped)="onDrop($event)">
              @for (row of rows; track row.id; let i = $index) {
                <div cdkDrag [cdkDragData]="row"
                  class="rounded-2xl border bg-white p-5 md:p-6"
                  [ngClass]="!isRowValid(row) && rowAttempted(row) ? 'border-trinidad' : 'border-dark-text/10'">
                  <!-- Drag handle + incomplete badge -->
                  <div class="flex items-center justify-between mb-3">
                    <span cdkDragHandle
                      class="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text cursor-grab active:cursor-grabbing select-none"
                      title="Drag to reorder">
                      <span class="material-symbols-outlined text-base">drag_indicator</span>
                      Reorder
                    </span>
                    @if (!isRowValid(row) && rowAttempted(row)) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-trinidad/10 text-trinidad text-[0.6rem] font-button uppercase tracking-[0.1em] font-bold">
                        <span class="material-symbols-outlined text-[12px]">warning</span>
                        {{ rowValidationHint(row) }}
                      </span>
                    }
                  </div>

                  <div class="flex items-start gap-4 mb-4">

                    <!-- Art tile: photo if uploaded, otherwise the chosen icon. -->
                    <div class="relative shrink-0">
                      <button type="button" (click)="toggleIconPicker(row.id)"
                        class="w-16 h-16 rounded-xl bg-cream/80 border-2 border-dark-text/15 inline-flex items-center justify-center overflow-hidden hover:border-trinidad transition-colors"
                        aria-label="Change add-on icon"
                        aria-haspopup="true"
                        [attr.aria-expanded]="openPickerFor === row.id"
                        [title]="row.photo ? 'Click art to change icon' : 'Pick an icon'">
                        @if (row.photo) {
                          <img [src]="row.photo" alt="" class="w-full h-full object-cover">
                        } @else {
                          <span class="material-symbols-outlined text-3xl text-trinidad">{{ row.icon || defaultIcon }}</span>
                        }
                      </button>
                      <label class="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-trinidad text-white inline-flex items-center justify-center cursor-pointer shadow-md hover:bg-trinidad/90 transition-colors"
                        [title]="row.photo ? 'Replace photo' : 'Add photo'">
                        <span class="material-symbols-outlined text-[14px]">{{ row.photo ? 'sync' : 'photo_camera' }}</span>
                        <input type="file" accept="image/*" class="sr-only" (change)="onPhotoChange($event, i)">
                      </label>
                      @if (row.photo) {
                        <button type="button" (click)="clearPhoto(i)"
                          class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-dark-text/15 text-muted-text inline-flex items-center justify-center hover:text-trinidad hover:border-trinidad transition-colors"
                          aria-label="Remove add-on photo"
                          title="Remove photo">
                          <span class="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      }

                      @if (openPickerFor === row.id) {
                        <div class="absolute left-0 top-[4.75rem] z-20 w-64 rounded-xl bg-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] border border-dark-text/10 p-3">
                          <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2">Pick an icon</div>
                          <div class="grid grid-cols-6 gap-1.5">
                            @for (name of iconChoices; track name) {
                              <button type="button" (click)="setIcon(i, name)"
                                class="w-9 h-9 rounded-md inline-flex items-center justify-center hover:bg-trinidad/10 transition-colors"
                                [class.bg-trinidad]="row.icon === name"
                                [class.text-white]="row.icon === name"
                                [class.text-dark-text]="row.icon !== name"
                                [attr.aria-label]="'Use the ' + name + ' icon'"
                                [attr.aria-pressed]="row.icon === name"
                                [title]="name">
                                <span class="material-symbols-outlined text-lg">{{ name }}</span>
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>

                    <div class="flex-1 min-w-0">
                      <label class="flex flex-col gap-1.5 mb-3">
                        <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Name</span>
                        <input type="text" [(ngModel)]="row.label" [name]="'label-'+row.id" maxlength="60" (input)="emit()"
                          placeholder="e.g. Firewood bundle"
                          class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                      </label>
                      <label class="flex flex-col gap-1.5">
                        <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Description</span>
                        <textarea [(ngModel)]="row.description" [name]="'desc-'+row.id" rows="2" maxlength="200" (input)="emit()"
                          placeholder="One short sentence so guests know what they're buying."
                          class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all resize-none"></textarea>
                      </label>
                    </div>

                    <button type="button" (click)="removeRow(i)"
                      class="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-text hover:bg-dark-text/5 hover:text-trinidad transition-colors"
                      aria-label="Remove add-on">
                      <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label class="flex flex-col gap-1.5">
                      <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Price ($)</span>
                      <input type="number" min="0" step="1" [(ngModel)]="row.price" [name]="'price-'+row.id" (input)="emit()"
                        class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                    </label>
                    <label class="flex flex-col gap-1.5">
                      <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Charged</span>
                      <select [(ngModel)]="row.unit" [name]="'unit-'+row.id" (change)="emit()"
                        class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                        <option value="per stay">per stay</option>
                        <option value="per night">per night</option>
                        <option value="per person">per person</option>
                        <option value="per unit">per unit</option>
                      </select>
                    </label>
                  </div>
                </div>
              }
            </div>

            <!-- Add row + starter chips -->
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" (click)="addRow()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-dark-text/15 bg-white text-dark-text text-sm font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">
                <span class="material-symbols-outlined text-base">add</span>
                Add another
              </button>
              @for (t of starterTemplates; track t.label) {
                @if (!hasLabel(t.label)) {
                  <button type="button" (click)="addFromTemplate(t)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dark-text/15 bg-cream/50 text-xs font-body font-bold text-dark-text hover:border-trinidad hover:text-trinidad transition-colors">
                    <span class="material-symbols-outlined text-sm">{{ t.icon }}</span>
                    {{ t.label }}
                  </button>
                }
              }
            </div>
          }
        </div>

        <!-- ───────────── Live guest preview ───────────── -->
        <aside class="lg:sticky lg:top-24">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="material-symbols-outlined text-base text-muted-text">visibility</span>
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Guest preview</span>
          </div>
          <div class="rounded-2xl border border-dark-text/10 bg-cream/40 p-3">
            @if (previewRows.length === 0) {
              <p class="text-xs font-body text-muted-text text-center py-8">
                Your add-ons will preview here as you fill them in.
              </p>
            } @else {
              <div class="space-y-2">
                @for (a of previewRows; track a.id) {
                  <div class="flex items-start gap-3 px-3 py-3 rounded-2xl border border-dark-text/10 bg-white">
                    @if (a.photo) {
                      <img [src]="a.photo" alt="" class="shrink-0 w-12 h-12 rounded-lg object-cover">
                    } @else {
                      <span class="material-symbols-outlined text-xl shrink-0 mt-0.5 text-jungle-green">{{ a.icon || defaultIcon }}</span>
                    }
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline justify-between gap-2">
                        <span class="font-body text-sm font-bold text-dark-text">{{ a.label }}</span>
                        <span class="font-body text-sm font-bold text-dark-text shrink-0">\${{ a.price || 0 }}<span class="text-[0.6rem] text-muted-text font-normal">/{{ unitLabel(a.unit) }}</span></span>
                      </div>
                      @if (a.description) {
                        <p class="text-xs font-body text-muted-text mt-0.5 leading-snug">{{ a.description }}</p>
                      }
                    </div>
                    <span class="material-symbols-outlined text-lg shrink-0 text-dark-text/30" style="font-variation-settings: 'FILL' 1;">add_circle</span>
                  </div>
                }
              </div>
            }
          </div>
        </aside>
      </div>
    </div>
  `,
})
export class Phase3AddonsComponent {
  @Input() set draft(value: IDraftListing | null) {
    const incoming = value?.addOns ?? [];
    this.rows = incoming.map(a => ({ ...a }));
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  rows: IAddOn[] = [];
  openPickerFor: string | null = null;
  readonly iconChoices = ICON_CHOICES;
  readonly starterTemplates = STARTER_TEMPLATES;
  readonly defaultIcon = DEFAULT_ICON;

  /** Rows complete enough to show in the guest preview / persist to guests. */
  get previewRows(): IAddOn[] {
    return this.rows.filter(r => this.isRowValid(r));
  }

  /** A row counts as valid when it has a label and a non-negative price. */
  isRowValid(row: IAddOn): boolean {
    return row.label.trim().length >= 2 && (row.price ?? 0) >= 0;
  }

  /** True when the host has clearly started editing the row — used to delay
   * showing the "incomplete" warning until they've done *something*. */
  rowAttempted(row: IAddOn): boolean {
    return !!row.description?.trim() || !!row.photo || row.icon !== 'add_shopping_cart' || (row.price ?? 0) > 0;
  }

  rowValidationHint(row: IAddOn): string {
    if (row.label.trim().length < 2) return 'Name required';
    if ((row.price ?? 0) < 0) return 'Price cannot be negative';
    return '';
  }

  onDrop(ev: CdkDragDrop<IAddOn[]>): void {
    if (ev.previousIndex === ev.currentIndex) return;
    const next = [...this.rows];
    moveItemInArray(next, ev.previousIndex, ev.currentIndex);
    this.rows = next;
    this.emit();
  }

  /** Map a unit to the short suffix the booking widget shows. */
  unitLabel(unit: IAddOn['unit']): string {
    return unit === 'per stay' ? 'stay'
      : unit === 'per night' ? 'night'
      : unit === 'per person' ? 'person'
      : 'unit';
  }

  /** True when a row with this label already exists — disables the matching chip. */
  hasLabel(label: string): boolean {
    return this.rows.some(r => r.label.trim().toLowerCase() === label.trim().toLowerCase());
  }

  addRow(): void {
    this.rows = [...this.rows, {
      id: makeId(),
      label: '',
      description: '',
      icon: DEFAULT_ICON,
      price: 0,
      unit: DEFAULT_UNIT,
    }];
    this.emit();
  }

  addFromTemplate(t: Omit<IAddOn, 'id'>): void {
    if (this.hasLabel(t.label)) return;
    this.rows = [...this.rows, { ...t, id: makeId() }];
    this.emit();
  }

  removeRow(index: number): void {
    this.rows = this.rows.filter((_, i) => i !== index);
    this.emit();
  }

  toggleIconPicker(id: string): void {
    this.openPickerFor = this.openPickerFor === id ? null : id;
  }

  setIcon(index: number, name: string): void {
    this.rows[index] = { ...this.rows[index], icon: name };
    this.openPickerFor = null;
    this.emit();
  }

  async onPhotoChange(ev: Event, index: number): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await downscalePhoto(file, { maxDimension: 400, quality: 0.82 });
      this.rows[index] = { ...this.rows[index], photo: dataUrl };
      this.emit();
    } catch {
      // Silent — user can retry. A toast hook would belong here later.
    }
  }

  clearPhoto(index: number): void {
    const next = { ...this.rows[index] };
    delete next.photo;
    this.rows[index] = next;
    this.emit();
  }

  emit(): void {
    this.patch.emit({ addOns: this.rows.map(r => ({ ...r })) });
  }
}
