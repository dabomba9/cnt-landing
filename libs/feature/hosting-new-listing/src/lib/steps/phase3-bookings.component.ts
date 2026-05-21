import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IDraftListing, CheckInProcess, Bookability,
} from '@cnt-workspace/data-access';

const CHECK_IN_TIMES = ['12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', 'Anytime'];
const CHECK_OUT_TIMES = ['10 AM', '11 AM', 'Noon', '1 PM', '2 PM', 'Anytime'];
const NIGHT_OPTIONS = [1, 2, 3, 5, 7, 14, 21, 30];
const NOTICE_OPTIONS_HOURS = [0, 6, 12, 24, 48, 72];
const NOTICE_OPTIONS_WEEKS = [1, 2, 4, 8, 12, 26, 52];

/** One-tap presets that fill every booking field at once. */
interface IBookingPreset {
  key: string;
  label: string;
  icon: string;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  maxNights: number;
  minNoticeHours: number;
  maxNoticeWeeks: number;
  checkInProcess: CheckInProcess;
  bookability: Bookability;
}

const BOOKING_PRESETS: IBookingPreset[] = [
  { key: 'standard', label: 'Standard', icon: 'tune',
    checkInTime: '3 PM', checkOutTime: '11 AM', minNights: 1, maxNights: 14,
    minNoticeHours: 24, maxNoticeWeeks: 12, checkInProcess: 'self-checkin', bookability: 'instant' },
  { key: 'flexible', label: 'Flexible', icon: 'sentiment_satisfied',
    checkInTime: 'Anytime', checkOutTime: 'Anytime', minNights: 1, maxNights: 30,
    minNoticeHours: 0, maxNoticeWeeks: 26, checkInProcess: 'self-checkin', bookability: 'instant' },
  { key: 'strict', label: 'Strict', icon: 'shield',
    checkInTime: '2 PM', checkOutTime: '11 AM', minNights: 2, maxNights: 14,
    minNoticeHours: 48, maxNoticeWeeks: 12, checkInProcess: 'meet-greet', bookability: 'request' },
];

/**
 * Step 3.1 — booking-flow settings. Check-in/out windows, min/max nights,
 * request notice, check-in process, and instant-book vs request-to-book.
 */
@Component({
  selector: 'cnt-phase3-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Bookings & check-ins
      </h2>
      <p class="text-sm font-body text-muted-text mb-5">Tune how guests book and arrive.</p>

      <!-- Quick presets -->
      <div class="mb-6">
        <div class="flex flex-wrap gap-2">
          @for (p of presets; track p.key) {
            <button type="button" (click)="applyPreset(p)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dark-text/15 bg-cream/50 text-xs font-body font-bold text-dark-text hover:border-trinidad hover:text-trinidad transition-colors">
              <span class="material-symbols-outlined text-sm">{{ p.icon }}</span>
              {{ p.label }}
            </button>
          }
        </div>
        <p class="text-[0.65rem] font-body text-muted-text mt-2">Tap a preset, then fine-tune below.</p>
      </div>

      <!-- Times -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-5">
        <h3 class="font-headline font-bold text-dark-text text-base mb-4">Check-in / check-out times</h3>
        <div class="grid grid-cols-2 gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Check-in after</span>
            <select [(ngModel)]="checkInTime" name="checkInTime" (change)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text">
              @for (t of checkInTimes; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Check-out before</span>
            <select [(ngModel)]="checkOutTime" name="checkOutTime" (change)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text">
              @for (t of checkOutTimes; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </label>
        </div>
      </div>

      <!-- Night limits -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-5">
        <h3 class="font-headline font-bold text-dark-text text-base mb-4">Night limits</h3>
        <div class="grid grid-cols-2 gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Min nights</span>
            <select [(ngModel)]="minNights" name="minNights" (change)="onMinNightsChange()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text">
              @for (n of nights; track n) {
                <option [ngValue]="n">{{ n }} {{ n === 1 ? 'night' : 'nights' }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Max nights</span>
            <select [(ngModel)]="maxNights" name="maxNights" (change)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text">
              @for (n of nights; track n) {
                <option [ngValue]="n">{{ n }} {{ n === 1 ? 'night' : 'nights' }}</option>
              }
            </select>
          </label>
        </div>
      </div>

      <!-- Notice windows -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-5">
        <h3 class="font-headline font-bold text-dark-text text-base mb-4">Booking lead times</h3>
        <div class="grid grid-cols-2 gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Min notice</span>
            <select [(ngModel)]="minNoticeHours" name="minNoticeHours" (change)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text">
              @for (h of noticeHours; track h) {
                <option [ngValue]="h">{{ h === 0 ? 'Same day OK' : h + ' hours' }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Max notice</span>
            <select [(ngModel)]="maxNoticeWeeks" name="maxNoticeWeeks" (change)="emit()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text">
              @for (w of noticeWeeks; track w) {
                <option [ngValue]="w">{{ w === 52 ? '1 year ahead' : w === 1 ? '1 week ahead' : w + ' weeks ahead' }}</option>
              }
            </select>
          </label>
        </div>
      </div>

      <!-- Check-in process + bookability -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-4">Check-in style</h3>
        <div class="space-y-2 mb-6">
          @for (opt of processOpts; track opt.key) {
            <button type="button" (click)="setProcess(opt.key)"
              [ngClass]="checkInProcess === opt.key ? 'border-trinidad bg-trinidad/8' : 'border-dark-text/15 bg-white'"
              class="w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors">
              <span class="material-symbols-outlined text-base mt-0.5"
                [class.text-trinidad]="checkInProcess === opt.key"
                [class.text-muted-text]="checkInProcess !== opt.key">{{ opt.icon }}</span>
              <div class="flex-1">
                <div class="font-body font-bold text-sm text-dark-text">{{ opt.label }}</div>
                <div class="text-xs text-muted-text mt-0.5">{{ opt.desc }}</div>
              </div>
            </button>
          }
        </div>

        <h3 class="font-headline font-bold text-dark-text text-base mb-4">Bookability</h3>
        <div class="space-y-2">
          <button type="button" (click)="setBookability('instant')"
            [ngClass]="bookability === 'instant' ? 'border-trinidad bg-trinidad/8' : 'border-dark-text/15 bg-white'"
            class="w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors">
            <span class="material-symbols-outlined text-base mt-0.5" style="font-variation-settings: 'FILL' 1;"
              [class.text-trinidad]="bookability === 'instant'"
              [class.text-muted-text]="bookability !== 'instant'">bolt</span>
            <div class="flex-1">
              <div class="font-body font-bold text-sm text-dark-text">Instant Book</div>
              <div class="text-xs text-muted-text mt-0.5">Guests can book without waiting for approval.</div>
            </div>
          </button>
          <button type="button" (click)="setBookability('request')"
            [ngClass]="bookability === 'request' ? 'border-trinidad bg-trinidad/8' : 'border-dark-text/15 bg-white'"
            class="w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors">
            <span class="material-symbols-outlined text-base mt-0.5"
              [class.text-trinidad]="bookability === 'request'"
              [class.text-muted-text]="bookability !== 'request'">schedule</span>
            <div class="flex-1">
              <div class="font-body font-bold text-sm text-dark-text">Request to book</div>
              <div class="text-xs text-muted-text mt-0.5">You approve each booking within 24h.</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class Phase3BookingsComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.checkInTime = value?.checkInTime ?? '2 PM';
    this.checkOutTime = value?.checkOutTime ?? 'Noon';
    this.minNights = value?.minNights ?? 1;
    this.maxNights = value?.maxNights ?? 14;
    this.minNoticeHours = value?.minNoticeHours ?? 24;
    this.maxNoticeWeeks = value?.maxNoticeWeeks ?? 12;
    this.checkInProcess = value?.checkInProcess ?? 'meet-greet';
    this.bookability = value?.bookability ?? 'instant';
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  checkInTime = '2 PM';
  checkOutTime = 'Noon';
  minNights = 1;
  maxNights = 14;
  minNoticeHours = 24;
  maxNoticeWeeks = 12;
  checkInProcess: CheckInProcess = 'meet-greet';
  bookability: Bookability = 'instant';
  readonly checkInTimes = CHECK_IN_TIMES;
  readonly checkOutTimes = CHECK_OUT_TIMES;
  readonly nights = NIGHT_OPTIONS;
  readonly noticeHours = NOTICE_OPTIONS_HOURS;
  readonly noticeWeeks = NOTICE_OPTIONS_WEEKS;
  readonly processOpts: { key: CheckInProcess; label: string; desc: string; icon: string }[] = [
    { key: 'meet-greet',   label: 'Meet & greet',  desc: 'You\'ll be there to welcome guests in person.', icon: 'handshake' },
    { key: 'self-checkin', label: 'Self check-in', desc: 'Guests follow instructions you send ahead of time.', icon: 'key' },
    { key: 'lockbox',      label: 'Lockbox',       desc: 'Code on a lockbox at the site entry.', icon: 'lock' },
  ];

  readonly presets = BOOKING_PRESETS;

  setProcess(p: CheckInProcess): void { this.checkInProcess = p; this.emit(); }
  setBookability(b: Bookability): void { this.bookability = b; this.emit(); }

  /** Apply a preset to every field at once. */
  applyPreset(p: IBookingPreset): void {
    this.checkInTime = p.checkInTime;
    this.checkOutTime = p.checkOutTime;
    this.minNights = p.minNights;
    this.maxNights = p.maxNights;
    this.minNoticeHours = p.minNoticeHours;
    this.maxNoticeWeeks = p.maxNoticeWeeks;
    this.checkInProcess = p.checkInProcess;
    this.bookability = p.bookability;
    this.emit();
  }

  /** Keep max ≥ min — bump max up when the host raises min past it. */
  onMinNightsChange(): void {
    if (this.maxNights < this.minNights) this.maxNights = this.minNights;
    this.emit();
  }

  emit(): void {
    this.patch.emit({
      checkInTime: this.checkInTime,
      checkOutTime: this.checkOutTime,
      minNights: this.minNights,
      maxNights: this.maxNights,
      minNoticeHours: this.minNoticeHours,
      maxNoticeWeeks: this.maxNoticeWeeks,
      checkInProcess: this.checkInProcess,
      bookability: this.bookability,
    });
  }
}
