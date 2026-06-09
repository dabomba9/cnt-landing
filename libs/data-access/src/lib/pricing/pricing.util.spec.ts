import {
  computeServiceFee, computeFeedbackIncentive, computeHostTakeHome,
  SERVICE_FEE_RATE, MINIMUM_FEE_PER_NIGHT, FEEDBACK_INCENTIVE_PER_NIGHT,
  MIN_VIABLE_LISTING_PRICE,
} from './pricing.util';

describe('pricing.util', () => {
  describe('computeServiceFee', () => {
    it('returns 0 when nights <= 0', () => {
      expect(computeServiceFee(1000, 0)).toBe(0);
      expect(computeServiceFee(1000, -1)).toBe(0);
    });

    it('floor wins below the $33.33/night crossover', () => {
      // 2 nights × $20/night = $40 host price; 15% = $6 < $10 floor → floor wins.
      expect(computeServiceFee(40, 2)).toBe(MINIMUM_FEE_PER_NIGHT * 2);
    });

    it('percent wins above the crossover', () => {
      // 1 night × $100 → 15% = $15 > $5 floor → percent wins.
      expect(computeServiceFee(100, 1)).toBe(15);
    });

    it('clamps negative hostPrice to 0 (still respects floor)', () => {
      expect(computeServiceFee(-50, 3)).toBe(MINIMUM_FEE_PER_NIGHT * 3);
    });

    it('rounds to whole dollars', () => {
      // 7 nights × $48.30 = $338.10 → 15% = $50.715 → rounds to 51.
      const fee = computeServiceFee(338.10, 7);
      expect(fee).toBe(51);
    });

    it('matches expected constants', () => {
      expect(SERVICE_FEE_RATE).toBe(0.15);
      expect(MINIMUM_FEE_PER_NIGHT).toBe(5);
    });
  });

  describe('computeFeedbackIncentive', () => {
    it('multiplies nights × incentive rate', () => {
      expect(computeFeedbackIncentive(3)).toBe(FEEDBACK_INCENTIVE_PER_NIGHT * 3);
    });

    it('clamps negative nights to 0', () => {
      expect(computeFeedbackIncentive(-2)).toBe(0);
    });
  });

  describe('computeHostTakeHome', () => {
    it('returns 0 when nights or price are non-positive', () => {
      expect(computeHostTakeHome(0, 3)).toBe(0);
      expect(computeHostTakeHome(50, 0)).toBe(0);
    });

    it('subtracts service fee + feedback incentive from guest total', () => {
      // 2 nights × $100 = $200 guestPays. fee=15% of 200 = $30. incentive=$10. takeHome=$160.
      expect(computeHostTakeHome(100, 2)).toBe(160);
    });

    it('clamps to 0 when fees + incentive exceed the listed price', () => {
      // At MIN_VIABLE the host nets exactly 0 (fee+incentive consume the listed price).
      expect(computeHostTakeHome(MIN_VIABLE_LISTING_PRICE, 1)).toBe(0);
      expect(computeHostTakeHome(1, 1)).toBe(0);
    });
  });
});
