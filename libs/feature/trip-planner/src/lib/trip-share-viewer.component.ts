import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import {
  SeoService, ToastService, TripPlannerService, ITripPlan, ITripStop,
  decodeTripShare, ITripShareV1,
  RoutingService, IRoute, parseIsoDate, shortDateLabel,
} from '@cnt-workspace/data-access';
import { TripPlannerMapComponent } from './trip-planner-map.component';

@Component({
  selector: 'cnt-trip-share-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, TripPlannerMapComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream">
      @if (!plan) {
        <section class="px-[2%]">
          <div class="max-w-[60rem] mx-auto px-4 md:px-8 py-16 text-center">
            <span class="material-symbols-outlined text-3xl text-muted-text">link_off</span>
            <h2 class="font-headline font-bold text-2xl mt-3 mb-2 text-dark-text">Share link invalid</h2>
            <p class="text-sm text-muted-text mb-4">This trip link is broken or expired.</p>
            <a routerLink="/trip-planner" class="text-trinidad text-sm font-button font-bold uppercase tracking-[0.12em] hover:underline">Open trip planner →</a>
          </div>
        </section>
      } @else {
        <section class="px-[2%] py-4 md:py-6">
          <div class="max-w-[100rem] mx-auto px-2 md:px-4">

            <div class="flex flex-wrap items-center gap-3 mb-4">
              <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined text-base">share</span>
                Shared trip
              </span>
              <h1 class="flex-1 min-w-[12rem] font-headline font-bold text-xl text-dark-text">{{ plan.name }}</h1>
              @if (tripDateLabel) {
                <span class="inline-flex items-center gap-1.5 text-xs text-muted-text">
                  <span class="material-symbols-outlined text-base text-jungle-green">calendar_today</span>
                  {{ tripDateLabel }}
                </span>
              }
              <button type="button" (click)="importTrip()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-trinidad text-white text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shrink-0">
                <span class="material-symbols-outlined text-sm">bookmark_add</span>
                Save to my trips
              </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">

              <aside class="bg-white rounded-2xl border border-dark-text/8 p-4 space-y-2 self-start">
                <div class="text-xs text-muted-text mb-1">
                  {{ plan.stops.length }} {{ plan.stops.length === 1 ? 'stop' : 'stops' }}
                  @if (activeRoute) { · {{ formatMiles(activeRoute.totalMiles) }} · {{ formatMins(activeRoute.totalMinutes) }} }
                </div>
                @for (s of plan.stops; track s.id; let i = $index, last = $last) {
                  <div class="flex items-start gap-2 p-2 rounded-lg bg-cream/30 border border-dark-text/8">
                    <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white text-[11px] font-headline font-bold shrink-0"
                      [ngStyle]="{ background: stopColor(i, last) }">
                      @if (i === 0 && plan.stops.length > 1) {
                        <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">flag</span>
                      } @else if (last && plan.stops.length > 1) {
                        <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">sports_score</span>
                      } @else {
                        {{ i + 1 }}
                      }
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-body font-bold text-dark-text truncate">{{ s.name }}</div>
                      @if (s.address) {
                        <div class="text-[0.6rem] text-muted-text truncate">{{ s.address }}</div>
                      }
                      @if (stopDateLabel(s); as d) {
                        <div class="text-[0.6rem] text-jungle-green mt-0.5">
                          <span class="material-symbols-outlined text-[12px] align-middle">calendar_today</span>
                          {{ d }}
                        </div>
                      }
                      @if (s.notes) {
                        <p class="text-[0.65rem] text-muted-text mt-1 italic">{{ s.notes }}</p>
                      }
                    </div>
                  </div>
                }
              </aside>

              <div class="rounded-2xl overflow-hidden border border-dark-text/8 bg-white" style="min-height: 65vh;">
                <cnt-trip-planner-map [plan]="plan" [pinDropMode]="false"
                  [backgroundListings]="[]" [backgroundPois]="[]"
                  [routeGeometry]="routeGeometry"></cnt-trip-planner-map>
              </div>
            </div>
          </div>
        </section>
      }
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class TripShareViewerComponent implements OnInit, OnDestroy {
  plan: ITripPlan | null = null;
  activeRoute: IRoute | null = null;
  private routeSub: Subscription | null = null;
  private paramSub: Subscription | null = null;
  private payload: ITripShareV1 | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private route: ActivatedRoute,
    private router: Router,
    private planner: TripPlannerService,
    private routing: RoutingService,
    private seo: SeoService,
    private toasts: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.paramSub = this.route.queryParamMap.subscribe(qp => {
      const t = qp.get('t');
      if (!t) { this.plan = null; return; }
      const decoded = decodeTripShare(t);
      if (!decoded) { this.plan = null; return; }
      this.payload = decoded;
      this.plan = this.materialize(decoded);
      this.seo.update({
        title: `${this.plan.name} — Shared trip | CurbNTurf`,
        description: 'A trip shared from CurbNTurf trip planner.',
        url: `/trip/share`,
        robots: 'noindex, nofollow',
      });
      this.fetchRoute();
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  /** Build a transient ITripPlan from the decoded payload — never persisted. */
  private materialize(p: ITripShareV1): ITripPlan {
    const now = new Date().toISOString();
    return {
      id: 'share-preview',
      name: p.n || 'Shared trip',
      startDate: p.s,
      endDate: p.e,
      corridorMiles: p.c ?? 0,
      stops: p.S.map((s, i) => ({
        id: `share-s-${i}`,
        kind: s.k,
        refId: s.r,
        name: s.n,
        lat: s.a,
        lng: s.g,
        address: s.d,
        checkInDate: s.i,
        checkOutDate: s.o,
        notes: s.t,
      })),
      createdAt: now,
      updatedAt: now,
    };
  }

  private fetchRoute(): void {
    if (!this.plan || this.plan.stops.length < 2) { this.activeRoute = null; return; }
    this.routeSub?.unsubscribe();
    this.routeSub = this.routing.getRoute(this.plan.stops).subscribe(r => {
      this.activeRoute = r;
      this.cdr.markForCheck();
    });
  }

  get routeGeometry(): [number, number][] | null { return this.activeRoute?.coordinates ?? null; }

  formatMiles = (mi: number): string => this.routing.formatDistance(mi);
  formatMins = (m: number): string => this.routing.formatDuration(m);

  get tripDateLabel(): string {
    const s = parseIsoDate(this.plan?.startDate);
    const e = parseIsoDate(this.plan?.endDate);
    if (!s && !e) return '';
    if (s && !e) return `${shortDateLabel(s)} → …`;
    if (!s && e) return `… → ${shortDateLabel(e)}`;
    return `${shortDateLabel(s)} → ${shortDateLabel(e)}`;
  }

  stopDateLabel(s: ITripStop): string {
    const ci = parseIsoDate(s.checkInDate);
    const co = parseIsoDate(s.checkOutDate);
    if (!ci && !co) return '';
    if (ci && !co) return `${shortDateLabel(ci)}`;
    if (!ci && co) return `${shortDateLabel(co)}`;
    return `${shortDateLabel(ci)} → ${shortDateLabel(co)}`;
  }

  stopColor(i: number, last: boolean): string {
    if (this.plan && this.plan.stops.length > 1) {
      if (i === 0) return '#295d42';
      if (last) return '#9a3f0a';
    }
    const k = this.plan?.stops[i]?.kind;
    return ({ private: '#e3530d', boondocking: '#3b6e3b', poi: '#b3760e', custom: '#6b6b6b' } as Record<string, string>)[k as string] ?? '#6b6b6b';
  }

  importTrip(): void {
    if (!this.payload || !isPlatformBrowser(this.platformId)) return;
    const created = this.planner.importShare(this.payload);
    this.toasts.success('Saved to your trips.');
    this.router.navigate(['/trip-planner', created.id]);
  }
}
