import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Review } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-review-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-card.component.html',
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;
}
