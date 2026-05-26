import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { SeoService, TripPlannerService, ITripPlan, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-trip-planner-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream bg-grid-subtle">
      <section class="px-[2%]">
        <div class="max-w-[80rem] mx-auto px-4 md:px-8 py-8 md:py-12">

          <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-10">
            <div>
              <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Roadtrips</span>
              <h1 class="font-headline font-bold text-dark-text tracking-tight leading-[1.05] text-3xl md:text-4xl">Trip planner</h1>
              <p class="text-sm text-muted-text font-body mt-2">Map a route across private spots, boondocking, POIs, and any waypoints you like. Plan it now, book later.</p>
            </div>
            <button type="button" (click)="startCreate()"
              class="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_8px_20px_rgba(227,83,13,0.2)] shrink-0">
              <span class="material-symbols-outlined text-base">add</span>
              New trip
            </button>
          </div>

          @if (creating) {
            <div class="bg-white rounded-2xl border border-trinidad/30 shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-6 mb-6">
              <div class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-trinidad mb-2">Name your trip</div>
              <div class="flex flex-col sm:flex-row gap-3">
                <input type="text" [(ngModel)]="newName" name="newName" maxlength="60"
                  placeholder="Summer loop through the Rockies"
                  (keydown.enter)="confirmCreate()"
                  class="flex-1 bg-cream/60 border border-dark-text/15 rounded-xl px-4 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                <button type="button" (click)="cancelCreate()"
                  class="px-4 py-2.5 rounded-full bg-white border border-dark-text/15 text-muted-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Cancel</button>
                <button type="button" (click)="confirmCreate()" [disabled]="!newName.trim()"
                  class="px-5 py-2.5 rounded-full bg-trinidad text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40">Create</button>
              </div>
            </div>
          }

          @if (plans.length === 0) {
            <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-10 md:p-16 text-center">
              <span class="w-14 h-14 mx-auto rounded-full bg-jungle-green/10 inline-flex items-center justify-center">
                <span class="material-symbols-outlined text-3xl text-jungle-green">map</span>
              </span>
              <h3 class="font-headline font-bold text-2xl mt-4 mb-2 text-dark-text">No trips planned yet</h3>
              <p class="text-sm text-muted-text font-body mb-6 max-w-md mx-auto">Sketch your next road trip — pick stops, drag them into order, and visualize the route on the map.</p>
              <button type="button" (click)="startCreate()"
                class="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_8px_20px_rgba(227,83,13,0.2)]">
                <span class="material-symbols-outlined text-base">add</span>
                Plan your first trip
              </button>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (p of plans; track p.id) {
                <article class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-5 flex flex-col gap-3 transition-shadow hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
                  <a [routerLink]="['/trip-planner', p.id]" class="no-underline group">
                    <h3 class="font-headline font-bold text-dark-text text-lg leading-tight group-hover:text-trinidad transition-colors">{{ p.name }}</h3>
                    <p class="text-xs text-muted-text font-body mt-1">{{ datesLabel(p) }}</p>
                  </a>
                  <div class="flex flex-wrap items-center gap-3 text-[0.65rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text">
                    <span class="inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm text-jungle-green">trip_origin</span>{{ p.stops.length }} {{ p.stops.length === 1 ? 'stop' : 'stops' }}</span>
                    @if (p.stops.length >= 2) {
                      <span class="inline-flex items-center gap-1"><span class="material-symbols-outlined text-sm text-trinidad">route</span>{{ p.stops[0].name }} → {{ p.stops[p.stops.length - 1].name }}</span>
                    }
                  </div>
                  <div class="flex items-center justify-between gap-3 pt-3 border-t border-dark-text/8">
                    <a [routerLink]="['/trip-planner', p.id]"
                      class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline">Open →</a>
                    @if (confirmingDeleteId === p.id) {
                      <span class="flex items-center gap-2">
                        <button type="button" (click)="confirmingDeleteId = null"
                          class="px-2.5 py-1 rounded-full bg-white border border-dark-text/15 text-muted-text text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Cancel</button>
                        <button type="button" (click)="confirmDelete(p.id)"
                          class="px-2.5 py-1 rounded-full bg-trinidad text-white text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95">Delete</button>
                      </span>
                    } @else {
                      <button type="button" (click)="confirmingDeleteId = p.id" aria-label="Delete trip plan"
                        class="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white border border-dark-text/15 text-muted-text hover:border-trinidad hover:text-trinidad transition-colors">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </div>
      </section>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class TripPlannerListComponent implements OnInit, OnDestroy {
  plans: ITripPlan[] = [];
  creating = false;
  newName = '';
  confirmingDeleteId: string | null = null;
  private sub: Subscription | null = null;

  constructor(
    private planner: TripPlannerService,
    private router: Router,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Trip planner — CurbNTurf',
      description: 'Plan your next road trip — pick stops, set dates, and map the route.',
      url: '/trip-planner',
      robots: 'noindex, nofollow',
    });
    this.sub = this.planner.plans$.subscribe(ps => {
      // Newest-edited first so the most relevant trip leads.
      this.plans = ps.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  startCreate(): void { this.creating = true; this.newName = ''; }
  cancelCreate(): void { this.creating = false; this.newName = ''; }
  confirmCreate(): void {
    const name = this.newName.trim();
    if (!name) return;
    const plan = this.planner.create(name);
    this.toasts.success('Trip created.');
    this.router.navigate(['/trip-planner', plan.id]);
  }

  confirmDelete(id: string): void {
    this.planner.delete(id);
    this.confirmingDeleteId = null;
    this.toasts.info('Trip removed.');
  }

  datesLabel(p: ITripPlan): string {
    if (!p.startDate && !p.endDate) return 'Dates not set';
    const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (p.startDate && p.endDate) return `${fmt(p.startDate)} – ${fmt(p.endDate)}`;
    return p.startDate ? `From ${fmt(p.startDate)}` : `Until ${fmt(p.endDate!)}`;
  }
}
