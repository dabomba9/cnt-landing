import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatDatepickerModule, DateRange } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

/** Standalone host for the home-hero inline date-range picker. Lives
 *  in its own component so the parent home-hero can lazy-load Material
 *  via @defer — Material modules are ~150 KB and the date picker only
 *  matters once the visitor opens the search dropdown. The parent
 *  passes a plain {start, end} pojo so its eager bundle stays Material-free. */
@Component({
  selector: 'cnt-hero-date-picker',
  standalone: true,
  imports: [MatDatepickerModule, MatNativeDateModule],
  template: `
    <mat-calendar
      [selected]="matRange"
      [minDate]="minDate"
      (selectedChange)="onSelected($event)"
      class="cnt-inline-calendar bg-transparent border-none">
    </mat-calendar>
  `,
})
export class HeroDatePickerComponent {
  @Input() set selectedRange(v: { start: Date | null; end: Date | null } | null) {
    this.matRange = v ? new DateRange(v.start, v.end) : null;
  }
  @Input() minDate: Date | null = null;
  @Output() selectedChange = new EventEmitter<Date>();
  matRange: DateRange<Date> | null = null;

  onSelected(d: Date | null): void { if (d) this.selectedChange.emit(d); }
}
