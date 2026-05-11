import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MyRv, isMyRvSet, hasMyRvPhotos, rvTypeLabel } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-my-rv-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7 h-full flex flex-col">
      @if (isSet) {
        <h3 class="font-headline font-bold text-dark-text text-xl tracking-tight leading-tight mb-4">{{ summary }}</h3>
        <div class="relative rounded-xl bg-cream/60 border border-dark-text/8 aspect-[16/10] overflow-hidden mb-4">
          @if (myRv?.rvPhoto) {
            <img [src]="myRv!.rvPhoto" alt="Your rig" class="absolute inset-0 w-full h-full object-cover">
          } @else {
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="material-symbols-outlined text-5xl text-trinidad" style="font-variation-settings: 'FILL' 1;">rv_hookup</span>
            </div>
          }
          @if (hasPhotos) {
            <div class="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm shadow-md ring-1 ring-jungle-green/20">
              <span class="material-symbols-outlined text-[14px] text-jungle-green" style="font-variation-settings: 'FILL' 1;">verified</span>
              <span class="text-[0.6rem] font-button uppercase tracking-[0.1em] font-bold text-jungle-green">Photos verified</span>
            </div>
          }
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm font-body mb-5">
          @if (myRv?.length) {
            <div>
              <div class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text font-bold">Length</div>
              <div class="font-bold text-dark-text">{{ myRv?.length }} ft</div>
            </div>
          }
          @if (myRv?.height) {
            <div>
              <div class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text font-bold">Height</div>
              <div class="font-bold text-dark-text">{{ myRv?.height }} ft</div>
            </div>
          }
        </div>
        <a routerLink="/search" [queryParams]="{ openRv: 1 }" class="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">
          Edit profile
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </a>
      } @else {
        <div class="flex-1 flex flex-col items-start gap-3">
          <span class="w-12 h-12 rounded-full bg-trinidad/10 inline-flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl text-trinidad">rv_hookup</span>
          </span>
          <h3 class="font-headline font-bold text-dark-text text-xl tracking-tight leading-tight">Add your rig</h3>
          <p class="text-sm text-muted-text font-body leading-relaxed">Hosts use your rig profile to confirm fit. Saved once and reused on every booking.</p>
          <a routerLink="/search" [queryParams]="{ openRv: 1 }" class="mt-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-trinidad text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">
            Set up profile
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </a>
        </div>
      }
    </div>
  `,
})
export class MyRvSummaryWidgetComponent {
  @Input() myRv: MyRv | null = null;

  get isSet(): boolean { return this.myRv ? isMyRvSet(this.myRv) : false; }
  get hasPhotos(): boolean { return this.myRv ? hasMyRvPhotos(this.myRv) : false; }
  get summary(): string {
    if (!this.myRv) return '';
    const type = rvTypeLabel(this.myRv.type);
    return this.myRv.length ? `${type} · ${this.myRv.length} ft` : type;
  }
}
