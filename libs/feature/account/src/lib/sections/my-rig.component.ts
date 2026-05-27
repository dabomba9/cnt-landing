import { Component, EventEmitter, Input, OnInit, Output, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IMyRv, IMyRvProfile, ITowVehicle, RV_TYPES, ToastService,
  isMyRvComplete, myRvMissingFields, rvTypeLabel, emptyMyRvProfile,
  isTowableRv, emptyTowVehicle, towVehicleHasData,
  listMyRvProfiles, getActiveRvProfileId, addMyRvProfile, updateMyRvProfile,
  deleteMyRvProfile, setActiveRvProfile,
} from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-account-my-rig',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8 space-y-6">
      <div>
        <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Your rigs</span>
        <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">My RVs</h2>
        <p class="text-xs text-muted-text font-body">Save every rig you travel with. Hosts use the active one to confirm fit. <span class="text-trinidad font-bold">RV type, dimensions, and license plate are required to book any stay.</span></p>
      </div>

      @if (redirectAfterSave) {
        <div class="rounded-xl bg-jungle-green/5 border border-jungle-green/30 p-3 flex items-start gap-2 text-sm font-body text-dark-text">
          <span class="material-symbols-outlined text-base shrink-0 mt-0.5 text-jungle-green">info</span>
          <span class="flex-1">Finish your rig profile to continue your booking. We'll take you back as soon as you save.</span>
        </div>
      }

      <!-- Saved profiles -->
      <div class="space-y-3">
        <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Saved RVs</div>
        @if (profiles.length === 0) {
          <p class="text-sm font-body text-muted-text">No RVs saved yet — add your first rig below.</p>
        } @else {
          <div class="space-y-2">
            @for (p of profiles; track p.id) {
              <div class="rounded-xl border p-4 flex flex-wrap items-center gap-3"
                [ngClass]="p.id === editingId ? 'border-trinidad/40 bg-trinidad/5' : 'border-dark-text/10 bg-cream/30'">
                <div class="flex-1 min-w-[12rem]">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-headline font-bold text-dark-text text-sm">{{ p.name }}</span>
                    @if (p.id === activeId) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-jungle-green text-white text-[0.55rem] font-label uppercase tracking-[0.1em] font-bold">Active</span>
                    }
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.55rem] font-label uppercase tracking-[0.1em] font-bold"
                      [ngClass]="isProfileComplete(p) ? 'bg-jungle-green/10 text-jungle-green' : 'bg-trinidad/10 text-trinidad'">
                      {{ isProfileComplete(p) ? 'Ready to book' : 'Incomplete' }}
                    </span>
                  </div>
                  <div class="text-xs font-body text-muted-text mt-0.5">{{ rvTypeLabel(p.type) }} · {{ dimsLabel(p) }}</div>
                  @if (isTowableRv(p.type) && towVehicleHasData(p.towVehicle)) {
                    <div class="text-xs font-body text-muted-text mt-0.5">Towed by {{ towVehicleLabel(p.towVehicle) }}</div>
                  }
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  @if (p.id !== activeId) {
                    <button type="button" (click)="setActive(p.id)"
                      class="px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-jungle-green hover:text-jungle-green transition-colors">Set active</button>
                  }
                  <button type="button" (click)="editProfile(p.id)"
                    class="px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">Edit</button>
                  @if (confirmingDeleteId === p.id) {
                    <button type="button" (click)="deleteProfile(p.id)"
                      class="px-3 py-1.5 rounded-full bg-trinidad text-white text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 transition-opacity">Confirm</button>
                    <button type="button" (click)="confirmingDeleteId = null"
                      class="px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-muted-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Cancel</button>
                  } @else {
                    <button type="button" (click)="confirmingDeleteId = p.id" aria-label="Delete this RV profile"
                      class="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white border border-dark-text/15 text-muted-text hover:border-trinidad hover:text-trinidad transition-colors">
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
        <button type="button" (click)="addProfile()"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-dashed border-dark-text/25 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">
          <span class="material-symbols-outlined text-base">add</span>
          Add another RV
        </button>
      </div>

      <!-- Editor -->
      @if (editingId) {
        <div class="border-t border-dark-text/8 pt-6 space-y-6">
          @if (!isComplete && hasAny) {
            <div class="rounded-xl bg-trinidad/5 border border-trinidad/30 p-3 flex items-start gap-2 text-sm font-body text-dark-text">
              <span class="material-symbols-outlined text-base shrink-0 mt-0.5 text-trinidad">error</span>
              <span class="flex-1">Still needed: <span class="font-bold">{{ missingLabel }}</span>.</span>
            </div>
          }

          <label class="flex flex-col gap-2">
            <span class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Name this RV</span>
            <input type="text" [(ngModel)]="rv.name" name="rvName" placeholder="The Big Rig, Weekend Teardrop…" maxlength="40"
              class="bg-cream/60 border border-dark-text/15 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
          </label>

          <div>
            <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">RV type <span class="text-trinidad">*</span></div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              @for (t of rvTypes; track t.id) {
                <button type="button" (click)="rv.type = (rv.type === t.id ? null : t.id)"
                  [attr.aria-pressed]="rv.type === t.id"
                  [ngClass]="rv.type === t.id ? 'bg-trinidad/10 text-trinidad' : 'text-dark-text hover:bg-cream/60'"
                  class="rounded-xl p-3 flex flex-col items-center gap-2 transition-colors text-center">
                  <img [src]="t.image" [alt]="t.label" class="h-10 w-auto object-contain" [class.opacity-90]="rv.type !== t.id">
                  <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] font-bold">{{ t.label }}</span>
                </button>
              }
            </div>
          </div>

          <div>
            <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">Vehicle details</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label class="flex flex-col gap-2">
                <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Year</span>
                <input type="number" [(ngModel)]="rv.year" name="year" placeholder="2024" min="1900" max="2100"
                  class="bg-cream/60 border border-dark-text/15 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Make</span>
                <input type="text" [(ngModel)]="rv.make" name="make" placeholder="Winnebago"
                  class="bg-cream/60 border border-dark-text/15 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Model</span>
                <input type="text" [(ngModel)]="rv.model" name="model" placeholder="Revel"
                  class="bg-cream/60 border border-dark-text/15 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">License plate <span class="text-trinidad">*</span></span>
                <input type="text" [(ngModel)]="rv.licensePlate" name="licensePlate" placeholder="ABC-1234" maxlength="10"
                  class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2.5 text-sm font-body uppercase focus:outline-none focus:border-jungle-green">
              </label>
            </div>
          </div>

          @if (isTowableRv(rv.type)) {
            @if (rv.towVehicle; as tow) {
              <div>
                <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-1">Tow vehicle</div>
                <p class="text-xs font-body text-muted-text mb-3">Your rig is towable — tell hosts what's pulling it so they can picture your full setup.</p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label class="flex flex-col gap-2">
                    <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Year</span>
                    <input type="number" [(ngModel)]="tow.year" name="towYear" placeholder="2020" min="1900" max="2100"
                      class="bg-cream/60 border border-dark-text/15 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                  </label>
                  <label class="flex flex-col gap-2">
                    <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Make</span>
                    <input type="text" [(ngModel)]="tow.make" name="towMake" placeholder="Ford"
                      class="bg-cream/60 border border-dark-text/15 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                  </label>
                  <label class="flex flex-col gap-2">
                    <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Model</span>
                    <input type="text" [(ngModel)]="tow.model" name="towModel" placeholder="F-250"
                      class="bg-cream/60 border border-dark-text/15 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                  </label>
                  <label class="flex flex-col gap-2">
                    <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">License plate</span>
                    <input type="text" [(ngModel)]="tow.licensePlate" name="towPlate" placeholder="ABC-1234" maxlength="10"
                      class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2.5 text-sm font-body uppercase focus:outline-none focus:border-jungle-green">
                  </label>
                  <label class="flex flex-col gap-2">
                    <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Length</span>
                    <div class="flex items-center bg-cream/60 border border-dark-text/15 rounded-xl overflow-hidden">
                      <input type="number" [(ngModel)]="tow.length" name="towLength" placeholder="0" class="flex-1 px-3 py-2.5 text-sm font-body focus:outline-none bg-transparent">
                      <span class="px-3 py-2.5 text-[0.65rem] font-label uppercase tracking-[0.1em] bg-dark-text/5 border-l border-dark-text/10">ft</span>
                    </div>
                  </label>
                </div>
                <div class="rounded-md border border-dark-text/8 p-4 bg-cream/30 mt-3">
                  <div class="text-xs font-body font-bold text-dark-text mb-2">Tow vehicle photo</div>
                  @if (tow.photo) {
                    <img [src]="tow.photo" alt="Tow vehicle" class="w-full h-32 object-cover rounded-md mb-2">
                  }
                  <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors cursor-pointer">
                    <span class="material-symbols-outlined text-base">photo_camera</span>
                    {{ tow.photo ? 'Change' : 'Upload' }}
                    <input type="file" accept="image/*" (change)="onTowPhoto($event)" class="hidden">
                  </label>
                  @if (tow.photo) {
                    <button type="button" (click)="tow.photo = null" class="ml-2 text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad">Remove</button>
                  }
                </div>
              </div>
            }
          }

          <div>
            <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">Dimensions <span class="text-trinidad">*</span></div>
            <div class="grid grid-cols-3 gap-3">
              @for (f of dimensions; track f.key) {
                <label class="flex flex-col gap-2">
                  <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">{{ f.label }}</span>
                  <div class="flex items-center bg-cream/60 border border-dark-text/15 rounded-xl overflow-hidden">
                    <input type="number" [(ngModel)]="rv[f.key]" [name]="f.key" placeholder="0" class="flex-1 px-3 py-2.5 text-sm font-body focus:outline-none bg-transparent">
                    <span class="px-3 py-2.5 text-[0.65rem] font-label uppercase tracking-[0.1em] bg-dark-text/5 border-l border-dark-text/10">ft</span>
                  </div>
                </label>
              }
            </div>
          </div>

          <div>
            <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">Fuel</div>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex flex-col gap-2">
                <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">MPG</span>
                <div class="flex items-center bg-cream/60 border border-dark-text/15 rounded-xl overflow-hidden">
                  <input type="number" min="0" step="0.1" [(ngModel)]="rv.mpg" name="mpg" placeholder="0" class="flex-1 px-3 py-2.5 text-sm font-body focus:outline-none bg-transparent">
                  <span class="px-3 py-2.5 text-[0.65rem] font-label uppercase tracking-[0.1em] bg-dark-text/5 border-l border-dark-text/10">mi/gal</span>
                </div>
              </label>
              <label class="flex flex-col gap-2">
                <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Tank capacity</span>
                <div class="flex items-center bg-cream/60 border border-dark-text/15 rounded-xl overflow-hidden">
                  <input type="number" min="0" step="1" [(ngModel)]="rv.fuelTankGallons" name="fuelTankGallons" placeholder="0" class="flex-1 px-3 py-2.5 text-sm font-body focus:outline-none bg-transparent">
                  <span class="px-3 py-2.5 text-[0.65rem] font-label uppercase tracking-[0.1em] bg-dark-text/5 border-l border-dark-text/10">gal</span>
                </div>
              </label>
            </div>
            <p class="text-[0.65rem] text-muted-text mt-2">Used by the trip planner to estimate fuel cost and warn when a leg exceeds your tank range.</p>
          </div>

          <div>
            <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">Photos</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="rounded-md border border-dark-text/8 p-4 bg-cream/30">
                <div class="text-xs font-body font-bold text-dark-text mb-2">RV photo</div>
                @if (rv.rvPhoto) {
                  <img [src]="rv.rvPhoto" alt="RV photo" class="w-full h-32 object-cover rounded-md mb-2">
                }
                <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors cursor-pointer">
                  <span class="material-symbols-outlined text-base">photo_camera</span>
                  {{ rv.rvPhoto ? 'Change' : 'Upload' }}
                  <input type="file" accept="image/*" (change)="onPhoto($event, 'rvPhoto')" class="hidden">
                </label>
                @if (rv.rvPhoto) {
                  <button type="button" (click)="rv.rvPhoto = null" class="ml-2 text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad">Remove</button>
                }
              </div>
              <div class="rounded-md border border-dark-text/8 p-4 bg-cream/30">
                <div class="text-xs font-body font-bold text-dark-text mb-2">License plate</div>
                @if (rv.licensePhoto) {
                  <img [src]="rv.licensePhoto" alt="License plate" class="w-full h-32 object-cover rounded-md mb-2">
                }
                <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors cursor-pointer">
                  <span class="material-symbols-outlined text-base">photo_camera</span>
                  {{ rv.licensePhoto ? 'Change' : 'Upload' }}
                  <input type="file" accept="image/*" (change)="onPhoto($event, 'licensePhoto')" class="hidden">
                </label>
                @if (rv.licensePhoto) {
                  <button type="button" (click)="rv.licensePhoto = null" class="ml-2 text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad">Remove</button>
                }
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-5 border-t border-dark-text/8">
            <button type="button" (click)="clear()" class="px-5 py-2.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Clear</button>
            <button type="button" (click)="cancelEdit()" class="px-5 py-2.5 rounded-full bg-white border border-dark-text/15 text-muted-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Done</button>
            <button type="button" (click)="save()" class="px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">Save</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class MyRigSectionComponent implements OnInit {
  /** If set, the parent will redirect here once the rig is complete and saved. */
  @Input() redirectAfterSave: string | null = null;
  /** Fires when a save completes with a fully complete rig — parent can use this to bounce back. */
  @Output() done = new EventEmitter<void>();

  profiles: IMyRvProfile[] = [];
  activeId: string | null = null;
  /** Profile currently bound to the editor form, or null for list-only view. */
  editingId: string | null = null;
  confirmingDeleteId: string | null = null;
  /** Working copy bound by the form. */
  rv: IMyRvProfile = emptyMyRvProfile();

  readonly rvTypes = RV_TYPES;
  readonly rvTypeLabel = rvTypeLabel;
  readonly isTowableRv = isTowableRv;
  readonly towVehicleHasData = towVehicleHasData;
  readonly dimensions: { key: 'length' | 'height' | 'width'; label: string }[] = [
    { key: 'length', label: 'Length' },
    { key: 'height', label: 'Height' },
    { key: 'width',  label: 'Width' },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: object, private toasts: ToastService) {}

  ngOnInit(): void {
    this.refresh();
    if (this.redirectAfterSave) {
      // Land the guest straight on a form so they can finish and bounce back.
      const target = this.profiles.find(p => p.id === this.activeId) ?? this.profiles[0];
      if (target) this.editProfile(target.id);
      else this.addProfile();
    }
  }

  private refresh(): void {
    this.profiles = listMyRvProfiles(this.platformId);
    this.activeId = getActiveRvProfileId(this.platformId);
  }

  isProfileComplete(p: IMyRv): boolean { return isMyRvComplete(p); }

  dimsLabel(p: IMyRv): string {
    if (!p.length && !p.height && !p.width) return 'Dimensions not set';
    return `${p.length ?? '—'} × ${p.height ?? '—'} × ${p.width ?? '—'} ft (L×H×W)`;
  }

  editProfile(id: string): void {
    const p = this.profiles.find(x => x.id === id);
    if (!p) return;
    this.editingId = id;
    // Working copy always carries a non-null towVehicle so the form can bind.
    this.rv = { ...p, towVehicle: p.towVehicle ? { ...p.towVehicle } : emptyTowVehicle() };
    this.confirmingDeleteId = null;
  }

  /** Year/make/model of a tow vehicle, for the profile-card "Towed by" line. */
  towVehicleLabel(t: ITowVehicle | null): string {
    if (!t) return '';
    return [t.year, t.make, t.model].filter(Boolean).join(' ') || 'tow vehicle';
  }

  onTowPhoto(e: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.rv.towVehicle) return;
    const reader = new FileReader();
    reader.onload = () => { if (this.rv.towVehicle) this.rv.towVehicle.photo = reader.result as string; };
    reader.readAsDataURL(file);
  }

  addProfile(): void {
    const created = addMyRvProfile(this.platformId, 'My RV ' + (this.profiles.length + 1));
    this.refresh();
    this.editProfile(created.id);
  }

  setActive(id: string): void {
    setActiveRvProfile(this.platformId, id);
    this.refresh();
    this.toasts.info('Active rig updated.');
  }

  deleteProfile(id: string): void {
    deleteMyRvProfile(this.platformId, id);
    if (this.editingId === id) this.editingId = null;
    this.confirmingDeleteId = null;
    this.refresh();
    this.toasts.info('RV profile removed.');
  }

  cancelEdit(): void {
    this.editingId = null;
    this.confirmingDeleteId = null;
  }

  onPhoto(e: Event, key: 'rvPhoto' | 'licensePhoto'): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.rv[key] = reader.result as string; };
    reader.readAsDataURL(file);
  }

  clear(): void {
    if (!this.editingId) return;
    this.rv = { ...emptyMyRvProfile(this.rv.name), id: this.rv.id, towVehicle: emptyTowVehicle() };
    updateMyRvProfile(this.platformId, this.editingId, { ...this.rv, towVehicle: null });
    this.refresh();
    this.toasts.info('Rig details cleared.');
  }

  get isComplete(): boolean { return isMyRvComplete(this.rv); }
  get hasAny(): boolean { return !!(this.rv.type || this.rv.length || this.rv.height || this.rv.width || this.rv.licensePlate); }
  get missingLabel(): string {
    const missing = myRvMissingFields(this.rv);
    if (missing.length === 0) return '';
    if (missing.length === 1) return missing[0];
    return missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];
  }

  save(): void {
    if (!this.editingId) return;
    // Keep the tow vehicle only when the rig is towable and something was entered.
    const tow = isTowableRv(this.rv.type) && towVehicleHasData(this.rv.towVehicle) ? this.rv.towVehicle : null;
    updateMyRvProfile(this.platformId, this.editingId, { ...this.rv, towVehicle: tow });
    const complete = this.isComplete;
    if (complete && this.redirectAfterSave) {
      // The listing we bounce back to evaluates the active rig — make it this one.
      setActiveRvProfile(this.platformId, this.editingId);
      this.toasts.success('Rig saved — taking you back to your booking.');
      this.done.emit();
      return;
    }
    this.refresh();
    if (complete) {
      this.toasts.success('Rig details saved — ready to book.');
    } else {
      this.toasts.info(`Saved. Add ${this.missingLabel} to book a stay.`);
    }
  }
}
