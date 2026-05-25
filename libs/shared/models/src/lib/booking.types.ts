export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled';

/** Snapshot of an AddOn at booking time. Frozen so the host editing the
 * listing later doesn't retroactively reprice existing bookings. */
export interface IBookingAddOn {
  id: string;
  label: string;
  unit: 'per stay' | 'per night' | 'per person' | 'per unit';
  unitPrice: number;
  /** Quantity for `per unit` add-ons; 1 for all others. */
  quantity: number;
  /** Total billed for this line (unitPrice × multiplier at booking time). */
  amount: number;
  /** Material Symbols name captured at booking time; receipts render this even
   * if the host later changes the source add-on's icon. */
  icon?: string;
  /** Optional photo data URL captured at booking time; same rationale as icon. */
  photo?: string;
}

export interface IBooking {
  id: string;
  userEmail: string;
  listingId: number;
  listingTitle: string;
  listingLocation: string;
  listingPhoto: string;
  hostName: string;
  hostAddress?: string;
  lat?: number;
  lng?: number;
  dates: { start: string; end: string };
  nights: number;
  guests: number;
  rvSummary: string;
  pricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  /** Optional $5/night charge that refunds as CurbNTurf Cash after a qualifying
   * review. Undefined on bookings made before the feedback-incentive model. */
  feedbackIncentive?: number;
  total: number;
  instantBook: boolean;
  status: BookingStatus;
  createdAt: string;
  /** When the host's mock decision is due to fire (request-to-book only). ISO. */
  decisionAt?: string;
  contact: { email: string; phone?: string };
  /** Optional opening note from the guest — surfaces in the inbox thread. */
  requestMessage?: string;
  /** Optional reason supplied at cancel time — surfaces in the inbox thread. */
  cancelReason?: string;
  /** ISO when the booking was last modified (dates/guests/add-ons). */
  modifiedAt?: string;
  /** Snapshot of add-ons attached to this booking. */
  addOns?: IBookingAddOn[];
  /** Sum of all add-on amounts at booking/modification time. */
  addOnsTotal?: number;
  /** ISO when the guest left a review for this completed trip. */
  reviewedAt?: string;
  /** ISO when the host left a review for this guest. Parallel to reviewedAt;
   * drives the two-sided reveal — both timestamps (or the 14-day window) gate
   * when either review becomes visible to the world. */
  hostReviewedAt?: string;
  /** Reward credit dollars applied to this booking's total (subtracts from availableCredit). */
  creditApplied?: number;
}

export const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', color: '#295d42', bg: 'bg-jungle-green/10' },
  pending:   { label: 'Pending',   color: '#b3760e', bg: 'bg-gold/20' },
  approved:  { label: 'Approved',  color: '#295d42', bg: 'bg-jungle-green/10' },
  declined:  { label: 'Declined',  color: '#9a3f0a', bg: 'bg-trinidad/10' },
  cancelled: { label: 'Cancelled', color: '#666666', bg: 'bg-dark-text/10' },
};
