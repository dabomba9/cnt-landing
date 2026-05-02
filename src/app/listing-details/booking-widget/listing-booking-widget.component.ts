import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  Listing, ListingDetail, CancellationTier,
} from '../../search-results/mock-listings.data';
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
  @Output() reserveClick = new EventEmitter<void>();

  constructor(public booking: BookingStateService) {}

  onReserve(): void { this.reserveClick.emit(); }
}
