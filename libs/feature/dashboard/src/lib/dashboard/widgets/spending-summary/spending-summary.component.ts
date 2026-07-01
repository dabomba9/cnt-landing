import { Component, Input } from '@angular/core';

import { IBooking } from '@cnt-workspace/models';
import { MOCK_LISTINGS, Category, CATEGORY_META } from '@cnt-workspace/data-access';

interface ICategorySpend { category: Category; label: string; color: string; total: number; }

@Component({
  selector: 'cnt-dashboard-spending',
  standalone: true,
  imports: [],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      <div class="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Spending</span>
          <h2 class="font-headline font-bold text-dark-text text-2xl tracking-tight leading-tight">Where your money went</h2>
        </div>
        <span class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text shrink-0">{{ thisYear }}</span>
      </div>

      @if (countedBookings.length === 0) {
        <p class="text-sm text-muted-text font-body">No completed trips yet — your spend summary will appear once you've stayed somewhere.</p>
      } @else {
        <!-- Three top-line stats -->
        <div class="grid grid-cols-3 gap-3 mb-5">
          <div class="rounded-md bg-trinidad/5 border border-trinidad/15 p-3">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad mb-1">Total spent</div>
            <div class="font-headline font-bold text-trinidad text-xl md:text-2xl leading-none">{{ formatCurrency(totalSpent) }}</div>
            <div class="text-[0.65rem] text-muted-text font-body mt-1">{{ countedBookings.length }} {{ countedBookings.length === 1 ? 'trip' : 'trips' }}</div>
          </div>
          <div class="rounded-md bg-jungle-green/5 border border-jungle-green/15 p-3">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-jungle-green mb-1">Avg per trip</div>
            <div class="font-headline font-bold text-jungle-green text-xl md:text-2xl leading-none">{{ formatCurrency(avgPerTrip) }}</div>
            <div class="text-[0.65rem] text-muted-text font-body mt-1">{{ totalNights }} {{ totalNights === 1 ? 'night' : 'nights' }} booked</div>
          </div>
          <div class="rounded-md bg-gold/15 border border-gold/40 p-3" style="color: #b3760e;">
            <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold mb-1">Year to date</div>
            <div class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-none">{{ formatCurrency(ytdSpent) }}</div>
            <div class="text-[0.65rem] text-muted-text font-body mt-1">since Jan 1</div>
          </div>
        </div>

        <!-- Spend by category -->
        @if (categoryBreakdown.length > 0) {
          <div class="pt-4 border-t border-dark-text/8">
            <div class="text-[0.6rem] uppercase tracking-[0.14em] font-button font-bold text-muted-text mb-3">By category</div>
            <ul class="space-y-2.5">
              @for (row of categoryBreakdown; track row.category) {
                <li class="flex items-center gap-3">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="row.color"></span>
                  <span class="text-sm font-body text-dark-text flex-1 capitalize">{{ row.label }}</span>
                  <span class="text-sm font-body font-bold text-dark-text">{{ formatCurrency(row.total) }}</span>
                  <span class="text-[0.65rem] text-muted-text font-body tabular-nums w-10 text-right">{{ percentOf(row.total) }}%</span>
                </li>
              }
            </ul>
          </div>
        }
      }
    </div>
  `,
})
export class SpendingSummaryComponent {
  @Input() set bookings(value: IBooking[]) {
    this._bookings = value || [];
  }
  private _bookings: IBooking[] = [];

  readonly thisYear = new Date().getFullYear();

  /** Only confirmed/approved + check-in past = real spend. */
  get countedBookings(): IBooking[] {
    const now = Date.now();
    return this._bookings.filter(b =>
      (b.status === 'confirmed' || b.status === 'approved')
      && new Date(b.dates.start).getTime() < now
    );
  }

  get totalSpent(): number {
    return this.countedBookings.reduce((sum, b) => sum + (b.total || 0), 0);
  }

  get totalNights(): number {
    return this.countedBookings.reduce((sum, b) => sum + (b.nights || 0), 0);
  }

  get avgPerTrip(): number {
    const n = this.countedBookings.length;
    return n === 0 ? 0 : Math.round(this.totalSpent / n);
  }

  get ytdSpent(): number {
    const yearStart = new Date(this.thisYear, 0, 1).getTime();
    return this.countedBookings
      .filter(b => new Date(b.dates.start).getTime() >= yearStart)
      .reduce((sum, b) => sum + (b.total || 0), 0);
  }

  get categoryBreakdown(): ICategorySpend[] {
    const totals: Record<Category, number> = { vineyard: 0, farm: 0, brewery: 0, attraction: 0, offgrid: 0 };
    for (const b of this.countedBookings) {
      const listing = MOCK_LISTINGS.find(l => l.id === b.listingId);
      if (!listing) continue;
      totals[listing.category] += (b.total || 0);
    }
    return (Object.keys(totals) as Category[])
      .filter(c => totals[c] > 0)
      .map(c => ({
        category: c,
        label: CATEGORY_META[c].label,
        color: CATEGORY_META[c].color,
        total: totals[c],
      }))
      .sort((a, b) => b.total - a.total);
  }

  percentOf(amount: number): number {
    return this.totalSpent === 0 ? 0 : Math.round((amount / this.totalSpent) * 100);
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }
}
