import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IReview, starState } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-review-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-card.component.html',
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: IReview;
  /** Helpful-vote display state — parent component reads from
   *  ReviewService and feeds these inputs so the card stays purely
   *  presentational. */
  @Input() helpfulCount = 0;
  @Input() hasVoted = false;
  /** Fired when the helpful button is tapped. Parent persists via
   *  ReviewService.toggleHelpful. */
  @Output() helpfulToggle = new EventEmitter<void>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly starState = starState;

  /** Only show the helpful button on real user-submitted reviews — the
   *  bookingId acts as the per-review identifier. Seeded mock reviews
   *  have no stable id. */
  get canVote(): boolean { return !!this.review.bookingId; }
  get hasPhotos(): boolean { return !!this.review.photos?.length; }
}
