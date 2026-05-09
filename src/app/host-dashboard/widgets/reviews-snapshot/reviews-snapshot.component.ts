import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Listing, Review, getListingDetail } from '../../../search-results/mock-listings.data';
import { ReviewCardComponent } from '../../../review-card/review-card.component';

interface RecentReview {
  review: Review;
  listingTitle: string;
  listingId: number;
  rating: number;
}

@Component({
  selector: 'cnt-reviews-snapshot',
  standalone: true,
  imports: [CommonModule, ReviewCardComponent],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      <div class="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold block mb-1">Reputation</span>
          <h3 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight leading-tight">Recent reviews</h3>
        </div>
        <div class="text-right shrink-0">
          <div class="font-headline font-bold text-jungle-green text-2xl tracking-tight leading-none flex items-baseline gap-1 justify-end">
            {{ averageRating }}
            <span class="material-symbols-outlined text-base text-trinidad" style="font-variation-settings: 'FILL' 1;">star</span>
          </div>
          <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mt-1">{{ totalReviews }} reviews</div>
        </div>
      </div>

      @if (recent.length === 0) {
        <p class="text-sm font-body text-muted-text">No reviews yet — once guests stay, their reviews show up here.</p>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (item of recent; track $index) {
            <div class="rounded-xl bg-cream/40 border border-dark-text/8 p-4">
              <div class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2 truncate">{{ item.listingTitle }}</div>
              <cnt-review-card [review]="item.review"></cnt-review-card>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ReviewsSnapshotComponent {
  @Input() set listings(value: Listing[]) {
    this._listings = value || [];
    this.compute();
  }
  private _listings: Listing[] = [];

  recent: RecentReview[] = [];
  averageRating = '—';
  totalReviews = 0;

  private compute(): void {
    if (this._listings.length === 0) {
      this.recent = [];
      this.averageRating = '—';
      this.totalReviews = 0;
      return;
    }
    const all: RecentReview[] = [];
    let totalReviews = 0;
    let weightedSum = 0;
    for (const listing of this._listings) {
      const detail = getListingDetail(listing);
      totalReviews += listing.reviewCount;
      weightedSum += listing.rating * listing.reviewCount;
      // Take the first 2 reviews from each listing — already chronologically ordered
      for (const r of detail.reviews.slice(0, 2)) {
        all.push({ review: r, listingTitle: listing.title, listingId: listing.id, rating: r.rating });
      }
    }
    this.recent = all.slice(0, 4);
    this.averageRating = totalReviews > 0 ? (weightedSum / totalReviews).toFixed(2) : '—';
    this.totalReviews = totalReviews;
  }
}
