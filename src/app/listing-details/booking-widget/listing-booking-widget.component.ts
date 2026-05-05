import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  Listing, ListingDetail, CancellationTier,
} from '../../search-results/mock-listings.data';
import { MyRv, emptyMyRv, isMyRvSet, hasMyRvPhotos, rvTypeLabel } from '../../my-rv.util';
import { BookingStateService } from '../booking-state.service';

/**
 * Sidebar booking widget. Renders the "Prices include all fees" callout and
 * the price card (dates, guests, add-ons panel, summary, refund pill, CTA).
 *
 * The wrapping `<aside>` and sticky container live in the parent — this
 * component only renders the two stacked cards. Consumes the parent-scoped
 * BookingStateService.
 */
@Component({
  selector: 'cnt-listing-booking-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './listing-booking-widget.component.html',
})
export class ListingBookingWidgetComponent {
  @Input({ required: true }) listing!: Listing;
  @Input({ required: true }) detail!: ListingDetail;
  @Input({ required: true }) cancellationMeta!: Record<CancellationTier, { label: string; summary: string; color: string }>;
  @Input() myRv: MyRv = emptyMyRv();
  /** Emits an updated MyRv when the user attaches/clears a required photo here.
      Parent persists via writeMyRv so the photos survive across listings. */
  @Output() myRvChange = new EventEmitter<MyRv>();
  @Output() reserveClick = new EventEmitter<void>();

  constructor(public booking: BookingStateService) {}

  onReserve(): void { this.reserveClick.emit(); }

  get isMyRvSet(): boolean { return isMyRvSet(this.myRv); }
  get hasMyRvPhotos(): boolean { return hasMyRvPhotos(this.myRv); }

  /** Photos are required to book a non-instant-book listing. Instant Book skips the check entirely. */
  get photosRequired(): boolean { return !this.listing.instantBook && !this.hasMyRvPhotos; }

  /** Compact summary line for the My RV block: "Class A · 32ft · 11h · 8w" */
  get myRvSummary(): string {
    const parts: string[] = [];
    const t = rvTypeLabel(this.myRv.type);
    if (t && t !== 'RV') parts.push(t);
    if (this.myRv.length) parts.push(`${this.myRv.length}ft`);
    if (this.myRv.height) parts.push(`${this.myRv.height}h`);
    if (this.myRv.width) parts.push(`${this.myRv.width}w`);
    return parts.join(' · ');
  }

  onRvPhotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.readAsDataUrl(file, dataUrl => this.myRvChange.emit({ ...this.myRv, rvPhoto: dataUrl }));
  }

  onLicensePhotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.readAsDataUrl(file, dataUrl => this.myRvChange.emit({ ...this.myRv, licensePhoto: dataUrl }));
  }

  clearRvPhoto(): void { this.myRvChange.emit({ ...this.myRv, rvPhoto: null }); }
  clearLicensePhoto(): void { this.myRvChange.emit({ ...this.myRv, licensePhoto: null }); }

  private readAsDataUrl(file: File, cb: (dataUrl: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  }
}
