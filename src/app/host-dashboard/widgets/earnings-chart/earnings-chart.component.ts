import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Listing } from '@cnt-workspace/data-access';

interface MonthBucket {
  label: string;       // 'Dec'
  shortYear: string;   // ''25
  amount: number;
}

@Component({
  selector: 'cnt-earnings-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      <div class="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold block mb-1">Earnings</span>
          <h3 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight leading-tight">Last 6 months</h3>
        </div>
        <div class="text-right">
          <div class="font-headline font-bold text-trinidad text-2xl tracking-tight leading-none">{{ formatCurrency(total) }}</div>
          <div class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mt-1">Total</div>
        </div>
      </div>

      <!-- Bars -->
      <div class="flex items-end justify-between gap-2 md:gap-3 h-[160px]">
        @for (m of months; track m.label; let i = $index) {
          <div class="flex-1 flex flex-col items-center gap-2 group">
            <div class="relative w-full flex items-end justify-center" style="height: 130px;">
              <!-- Hover label -->
              <div class="absolute -top-7 px-2 py-1 rounded-md bg-dark-text text-white text-[0.65rem] font-button font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {{ formatCurrency(m.amount) }}
              </div>
              <div class="w-full max-w-[36px] rounded-t-md transition-all duration-300"
                [style.height.%]="heightPct(m.amount)"
                [style.background]="i === months.length - 1 ? '#e3530d' : 'rgba(41, 93, 66, 0.85)'">
              </div>
            </div>
            <div class="text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold"
              [class.text-trinidad]="i === months.length - 1"
              [class.text-muted-text]="i !== months.length - 1">{{ m.label }}</div>
          </div>
        }
      </div>

      <div class="flex items-center justify-between mt-5 pt-4 border-t border-dark-text/8">
        <div class="flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-jungle-green/85"></span>
            Past payouts
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-trinidad"></span>
            This month
          </span>
        </div>
        <div class="text-[0.7rem] text-muted-text font-body">
          Avg <span class="text-dark-text font-bold">{{ formatCurrency(average) }}</span> / month
        </div>
      </div>
    </div>
  `,
})
export class EarningsChartComponent {
  @Input() set listings(value: Listing[]) {
    this._listings = value || [];
    this.compute();
  }
  private _listings: Listing[] = [];

  months: MonthBucket[] = [];
  total = 0;
  average = 0;

  private compute(): void {
    const baseline = this._listings.reduce((s, l) => s + l.price, 0);
    if (baseline === 0) {
      this.months = [];
      this.total = 0;
      this.average = 0;
      return;
    }
    // Generate 6 monthly buckets ending in current month, with seasonality
    // (RV travel peaks in summer). Deterministic per listing count.
    const seed = this._listings.length;
    const seasonal = [0.6, 0.7, 0.85, 1.0, 1.1, 0.95]; // last 6 months → most recent rightmost
    const now = new Date();
    const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });
    this.months = [];
    let total = 0;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const factor = seasonal[5 - i] * (0.9 + (seed % 3) * 0.05);
      const amount = Math.round(baseline * 6 * factor);
      this.months.push({
        label: monthFmt.format(d),
        shortYear: `'${d.getFullYear().toString().slice(-2)}`,
        amount,
      });
      total += amount;
    }
    this.total = total;
    this.average = Math.round(total / 6);
  }

  /** Height percentage for a bar (0–100). */
  heightPct(amount: number): number {
    if (this.months.length === 0) return 0;
    const max = Math.max(...this.months.map(m => m.amount));
    if (max === 0) return 0;
    // Reserve at least 8% so very small bars are still visible
    return Math.max(8, Math.round((amount / max) * 100));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
}
