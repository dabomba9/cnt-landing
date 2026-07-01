import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IPrivateListing } from '@cnt-workspace/data-access';
import { BookingStateService } from '../booking-state.service';

/**
 * Fixed-bottom mobile booking bar mirroring the sidebar widget.
 * Consumes the parent-scoped BookingStateService for live totals.
 * Emits `reserveClick`; the parent decides whether to scroll to the
 * widget+open calendar or route to the booking confirmation flow.
 */
@Component({
  selector: 'cnt-listing-mobile-booking-bar',
  standalone: true,
  imports: [],
  templateUrl: './listing-mobile-booking-bar.component.html',
})
export class ListingMobileBookingBarComponent {
  @Input({ required: true }) listing!: IPrivateListing;
  @Output() reserveClick = new EventEmitter<void>();

  constructor(public booking: BookingStateService) {}

  onReserve(): void { this.reserveClick.emit(); }
}
