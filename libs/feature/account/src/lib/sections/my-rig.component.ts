import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MyRv, readMyRv, writeMyRv, emptyMyRv, RV_TYPES, RvType, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-account-my-rig',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8 space-y-6">
      <div>
        <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Your rig</span>
        <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">My RV</h2>
        <p class="text-xs text-muted-text font-body">Hosts use this to make sure their site fits your setup.</p>
      </div>

      <div>
        <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">RV type</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          @for (t of rvTypes; track t.id) {
            <button type="button" (click)="rv.type = (rv.type === t.id ? null : t.id)"
              [ngClass]="rv.type === t.id ? 'bg-trinidad text-white border-trinidad' : 'bg-white text-dark-text border-dark-text/15 hover:border-trinidad'"
              class="border rounded-xl p-3 flex flex-col items-center gap-2 transition-colors">
              <img [src]="t.image" [alt]="t.label" class="h-10 w-auto object-contain">
              <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] font-bold">{{ t.label }}</span>
            </button>
          }
        </div>
      </div>

      <div>
        <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-3">Dimensions</div>
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
          <div class="rounded-xl border border-dashed border-dark-text/20 p-4 bg-cream/30">
            <div class="text-xs font-body font-bold text-dark-text mb-2">RV photo</div>
            @if (rv.rvPhoto) {
              <img [src]="rv.rvPhoto" alt="RV photo" class="w-full h-32 object-cover rounded-lg mb-2">
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
          <div class="rounded-xl border border-dashed border-dark-text/20 p-4 bg-cream/30">
            <div class="text-xs font-body font-bold text-dark-text mb-2">License plate</div>
            @if (rv.licensePhoto) {
              <img [src]="rv.licensePhoto" alt="License plate" class="w-full h-32 object-cover rounded-lg mb-2">
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
        <button type="button" (click)="save()" class="px-6 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">Save</button>
      </div>
    </div>
  `,
})
export class MyRigSectionComponent implements OnInit {
  rv: MyRv = emptyMyRv();
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

  save(): void {
    writeMyRv(this.platformId, { ...this.rv, type: this.rv.type as RvType | null });
    this.toasts.success('Rig details saved.');
  }
}
