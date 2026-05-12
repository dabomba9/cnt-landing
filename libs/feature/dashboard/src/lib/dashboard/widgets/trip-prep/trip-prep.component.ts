import { Component, Input, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IBooking } from '@cnt-workspace/models';
import { IPublicUser } from '@cnt-workspace/data-access';
import { IMyRv, hasMyRvPhotos } from '@cnt-workspace/data-access';

interface IPrepItem {
  key: 'verified' | 'rvphotos' | 'calendar' | 'contacted';
  icon: string;
  headline: string;
  body: string;
  done: boolean;
  /** Display copy for the action when not done */
  action: string;
  /** Click handler */
  onAction: (event: Event) => void;
}

@Component({
  selector: 'cnt-trip-prep',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (booking) {
      <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
        <div class="flex items-baseline justify-between gap-3 mb-4">
          <div>
            <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Trip prep</span>
            <h2 class="font-headline font-bold text-dark-text text-2xl tracking-tight leading-tight">Get ready in 4 steps</h2>
          </div>
          <span class="text-xs uppercase tracking-[0.12em] font-button font-bold text-muted-text shrink-0">{{ doneCount }} of {{ items.length }} done</span>
        </div>

        <!-- Progress bar -->
        <div class="h-1.5 rounded-full bg-dark-text/8 overflow-hidden mb-5">
          <div class="h-full bg-trinidad transition-all duration-500" [style.width.%]="percent"></div>
        </div>

        <ul class="divide-y divide-dark-text/8">
          @for (item of items; track item.key) {
            <li class="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
              <span class="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
                [ngClass]="item.done ? 'bg-jungle-green/10' : 'bg-dark-text/5'">
                <span class="material-symbols-outlined text-base"
                  [ngClass]="item.done ? 'text-jungle-green' : 'text-muted-text'"
                  style="font-variation-settings: 'FILL' 1;">{{ item.done ? 'check_circle' : item.icon }}</span>
              </span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-body font-bold leading-tight"
                  [ngClass]="item.done ? 'text-muted-text line-through decoration-dark-text/20' : 'text-dark-text'">{{ item.headline }}</div>
                <div class="text-xs text-muted-text font-body leading-snug mt-0.5">{{ item.body }}</div>
              </div>
              @if (!item.done) {
                <button type="button" (click)="item.onAction($event)"
                  class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">
                  {{ item.action }}
                  <span class="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              } @else {
                <span class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-jungle-green/10 text-jungle-green text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold">
                  <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">check</span>
                  Done
                </span>
              }
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class TripPrepComponent {
  @Input() set booking(value: IBooking | null) {
    this._booking = value;
    this.computeFlags();
  }
  get booking(): IBooking | null { return this._booking; }
  private _booking: IBooking | null = null;

  @Input() set user(value: IPublicUser | null) {
    this._user = value;
    this.computeFlags();
  }
  private _user: IPublicUser | null = null;

  @Input() set myRv(value: IMyRv | null) {
    this._myRv = value;
    this.computeFlags();
  }
  private _myRv: IMyRv | null = null;

  items: IPrepItem[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
  ) {}

  get doneCount(): number { return this.items.filter(i => i.done).length; }
  get percent(): number { return this.items.length === 0 ? 0 : Math.round((this.doneCount / this.items.length) * 100); }

  private computeFlags(): void {
    if (!this._booking) { this.items = []; return; }
    const b = this._booking;
    const flagsKey = `cnt-prep-flags-${b.id}`;
    const localFlags = this.readLocalFlags(flagsKey);

    this.items = [
      {
        key: 'verified',
        icon: 'verified_user',
        headline: 'Identity verified',
        body: 'Hosts trust verified guests. Takes about 30 seconds.',
        done: !!this._user?.verified,
        action: 'Verify',
        onAction: (e) => { e.stopPropagation(); this.router.navigate(['/listing'], { queryParams: { id: b.listingId } }); },
      },
      {
        key: 'rvphotos',
        icon: 'rv_hookup',
        headline: 'RV photos uploaded',
        body: 'Rig + license plate so your host knows what to expect.',
        done: this._myRv ? hasMyRvPhotos(this._myRv) : false,
        action: 'Upload',
        onAction: (e) => { e.stopPropagation(); this.router.navigate(['/search'], { queryParams: { openRv: 1 } }); },
      },
      {
        key: 'calendar',
        icon: 'calendar_add_on',
        headline: 'Trip on your calendar',
        body: 'Add the .ics so dates land in your default calendar app.',
        done: !!localFlags['calendar'],
        action: 'Download',
        onAction: (e) => { e.stopPropagation(); this.downloadIcs(); this.markFlag(flagsKey, 'calendar'); },
      },
      {
        key: 'contacted',
        icon: 'forum',
        headline: 'Said hi to the host',
        body: 'A quick "looking forward" goes a long way.',
        done: !!localFlags['contacted'],
        action: 'Message',
        onAction: (e) => {
          e.stopPropagation();
          this.markFlag(flagsKey, 'contacted');
          this.router.navigate(['/contact'], { queryParams: { reason: 'guest-support', listingId: b.listingId } });
        },
      },
    ];
  }

  private readLocalFlags(key: string): Record<string, boolean> {
    if (!isPlatformBrowser(this.platformId)) return {};
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private markFlag(key: string, name: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const flags = this.readLocalFlags(key);
    flags[name] = true;
    try { localStorage.setItem(key, JSON.stringify(flags)); } catch {}
    // Re-derive items so the row flips immediately.
    this.computeFlags();
  }

  private downloadIcs(): void {
    if (!this._booking || !isPlatformBrowser(this.platformId)) return;
    const b = this._booking;
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CurbNTurf//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${b.id}@curbnturf`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(new Date(b.dates.start))}`,
      `DTEND:${fmt(new Date(b.dates.end))}`,
      `SUMMARY:CurbNTurf — ${b.listingTitle}`,
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
}
