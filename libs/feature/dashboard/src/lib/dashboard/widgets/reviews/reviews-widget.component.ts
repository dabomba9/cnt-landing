import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Booking } from '@cnt-workspace/models';
import { UserReview } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-dashboard-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
      <div class="flex items-baseline justify-between gap-3 p-5 md:p-6 pb-3">
        <div>
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Feedback</span>
          <h3 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight leading-tight">Reviews</h3>
        </div>
        @if (submittedCount > 0) {
          <a routerLink="/trips" [queryParams]="{ filter: 'past' }" class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline shrink-0">
            View past trips →
          </a>
        }
      </div>

      <div class="px-5 md:px-6 pb-2 flex items-center gap-4 text-sm font-body">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base text-trinidad">edit</span>
          <span class="font-bold text-dark-text">{{ needsReview.length }}</span>
          <span class="text-muted-text">to review</span>
        </div>
        <span class="w-1 h-1 rounded-full bg-muted-text/30"></span>
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base text-jungle-green" style="font-variation-settings: 'FILL' 1;">verified</span>
          <span class="font-bold text-dark-text">{{ submittedCount }}</span>
          <span class="text-muted-text">submitted</span>
        </div>
      </div>

      @if (needsReview.length === 0 && submittedCount === 0) {
        <div class="px-5 md:px-6 pb-6 pt-3">
          <p class="text-xs text-muted-text font-body">No completed stays yet. After your first trip, leave a review here to earn $5/night credit.</p>
        </div>
      } @else if (needsReview.length === 0) {
        <div class="px-5 md:px-6 pb-6 pt-3 flex items-start gap-3">
          <span class="w-9 h-9 rounded-full bg-jungle-green/10 inline-flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-base text-jungle-green" style="font-variation-settings: 'FILL' 1;">check</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-body font-bold text-dark-text">You're all caught up</div>
            <p class="text-xs text-muted-text font-body mt-0.5">Reviews submitted on every completed trip. Nice work.</p>
          </div>
        </div>
      } @else {
        <ul class="divide-y divide-dark-text/8 mt-2">
          @for (b of needsReview.slice(0, 3); track b.id) {
            <li>
              <a [routerLink]="['/trips']" [queryParams]="{ review: b.id, filter: 'past' }"
                class="flex items-center gap-3 px-5 md:px-6 py-3 hover:bg-cream/40 transition-colors no-underline">
                <div class="w-10 h-10 rounded-md overflow-hidden bg-cream shrink-0">
                  @if (b.listingPhoto) {
                    <img [src]="b.listingPhoto" [alt]="b.listingTitle" class="w-full h-full object-cover">
                  }
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-body font-bold text-dark-text truncate">{{ b.listingTitle }}</div>
                  <div class="text-xs text-muted-text font-body truncate">{{ datesLabel(b) }} · \${{ b.total }}</div>
                </div>
                <span class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad shrink-0">Review →</span>
              </a>
            </li>
          }
        </ul>
        @if (needsReview.length > 3) {
          <a [routerLink]="['/trips']" [queryParams]="{ filter: 'past' }" class="block px-5 md:px-6 py-3 text-center text-xs uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:bg-cream/40 border-t border-dark-text/8">
            View all {{ needsReview.length }} pending reviews
          </a>
        }
      }
    </div>
  `,
})
export class ReviewsWidgetComponent {
  @Input() bookings: Booking[] = [];
  @Input() reviews: UserReview[] = [];

  get needsReview(): Booking[] {
    const now = Date.now();
    return this.bookings
      .filter(b => (b.status === 'confirmed' || b.status === 'approved')
                && new Date(b.dates.end).getTime() < now
                && !b.reviewedAt)
      .sort((a, b) => b.dates.end.localeCompare(a.dates.end));
  }

  get submittedCount(): number {
    return this.reviews.length;
  }

  datesLabel(b: Booking): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = new Date(b.dates.start).toLocaleDateString('en-US', opts);
    const end = new Date(b.dates.end).toLocaleDateString('en-US', opts);
    return `${start} – ${end}`;
  }
}
