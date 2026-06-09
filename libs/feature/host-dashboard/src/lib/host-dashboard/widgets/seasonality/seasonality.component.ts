import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IBooking } from '@cnt-workspace/models';

interface IMonthSlot {
  month: number;            // 0–11
  label: string;            // 'Jan' … 'Dec'
  revenue: number;
  bookings: number;
  /** 0–1 — share of max month, drives the cell tint. */
  intensity: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Month-of-year revenue heatmap. Aggregates the host's bookings by
 *  start-month across all available years, normalizing intensity to
 *  the max month so the busy/quiet pattern stands out even when the
 *  underlying revenue scale shifts year to year. */
@Component({
  selector: 'cnt-seasonality',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      <div class="flex items-end justify-between gap-3 mb-1">
        <div>
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold block">Seasonality</span>
          <h3 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight leading-tight">Revenue by month</h3>
        </div>
        @if (totalRevenue > 0) {
          <div class="text-right text-[0.7rem] text-muted-text font-body">
            <span class="text-dark-text font-bold">{{ totalBookings }}</span> {{ totalBookings === 1 ? 'booking' : 'bookings' }}
          </div>
        }
      </div>
      <p class="text-xs text-muted-text font-body mb-4">Bookings aggregated by check-in month across every year you've hosted. The deeper the tint, the bigger the month.</p>

      @if (totalRevenue === 0) {
        <div class="rounded-xl bg-cream/40 border border-dark-text/8 px-4 py-6 text-center">
          <span class="material-symbols-outlined text-2xl text-muted-text" aria-hidden="true">calendar_month</span>
          <p class="text-sm text-muted-text font-body mt-1.5">Your seasonality pattern will appear once bookings start landing.</p>
        </div>
      } @else {
        <div class="grid grid-cols-12 gap-1.5">
          @for (m of months; track m.month) {
            <div class="flex flex-col items-center"
              [title]="m.label + ' · $' + (m.revenue | number:'1.0-0') + ' · ' + m.bookings + ' booking' + (m.bookings === 1 ? '' : 's')">
              <div class="w-full h-16 rounded-md border border-dark-text/8"
                [style.background-color]="cellBgColor(m.intensity)"></div>
              <div class="text-[0.55rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text mt-1">{{ m.label }}</div>
              @if (m.revenue > 0) {
                <div class="text-[0.6rem] font-body font-bold text-dark-text">{{ formatCompact(m.revenue) }}</div>
              }
            </div>
          }
        </div>

        @if (topMonths.length > 0 || bottomMonths.length > 0) {
          <div class="mt-5 pt-4 border-t border-dark-text/8 flex flex-wrap gap-4 text-[0.7rem] font-body">
            @if (topMonths.length > 0) {
              <div>
                <span class="text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text block mb-1">Busy months</span>
                <div class="flex flex-wrap gap-1">
                  @for (m of topMonths; track m.month) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-trinidad/10 text-trinidad text-[0.65rem] font-button uppercase tracking-[0.1em] font-bold">{{ m.label }}</span>
                  }
                </div>
              </div>
            }
            @if (bottomMonths.length > 0) {
              <div>
                <span class="text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text block mb-1">Quiet months</span>
                <div class="flex flex-wrap gap-1">
                  @for (m of bottomMonths; track m.month) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cream/80 text-muted-text text-[0.65rem] font-button uppercase tracking-[0.1em] font-bold border border-dark-text/10">{{ m.label }}</span>
                  }
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class SeasonalityComponent implements OnChanges {
  /** Pass the host's confirmed/approved bookings (parent already
   *  filters via getHostBookings). The widget skips cancelled / declined. */
  @Input() bookings: IBooking[] = [];

  months: IMonthSlot[] = MONTH_LABELS.map((label, month) => ({
    month, label, revenue: 0, bookings: 0, intensity: 0,
  }));

  totalRevenue = 0;
  totalBookings = 0;

  ngOnChanges(_: SimpleChanges): void { this.recompute(); }

  private recompute(): void {
    const slots = MONTH_LABELS.map((label, month) => ({
      month, label, revenue: 0, bookings: 0, intensity: 0,
    }));
    let totalRevenue = 0;
    let totalBookings = 0;
    for (const b of this.bookings) {
      if (b.status === 'cancelled' || b.status === 'declined') continue;
      const start = new Date(b.dates.start);
      if (Number.isNaN(start.getTime())) continue;
      const m = start.getMonth();
      const rev = b.total ?? 0;
      slots[m].revenue += rev;
      slots[m].bookings += 1;
      totalRevenue += rev;
      totalBookings += 1;
    }
    const max = slots.reduce((mx, s) => Math.max(mx, s.revenue), 0);
    for (const s of slots) {
      s.intensity = max === 0 ? 0 : s.revenue / max;
    }
    this.months = slots;
    this.totalRevenue = totalRevenue;
    this.totalBookings = totalBookings;
  }

  /** Top 3 months by revenue (only including months with any revenue). */
  get topMonths(): IMonthSlot[] {
    return [...this.months].filter(m => m.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  }

  /** Bottom 3 months by revenue — only meaningful when at least 6
   *  months have data, otherwise the "quiet" framing is misleading. */
  get bottomMonths(): IMonthSlot[] {
    const earning = this.months.filter(m => m.revenue > 0);
    if (earning.length < 6) return [];
    return [...earning].sort((a, b) => a.revenue - b.revenue).slice(0, 3);
  }

  /** Background color for a cell, interpolating from cream → trinidad
   *  via the intensity ratio. Pure presentational. */
  cellBgColor(intensity: number): string {
    if (intensity <= 0) return 'rgba(247, 245, 236, 0.6)';   // cream
    // Trinidad #e3530d at full intensity, blended into cream.
    const alpha = Math.max(0.12, Math.min(1, 0.12 + intensity * 0.78));
    return `rgba(227, 83, 13, ${alpha})`;
  }

  formatCompact(revenue: number): string {
    if (revenue >= 1000) return `$${(revenue / 1000).toFixed(revenue >= 10000 ? 0 : 1)}k`;
    return `$${Math.round(revenue)}`;
  }
}
