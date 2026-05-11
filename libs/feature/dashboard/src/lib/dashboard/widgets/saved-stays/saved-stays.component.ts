import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listing } from '@cnt-workspace/data-access';
import { ListingCardComponent } from '@cnt-workspace/ui';

@Component({
  selector: 'cnt-saved-stays',
  standalone: true,
  imports: [CommonModule, RouterLink, ListingCardComponent],
  template: `
    @if (savedListings.length === 0) {
      <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-10 md:p-14 text-center">
        <span class="w-14 h-14 mx-auto rounded-full bg-trinidad/10 inline-flex items-center justify-center">
          <span class="material-symbols-outlined text-2xl text-trinidad" aria-hidden="true" style="font-variation-settings: 'FILL' 0;">favorite</span>
        </span>
        <h3 class="font-headline font-bold text-xl mt-4 mb-2 text-dark-text">No saved stays yet</h3>
        <p class="text-sm font-body text-muted-text mb-5 max-w-md mx-auto">Tap the heart on any listing to keep track of stays you're considering.</p>
        <a routerLink="/search" class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_8px_20px_rgba(227,83,13,0.2)]">
          Browse stays
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </a>
      </div>
    } @else {
      <div class="relative">
        <!-- Track -->
        <div #track class="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-pl-1 pb-2 [&::-webkit-scrollbar]:hidden" style="scrollbar-width: none;">
          @for (l of savedListings; track l.id) {
            <div class="snap-start shrink-0 w-[calc(85%-12px)] sm:w-[calc(50%-10px)] lg:w-[calc(33.33%-14px)] xl:w-[calc(25%-15px)]">
              <cnt-listing-card [listing]="l"></cnt-listing-card>
            </div>
          }
        </div>

        <!-- Arrow buttons (md+) -->
        @if (savedListings.length > 1) {
          <button type="button" (click)="scrollByCard(-1)" aria-label="Previous"
            class="hidden md:flex absolute -left-3 top-[140px] -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-dark-text/8 items-center justify-center hover:scale-105 transition-transform z-10">
            <span class="material-symbols-outlined text-lg text-dark-text">chevron_left</span>
          </button>
          <button type="button" (click)="scrollByCard(1)" aria-label="Next"
            class="hidden md:flex absolute -right-3 top-[140px] -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-dark-text/8 items-center justify-center hover:scale-105 transition-transform z-10">
            <span class="material-symbols-outlined text-lg text-dark-text">chevron_right</span>
          </button>
        }
      </div>
    }
  `,
})
export class SavedStaysWidgetComponent {
  @Input() savedListings: Listing[] = [];
  @ViewChild('track') trackEl?: ElementRef<HTMLDivElement>;

  scrollByCard(direction: 1 | -1): void {
    const el = this.trackEl?.nativeElement;
    if (!el) return;
    // Find the first child to compute one-card width including gap.
    const first = el.querySelector<HTMLDivElement>('div.snap-start');
    if (!first) return;
    const cardWidth = first.getBoundingClientRect().width;
    const gap = 20; // matches gap-5
    el.scrollBy({ left: direction * (cardWidth + gap), behavior: 'smooth' });
  }
}
