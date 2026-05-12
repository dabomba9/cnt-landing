import { Component, Input, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IBooking, STATUS_META } from '@cnt-workspace/models';

@Component({
  selector: 'cnt-upcoming-trip',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (booking) {
      <a [routerLink]="['/booking/confirm', booking.id]"
        class="group block bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] no-underline">
        <div class="flex flex-col md:flex-row">
          <div class="relative md:w-2/5 h-56 md:h-auto md:min-h-[260px] overflow-hidden">
            <img [src]="booking.listingPhoto" [alt]="booking.listingTitle" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]">
            <div class="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[0.6rem] font-button uppercase tracking-[0.1em] font-bold"
              [ngClass]="STATUS_META[booking.status].bg"
              [style.color]="STATUS_META[booking.status].color">
              {{ STATUS_META[booking.status].label }}
            </div>
            @if (countdownLabel) {
              <div class="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-dark-text/90 text-white text-[0.6rem] font-button uppercase tracking-[0.1em] font-bold backdrop-blur-sm">
                <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">schedule</span>
                {{ countdownLabel }}
              </div>
            }
          </div>
          <div class="flex-1 p-6 md:p-8 flex flex-col justify-center">
            <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-2">Upcoming trip</span>
            <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl leading-tight tracking-tight">{{ booking.listingTitle }}</h2>
            <div class="inline-flex items-center gap-1.5 text-muted-text text-sm font-body mt-1.5">
              <span class="material-symbols-outlined text-base text-jungle-green" style="font-variation-settings: 'FILL' 1;">location_on</span>
              {{ booking.listingLocation }}
            </div>
            <div class="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-dark-text/8">
              <div>
                <div class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text font-bold">Check-in</div>
                <div class="text-sm font-body font-bold text-dark-text mt-0.5">{{ checkInLabel }}</div>
              </div>
              <div>
                <div class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text font-bold">Check-out</div>
                <div class="text-sm font-body font-bold text-dark-text mt-0.5">{{ checkOutLabel }}</div>
              </div>
              <div>
                <div class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text font-bold">Trip</div>
                <div class="text-sm font-body font-bold text-dark-text mt-0.5">{{ booking.nights }} {{ booking.nights === 1 ? 'night' : 'nights' }}</div>
              </div>
            </div>
            <!-- IHost + weather row -->
            <div class="flex items-center gap-3 mt-5">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-full bg-jungle-green text-white flex items-center justify-center text-[10px] font-headline font-bold shrink-0">{{ hostInitials }}</div>
                <div class="min-w-0">
                  <div class="text-[0.65rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text leading-tight">Hosted by</div>
                  <div class="text-sm font-body font-bold text-dark-text truncate">{{ booking.hostName }}</div>
                </div>
              </div>
              @if (showWeather) {
                <div class="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream/80 border border-dark-text/8">
                  <span class="material-symbols-outlined text-base" [style.color]="weatherColor" style="font-variation-settings: 'FILL' 1;">{{ weatherIcon }}</span>
                  <span class="text-xs font-body font-bold text-dark-text">{{ weatherLabel }}</span>
                </div>
              }
            </div>

            <!-- Inline action row -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-5 border-t border-dark-text/8">
              <span class="inline-flex items-center gap-1.5 text-trinidad text-xs uppercase tracking-[0.12em] font-button font-bold">
                View details
                <span class="material-symbols-outlined text-base transition-transform duration-200 group-hover:translate-x-0.5">arrow_forward</span>
              </span>
              <button type="button" (click)="onAddToCalendar($event)"
                class="inline-flex items-center gap-1.5 text-dark-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:text-trinidad transition-colors">
                <span class="material-symbols-outlined text-base text-jungle-green">calendar_add_on</span>
                Add to calendar
              </button>
              <a [routerLink]="['/contact']" [queryParams]="{ reason: 'guest-support', listingId: booking.listingId }" (click)="$event.stopPropagation()"
                class="inline-flex items-center gap-1.5 text-dark-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:text-trinidad transition-colors">
                <span class="material-symbols-outlined text-base text-jungle-green" style="font-variation-settings: 'FILL' 1;">forum</span>
                Message host
              </a>
            </div>
          </div>
        </div>
      </a>
    } @else {
      <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-8 md:p-12 text-center">
        <span class="material-symbols-outlined text-4xl text-muted-text" aria-hidden="true">explore</span>
        <h3 class="font-headline font-bold text-2xl mt-3 mb-2">No upcoming trips</h3>
        <p class="text-muted-text text-sm font-body mb-5 max-w-md mx-auto">When you book a stay it'll show up here so you can pull up details on the road.</p>
        <a routerLink="/search" class="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_8px_20px_rgba(227,83,13,0.2)]">
          Plan your next trip
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </a>
      </div>
    }
  `,
})
export class UpcomingTripCardComponent {
  @Input() booking: IBooking | null = null;
  STATUS_META = STATUS_META;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  get hostInitials(): string {
    if (!this.booking) return '';
    return this.booking.hostName.split(/\s+/).filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  }

  /** Weather chip only renders when trip is within 14 days. Mock weather seeded by listingId. */
  get showWeather(): boolean {
    if (!this.booking) return false;
    const days = Math.ceil((new Date(this.booking.dates.start).getTime() - Date.now()) / 86_400_000);
    return days >= 0 && days <= 14;
  }

  get weatherIcon(): string {
    if (!this.booking) return 'wb_sunny';
    const seed = this.booking.listingId % 5;
    return ['wb_sunny', 'partly_cloudy_day', 'wb_sunny', 'cloud', 'partly_cloudy_day'][seed];
  }

  get weatherLabel(): string {
    if (!this.booking) return '';
    const seed = this.booking.listingId % 5;
    const map = [
      ['Sunny', 72], ['Partly sunny', 68], ['Sunny', 79],
      ['Mild', 65], ['Partly cloudy', 70],
    ];
    const [label, temp] = map[seed];
    return `${label}, ${temp}°F`;
  }

  get weatherColor(): string {
    if (!this.booking) return '#b3760e';
    const seed = this.booking.listingId % 5;
    return ['#b3760e', '#b3760e', '#b3760e', '#666666', '#666666'][seed];
  }

  /** Triggered by the inline "Add to calendar" button. Stops propagation so the parent <a> doesn't navigate. */
  onAddToCalendar(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.booking || !isPlatformBrowser(this.platformId)) return;
    const b = this.booking;
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CurbNTurf//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${b.id}@curbnturf`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(new Date(b.dates.start))}`,
      `DTEND:${fmt(new Date(b.dates.end))}`,
      `SUMMARY:CurbNTurf — ${b.listingTitle}`,
      `DESCRIPTION:Hosted by ${b.hostName}.`,
      `LOCATION:${b.listingLocation}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curbnturf-${b.id.slice(0, 8)}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  get checkInLabel(): string {
    if (!this.booking) return '';
    return new Date(this.booking.dates.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  get checkOutLabel(): string {
    if (!this.booking) return '';
    return new Date(this.booking.dates.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  get countdownLabel(): string | null {
    if (!this.booking) return null;
    const days = Math.ceil((new Date(this.booking.dates.start).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return null;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 30) return `In ${Math.round(days / 7)} weeks`;
    return `In ${Math.round(days / 30)} months`;
  }
}
