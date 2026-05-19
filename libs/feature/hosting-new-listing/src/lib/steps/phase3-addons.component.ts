import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDraftListing, IAddOn, downscalePhoto } from '@cnt-workspace/data-access';

const DEFAULT_UNIT: IAddOn['unit'] = 'per stay';
const DEFAULT_ICON = 'add_shopping_cart';

/** Curated icon set — Material Symbols names. Picked to cover the common
 * add-on categories hosts ask about: services, food, products, experiences. */
const ICON_CHOICES: string[] = [
  'add_shopping_cart', 'local_fire_department', 'pets', 'directions_car', 'login', 'logout',
  'restaurant', 'wine_bar', 'sports_bar', 'coffee', 'local_pizza', 'cake',
  'kayaking', 'hiking', 'directions_bike', 'surfing', 'fishing', 'campaign',
  'cleaning_services', 'iron', 'local_laundry_service', 'wifi', 'electric_bolt', 'shower',
];

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
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Add-ons
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">
        Extras guests can purchase at checkout. Leave empty if you don't offer any.
      </p>

      @if (rows.length === 0) {
        <div class="rounded-2xl border border-dashed border-dark-text/15 bg-white p-8 text-center mb-6">
          <p class="text-sm font-body text-muted-text mb-4">No add-ons yet.</p>
          <button type="button" (click)="addRow()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-trinidad text-white text-sm font-button font-bold hover:bg-trinidad/90 transition-colors">
            <span class="material-symbols-outlined text-base">add</span>
            Add your first add-on
          </button>
        </div>
      } @else {
        <div class="space-y-3 mb-4">
          @for (row of rows; track row.id; let i = $index) {
            <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
              <div class="flex items-start gap-4 mb-4">

                <!-- Art tile: photo if uploaded, otherwise the chosen icon. Click to pick icon; small overlay button uploads/replaces photo. -->
                <div class="relative shrink-0">
                  <button type="button" (click)="toggleIconPicker(row.id)"
                    class="w-16 h-16 rounded-xl bg-cream/80 border-2 border-dark-text/15 inline-flex items-center justify-center overflow-hidden hover:border-trinidad transition-colors"
                    [title]="row.photo ? 'Click art to change icon' : 'Pick an icon'">
                    @if (row.photo) {
                      <img [src]="row.photo" alt="" class="w-full h-full object-cover">
                    } @else {
                      <span class="material-symbols-outlined text-3xl text-trinidad">{{ row.icon || defaultIcon }}</span>
                    }
                  </button>
                  <!-- Upload / replace photo -->
                  <label class="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-trinidad text-white inline-flex items-center justify-center cursor-pointer shadow-md hover:bg-trinidad/90 transition-colors"
                    [title]="row.photo ? 'Replace photo' : 'Add photo'">
                    <span class="material-symbols-outlined text-[14px]">{{ row.photo ? 'sync' : 'photo_camera' }}</span>
                    <input type="file" accept="image/*" class="sr-only" (change)="onPhotoChange($event, i)">
                  </label>
                  @if (row.photo) {
                    <button type="button" (click)="clearPhoto(i)"
                      class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-dark-text/15 text-muted-text inline-flex items-center justify-center hover:text-trinidad hover:border-trinidad transition-colors"
                      title="Remove photo">
                      <span class="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  }

                  <!-- Icon picker popover -->
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
        <button type="button" (click)="addRow()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-dark-text/15 bg-white text-dark-text text-sm font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">
          <span class="material-symbols-outlined text-base">add</span>
          Add another
        </button>
      }
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
  readonly defaultIcon = DEFAULT_ICON;

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
