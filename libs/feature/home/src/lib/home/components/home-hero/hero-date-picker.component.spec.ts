import { TestBed } from '@angular/core/testing';
import { DateRange } from '@angular/material/datepicker';
import { HeroDatePickerComponent } from './hero-date-picker.component';

describe('HeroDatePickerComponent (P7/A pojo→DateRange mapping)', () => {
  let component: HeroDatePickerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [HeroDatePickerComponent] });
    component = TestBed.inject(HeroDatePickerComponent);
  });

  describe('selectedRange setter', () => {
    it('wraps a full {start, end} pojo into a DateRange<Date>', () => {
      const start = new Date(2027, 3, 12);
      const end = new Date(2027, 3, 15);
      component.selectedRange = { start, end };
      expect(component.matRange).toBeInstanceOf(DateRange);
      expect(component.matRange!.start).toBe(start);
      expect(component.matRange!.end).toBe(end);
    });

    it('handles a partial range (start set, end null) while the user is picking', () => {
      const start = new Date(2027, 3, 12);
      component.selectedRange = { start, end: null };
      expect(component.matRange).toBeInstanceOf(DateRange);
      expect(component.matRange!.start).toBe(start);
      expect(component.matRange!.end).toBeNull();
    });

    it('clears the range when given null', () => {
      component.selectedRange = { start: new Date(), end: new Date() };
      component.selectedRange = null;
      expect(component.matRange).toBeNull();
    });
  });

  describe('selectedChange emit', () => {
    it('emits when mat-calendar fires a non-null Date', () => {
      const spy = jest.fn();
      component.selectedChange.subscribe(spy);
      const picked = new Date(2027, 3, 12);
      component.onSelected(picked);
      expect(spy).toHaveBeenCalledWith(picked);
    });

    it('drops null emissions from mat-calendar (initial / cleared state)', () => {
      const spy = jest.fn();
      component.selectedChange.subscribe(spy);
      component.onSelected(null);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
