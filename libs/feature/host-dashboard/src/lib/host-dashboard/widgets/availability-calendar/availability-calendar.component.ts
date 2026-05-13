import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IListing, getListingDetail } from '@cnt-workspace/data-access';

interface IDayCell {
  date: number;
  iso: string;
  state: 'past' | 'open' | 'booked' | 'today';
  isCurrentMonth: boolean;
}

@Component({
  selector: 'cnt-availability-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      <div class="flex items-center justify-between gap-3 mb-3">
        <div>
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold block mb-1">Availability</span>
          <h3 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight leading-tight">{{ monthLabel }}</h3>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" (click)="prevMonth()" aria-label="Previous month"
            class="w-9 h-9 rounded-full border border-dark-text/15 flex items-center justify-center hover:border-trinidad hover:text-trinidad transition-colors">
            <span class="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <button type="button" (click)="nextMonth()" aria-label="Next month"
            class="w-9 h-9 rounded-full border border-dark-text/15 flex items-center justify-center hover:border-trinidad hover:text-trinidad transition-colors">
            <span class="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>

      <a routerLink="/hosting/listings" class="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline mb-4">
        Manage availability
        <span class="material-symbols-outlined text-sm">arrow_forward</span>
      </a>

      @if (hasNoListings) {
        <div class="rounded-xl bg-cream/40 border border-dark-text/8 px-4 py-6 text-center mb-3">
          <span class="material-symbols-outlined text-2xl text-muted-text" aria-hidden="true">event_available</span>
          <p class="text-sm text-muted-text font-body mt-1.5">No listings yet — availability will appear once you publish your first space.</p>
        </div>
      }

      <!-- Weekday headers -->
      <div class="grid grid-cols-7 gap-1 mb-2">
        @for (d of weekdays; track d) {
          <div class="text-center text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">{{ d }}</div>
        }
      </div>

      <!-- Day grid -->
      <div class="grid grid-cols-7 gap-1">
        @for (cell of cells; track cell.iso) {
          <div class="aspect-square rounded-lg flex items-center justify-center text-xs font-body relative"
            [ngClass]="{
              'bg-trinidad/10 text-trinidad font-bold ring-2 ring-trinidad': cell.state === 'today',
              'bg-jungle-green/10 text-dark-text': cell.state === 'open' && cell.isCurrentMonth,
              'bg-trinidad/15 text-trinidad': cell.state === 'booked' && cell.isCurrentMonth,
              'text-muted-text/40': !cell.isCurrentMonth || cell.state === 'past'
            }"
            [title]="cell.state === 'booked' ? 'Booked' : cell.state === 'today' ? 'Today' : cell.state === 'open' && cell.isCurrentMonth ? 'Open' : ''">
            {{ cell.date }}
            @if (cell.state === 'booked' && cell.isCurrentMonth) {
              <span class="absolute bottom-1 w-1 h-1 rounded-full bg-trinidad"></span>
            }
          </div>
        }
      </div>

      <!-- Legend + summary -->
      <div class="flex items-center justify-between mt-5 pt-4 border-t border-dark-text/8">
        <div class="flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-jungle-green/30"></span>
            Open
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-trinidad/40"></span>
            Booked
          </span>
        </div>
        <div class="text-[0.7rem] text-muted-text font-body">
          <span class="text-dark-text font-bold">{{ openCount }}</span> open · <span class="text-trinidad font-bold">{{ bookedCount }}</span> booked
        </div>
      </div>
    </div>
  `,
})
export class AvailabilityCalendarComponent {
  @Input() set listings(value: IListing[]) {
    this._listings = value || [];
    this.compute();
  }
  private _listings: IListing[] = [];

  weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  cells: IDayCell[] = [];
  monthLabel = '';
  openCount = 0;

  get hasNoListings(): boolean { return this._listings.length === 0; }

  bookedCount = 0;

  private viewYear = new Date().getFullYear();
  private viewMonth = new Date().getMonth();

  prevMonth(): void {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
    this.compute();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
    this.compute();
  }

  private compute(): void {
    if (this._listings.length === 0) {
      this.cells = [];
      this.monthLabel = '';
      this.openCount = 0;
      this.bookedCount = 0;
      return;
    }
    // Build the union of unavailableDates across all listings
    const unavailable = new Set<string>();
    for (const l of this._listings) {
      const detail = getListingDetail(l);
      for (const d of detail.unavailableDates) unavailable.add(d);
    }

    const first = new Date(this.viewYear, this.viewMonth, 1);
    const last = new Date(this.viewYear, this.viewMonth + 1, 0);
    const startDay = first.getDay(); // 0-6, Sun = 0
    const todayIso = this.toIso(new Date());

    const cells: IDayCell[] = [];

    // Leading days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(this.viewYear, this.viewMonth, -i);
      cells.push({ date: d.getDate(), iso: this.toIso(d), state: 'past', isCurrentMonth: false });
    }

    // Days in this month
    let openCount = 0, bookedCount = 0;
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(this.viewYear, this.viewMonth, day);
      const iso = this.toIso(d);
      let state: IDayCell['state'];
      if (iso === todayIso) state = 'today';
      else if (d.getTime() < Date.now() - 86_400_000) state = 'past';
      else if (unavailable.has(iso)) { state = 'booked'; bookedCount++; }
      else { state = 'open'; openCount++; }
      cells.push({ date: day, iso, state, isCurrentMonth: true });
    }

    // Trailing days to fill the grid (up to 42 cells = 6 weeks)
    while (cells.length < 42) {
      const idx = cells.length - (startDay + last.getDate());
      const d = new Date(this.viewYear, this.viewMonth + 1, idx + 1);
      cells.push({ date: d.getDate(), iso: this.toIso(d), state: 'past', isCurrentMonth: false });
    }

    this.cells = cells;
    this.openCount = openCount;
    this.bookedCount = bookedCount;
    this.monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
