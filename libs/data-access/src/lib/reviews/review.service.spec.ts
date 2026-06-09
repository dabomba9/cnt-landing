import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import {
  ReviewService, IUserReview, IReviewSubScores,
  averageSubScores, starState,
} from './review.service';

const SUBS: IReviewSubScores = {
  cleanliness: 5, communication: 5, location: 4, hookups: 5, value: 5,
};

function mkInput(over: Partial<IUserReview> = {}): Omit<IUserReview, 'id' | 'createdAt'> & { id?: string } {
  return {
    bookingId: 'b1',
    listingId: 1,
    userEmail: 'rver@example.com',
    authorName: 'Sam R.',
    authorInitials: 'SR',
    rating: 5,
    text: 'Loved every minute.',
    subScores: SUBS,
    ...over,
  };
}

describe('ReviewService', () => {
  let svc: ReviewService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ReviewService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    svc = TestBed.inject(ReviewService);
  });

  describe('pure helpers', () => {
    it('averageSubScores averages all 5 by default', () => {
      expect(averageSubScores(SUBS)).toBeCloseTo(4.8);
    });

    it('averageSubScores excludes hookups when asked', () => {
      // (5+5+4+5)/4 = 4.75
      expect(averageSubScores(SUBS, true)).toBeCloseTo(4.75);
    });

    it('starState classifies full / half / empty thresholds', () => {
      expect(starState(4, 4.8)).toBe('full');
      expect(starState(5, 4.8)).toBe('half');
      expect(starState(5, 4.2)).toBe('empty');
      expect(starState(5, 4.5)).toBe('half');
    });
  });

  describe('upsert', () => {
    it('inserts a new review with a generated id + createdAt', () => {
      const r = svc.upsert(mkInput());
      expect(r.id).toBeTruthy();
      expect(r.createdAt).toBeTruthy();
      expect(svc.list().length).toBe(1);
    });

    it('replaces by bookingId (keeps original id + createdAt)', () => {
      const a = svc.upsert(mkInput());
      const b = svc.upsert(mkInput({ text: 'Updated', rating: 4 }));
      expect(b.id).toBe(a.id);
      expect(b.createdAt).toBe(a.createdAt);
      expect(b.text).toBe('Updated');
      expect(svc.list().length).toBe(1);
    });
  });

  describe('forListing + forBooking + forUser', () => {
    it('sorts forListing newest createdAt first', () => {
      const old = svc.upsert(mkInput({ bookingId: 'b1' }));
      // Force the second review to a later createdAt by re-writing one.
      const fresh = svc.upsert(mkInput({ bookingId: 'b2' }));
      const all = svc.forListing(1);
      expect(all.length).toBe(2);
      expect(all[0].createdAt >= all[1].createdAt).toBe(true);
      // Sanity — both made it back.
      expect(all.map(r => r.id).sort()).toEqual([old.id, fresh.id].sort());
    });

    it('forBooking returns the single review or null', () => {
      svc.upsert(mkInput({ bookingId: 'b1' }));
      expect(svc.forBooking('b1')?.bookingId).toBe('b1');
      expect(svc.forBooking('missing')).toBeNull();
    });

    it('forUser filters by author email', () => {
      svc.upsert(mkInput({ bookingId: 'b1', userEmail: 'a@x.com' }));
      svc.upsert(mkInput({ bookingId: 'b2', userEmail: 'b@x.com' }));
      expect(svc.forUser('a@x.com').length).toBe(1);
      expect(svc.forUser('b@x.com').length).toBe(1);
    });
  });

  describe('aggregateRating', () => {
    it('returns seeded values when no user reviews exist', () => {
      expect(svc.aggregateRating(4.5, 10, 1)).toEqual({ rating: 4.5, count: 10 });
    });

    it('blends seeded + user reviews proportionally', () => {
      svc.upsert(mkInput({ rating: 3 }));
      // (4.5*10 + 3) / 11 = 48 / 11 ≈ 4.36
      const out = svc.aggregateRating(4.5, 10, 1);
      expect(out.count).toBe(11);
      expect(out.rating).toBeCloseTo(4.36, 2);
    });

    it('ignores reviews from other listings', () => {
      svc.upsert(mkInput({ listingId: 99, rating: 1 }));
      expect(svc.aggregateRating(4.5, 10, 1)).toEqual({ rating: 4.5, count: 10 });
    });
  });

  describe('setHostResponse', () => {
    it('attaches a host response and stamps respondedAt', () => {
      svc.upsert(mkInput());
      const out = svc.setHostResponse('b1', '  Thanks for staying!  ');
      expect(out?.hostResponse?.text).toBe('Thanks for staying!');
      expect(out?.hostResponse?.respondedAt).toBeTruthy();
    });

    it('clears the response on empty / whitespace', () => {
      svc.upsert(mkInput());
      svc.setHostResponse('b1', 'Hi');
      const out = svc.setHostResponse('b1', '   ');
      expect(out?.hostResponse).toBeUndefined();
    });

    it('returns null when the booking has no review', () => {
      expect(svc.setHostResponse('missing', 'Hi')).toBeNull();
    });
  });

  describe('helpful votes', () => {
    it('toggleHelpful returns voted / unvoted and tracks per-user', () => {
      expect(svc.toggleHelpful('r1', 'a@x.com')).toBe('voted');
      expect(svc.hasUserVoted('r1', 'a@x.com')).toBe(true);
      expect(svc.helpfulCount('r1')).toBe(1);

      expect(svc.toggleHelpful('r1', 'a@x.com')).toBe('unvoted');
      expect(svc.hasUserVoted('r1', 'a@x.com')).toBe(false);
      expect(svc.helpfulCount('r1')).toBe(0);
    });

    it('counts unique voters', () => {
      svc.toggleHelpful('r1', 'a@x.com');
      svc.toggleHelpful('r1', 'b@x.com');
      svc.toggleHelpful('r1', 'a@x.com');  // a unvotes
      expect(svc.helpfulCount('r1')).toBe(1);
    });

    it('no-ops on empty inputs', () => {
      expect(svc.toggleHelpful('', 'a@x.com')).toBe('unvoted');
      expect(svc.toggleHelpful('r1', '')).toBe('unvoted');
      expect(svc.helpfulCount('r1')).toBe(0);
    });
  });

  describe('persistence', () => {
    it('rehydrates reviews + helpful votes on fresh instance', () => {
      svc.upsert(mkInput());
      svc.toggleHelpful('r1', 'a@x.com');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ReviewService,
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });
      const fresh = TestBed.inject(ReviewService);
      expect(fresh.forBooking('b1')?.bookingId).toBe('b1');
      expect(fresh.helpfulCount('r1')).toBe(1);
    });
  });
});
