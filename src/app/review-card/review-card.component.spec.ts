import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewCardComponent } from './review-card.component';
import { Review } from '../search-results/mock-listings.data';

describe('ReviewCardComponent', () => {
  let fixture: ComponentFixture<ReviewCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ReviewCardComponent] });
    fixture = TestBed.createComponent(ReviewCardComponent);
  });

  it('renders 4 filled stars and 1 dimmed for rating=4', () => {
    const review: Review = {
      authorName: 'Jane',
      authorInitials: 'J',
      date: 'May 2026',
      rating: 4,
      text: 'Great stay.',
    };
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();
    const stars = fixture.nativeElement.querySelectorAll('.material-symbols-outlined');
    // 5 stars total in the row
    expect(stars.length).toBe(5);
    // First 4 are filled (text-trinidad), last is dimmed (opacity-20)
    expect(stars[0].classList.contains('text-trinidad')).toBe(true);
    expect(stars[3].classList.contains('text-trinidad')).toBe(true);
    expect(stars[4].classList.contains('opacity-20')).toBe(true);
  });
});
