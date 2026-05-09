export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled';

export interface Booking {
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
  total: number;
  instantBook: boolean;
  status: BookingStatus;
  createdAt: string;
  /** When the host's mock decision is due to fire (request-to-book only). ISO. */
  decisionAt?: string;
  contact: { email: string; phone?: string };
  /** Optional opening note from the guest — surfaces in the inbox thread. */
  requestMessage?: string;
}

export const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', color: '#295d42', bg: 'bg-jungle-green/10' },
  pending:   { label: 'Pending',   color: '#b3760e', bg: 'bg-gold/20' },
  approved:  { label: 'Approved',  color: '#295d42', bg: 'bg-jungle-green/10' },
  declined:  { label: 'Declined',  color: '#9a3f0a', bg: 'bg-trinidad/10' },
  cancelled: { label: 'Cancelled', color: '#666666', bg: 'bg-dark-text/10' },
};
