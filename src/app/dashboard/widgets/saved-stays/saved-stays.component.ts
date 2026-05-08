import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listing } from '../../../search-results/mock-listings.data';
import { ListingCardComponent } from '../../../listing-card/listing-card.component';

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
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        @for (l of savedListings.slice(0, 4); track l.id) {
          <cnt-listing-card [listing]="l"></cnt-listing-card>
        }
      </div>
    }
  `,
})
export class SavedStaysWidgetComponent {
  @Input() savedListings: Listing[] = [];
}
