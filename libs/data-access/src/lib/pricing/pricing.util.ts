/**
 * Central pricing model for guest receipts.
 *
 *   hostPrice           = subtotal (nightly × nights) after weekly discount
 *   servicePercent      = hostPrice × 15%
 *   serviceFloor        = $5 × nights              // per-night floor
 *   serviceFee          = max(servicePercent, serviceFloor)
 *   feedbackIncentive   = $5 × nights
 *
 * Crossover: at $33.33/night the 15% percent equals the $5 floor. Below that,
 * the floor wins (matters most for short stays of cheap-priced listings).
 *
 * Add-ons pass through fee-free — they belong to the host payout and the
 * guest pays them at face value.
 *
 * The feedback incentive is the upfront mirror of the post-stay
 * REVIEW_CREDIT_PER_NIGHT system: charged at booking, refunded as
 * "CurbNTurf Cash" once the guest submits a qualifying review. Honest
 * reviewers net to zero; non-reviewers forfeit it to the platform.
 */
export const SERVICE_FEE_RATE = 0.15;
export const MINIMUM_FEE_PER_NIGHT = 5;
export const FEEDBACK_INCENTIVE_PER_NIGHT = 5;

/**
 * Service fee on top of the host's nightly subtotal. Floor is per-night so
 * a 3-night stay at a low price still meets $5/night × 3 = $15.
 */
export function computeServiceFee(hostPrice: number, nights: number): number {
  if (nights <= 0) return 0;
  const safe = Math.max(0, hostPrice);
  const percent = safe * SERVICE_FEE_RATE;
  const floor = MINIMUM_FEE_PER_NIGHT * nights;
  return Math.round(Math.max(percent, floor));
}

/** Total feedback incentive charged for a stay of `nights` nights. */
export function computeFeedbackIncentive(nights: number): number {
  return Math.max(0, nights) * FEEDBACK_INCENTIVE_PER_NIGHT;
}

/**
 * Minimum listed price per night that lets the host actually take any money
 * home — covers the $5/night service-fee floor plus the $5/night feedback
 * incentive. Below this, the host's take-home is clamped at $0.
 */
export const MIN_VIABLE_LISTING_PRICE = MINIMUM_FEE_PER_NIGHT + FEEDBACK_INCENTIVE_PER_NIGHT;

/**
 * Host's take-home for a stay. In the "all-in" pricing model the listed
 * price IS what the guest pays per night — service fee + feedback incentive
 * come out of that. Clamped at $0 (host can't owe the platform).
 */
export function computeHostTakeHome(listedPrice: number, nights: number): number {
  if (listedPrice <= 0 || nights <= 0) return 0;
  const guestPaysTotal = listedPrice * nights;
  const fee = computeServiceFee(guestPaysTotal, nights);
  const incentive = computeFeedbackIncentive(nights);
  return Math.max(0, guestPaysTotal - fee - incentive);
}
