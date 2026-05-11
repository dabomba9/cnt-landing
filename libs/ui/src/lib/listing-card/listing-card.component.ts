import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listing, getListingDetail, CATEGORY_META, AMENITY_LABELS, NEW_LISTING_IDS, BEST_VALUE_IDS } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-listing-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './listing-card.component.html',
})
export class ListingCardComponent {
  @Input({ required: true }) listing!: Listing;
  @Input() isFavorite = false;
  /** Optional. When > 0, the price chip reveals a "$price × N nights = $total" bubble on hover. */
  @Input() nights = 0;
  @Output() favoriteToggle = new EventEmitter<MouseEvent>();

  get hoverTotal(): number | null {
    return this.nights > 0 ? this.listing.price * this.nights : null;
  }

  currentImageIndex = 0;
  CATEGORY_META = CATEGORY_META;
  AMENITY_LABELS = AMENITY_LABELS;

  /** Resolved photo array (up to 5) for the carousel. Memoized per listing. */
  private _photos: string[] | null = null;
  private _photosForId: number | null = null;
  get photos(): string[] {
    if (this._photosForId !== this.listing.id) {
      this._photos = getListingDetail(this.listing).photos.slice(0, 5);
      this._photosForId = this.listing.id;
      this.currentImageIndex = 0;
    }
    return this._photos!;
  }

  /**
   * Merchandising badge — at most one per card. Priority:
   *   New > Best Value > Guest Favorite (rating ≥ 4.8). Returns null when none apply.
   */
  get merchBadge(): { label: string; icon: string; bg: string; fg: string } | null {
    if (NEW_LISTING_IDS.has(this.listing.id)) {
      return { label: 'New', icon: 'auto_awesome', bg: 'bg-jungle-green', fg: 'text-white' };
    }
    if (BEST_VALUE_IDS.has(this.listing.id)) {
      return { label: 'Best Value', icon: 'verified', bg: 'bg-gold', fg: 'text-dark-text' };
    }
    if (this.listing.rating >= 4.8) {
      return { label: 'Guest Favorite', icon: 'workspace_premium', bg: 'bg-dark-text', fg: 'text-gold' };
    }
    return null;
  }

  onFavoriteClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggle.emit(event);
  }

  prevImage(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const n = this.photos.length;
    this.currentImageIndex = (this.currentImageIndex - 1 + n) % n;
  }

  nextImage(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const n = this.photos.length;
    this.currentImageIndex = (this.currentImageIndex + 1) % n;
  }

  goToImage(i: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.currentImageIndex = i;
  }
}
