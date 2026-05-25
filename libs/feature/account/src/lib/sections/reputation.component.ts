import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  AuthService, IPublicUser, BookingService,
  HostReviewService, IHostReview, IHostReviewSubScores, GUEST_SUBSCORE_LABELS,
  starState, isReviewRevealed,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';

@Component({
  selector: 'cnt-account-reputation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8 space-y-6">
      <div>
        <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Two-sided trust</span>
        <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">Your reputation</h2>
        <p class="text-xs text-muted-text font-body">How hosts are rating you as a guest. Reviews stay hidden until both sides submit — or 14 days after checkout.</p>
      </div>

      @if (totalCount === 0) {
        <div class="rounded-xl bg-cream/60 border border-dark-text/8 p-6 text-center">
          <span class="material-symbols-outlined text-3xl text-muted-text mb-2 inline-block">person_outline</span>
          <h3 class="font-headline font-bold text-dark-text text-base mb-1">No reviews yet</h3>
          <p class="text-sm font-body text-muted-text">You'll see your guest reputation here once a host reviews you. New guests get a fair shot — hosts know everyone starts here.</p>
        </div>
      } @else {
        <!-- Aggregated headline -->
        <div class="flex items-center gap-6 flex-wrap">
          <div>
            <div class="flex items-baseline gap-2">
              <span class="font-headline font-bold text-dark-text text-4xl leading-none">{{ rating.toFixed(1) }}</span>
              <span class="text-muted-text font-body">/ 5</span>
            </div>
            <div class="flex items-center gap-1 mt-1.5">
              @for (i of stars; track i) {
                @switch (starState(i, rating)) {
                  @case ('full') { <span class="material-symbols-outlined text-trinidad" style="font-variation-settings: 'FILL' 1;">star</span> }
                  @case ('half') { <span class="material-symbols-outlined text-trinidad" style="font-variation-settings: 'FILL' 1;">star_half</span> }
                  @default       { <span class="material-symbols-outlined text-dark-text opacity-20" style="font-variation-settings: 'FILL' 1;">star</span> }
                }
              }
              <span class="ml-1 text-xs font-body text-muted-text">{{ totalCount }} review{{ totalCount === 1 ? '' : 's' }}</span>
            </div>
          </div>
          @if (pendingCount > 0) {
            <div class="rounded-xl border border-jungle-green/30 bg-jungle-green/5 px-4 py-3 text-xs font-body text-dark-text">
              <span class="font-bold">{{ pendingCount }} review{{ pendingCount === 1 ? '' : 's' }} pending reveal</span> — waiting on you or the 14-day window.
            </div>
          }
        </div>

        <!-- Per-sub-score breakdown -->
        <div class="rounded-xl border border-dark-text/8 p-4 md:p-5">
          <div class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-muted-text mb-3">By category</div>
          <div class="space-y-2">
            @for (s of subScoreLabels; track s.key) {
              <div class="flex items-center gap-3">
                <span class="text-sm font-body text-dark-text flex-1">{{ s.label }}</span>
                <span class="text-sm font-body font-bold text-dark-text w-12 text-right">{{ subAverage(s.key).toFixed(1) }}</span>
                <div class="w-32 h-1.5 rounded-full bg-dark-text/10 overflow-hidden">
                  <div class="h-full bg-trinidad" [style.width.%]="(subAverage(s.key) / 5) * 100"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Individual reviews (revealed only) -->
        @if (revealedReviews.length > 0) {
          <div class="space-y-3">
            <div class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-muted-text">What hosts said</div>
            @for (r of revealedReviews; track r.id) {
              <div class="rounded-xl border border-dark-text/8 p-4">
                <div class="flex items-center gap-1 mb-1">
                  @for (i of stars; track i) {
                    @switch (starState(i, r.rating)) {
                      @case ('full') { <span class="material-symbols-outlined text-sm text-trinidad" style="font-variation-settings: 'FILL' 1;">star</span> }
                      @case ('half') { <span class="material-symbols-outlined text-sm text-trinidad" style="font-variation-settings: 'FILL' 1;">star_half</span> }
                      @default       { <span class="material-symbols-outlined text-sm text-dark-text opacity-20" style="font-variation-settings: 'FILL' 1;">star</span> }
                    }
                  }
                  <span class="ml-1 text-xs font-body font-bold text-dark-text">{{ r.rating.toFixed(1) }}</span>
                </div>
                @if (r.text) {
                  <p class="text-sm font-body text-dark-text leading-relaxed">{{ r.text }}</p>
                } @else {
                  <p class="text-xs font-body text-muted-text italic">No written feedback.</p>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class ReputationSectionComponent implements OnInit, OnDestroy {
  user: IPublicUser | null = null;
  private allReviews: IHostReview[] = [];
  private allBookings: IBooking[] = [];
  private subs: Subscription[] = [];

  readonly stars = [1, 2, 3, 4, 5];
  readonly subScoreLabels = GUEST_SUBSCORE_LABELS;
  readonly starState = starState;

  constructor(
    private auth: AuthService,
    private bookingSvc: BookingService,
    private hostReviews: HostReviewService,
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    this.subs.push(this.hostReviews.reviews$.subscribe(rs => { this.allReviews = rs; }));
    this.subs.push(this.bookingSvc.bookings$.subscribe(bs => { this.allBookings = bs; }));
  }

  ngOnDestroy(): void { for (const s of this.subs) s.unsubscribe(); }

  /** All host-reviews of this guest (revealed AND pending). */
  get myReviews(): IHostReview[] {
    if (!this.user) return [];
    return this.allReviews.filter(r => r.guestEmail === this.user!.email);
  }

  private get bookingsMap(): Map<string, IBooking> {
    return new Map(this.allBookings.map(b => [b.id, b]));
  }

  get revealedReviews(): IHostReview[] {
    const map = this.bookingsMap;
    return this.myReviews.filter(r => isReviewRevealed(map.get(r.bookingId)));
  }

  get totalCount(): number { return this.revealedReviews.length; }
  get pendingCount(): number { return this.myReviews.length - this.totalCount; }

  get rating(): number {
    const list = this.revealedReviews;
    if (list.length === 0) return 0;
    const sum = list.reduce((s, r) => s + r.rating, 0);
    return +(sum / list.length).toFixed(2);
  }

  subAverage(key: keyof IHostReviewSubScores): number {
    const list = this.revealedReviews;
    if (list.length === 0) return 0;
    const sum = list.reduce((s, r) => s + r.subScores[key], 0);
    return +(sum / list.length).toFixed(2);
  }
}
