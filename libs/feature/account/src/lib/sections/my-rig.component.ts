import { Component, EventEmitter, Input, OnInit, Output, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IMyRv, readMyRv, writeMyRv, emptyMyRv, RV_TYPES, RvType, ToastService, isMyRvComplete, myRvMissingFields } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-account-my-rig',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8 space-y-6">
      <div>
        <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Your rig</span>
        <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">My RV</h2>
        <p class="text-xs text-muted-text font-body">Hosts use this to confirm fit. <span class="text-trinidad font-bold">RV type, dimensions, and license plate are required to book any stay.</span></p>
      </div>

      @if (redirectAfterSave) {
        <div class="rounded-xl bg-jungle-green/5 border border-jungle-green/30 p-3 flex items-start gap-2 text-sm font-body text-dark-text">
          <span class="material-symbols-outlined text-base shrink-0 mt-0.5 text-jungle-green">info</span>
          <span class="flex-1">Finish your rig profile to continue your booking. We'll take you back as soon as you save.</span>
        </div>
      }

      @if (!isComplete && hasAny) {
        <div class="rounded-xl bg-trinidad/5 border border-trinidad/30 p-3 flex items-start gap-2 text-sm font-body text-dark-text">
          <span class="material-symbols-outlined text-base shrink-0 mt-0.5 text-trinidad">error</span>
          <span class="flex-1">Still needed: <span class="font-bold">{{ missingLabel }}</span>.</span>
        </div>
      }

      <div>
        <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">RV type <span class="text-trinidad">*</span></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          @for (t of rvTypes; track t.id) {
            <button type="button" (click)="rv.type = (rv.type === t.id ? null : t.id)"
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
        <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">Photos</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-xl border border-dark-text/8 p-4 bg-cream/30">
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
          <div class="rounded-xl border border-dark-text/8 p-4 bg-cream/30">
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
        <button type="button" (click)="save()" class="px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">Save</button>
      </div>
    </div>
  `,
})
export class MyRigSectionComponent implements OnInit {
  /** If set, the parent will redirect here once the rig is complete and saved. */
  @Input() redirectAfterSave: string | null = null;
  /** Fires when a save completes with a fully complete rig — parent can use this to bounce back. */
  @Output() done = new EventEmitter<void>();

  rv: IMyRv = emptyMyRv();
  readonly rvTypes = RV_TYPES;
  readonly dimensions: { key: 'length' | 'height' | 'width'; label: string }[] = [
    { key: 'length', label: 'Length' },
    { key: 'height', label: 'Height' },
    { key: 'width',  label: 'Width' },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: object, private toasts: ToastService) {}

  ngOnInit(): void { this.rv = readMyRv(this.platformId); }

  onPhoto(e: Event, key: 'rvPhoto' | 'licensePhoto'): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.rv[key] = reader.result as string; };
    reader.readAsDataURL(file);
  }

  clear(): void {
    this.rv = emptyMyRv();
    writeMyRv(this.platformId, this.rv);
    this.toasts.info('My Rig cleared.');
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
    writeMyRv(this.platformId, { ...this.rv, type: this.rv.type as RvType | null });
    if (this.isComplete) {
      const headedBack = !!this.redirectAfterSave;
      this.toasts.success(headedBack ? 'Rig saved — taking you back to your booking.' : 'Rig details saved — ready to book.');
      if (headedBack) this.done.emit();
    } else {
      this.toasts.info(`Saved. Add ${this.missingLabel} to book a stay.`);
    }
  }
}
