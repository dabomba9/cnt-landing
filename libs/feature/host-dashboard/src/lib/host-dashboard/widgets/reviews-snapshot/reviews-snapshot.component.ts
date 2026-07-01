import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IPrivateListing, IReview, IUserReview, ReviewService, ToastService, getListingDetail } from '@cnt-workspace/data-access';
import { ReviewCardComponent } from '@cnt-workspace/ui';

interface IRecentReview {
  review: IReview;
  listingTitle: string;
  listingId: number;
  rating: number;
}

@Component({
  selector: 'cnt-reviews-snapshot',
  standalone: true,
  imports: [FormsModule, ReviewCardComponent],
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
            <div>
              <div class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2 truncate">{{ item.listingTitle }}</div>
              <cnt-review-card [review]="item.review"></cnt-review-card>
              @if (item.review.bookingId) {
                @if (respondingBookingId === item.review.bookingId) {
                  <div class="mt-2 rounded-2xl border border-trinidad/30 bg-trinidad/5 p-3">
                    <div class="text-[0.6rem] font-label uppercase tracking-[0.12em] font-bold text-trinidad mb-2">{{ item.review.hostResponse ? 'Edit your response' : 'Respond to this review' }}</div>
                    <textarea [(ngModel)]="responseDraft" [name]="'resp-' + item.review.bookingId" rows="3" maxlength="600"
                      placeholder="Thanks for the kind words, see you next year…"
                      class="w-full bg-white border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 resize-none"></textarea>
                    <div class="flex items-center justify-end gap-2 mt-2">
                      <button type="button" (click)="cancelRespond()" class="px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-muted-text text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Cancel</button>
                      <button type="button" (click)="saveResponse()" [disabled]="!responseDraft.trim()" class="px-3 py-1.5 rounded-full bg-trinidad text-white text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 transition-opacity">{{ item.review.hostResponse ? 'Update' : 'Post response' }}</button>
                    </div>
                  </div>
                } @else if (item.review.hostResponse) {
                  <div class="mt-2 flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold">
                    <button type="button" (click)="openRespond(item.review)" class="text-dark-text hover:text-trinidad transition-colors">Edit response</button>
                    <span class="text-dark-text/20">·</span>
                    <button type="button" (click)="removeResponse(item.review.bookingId)" class="text-muted-text hover:text-trinidad transition-colors">Remove</button>
                  </div>
                } @else {
                  <button type="button" (click)="openRespond(item.review)" class="mt-2 inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline">
                    <span class="material-symbols-outlined text-sm">reply</span>
                    Respond
                  </button>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ReviewsSnapshotComponent implements OnInit, OnDestroy {
  @Input() set listings(value: IPrivateListing[]) {
    this._listings = value || [];
    this.compute();
  }
  private _listings: IPrivateListing[] = [];
  private allUserReviews: IUserReview[] = [];
  private sub: Subscription | null = null;

  recent: IRecentReview[] = [];
  averageRating = '—';
  totalReviews = 0;

  /** Inline respond editor state — shared across cards (one at a time). */
  respondingBookingId: string | null = null;
  responseDraft = '';

  constructor(private reviewSvc: ReviewService, private toasts: ToastService) {}

  ngOnInit(): void {
    this.sub = this.reviewSvc.reviews$.subscribe(all => {
      this.allUserReviews = all;
      this.compute();
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  openRespond(r: IReview): void {
    if (!r.bookingId) return;
    this.respondingBookingId = r.bookingId;
    this.responseDraft = r.hostResponse?.text ?? '';
  }
  cancelRespond(): void { this.respondingBookingId = null; this.responseDraft = ''; }
  saveResponse(): void {
    const id = this.respondingBookingId;
    if (!id) return;
    this.reviewSvc.setHostResponse(id, this.responseDraft);
    this.toasts.success('Response posted.');
    this.cancelRespond();
  }
  removeResponse(bookingId: string | undefined): void {
    if (!bookingId) return;
    this.reviewSvc.setHostResponse(bookingId, null);
    this.toasts.info('Response removed.');
  }

  /** Map a UserReview to the IReview display shape, carrying response fields. */
  private userReviewAsReview(r: IUserReview): IReview {
    return {
      authorName: r.authorName,
      authorInitials: r.authorInitials,
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      rating: r.rating,
      text: r.text || '(No comment)',
      bookingId: r.bookingId,
      hostResponse: r.hostResponse,
    };
  }

  private compute(): void {
    if (this._listings.length === 0) {
      this.recent = [];
      this.averageRating = '—';
      this.totalReviews = 0;
      return;
    }
    const all: IRecentReview[] = [];
    let totalReviews = 0;
    let weightedSum = 0;
    const listingIds = new Set(this._listings.map(l => l.id));
    // Real user reviews first (newest-first), so a host's actual feedback
    // leads the snapshot instead of being buried under seeded mocks.
    const realByListing = new Map<number, IUserReview[]>();
    for (const r of this.allUserReviews) {
      if (!listingIds.has(r.listingId)) continue;
      const list = realByListing.get(r.listingId) ?? [];
      list.push(r);
      realByListing.set(r.listingId, list);
    }
    for (const listing of this._listings) {
      const detail = getListingDetail(listing);
      totalReviews += listing.reviewCount;
      weightedSum += listing.rating * listing.reviewCount;
      const realForThis = (realByListing.get(listing.id) ?? [])
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const r of realForThis) {
        all.push({ review: this.userReviewAsReview(r), listingTitle: listing.title, listingId: listing.id, rating: r.rating });
      }
      for (const r of detail.reviews.slice(0, 2)) {
        all.push({ review: r, listingTitle: listing.title, listingId: listing.id, rating: r.rating });
      }
    }
    this.recent = all.slice(0, 4);
    this.averageRating = totalReviews > 0 ? (weightedSum / totalReviews).toFixed(2) : '—';
    this.totalReviews = totalReviews;
  }
}
