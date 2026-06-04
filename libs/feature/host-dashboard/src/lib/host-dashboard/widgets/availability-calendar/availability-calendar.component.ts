import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import {
  IListing, HostAvailabilityService, BookingService, ToastService,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';

interface IDayCell {
  date: number;
  iso: string;
  state: 'past' | 'open' | 'booked' | 'today';
  isCurrentMonth: boolean;
}

interface IDayBreakdown {
  listingId: number;
  title: string;
  state: 'open' | 'booked' | 'blocked' | 'external' | 'priced';
  detail?: string;
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

      <a routerLink="/hosting/calendar" class="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline mb-4">
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
          <button type="button" (click)="selectDay(cell)"
            [disabled]="!cell.isCurrentMonth || cell.state === 'past'"
            class="aspect-square rounded-lg flex items-center justify-center text-xs font-body relative transition-colors"
            [ngClass]="{
              'bg-trinidad/10 text-trinidad font-bold ring-2 ring-trinidad': cell.state === 'today',
              'bg-jungle-green/10 text-dark-text hover:bg-jungle-green/15': cell.state === 'open' && cell.isCurrentMonth,
              'bg-trinidad/15 text-trinidad hover:bg-trinidad/25': cell.state === 'booked' && cell.isCurrentMonth,
              'ring-2 ring-jungle-green ring-offset-1 ring-offset-white': selectedDayIso === cell.iso,
              'text-muted-text/40 cursor-default': !cell.isCurrentMonth || cell.state === 'past'
            }"
            [title]="cell.state === 'booked' ? 'Booked' : cell.state === 'today' ? 'Today' : cell.state === 'open' && cell.isCurrentMonth ? 'Open' : ''">
            {{ cell.date }}
            @if (cell.state === 'booked' && cell.isCurrentMonth) {
              <span class="absolute bottom-1 w-1 h-1 rounded-full bg-trinidad"></span>
            }
          </button>
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

      @if (selectedDayIso) {
        <div class="mt-5 pt-4 border-t border-dark-text/8">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.6rem] font-bold block">Day view</span>
              <h4 class="font-headline font-bold text-dark-text text-base tracking-tight">{{ selectedDayLabel }}</h4>
            </div>
            <button type="button" (click)="closePeek()" aria-label="Close" class="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-cream/60 text-muted-text">
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <ul class="flex flex-col gap-1.5 mb-4">
            @for (row of selectedBreakdown; track row.listingId) {
              <li class="flex items-center gap-2 text-xs">
                <span class="font-body font-bold text-dark-text flex-1 truncate">{{ row.title }}</span>
                <span class="text-[0.55rem] uppercase tracking-[0.1em] font-button font-bold px-2 py-0.5 rounded-full"
                  [ngClass]="rowChipClass(row)">
                  {{ rowChipLabel(row) }}
                </span>
              </li>
            }
          </ul>
          <div class="flex flex-wrap gap-2">
            @if (openCountForSelected > 0) {
              <button type="button" (click)="blockRemainingOpen()"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-trinidad text-white text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95">
                <span class="material-symbols-outlined text-sm">event_busy</span>
                Block {{ openCountForSelected }} open {{ openCountForSelected === 1 ? 'listing' : 'listings' }}
              </button>
            }
            <button type="button" (click)="openInCalendar()"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-jungle-green hover:text-jungle-green">
              <span class="material-symbols-outlined text-sm">date_range</span>
              Open in calendar
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class AvailabilityCalendarComponent implements OnDestroy {
  @Input() set listings(value: IListing[]) {
    this._listings = value || [];
    this.compute();
  }
  private _listings: IListing[] = [];

  /** Listing-id → set of ISO dates with a non-cancelled booking. Rebuilt
   *  whenever the bookings stream emits; used by compute() + breakdown. */
  private bookedByListing: Record<number, Set<string>> = {};
  private sub: Subscription | null = null;

  constructor(
    private hostAvail: HostAvailabilityService,
    private bookings: BookingService,
    private router: Router,
    private toasts: ToastService,
  ) {
    this.sub = combineLatest([this.bookings.bookings$, this.hostAvail.all$]).subscribe(([all]) => {
      this.rebuildBookedMap(all);
      this.compute();
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private rebuildBookedMap(all: IBooking[]): void {
    const map: Record<number, Set<string>> = {};
    for (const b of all) {
      if (b.status === 'cancelled' || b.status === 'declined') continue;
      const s = new Date(b.dates.start); s.setHours(0, 0, 0, 0);
      const e = new Date(b.dates.end);   e.setHours(0, 0, 0, 0);
      const set = map[b.listingId] ?? (map[b.listingId] = new Set());
      for (let d = new Date(s); d <= e; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        set.add(this.toIso(d));
      }
    }
    this.bookedByListing = map;
  }

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
    // Union the per-listing merged unavailable set (manual blocks +
    // bookings + external feeds) so the widget tracks the live data
    // every other surface reads.
    const unavailable = new Set<string>();
    for (const l of this._listings) {
      const avail = this.hostAvail.get(l.id);
      for (const iso of avail.blocked) unavailable.add(iso);
      if (avail.externalBlocks) {
        for (const dates of Object.values(avail.externalBlocks)) for (const iso of dates) unavailable.add(iso);
      }
      const booked = this.bookedByListing[l.id];
      if (booked) for (const iso of booked) unavailable.add(iso);
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

  // ============ Peek panel (T3.3) ============

  selectedDayIso: string | null = null;

  selectDay(cell: IDayCell): void {
    if (!cell.isCurrentMonth || cell.state === 'past') return;
    this.selectedDayIso = this.selectedDayIso === cell.iso ? null : cell.iso;
  }

  closePeek(): void { this.selectedDayIso = null; }

  get selectedDayLabel(): string {
    if (!this.selectedDayIso) return '';
    const d = new Date(this.selectedDayIso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  get selectedBreakdown(): IDayBreakdown[] {
    if (!this.selectedDayIso) return [];
    const iso = this.selectedDayIso;
    return this._listings.map(l => {
      const avail = this.hostAvail.get(l.id);
      if (this.bookedByListing[l.id]?.has(iso)) {
        return { listingId: l.id, title: l.title, state: 'booked' as const };
      }
      if (avail.blocked.includes(iso)) {
        return { listingId: l.id, title: l.title, state: 'blocked' as const };
      }
      if (avail.externalBlocks) {
        for (const [src, dates] of Object.entries(avail.externalBlocks)) {
          if (dates.includes(iso)) return { listingId: l.id, title: l.title, state: 'external' as const, detail: src };
        }
      }
      const price = avail.prices?.[iso];
      if (typeof price === 'number') {
        return { listingId: l.id, title: l.title, state: 'priced' as const, detail: `$${price}` };
      }
      return { listingId: l.id, title: l.title, state: 'open' as const };
    });
  }

  get openCountForSelected(): number {
    return this.selectedBreakdown.filter(r => r.state === 'open' || r.state === 'priced').length;
  }

  rowChipClass(row: IDayBreakdown): string {
    switch (row.state) {
      case 'open':     return 'bg-jungle-green/10 text-jungle-green';
      case 'booked':   return 'bg-trinidad/15 text-trinidad';
      case 'blocked':  return 'bg-cream/60 text-muted-text border border-dark-text/15';
      case 'external': return 'bg-jungle-green/15 text-jungle-green';
      case 'priced':   return 'bg-trinidad/10 text-trinidad';
      default:         return 'bg-cream/60 text-muted-text';
    }
  }

  rowChipLabel(row: IDayBreakdown): string {
    switch (row.state) {
      case 'open':     return 'Open';
      case 'booked':   return 'Booked';
      case 'blocked':  return 'Blocked';
      case 'external': return row.detail || 'External';
      case 'priced':   return row.detail || 'Priced';
      default:         return '';
    }
  }

  blockRemainingOpen(): void {
    if (!this.selectedDayIso) return;
    const ids = this.selectedBreakdown.filter(r => r.state === 'open' || r.state === 'priced').map(r => r.listingId);
    if (ids.length === 0) return;
    this.hostAvail.setBlockedBulk(ids, [this.selectedDayIso], true);
    const noun = ids.length === 1 ? 'listing' : 'listings';
    this.toasts.success(`Blocked ${ids.length} ${noun} on ${this.selectedDayLabel}.`);
  }

  openInCalendar(): void {
    if (!this.selectedDayIso) return;
    this.router.navigate(['/hosting/calendar'], { queryParams: { day: this.selectedDayIso } });
  }
}
