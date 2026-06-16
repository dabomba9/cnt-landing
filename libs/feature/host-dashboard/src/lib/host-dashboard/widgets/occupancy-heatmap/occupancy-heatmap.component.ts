import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import {
  IPrivateListing, HostAvailabilityService, BookingService,
  isoKey, addDaysIso, eachDateIso,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';

type CellState = 'open' | 'booked' | 'blocked' | 'external';

interface IRow {
  listingId: number;
  title: string;
  cells: { iso: string; state: CellState }[];
  occupancyPct: number;
  bookedCount: number;
}

const WINDOW_DAYS = 90;

/** Per-listing × next-90-days occupancy heatmap. Rows are listings,
 *  columns are days. Cell color indicates state (open / booked /
 *  blocked / external). Below each row, the occupancy percentage
 *  across the window is shown. */
@Component({
  selector: 'cnt-occupancy-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      <div class="flex items-center justify-between gap-3 mb-1">
        <div>
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold block">Occupancy</span>
          <h3 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight leading-tight">Next {{ WINDOW_DAYS }} days</h3>
        </div>
        <div class="text-[0.7rem] text-muted-text font-body text-right">
          <div><span class="text-dark-text font-bold">{{ rows.length }}</span> {{ rows.length === 1 ? 'listing' : 'listings' }}</div>
          @if (overallOccupancyPct !== null) {
            <div><span class="text-trinidad font-bold">{{ overallOccupancyPct | number:'1.0-0' }}%</span> avg</div>
          }
        </div>
      </div>
      <p class="text-xs text-muted-text font-body mb-4">One row per listing. Each cell = one day. Tap a row to open it on /hosting/calendar.</p>

      @if (rows.length === 0) {
        <div class="rounded-xl bg-cream/40 border border-dark-text/8 px-4 py-6 text-center">
          <span class="material-symbols-outlined text-2xl text-muted-text" aria-hidden="true">grid_view</span>
          <p class="text-sm text-muted-text font-body mt-1.5">No listings yet — occupancy will appear once you publish your first space.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (row of rows; track row.listingId) {
            <div class="flex items-center gap-3">
              <div class="w-24 md:w-32 shrink-0 min-w-0">
                <div class="text-xs font-body font-bold text-dark-text truncate">{{ row.title }}</div>
                <div class="text-[0.6rem] text-muted-text font-body">{{ row.occupancyPct | number:'1.0-0' }}% · {{ row.bookedCount }} {{ row.bookedCount === 1 ? 'night' : 'nights' }}</div>
              </div>
              <!-- 90-cell heatmap is meaningless at < 640 px (cells
                   render ~3 px wide). Show a numeric summary instead;
                   reveal the heatmap at sm: where cells are ≥ 7 px. -->
              <div class="flex-1 sm:hidden flex items-center justify-end gap-2 text-[0.65rem] font-button uppercase tracking-[0.1em] font-bold">
                <span class="text-trinidad">{{ row.occupancyPct | number:'1.0-0' }}%</span>
                <span class="text-muted-text">occupancy</span>
              </div>
              <div class="hidden sm:grid flex-1 gap-px overflow-hidden rounded"
                role="img"
                [attr.aria-label]="row.title + ': ' + (row.occupancyPct | number:'1.0-0') + ' percent occupancy over next ' + WINDOW_DAYS + ' days'"
                [style.grid-template-columns]="'repeat(' + WINDOW_DAYS + ', minmax(0, 1fr))'">
                @for (cell of row.cells; track cell.iso) {
                  <div [ngClass]="cellTone(cell.state)" [title]="cell.iso + ' · ' + cell.state" aria-hidden="true" class="h-5"></div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Legend -->
        <div class="mt-5 pt-4 border-t border-dark-text/8 flex flex-wrap gap-4 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">
          <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-cream/80 border border-dark-text/10"></span> Open</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-trinidad/60"></span> Booked</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-dark-text/30"></span> Blocked</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-jungle-green/40"></span> External</span>
        </div>
      }
    </div>
  `,
})
export class OccupancyHeatmapComponent implements OnChanges, OnDestroy {
  @Input() listings: IPrivateListing[] = [];

  readonly WINDOW_DAYS = WINDOW_DAYS;
  rows: IRow[] = [];
  private sub: Subscription | null = null;

  constructor(
    private hostAvail: HostAvailabilityService,
    private bookings: BookingService,
  ) {
    this.sub = combineLatest([this.bookings.bookings$, this.hostAvail.all$])
      .subscribe(([all]) => this.recompute(all));
  }

  ngOnChanges(_: SimpleChanges): void {
    // Recompute on input changes (initial bind + listing additions).
    this.recompute(this.bookings.getAll());
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private recompute(allBookings: IBooking[]): void {
    if (this.listings.length === 0) { this.rows = []; return; }

    // Build a fast lookup of per-listing booked ISOs (active statuses only).
    // Iso-day slicing skips Date round-tripping (which shifts a day in
    // negative-offset TZs when bare YYYY-MM-DD parses as UTC midnight).
    const bookedByListing: Record<number, Set<string>> = {};
    for (const b of allBookings) {
      if (b.status === 'cancelled' || b.status === 'declined') continue;
      const start = b.dates.start.slice(0, 10);
      const end = b.dates.end.slice(0, 10);
      const set = bookedByListing[b.listingId] ?? (bookedByListing[b.listingId] = new Set());
      for (const iso of eachDateIso(start, end)) set.add(iso);
    }

    const today = isoKey(new Date());
    const rows: IRow[] = [];
    for (const l of this.listings) {
      const avail = this.hostAvail.get(l.id);
      const blockedSet = new Set(avail.blocked);
      const externalSet = new Set<string>();
      if (avail.externalBlocks) {
        for (const dates of Object.values(avail.externalBlocks)) for (const iso of dates) externalSet.add(iso);
      }
      const booked = bookedByListing[l.id] ?? new Set<string>();

      const cells: IRow['cells'] = [];
      let bookedCount = 0;
      for (let i = 0; i < WINDOW_DAYS; i++) {
        const iso = addDaysIso(today, i);
        let state: CellState = 'open';
        if (booked.has(iso)) state = 'booked';
        else if (blockedSet.has(iso)) state = 'blocked';
        else if (externalSet.has(iso)) state = 'external';
        if (state !== 'open') bookedCount++;
        cells.push({ iso, state });
      }
      const occupancyPct = (bookedCount / WINDOW_DAYS) * 100;
      rows.push({ listingId: l.id, title: l.title, cells, occupancyPct, bookedCount });
    }
    this.rows = rows;
  }

  get overallOccupancyPct(): number | null {
    if (this.rows.length === 0) return null;
    let totalBooked = 0;
    let totalDays = 0;
    for (const r of this.rows) { totalBooked += r.bookedCount; totalDays += WINDOW_DAYS; }
    return totalDays === 0 ? null : (totalBooked / totalDays) * 100;
  }

  cellTone(state: CellState): string {
    switch (state) {
      case 'booked':   return 'bg-trinidad/60';
      case 'blocked':  return 'bg-dark-text/30';
      case 'external': return 'bg-jungle-green/40';
      default:         return 'bg-cream/80';
    }
  }
}
