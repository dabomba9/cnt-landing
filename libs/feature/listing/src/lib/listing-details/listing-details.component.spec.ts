import { ListingDetailsComponent } from './listing-details.component';
import { IUserReview } from '@cnt-workspace/data-access';

/** Narrow scope: just the topReviewsForSnippet getter (P6/C). The
 *  full template has heavy service deps that aren't relevant to
 *  the prioritization logic, so we bypass the constructor via
 *  Object.create and stamp only the fields the getter reads. */

type Review = { authorName: string; authorInitials: string; date: string; rating: number; text: string };

function mkUserReview(over: Partial<IUserReview>): IUserReview {
  return {
    id: 'r-' + Math.random().toString(36).slice(2, 8),
    bookingId: 'b-1',
    listingId: 1,
    userEmail: 'rver@example.com',
    authorName: 'Sam R.',
    authorInitials: 'SR',
    rating: 5,
    text: 'Loved it.',
    subScores: { cleanliness: 5, communication: 5, location: 5, hookups: 5, value: 5 },
    createdAt: new Date(2027, 5, 1).toISOString(),
    ...over,
  };
}

function mkSeededReview(over: Partial<Review>): Review {
  return {
    authorName: 'Seeded R.',
    authorInitials: 'SR',
    date: 'May 2027',
    rating: 4,
    text: 'Solid stay.',
    ...over,
  };
}

/** Build a component instance with the read-fields stamped on,
 *  bypassing constructor + DI. The getter only touches
 *  `this.userReviews` and `this.detail.reviews`. */
function withReviews(userReviews: IUserReview[], seededReviews: Review[]): ListingDetailsComponent {
  const c = Object.create(ListingDetailsComponent.prototype) as ListingDetailsComponent;
  (c as unknown as { userReviews: IUserReview[] }).userReviews = userReviews;
  (c as unknown as { detail: { reviews: Review[] } }).detail = { reviews: seededReviews };
  return c;
}

describe('ListingDetailsComponent — topReviewsForSnippet (P6/C)', () => {
  it('returns top 2 user reviews when at least 2 exist (real preferred over seeded)', () => {
    const u1 = mkUserReview({ rating: 5, authorName: 'A' });
    const u2 = mkUserReview({ rating: 4, authorName: 'B' });
    const seeded = mkSeededReview({ rating: 5, authorName: 'Seeded' });
    const c = withReviews([u1, u2], [seeded]);

    const top = c.topReviewsForSnippet;
    expect(top.length).toBe(2);
    expect(top.map(r => r.authorName).sort()).toEqual(['A', 'B']);
    expect(top.map(r => r.authorName)).not.toContain('Seeded');
  });

  it('falls back to the union pool when user reviews < 2', () => {
    const u1 = mkUserReview({ rating: 4, authorName: 'Solo User' });
    const s1 = mkSeededReview({ rating: 5, authorName: 'Top Seeded' });
    const s2 = mkSeededReview({ rating: 3, authorName: 'Weak Seeded' });
    const c = withReviews([u1], [s1, s2]);

    const top = c.topReviewsForSnippet;
    expect(top.length).toBe(2);
    expect(top.map(r => r.authorName).sort()).toEqual(['Solo User', 'Top Seeded']);
  });

  it('sorts by rating desc, then date desc (highest signal leads)', () => {
    const lower = mkSeededReview({ rating: 4, date: 'June 2027', authorName: 'Lower' });
    const higher = mkSeededReview({ rating: 5, date: 'January 2027', authorName: 'Higher' });
    const newerSameRating = mkSeededReview({ rating: 5, date: 'June 2027', authorName: 'Newer' });
    const c = withReviews([], [lower, higher, newerSameRating]);

    const top = c.topReviewsForSnippet;
    // Both rating-5 reviews come first; newer date breaks the tie.
    expect(top[0].authorName).toBe('Newer');
    expect(top[1].authorName).toBe('Higher');
  });

  it('returns an empty array when both pools are empty', () => {
    const c = withReviews([], []);
    expect(c.topReviewsForSnippet).toEqual([]);
  });

  it('does not mutate the underlying userReviews or detail.reviews arrays', () => {
    const u1 = mkUserReview({ rating: 5 });
    const u2 = mkUserReview({ rating: 3 });
    const seeded = mkSeededReview({ rating: 4 });
    const c = withReviews([u1, u2], [seeded]);

    const beforeUser = [...(c as unknown as { userReviews: IUserReview[] }).userReviews];
    const beforeSeed = [...(c as unknown as { detail: { reviews: Review[] } }).detail.reviews];

    // Force evaluation a few times.
    c.topReviewsForSnippet;
    c.topReviewsForSnippet;

    expect((c as unknown as { userReviews: IUserReview[] }).userReviews).toEqual(beforeUser);
    expect((c as unknown as { detail: { reviews: Review[] } }).detail.reviews).toEqual(beforeSeed);
  });
});
