import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listing, CATEGORY_META, AMENITY_LABELS } from '../search-results/mock-listings.data';

@Component({
  selector: 'cnt-listing-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './listing-card.component.html',
})
export class ListingCardComponent {
  @Input({ required: true }) listing!: Listing;
  @Input() isFavorite = false;
  @Output() favoriteToggle = new EventEmitter<MouseEvent>();

  CATEGORY_META = CATEGORY_META;
  AMENITY_LABELS = AMENITY_LABELS;

  onFavoriteClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggle.emit(event);
  }
}
