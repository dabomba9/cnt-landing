import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Booking } from '@cnt-workspace/models';
import { PublicUser } from '@cnt-workspace/data-access';

interface ActivityEvent {
  icon: string;
  iconColor: 'jungle-green' | 'trinidad' | 'gold' | 'muted-text';
  headline: string;
  subline?: string;
  ts: number;
  link?: { path: string | (string | number)[]; query?: Record<string, string | number> };
}

interface ActivityGroup {
  label: string;
  events: ActivityEvent[];
}

@Component({
  selector: 'cnt-activity-feed',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-7">
      @if (events.length === 0) {
        <p class="text-sm font-body text-muted-text">No activity yet — book a stay or save a listing to see it here.</p>
      } @else {
        <div class="space-y-5">
          @for (g of groups; track g.label) {
            <div>
              <div class="text-[0.6rem] uppercase tracking-[0.14em] font-button font-bold text-muted-text mb-2">{{ g.label }}</div>
              <ul class="divide-y divide-dark-text/8">
                @for (e of g.events; track e.ts) {
                  <li class="py-3 first:pt-0 last:pb-0">
                    <ng-container *ngTemplateOutlet="row; context: { $implicit: e }"></ng-container>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }
    </div>

    <ng-template #row let-e>
      @if (e.link) {
        <a [routerLink]="e.link.path" [queryParams]="e.link.query || {}" class="flex items-start gap-3 hover:bg-cream/40 -mx-2 px-2 py-1 rounded-lg transition-colors no-underline">
          <ng-container *ngTemplateOutlet="rowBody; context: { $implicit: e }"></ng-container>
        </a>
      } @else {
        <div class="flex items-start gap-3">
          <ng-container *ngTemplateOutlet="rowBody; context: { $implicit: e }"></ng-container>
        </div>
      }
    </ng-template>

    <ng-template #rowBody let-e>
      <span class="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
        [ngClass]="{
          'bg-jungle-green/10': e.iconColor === 'jungle-green',
          'bg-trinidad/10': e.iconColor === 'trinidad',
          'bg-gold/20': e.iconColor === 'gold',
          'bg-dark-text/8': e.iconColor === 'muted-text'
        }">
        <span class="material-symbols-outlined text-base"
          [ngClass]="{
            'text-jungle-green': e.iconColor === 'jungle-green',
            'text-trinidad': e.iconColor === 'trinidad',
            'text-muted-text': e.iconColor === 'muted-text'
          }"
          [style.color]="e.iconColor === 'gold' ? '#b3760e' : null"
          style="font-variation-settings: 'FILL' 1;">
          {{ e.icon }}
        </span>
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-body font-bold text-dark-text leading-tight">{{ e.headline }}</div>
        @if (e.subline) {
          <div class="text-xs text-muted-text font-body leading-snug mt-0.5">{{ e.subline }}</div>
        }
      </div>
      <div class="text-[0.65rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text shrink-0 self-center">{{ formatRelative(e.ts) }}</div>
    </ng-template>
  `,
})
export class ActivityFeedComponent {
  @Input() set bookings(value: Booking[]) {
    this._bookings = value || [];
    this.recompute();
  }
  @Input() set user(value: PublicUser | null) {
    this._user = value;
    this.recompute();
  }
  events: ActivityEvent[] = [];
  groups: ActivityGroup[] = [];
  private _bookings: Booking[] = [];
  private _user: PublicUser | null = null;

  private recompute(): void {
    const out: ActivityEvent[] = [];
    for (const b of this._bookings) {
      const created = new Date(b.createdAt).getTime();
      if (b.instantBook) {
        out.push({
          icon: 'check_circle',
          iconColor: 'jungle-green',
          headline: `Confirmed: ${b.listingTitle}`,
          subline: `${b.nights} ${b.nights === 1 ? 'night' : 'nights'} · $${b.total}`,
          ts: created,
          link: { path: ['/booking/confirm', b.id] },
        });
      } else {
        out.push({
          icon: 'send',
          iconColor: 'trinidad',
          headline: `Request sent: ${b.listingTitle}`,
          subline: 'Awaiting host response',
          ts: created,
          link: { path: ['/booking/confirm', b.id] },
        });
      }
      if (b.status === 'approved') {
        out.push({
          icon: 'verified',
          iconColor: 'jungle-green',
          headline: `Host approved your request`,
          subline: b.listingTitle,
          ts: created + 30_000, // mock decisionAt offset
          link: { path: ['/booking/confirm', b.id] },
        });
      } else if (b.status === 'declined') {
        out.push({
          icon: 'do_not_disturb_on',
          iconColor: 'trinidad',
          headline: `Host declined your request`,
          subline: b.listingTitle,
          ts: created + 30_000,
          link: { path: ['/booking/confirm', b.id] },
        });
      } else if (b.status === 'cancelled') {
        out.push({
          icon: 'cancel',
          iconColor: 'muted-text',
          headline: `Cancelled: ${b.listingTitle}`,
          ts: created + 60_000,
          link: { path: ['/booking/confirm', b.id] },
        });
      }
    }
    if (this._user?.verified && this._user.verifiedAt) {
      out.push({
        icon: 'verified_user',
        iconColor: 'jungle-green',
        headline: `Identity verified`,
        subline: `Verified guest badge added to your profile`,
        ts: new Date(this._user.verifiedAt).getTime(),
      });
    }
    this.events = out.sort((a, b) => b.ts - a.ts).slice(0, 8);
    this.groups = this.bucketEvents(this.events);
  }

  private bucketEvents(events: ActivityEvent[]): ActivityGroup[] {
    if (!events.length) return [];
    const todayCut = new Date(); todayCut.setHours(0, 0, 0, 0);
    const todayStart = todayCut.getTime();
    const weekStart = todayStart - 7 * 86_400_000;
    const buckets: Record<string, ActivityEvent[]> = { Today: [], 'This week': [], Earlier: [] };
    for (const e of events) {
      if (e.ts >= todayStart) buckets['Today'].push(e);
      else if (e.ts >= weekStart) buckets['This week'].push(e);
      else buckets['Earlier'].push(e);
    }
    return ['Today', 'This week', 'Earlier']
      .filter(label => buckets[label].length > 0)
      .map(label => ({ label, events: buckets[label] }));
  }

  formatRelative(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.round(diff / 86_400_000)}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
