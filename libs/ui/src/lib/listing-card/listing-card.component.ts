import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IListing, IListingDetail, IMyRvProfile, getListingDetail, addOnCountForListing, rvTypeLabel, ReviewService, CATEGORY_META, AMENITY_LABELS, NEW_LISTING_IDS, BEST_VALUE_IDS } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-listing-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './listing-card.component.html',
})
export class ListingCardComponent {
  @Input({ required: true }) listing!: IListing;
  @Input() isFavorite = false;
  /** Optional. When > 0, the price chip reveals a "$price × N nights = $total" bubble on hover. */
  @Input() nights = 0;
  /** Optional. When set, the card shows a "Fits / Too long for your <rig>" pill. */
  @Input() rvProfile: IMyRvProfile | null = null;
  /** When true, render an "Add to trip" pill at the bottom of the card.
   *  Used by the cross-sell sections on /listing/:id; the search results
   *  + dashboard saved lists don't show it (different routing patterns). */
  @Input() showAddToTrip = false;
  @Output() favoriteToggle = new EventEmitter<MouseEvent>();
  @Output() addToTripClick = new EventEmitter<MouseEvent>();

  get hoverTotal(): number | null {
    if (this.listing.kind === 'boondocking') return null;
    return this.nights > 0 ? this.listing.price * this.nights : null;
  }

  /** Cancellation tier worth surfacing on the card — only the
   *  guest-favorable tiers (free-cancellation policies). Strict and
   *  exclusive don't earn a chip; they'd hurt the conversion signal
   *  instead of helping it. Null for boondocking. */
  get goodCancellationChip(): { label: string; summary: string } | null {
    if (this.listing.kind === 'boondocking') return null;
    const tier = this.detail.cancellationTier;
    if (tier === 'easy-goin') return { label: "Easy Goin'", summary: 'Free cancellation up to 1 day before check-in' };
    if (tier === 'moderate')  return { label: 'Moderate',    summary: 'Free cancellation up to 3 days before check-in' };
    return null;
  }

  /** Numeric price for the template — narrowed so the union doesn't trip up Angular. */
  get listingPrice(): number {
    return this.listing.kind === 'boondocking' ? 0 : this.listing.price;
  }

  currentImageIndex = 0;
  CATEGORY_META = CATEGORY_META;
  AMENITY_LABELS = AMENITY_LABELS;

  /** Full listing detail, memoized per listing — drives both the photo
   * carousel and the per-rig fit pill from a single getListingDetail call. */
  private _detail: IListingDetail | null = null;
  private _detailForId: number | null = null;
  private get detail(): IListingDetail {
    if (this._detailForId !== this.listing.id) {
      this._detail = getListingDetail(this.listing);
      this._detailForId = this.listing.id;
      this.currentImageIndex = 0;
    }
    return this._detail!;
  }

  /** Resolved photo array (up to 5) for the carousel. */
  get photos(): string[] {
    return this.detail.photos.slice(0, 5);
  }

  /** Fit verdict for the active RV profile against this listing's max rig
   * length. Null when no profile is supplied or it has no length. Mirrors the
   * listing-detail `myRvFit` getter. */
  get rvFit(): { passes: boolean; label: string } | null {
    const rv = this.rvProfile;
    if (!rv || !rv.length) return null;
    const max = this.detail.siteSpecs.maxRigLength;
    const name = rv.name?.trim() || rvTypeLabel(rv.type);
    return rv.length > max
      ? { passes: false, label: `Too long for your ${name}` }
      : { passes: true,  label: `Fits your ${name}` };
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
    if (this.listing.kind !== 'boondocking' && this.listing.rating >= 4.8) {
      return { label: 'Guest Favorite', icon: 'workspace_premium', bg: 'bg-dark-text', fg: 'text-gold' };
    }
    return null;
  }

  constructor(private reviews: ReviewService) {}

  /** Aggregated rating + count combining the seeded baseline with any
   * user-submitted reviews. Boondocking listings have no rating; callers
   * should already guard on kind. */
  get aggregatedRating(): { rating: number; count: number } {
    if (this.listing.kind === 'boondocking') return { rating: 0, count: 0 };
    return this.reviews.aggregateRating(this.listing.rating, this.listing.reviewCount, this.listing.id);
  }

  /** Add-on count for the "+N add-ons" badge. Memoized per listing id so the
   * template getter doesn't recompute every change-detection cycle. */
  private _addOnCount = 0;
  private _addOnCountForId: number | null = null;
  get addOnCount(): number {
    if (this._addOnCountForId !== this.listing.id) {
      this._addOnCount = addOnCountForListing(this.listing);
      this._addOnCountForId = this.listing.id;
    }
    return this._addOnCount;
  }

  onFavoriteClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggle.emit(event);
  }

  onAddToTripClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.addToTripClick.emit(event);
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
