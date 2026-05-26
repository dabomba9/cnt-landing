import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import {
  SeoService, ToastService, TripPlannerService, ITripPlan, ITripStop, TripStopKind,
  ALL_LISTINGS, MOCK_POIS, IListing, IPoi,
} from '@cnt-workspace/data-access';
import { TripPlannerMapComponent } from './trip-planner-map.component';

type PickerTarget = 'stop' | 'start' | 'end';
type PickerTab = 'listings' | 'pois' | 'pin';

@Component({
  selector: 'cnt-trip-planner-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule, NavbarComponent, FooterComponent, TripPlannerMapComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream">
      @if (!plan) {
        <section class="px-[2%]">
          <div class="max-w-[80rem] mx-auto px-4 md:px-8 py-12 text-center">
            <span class="material-symbols-outlined text-3xl text-muted-text">search_off</span>
            <h2 class="font-headline font-bold text-2xl mt-3 mb-2 text-dark-text">Trip not found</h2>
            <a routerLink="/trip-planner" class="text-trinidad text-sm font-button font-bold uppercase tracking-[0.12em] hover:underline">← Back to trip planner</a>
          </div>
        </section>
      } @else {
        <section class="px-[2%] py-4 md:py-6">
          <div class="max-w-[100rem] mx-auto px-2 md:px-4">
            <!-- Top bar -->
            <div class="flex items-center justify-between gap-3 mb-4">
              <a routerLink="/trip-planner" class="inline-flex items-center gap-1 text-xs font-button font-bold uppercase tracking-[0.12em] text-muted-text hover:text-trinidad transition-colors">
                <span class="material-symbols-outlined text-base">arrow_back</span>
                All trips
              </a>
              <span class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Last saved {{ savedLabel }}</span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
              <!-- Side panel -->
              <aside class="lg:col-span-2 space-y-4">
                <!-- Trip name + dates -->
                <div class="bg-white rounded-2xl border border-dark-text/8 p-5 space-y-4">
                  <label class="block">
                    <span class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-muted-text">Trip name</span>
                    <input type="text" [(ngModel)]="plan.name" name="planName" maxlength="60" (blur)="commitField('name', plan.name)"
                      class="mt-1 w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body font-bold focus:outline-none focus:border-jungle-green">
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <label class="block">
                      <span class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-muted-text">Start date</span>
                      <input type="date" [(ngModel)]="plan.startDate" name="startDate" (change)="commitField('startDate', plan.startDate)"
                        class="mt-1 w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body focus:outline-none focus:border-jungle-green">
                    </label>
                    <label class="block">
                      <span class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-muted-text">End date</span>
                      <input type="date" [(ngModel)]="plan.endDate" name="endDate" (change)="commitField('endDate', plan.endDate)"
                        class="mt-1 w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body focus:outline-none focus:border-jungle-green">
                    </label>
                  </div>
                </div>

                <!-- Start + End points -->
                <div class="bg-white rounded-2xl border border-dark-text/8 p-5 space-y-3">
                  <div class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-muted-text">Endpoints</div>
                  <ng-container *ngTemplateOutlet="endpointRow; context: { stop: plan.startPoint, label: 'Start', target: 'start', color: 'bg-jungle-green' }"></ng-container>
                  <ng-container *ngTemplateOutlet="endpointRow; context: { stop: plan.endPoint, label: 'Finish', target: 'end', color: 'bg-trinidad' }"></ng-container>
                </div>

                <!-- Stops list -->
                <div class="bg-white rounded-2xl border border-dark-text/8 p-5">
                  <div class="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-muted-text">Stops</div>
                      <div class="text-xs font-body text-dark-text">{{ plan.stops.length }} {{ plan.stops.length === 1 ? 'stop' : 'stops' }} · drag to reorder</div>
                    </div>
                    <button type="button" (click)="openPicker('stop')"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-trinidad text-white text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95">
                      <span class="material-symbols-outlined text-sm">add</span>
                      Add stop
                    </button>
                  </div>
                  @if (plan.stops.length === 0) {
                    <p class="text-xs text-muted-text font-body py-3 text-center">No stops yet — add private spots, boondocking, POIs, or drop a custom pin.</p>
                  } @else {
                    <div cdkDropList (cdkDropListDropped)="onDrop($event)" class="space-y-2">
                      @for (s of plan.stops; track s.id) {
                        <div cdkDrag class="flex items-center gap-3 p-3 rounded-xl border border-dark-text/10 bg-cream/40 hover:border-trinidad/40 transition-colors">
                          <span class="material-symbols-outlined text-base text-muted-text cursor-grab" cdkDragHandle>drag_indicator</span>
                          <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white shrink-0"
                            [ngStyle]="{ background: kindColor(s.kind) }">
                            <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">{{ kindIcon(s.kind) }}</span>
                          </span>
                          <div class="flex-1 min-w-0">
                            <div class="text-sm font-body font-bold text-dark-text truncate">{{ s.name }}</div>
                            <div class="text-[0.65rem] text-muted-text font-body truncate">{{ kindLabel(s.kind) }}@if (s.address) {· {{ s.address }}}</div>
                          </div>
                          <button type="button" (click)="removeStop(s.id)" aria-label="Remove stop"
                            class="w-7 h-7 inline-flex items-center justify-center rounded-full bg-white border border-dark-text/15 text-muted-text hover:border-trinidad hover:text-trinidad transition-colors">
                            <span class="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Picker drawer -->
                @if (picker) {
                  <div class="bg-white rounded-2xl border border-trinidad/30 p-5 space-y-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-[0.65rem] font-label uppercase tracking-[0.12em] font-bold text-trinidad">Add {{ pickerTargetLabel }}</div>
                      <button type="button" (click)="closePicker()" aria-label="Close picker"
                        class="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-cream/60 transition-colors">
                        <span class="material-symbols-outlined text-base text-muted-text">close</span>
                      </button>
                    </div>
                    <div class="flex gap-1 bg-cream/60 rounded-full p-0.5 text-[0.6rem] font-button font-bold uppercase tracking-[0.12em]">
                      @for (t of pickerTabs; track t.id) {
                        <button type="button" (click)="setPickerTab(t.id)"
                          [ngClass]="picker.tab === t.id ? 'bg-trinidad text-white' : 'text-dark-text hover:bg-white'"
                          class="flex-1 px-3 py-1.5 rounded-full transition-colors">{{ t.label }}</button>
                      }
                    </div>

                    @if (picker.tab === 'listings') {
                      <input type="search" [(ngModel)]="query" name="query" placeholder="Search by name or city…"
                        class="w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body focus:outline-none focus:border-jungle-green">
                      <div class="max-h-80 overflow-y-auto -mx-2 px-2 space-y-1">
                        @for (l of filteredListings; track l.id) {
                          <button type="button" (click)="addListing(l)"
                            class="w-full text-left p-2.5 rounded-lg hover:bg-cream/60 transition-colors flex items-center gap-3">
                            <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white shrink-0"
                              [ngStyle]="{ background: l.kind === 'boondocking' ? '#3b6e3b' : '#e3530d' }">
                              <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">{{ l.kind === 'boondocking' ? 'landscape' : 'rv_hookup' }}</span>
                            </span>
                            <span class="flex-1 min-w-0">
                              <span class="block text-sm font-body font-bold text-dark-text truncate">{{ l.title }}</span>
                              <span class="block text-[0.65rem] text-muted-text font-body truncate">{{ l.location }} · {{ l.kind === 'boondocking' ? 'Boondocking' : 'Private' }}</span>
                            </span>
                          </button>
                        }
                        @if (filteredListings.length === 0) {
                          <p class="text-xs font-body text-muted-text text-center py-3">No matches.</p>
                        }
                      </div>
                    }

                    @if (picker.tab === 'pois') {
                      <input type="search" [(ngModel)]="query" name="query" placeholder="Search POIs…"
                        class="w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body focus:outline-none focus:border-jungle-green">
                      <div class="max-h-80 overflow-y-auto -mx-2 px-2 space-y-1">
                        @for (p of filteredPois; track p.id) {
                          <button type="button" (click)="addPoi(p)"
                            class="w-full text-left p-2.5 rounded-lg hover:bg-cream/60 transition-colors flex items-center gap-3">
                            <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white bg-gold shrink-0">
                              <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">pin_drop</span>
                            </span>
                            <span class="flex-1 min-w-0">
                              <span class="block text-sm font-body font-bold text-dark-text truncate">{{ p.name }}</span>
                              <span class="block text-[0.65rem] text-muted-text font-body truncate">{{ poiKindLabel(p.kind) }} · {{ p.address }}</span>
                            </span>
                          </button>
                        }
                        @if (filteredPois.length === 0) {
                          <p class="text-xs font-body text-muted-text text-center py-3">No matches.</p>
                        }
                      </div>
                    }

                    @if (picker.tab === 'pin') {
                      <div class="rounded-md border border-dashed border-trinidad/40 bg-trinidad/5 p-4 text-center">
                        <span class="material-symbols-outlined text-2xl text-trinidad" style="font-variation-settings: 'FILL' 1;">push_pin</span>
                        <p class="text-xs font-body text-dark-text mt-1">Click anywhere on the map to drop a pin. You'll be able to name it after.</p>
                      </div>
                      @if (pendingPin) {
                        <div class="rounded-md border border-jungle-green/30 bg-jungle-green/5 p-3 space-y-2">
                          <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-jungle-green">Pin dropped at {{ pendingPin.lat.toFixed(4) }}, {{ pendingPin.lng.toFixed(4) }}</div>
                          <input type="text" [(ngModel)]="pendingPinName" name="pendingPinName" maxlength="60"
                            placeholder="Name this place"
                            class="w-full bg-white border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body focus:outline-none focus:border-jungle-green">
                          <div class="flex justify-end gap-2">
                            <button type="button" (click)="cancelPin()" class="px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-muted-text text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Discard</button>
                            <button type="button" (click)="confirmPin()" [disabled]="!pendingPinName.trim()" class="px-3 py-1.5 rounded-full bg-trinidad text-white text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40">Add pin</button>
                          </div>
                        </div>
                      }
                    }
                  </div>
                }
              </aside>

              <!-- Map -->
              <div class="lg:col-span-3 rounded-2xl overflow-hidden border border-dark-text/8 bg-white" style="min-height: 70vh;">
                <cnt-trip-planner-map
                  [plan]="plan"
                  [pinDropMode]="pinDropMode"
                  (pinDropped)="onPinDropped($event)"
                  (markerClicked)="onMarkerClicked($event)"></cnt-trip-planner-map>
              </div>
            </div>
          </div>
        </section>
      }

      <ng-template #endpointRow let-stop="stop" let-label="label" let-target="target" let-color="color">
        <div class="flex items-center gap-3 p-3 rounded-xl border border-dark-text/10 bg-cream/40">
          <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white shrink-0" [ngClass]="color">
            <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">{{ target === 'start' ? 'flag' : 'sports_score' }}</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text">{{ label }}</div>
            @if (stop) {
              <div class="text-sm font-body font-bold text-dark-text truncate">{{ stop.name }}</div>
              <div class="text-[0.65rem] text-muted-text font-body truncate">{{ kindLabel(stop.kind) }}</div>
            } @else {
              <div class="text-xs font-body text-muted-text italic">Not set</div>
            }
          </div>
          @if (stop) {
            <button type="button" (click)="clearEndpoint(target)" class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad transition-colors">Clear</button>
          } @else {
            <button type="button" (click)="openPicker(target)" class="px-3 py-1.5 rounded-full bg-trinidad text-white text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95">Set</button>
          }
        </div>
      </ng-template>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class TripPlannerEditComponent implements OnInit, OnDestroy {
  plan: ITripPlan | null = null;
  picker: { tab: PickerTab; target: PickerTarget } | null = null;
  query = '';
  pendingPin: { lat: number; lng: number } | null = null;
  pendingPinName = '';
  readonly pickerTabs: { id: PickerTab; label: string }[] = [
    { id: 'listings', label: 'Listings' },
    { id: 'pois',     label: 'POIs' },
    { id: 'pin',      label: 'Pin' },
  ];

  private sub: Subscription | null = null;
  private planId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planner: TripPlannerService,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.planId = this.route.snapshot.paramMap.get('id');
    if (!this.planId) { this.router.navigate(['/trip-planner']); return; }
    this.planner.setActiveId(this.planId);
    this.sub = this.planner.plans$.subscribe(plans => {
      this.plan = plans.find(p => p.id === this.planId) ?? null;
      if (this.plan) {
        this.seo.update({
          title: `${this.plan.name} — Trip planner | CurbNTurf`,
          description: 'Plan your trip across CurbNTurf.',
          url: `/trip-planner/${this.plan.id}`,
          robots: 'noindex, nofollow',
        });
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // ============ Stops list ============
  onDrop(event: CdkDragDrop<ITripStop[]>): void {
    if (!this.plan) return;
    const stops = this.plan.stops.slice();
    moveItemInArray(stops, event.previousIndex, event.currentIndex);
    this.planner.update(this.plan.id, { stops });
  }

  removeStop(stopId: string): void {
    if (!this.plan) return;
    this.planner.removeStop(this.plan.id, stopId);
  }

  // ============ Endpoints ============
  clearEndpoint(target: PickerTarget): void {
    if (!this.plan) return;
    if (target === 'start') this.planner.setStartPoint(this.plan.id, null);
    else if (target === 'end') this.planner.setEndPoint(this.plan.id, null);
  }

  // ============ Field commits ============
  commitField(key: 'name' | 'startDate' | 'endDate', value: string | undefined): void {
    if (!this.plan) return;
    this.planner.update(this.plan.id, { [key]: value || undefined });
  }

  // ============ Picker ============
  openPicker(target: PickerTarget): void {
    this.picker = { tab: 'listings', target };
    this.query = '';
    this.pendingPin = null;
    this.pendingPinName = '';
  }
  closePicker(): void {
    this.picker = null;
    this.pendingPin = null;
    this.pendingPinName = '';
  }
  setPickerTab(tab: PickerTab): void {
    if (this.picker) this.picker = { ...this.picker, tab };
  }

  get pinDropMode(): boolean { return this.picker?.tab === 'pin'; }
  get pickerTargetLabel(): string {
    if (!this.picker) return '';
    if (this.picker.target === 'start') return 'start point';
    if (this.picker.target === 'end')   return 'finish point';
    return 'stop';
  }

  onPinDropped(coords: { lat: number; lng: number }): void {
    if (!this.picker || this.picker.tab !== 'pin') return;
    this.pendingPin = coords;
    this.pendingPinName = '';
  }
  cancelPin(): void { this.pendingPin = null; this.pendingPinName = ''; }
  confirmPin(): void {
    if (!this.plan || !this.picker || !this.pendingPin) return;
    const name = this.pendingPinName.trim();
    if (!name) return;
    this.commitStop(this.picker.target, {
      kind: 'custom',
      name,
      lat: this.pendingPin.lat,
      lng: this.pendingPin.lng,
    });
    this.closePicker();
  }

  addListing(l: IListing): void {
    if (!this.plan || !this.picker) return;
    this.commitStop(this.picker.target, {
      kind: l.kind === 'boondocking' ? 'boondocking' : 'private',
      refId: l.id,
      name: l.title,
      lat: l.lat,
      lng: l.lng,
      address: l.location,
      photo: l.image,
    });
    this.closePicker();
  }

  addPoi(p: IPoi): void {
    if (!this.plan || !this.picker) return;
    this.commitStop(this.picker.target, {
      kind: 'poi',
      refId: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      photo: p.photos?.[0],
    });
    this.closePicker();
  }

  private commitStop(target: PickerTarget, stop: Omit<ITripStop, 'id'>): void {
    if (!this.plan) return;
    if (target === 'start')      this.planner.setStartPoint(this.plan.id, stop);
    else if (target === 'end')   this.planner.setEndPoint(this.plan.id, stop);
    else                          this.planner.addStop(this.plan.id, stop);
    this.toasts.success('Added.');
  }

  onMarkerClicked(_stopId: string): void {
    // Reserved — Phase 2 will surface stop details (dates/notes) on click.
  }

  // ============ Filters ============
  get filteredListings(): IListing[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return ALL_LISTINGS.slice(0, 30);
    return ALL_LISTINGS.filter(l =>
      l.title.toLowerCase().includes(q) || l.location.toLowerCase().includes(q)
    ).slice(0, 50);
  }

  get filteredPois(): IPoi[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return MOCK_POIS.slice(0, 30);
    return MOCK_POIS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.kind.includes(q)
    ).slice(0, 50);
  }

  // ============ Labels ============
  kindLabel(k: TripStopKind): string {
    return ({ private: 'Private spot', boondocking: 'Boondocking', poi: 'POI', custom: 'Custom pin' } as Record<TripStopKind, string>)[k];
  }
  kindIcon(k: TripStopKind): string {
    return ({ private: 'rv_hookup', boondocking: 'landscape', poi: 'pin_drop', custom: 'push_pin' } as Record<TripStopKind, string>)[k];
  }
  kindColor(k: TripStopKind): string {
    return ({ private: '#e3530d', boondocking: '#3b6e3b', poi: '#b3760e', custom: '#6b6b6b' } as Record<TripStopKind, string>)[k];
  }
  poiKindLabel(k: string): string {
    return ({ dumpstation: 'Dump station', rest_area: 'Rest area', propane: 'Propane', potable_water: 'Potable water' } as Record<string, string>)[k] ?? k;
  }

  get savedLabel(): string {
    if (!this.plan) return '';
    const ms = Date.now() - new Date(this.plan.updatedAt).getTime();
    if (ms < 60_000) return 'just now';
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
    return `${Math.round(ms / 86_400_000)}d ago`;
  }
}
