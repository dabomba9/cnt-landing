import { Component, ChangeDetectorRef, ElementRef, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDatepickerModule, DateRange } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent, FocusTrapDirective } from '@cnt-workspace/ui';
import {
  SeoService, ToastService, TripPlannerService, ITripPlan, ITripStop, TripStopKind,
  ALL_LISTINGS, MOCK_POIS, IListing, IPoi,
  IMyRvProfile, listMyRvProfiles, getActiveRvProfile, setActiveRvProfile, rvTypeLabel,
  totalTripMiles, pointToRouteMiles, RoutingService, IRoute, suggestionsAlongRoute,
  BookingService, bookingForStop,
  parseIsoDate, formatIsoDate, shortDateLabel,
  encodeTripShare, tripCostSummary, ITripCost,
  isLongLeg, tripFuelEstimate, ITripFuel,
  ListingAvailabilityService, HostAvailabilityService,
} from '@cnt-workspace/data-access';
import type { IBooking } from '@cnt-workspace/models';
import { TripPlannerMapComponent } from './trip-planner-map.component';

interface ISearchHit {
  id: string;
  kind: 'private' | 'boondocking' | 'poi';
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  source: IListing | IPoi;
}

@Component({
  selector: 'cnt-trip-planner-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule, MatDatepickerModule, MatNativeDateModule, FocusTrapDirective, NavbarComponent, FooterComponent, TripPlannerMapComponent],
  template: `
    <cnt-navbar class="cnt-print-hide"></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream cnt-print-hide">
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
            <div class="flex flex-wrap items-center gap-3 mb-4">
              <a routerLink="/trip-planner" class="inline-flex items-center gap-1 text-xs font-button font-bold uppercase tracking-[0.12em] text-muted-text hover:text-trinidad transition-colors shrink-0">
                <span class="material-symbols-outlined text-base">arrow_back</span>
                All trips
              </a>
              <input type="text" [(ngModel)]="plan.name" name="planName" maxlength="60" (blur)="commit('name', plan.name)"
                class="flex-1 min-w-[12rem] max-w-md font-headline font-bold text-xl bg-transparent focus:bg-white border-b border-dark-text/15 focus:border-jungle-green outline-none px-2 py-1">
              <div class="relative">
                <button type="button" (click)="toggleTripDates()" [attr.aria-expanded]="tripDatesOpen"
                  class="inline-flex items-center gap-1.5 bg-cream/60 border border-dark-text/15 rounded-md px-2.5 py-1.5 text-xs font-body text-dark-text hover:border-jungle-green transition-colors">
                  <span class="material-symbols-outlined text-base text-jungle-green">calendar_today</span>
                  <span>{{ tripDateLabel }}</span>
                </button>
                @if (tripDatesOpen) {
                  <div role="dialog" aria-label="Trip dates" cntFocusTrap (escape)="tripDatesOpen = false"
                    class="review-popover absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border border-dark-text/10 shadow-[0_18px_38px_rgba(0,0,0,0.16)] p-3 w-[19rem]">
                    <div class="flex items-center justify-between mb-2 px-1">
                      <span class="text-[0.7rem] uppercase tracking-[0.14em] text-dark-text font-bold">Pick dates</span>
                      <button type="button" (click)="tripDatesOpen = false" class="text-trinidad text-xs font-bold uppercase tracking-[0.12em] hover:underline">Done</button>
                    </div>
                    <mat-calendar [selected]="tripDateRange" (selectedChange)="onTripDateSelected($event)" class="cnt-inline-calendar bg-transparent border-none"></mat-calendar>
                  </div>
                }
              </div>
              <a [routerLink]="['/search']" [queryParams]="{ openPlanner: 1 }"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-jungle-green text-white text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 no-underline shrink-0">
                <span class="material-symbols-outlined text-sm">map</span>
                Plan on map
              </a>
              <button type="button" (click)="shareTrip()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors shrink-0">
                <span class="material-symbols-outlined text-sm">ios_share</span>
                Share
              </button>
              <button type="button" (click)="printTrip()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors shrink-0">
                <span class="material-symbols-outlined text-sm">print</span>
                Print
              </button>
              <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text shrink-0">Saved {{ savedLabel }}</span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">

              <!-- Compact left panel -->
              <aside class="bg-white rounded-2xl border border-dark-text/8 p-4 space-y-3 self-start" #panel>

                <!-- RV chip -->
                <div class="relative">
                  <div class="flex items-center gap-3 p-2 rounded-xl bg-cream/40">
                    <button type="button" (click)="rvSwitcherOpen = !rvSwitcherOpen" aria-label="Switch RV profile" class="relative shrink-0">
                      <span class="w-11 h-11 rounded-full bg-jungle-green text-white inline-flex items-center justify-center font-headline font-bold text-sm">{{ activeRvInitials }}</span>
                      <span class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-trinidad text-white inline-flex items-center justify-center border-2 border-white">
                        <span class="material-symbols-outlined text-[10px]">add</span>
                      </span>
                    </button>
                    <div class="flex-1 min-w-0">
                      <div class="text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold text-muted-text">Bringing</div>
                      <div class="text-sm font-body font-bold text-dark-text truncate">{{ activeRv?.name || 'No RV set' }}</div>
                      @if (activeRv) {
                        <div class="text-[0.65rem] text-muted-text">{{ rvTypeLabel(activeRv.type) }}</div>
                      }
                    </div>
                  </div>
                  @if (rvSwitcherOpen) {
                    <div class="absolute left-0 right-0 top-full mt-1 z-40 rounded-xl border border-dark-text/10 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.12)] p-2 space-y-1">
                      @for (p of rvProfiles; track p.id) {
                        <button type="button" (click)="selectRv(p.id)"
                          [ngClass]="p.id === activeRv?.id ? 'bg-cream/60' : ''"
                          class="w-full text-left p-2 rounded-md flex items-center gap-2 hover:bg-cream/60 transition-colors">
                          <span class="w-6 h-6 rounded-full bg-jungle-green text-white inline-flex items-center justify-center text-[10px] font-headline font-bold">{{ initials(p.name) }}</span>
                          <span class="text-xs font-body font-bold text-dark-text truncate">{{ p.name }}</span>
                        </button>
                      }
                      @if (rvProfiles.length === 0) {
                        <p class="text-xs text-muted-text text-center py-2">No RVs saved yet.</p>
                      }
                      <a routerLink="/account" fragment="rig" class="block w-full text-center text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad py-1 hover:underline">Manage RVs →</a>
                    </div>
                  }
                </div>

                <!-- Search input + autocomplete -->
                <div class="relative">
                  <input #searchInput type="text" [(ngModel)]="query" (focus)="searchOpen = true" (blur)="onSearchBlur()" (keydown.enter)="onSearchEnter()" name="query"
                    placeholder="Add a place..."
                    class="w-full bg-cream/60 border border-dark-text/15 rounded-md pl-3 pr-9 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                  <span class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-text pointer-events-none">
                    <span class="material-symbols-outlined text-base">search</span>
                  </span>
                  @if (searchOpen && query.trim() && searchResults.length > 0) {
                    <div class="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-md border border-dark-text/15 shadow-[0_12px_28px_rgba(0,0,0,0.12)] max-h-80 overflow-y-auto">
                      @for (hit of searchResults; track hit.id) {
                        <button type="button" (mousedown)="addHit(hit)" class="w-full text-left p-2.5 hover:bg-cream/60 transition-colors flex items-center gap-2.5 border-b border-dark-text/5 last:border-0">
                          <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white shrink-0" [ngStyle]="{ background: kindColor(hit.kind) }">
                            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">{{ kindIcon(hit.kind) }}</span>
                          </span>
                          <span class="flex-1 min-w-0">
                            <span class="block text-sm font-body font-bold text-dark-text truncate">{{ hit.name }}</span>
                            <span class="block text-[0.65rem] text-muted-text truncate">{{ hit.subtitle }}</span>
                          </span>
                        </button>
                      }
                    </div>
                  }
                  @if (searchOpen && query.trim() && searchResults.length === 0) {
                    <div class="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-md border border-dark-text/15 shadow-[0_12px_28px_rgba(0,0,0,0.12)] p-3 text-center">
                      <p class="text-xs text-muted-text">No matches{{ corridorActive ? ' within ' + plan.corridorMiles + ' mi of your route' : '' }}.</p>
                    </div>
                  }
                </div>

                <!-- Action button -->
                <!-- P48 — spinner + dynamic label while geolocation is in flight. -->
                <button type="button" (click)="useMyLocation()" [disabled]="locating"
                  class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-jungle-green hover:text-jungle-green disabled:opacity-50 disabled:cursor-wait transition-colors">
                  @if (locating) {
                    <span class="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                    Getting your location…
                  } @else {
                    <span class="material-symbols-outlined text-base" aria-hidden="true">my_location</span>
                    Use My Location
                  }
                </button>

                <!-- Stops list -->
                <div cdkDropList (cdkDropListDropped)="onDrop($event)" class="space-y-1.5">
                  @if (plan.stops.length === 0) {
                    <p class="text-xs text-muted-text text-center py-4">Add a site to your trip to begin.</p>
                  }
                  @for (s of plan.stops; track s.id; let i = $index, last = $last) {
                    @if (i > 0 && legBetween(i - 1); as leg) {
                      <div class="flex items-center gap-1.5 pl-7 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold"
                        [ngClass]="(isLongLeg(leg.minutes) || legExceedsRange(i - 1)) ? 'text-trinidad' : 'text-muted-text'">
                        <span class="material-symbols-outlined text-[14px]">{{ (isLongLeg(leg.minutes) || legExceedsRange(i - 1)) ? 'warning' : 'arrow_downward' }}</span>
                        {{ formatMiles(leg.miles) }}@if (leg.minutes > 0) { · {{ formatMins(leg.minutes) }} }
                        @if (legExceedsRange(i - 1)) { <span class="normal-case tracking-normal font-body font-normal">· over tank range — plan a fuel stop</span> }
                        @else if (isLongLeg(leg.minutes)) { <span class="normal-case tracking-normal font-body font-normal">· long drive — add a rest stop?</span> }
                      </div>
                    }
                    <div cdkDrag class="rounded-lg border border-dark-text/10 bg-cream/30">
                      <div class="flex items-center gap-2 p-2">
                      <span class="material-symbols-outlined text-base text-muted-text cursor-grab shrink-0" cdkDragHandle>drag_indicator</span>
                      <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white text-[11px] font-headline font-bold shrink-0" [ngStyle]="{ background: stopMarkerColor(i, last) }">
                        @if (i === 0 && plan.stops.length > 1) {
                          <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">flag</span>
                        } @else if (last && plan.stops.length > 1) {
                          <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">sports_score</span>
                        } @else if (plan.stops.length > 1) {
                          {{ i }}
                        } @else {
                          <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">place</span>
                        }
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                          <div class="text-xs font-body font-bold text-dark-text truncate">{{ s.name }}</div>
                          @if (stopIssue[s.id]; as issue) {
                            <button type="button" (click)="expandedStopId = s.id"
                              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-trinidad/10 border border-trinidad/30 text-trinidad text-[0.55rem] uppercase tracking-[0.1em] font-button font-bold shrink-0 hover:bg-trinidad/15">
                              <span class="material-symbols-outlined text-[12px]">warning</span>
                              {{ issue.kind === 'min' ? issue.requiredNights + '-night min' : issue.kind === 'max' ? 'Too long' : 'Unavailable' }}
                            </button>
                          }
                        </div>
                        <div class="text-[0.6rem] text-muted-text truncate">{{ stopBadge(i, last) }}@if (s.address) { · {{ s.address }} }</div>
                      </div>
                      <button type="button" (click)="toggleStopExpand(s.id)"
                        [attr.aria-expanded]="expandedStopId === s.id"
                        aria-label="Toggle stop details"
                        class="w-6 h-6 inline-flex items-center justify-center rounded-full text-muted-text hover:bg-white hover:text-dark-text transition-colors shrink-0">
                        <span class="material-symbols-outlined text-sm">{{ expandedStopId === s.id ? 'expand_less' : 'expand_more' }}</span>
                      </button>
                      <button type="button" (click)="removeStop(s.id)" aria-label="Remove stop"
                        class="w-6 h-6 inline-flex items-center justify-center rounded-full bg-white border border-dark-text/15 text-muted-text hover:border-trinidad hover:text-trinidad transition-colors shrink-0">
                        <span class="material-symbols-outlined text-sm">close</span>
                      </button>
                      </div>
                      @if (expandedStopId === s.id) {
                        <div class="px-3 pb-3 pt-1 space-y-2 border-t border-dark-text/10 bg-white rounded-b-lg">
                          <div class="relative">
                            <span class="text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Check-in / Check-out</span>
                            <button type="button" (click)="toggleStopDates(s.id)" [attr.aria-expanded]="stopDatesOpenId === s.id"
                              class="mt-0.5 w-full inline-flex items-center gap-1.5 bg-cream/60 border border-dark-text/15 rounded-md px-2.5 py-1.5 text-xs font-body text-dark-text hover:border-jungle-green transition-colors">
                              <span class="material-symbols-outlined text-base text-jungle-green">calendar_today</span>
                              <span class="flex-1 text-left">{{ stopDateLabel(s) }}</span>
                            </button>
                            @if (stopDatesOpenId === s.id) {
                              <div role="dialog" aria-label="Stop dates" cntFocusTrap (escape)="stopDatesOpenId = null"
                                class="review-popover absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-dark-text/10 shadow-[0_18px_38px_rgba(0,0,0,0.16)] p-3">
                                <div class="flex items-center justify-between mb-2 px-1">
                                  <span class="text-[0.7rem] uppercase tracking-[0.14em] text-dark-text font-bold">Pick dates</span>
                                  <button type="button" (click)="stopDatesOpenId = null" class="text-trinidad text-xs font-bold uppercase tracking-[0.12em] hover:underline">Done</button>
                                </div>
                                <mat-calendar [selected]="stopDateRange(s)" (selectedChange)="onStopDateSelected(s.id, $event)" class="cnt-inline-calendar bg-transparent border-none"></mat-calendar>
                              </div>
                            }
                          </div>
                          @if (stopIssue[s.id]) {
                            <div class="rounded-md bg-trinidad/10 border border-trinidad/30 px-2.5 py-2 flex flex-wrap items-center gap-2 text-[0.65rem] font-body text-dark-text">
                              <span class="material-symbols-outlined text-base text-trinidad shrink-0">event_busy</span>
                              <span class="flex-1 min-w-[8rem]">
                                {{ stopIssueMessage(s) }}
                              </span>
                              <button type="button" (click)="stopDatesOpenId = s.id"
                                class="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline">
                                Pick new dates
                                <span class="material-symbols-outlined text-sm">arrow_forward</span>
                              </button>
                              <a [routerLink]="['/listing']" [queryParams]="{ id: s.refId }" fragment="availability"
                                class="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-jungle-green hover:underline no-underline">
                                Open availability
                                <span class="material-symbols-outlined text-sm">open_in_new</span>
                              </a>
                            </div>
                          }
                          <label class="block">
                            <span class="text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Notes</span>
                            <textarea [ngModel]="s.notes" (ngModelChange)="updateStopField(s.id, { notes: $event || undefined })" [name]="'note-' + s.id"
                              rows="2" maxlength="400" placeholder="Wifi password, fire pit details, anything to remember…"
                              class="mt-0.5 w-full bg-cream/60 border border-dark-text/15 rounded-md px-2 py-1.5 text-xs font-body focus:outline-none focus:border-jungle-green resize-none"></textarea>
                          </label>
                          @if (s.kind === 'private') {
                            @if (bookingForStop(s); as booking) {
                              <a [routerLink]="['/booking/confirm', booking.id]"
                                class="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold no-underline transition-colors"
                                [ngClass]="booking.status === 'pending' ? 'bg-gold/15 text-dark-text border border-gold/40 hover:bg-gold/25' : 'bg-jungle-green/10 text-jungle-green border border-jungle-green/30 hover:bg-jungle-green/20'">
                                <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">{{ booking.status === 'pending' ? 'schedule' : 'check_circle' }}</span>
                                {{ booking.status === 'pending' ? 'Request out — view' : 'Booked · view confirmation' }}
                              </a>
                            } @else {
                              <a [routerLink]="['/booking/review']"
                                [queryParams]="{ listingId: s.refId, start: s.checkInDate || null, end: s.checkOutDate || null }"
                                class="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-trinidad text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold no-underline hover:opacity-95">
                                <span class="material-symbols-outlined text-sm">event_available</span>
                                Book this stay
                              </a>
                            }
                          }
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Suggested stops along your route — when corridor is set + >= 2 stops. -->
                @if (plan.corridorMiles && plan.corridorMiles > 0 && plan.stops.length >= 2 && (listingSuggestions.length > 0 || poiSuggestions.length > 0)) {
                  <div class="rounded-md border border-jungle-green/30 bg-jungle-green/5 p-3 space-y-2">
                    <div class="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-jungle-green">
                      <span class="material-symbols-outlined text-sm">explore</span>
                      Along your route
                      <span class="ml-auto text-muted-text normal-case tracking-normal">within {{ plan.corridorMiles }} mi</span>
                    </div>
                    @for (l of listingSuggestions; track l.id) {
                      <button type="button" (click)="addListingSuggestion(l)"
                        class="w-full text-left p-2 rounded-md bg-white hover:bg-cream/60 transition-colors flex items-center gap-2 border border-dark-text/8">
                        <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white shrink-0"
                          [ngStyle]="{ background: l.kind === 'boondocking' ? '#3b6e3b' : '#e3530d' }">
                          <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">{{ l.kind === 'boondocking' ? 'landscape' : 'rv_hookup' }}</span>
                        </span>
                        <span class="flex-1 min-w-0">
                          <span class="block text-xs font-body font-bold text-dark-text truncate">{{ l.title }}</span>
                          <span class="block text-[0.6rem] text-muted-text truncate">{{ l.location }} · {{ formatMiles(milesFromRoute(l)) }} from route</span>
                        </span>
                        <span class="material-symbols-outlined text-base text-trinidad shrink-0">add_circle</span>
                      </button>
                    }
                    @for (p of poiSuggestions; track p.id) {
                      <button type="button" (click)="addPoiSuggestion(p)"
                        class="w-full text-left p-2 rounded-md bg-white hover:bg-cream/60 transition-colors flex items-center gap-2 border border-dark-text/8">
                        <span class="w-7 h-7 rounded-full inline-flex items-center justify-center text-white bg-gold shrink-0">
                          <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">pin_drop</span>
                        </span>
                        <span class="flex-1 min-w-0">
                          <span class="block text-xs font-body font-bold text-dark-text truncate">{{ p.name }}</span>
                          <span class="block text-[0.6rem] text-muted-text truncate">{{ poiKindLabel(p.kind) }} · {{ formatMiles(milesFromRoute(p)) }} from route</span>
                        </span>
                        <span class="material-symbols-outlined text-base text-trinidad shrink-0">add_circle</span>
                      </button>
                    }
                  </div>
                }

                <!-- Pin-drop toggle -->
                <button type="button" (click)="togglePinDrop()"
                  class="block w-full text-center text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold py-1.5 hover:underline"
                  [ngClass]="pinDropMode ? 'text-trinidad' : 'text-muted-text'">
                  <span class="inline-flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-sm">push_pin</span>
                    {{ pinDropMode ? 'Click map to drop a pin · tap to cancel' : 'Or drop a pin on the map' }}
                  </span>
                </button>

                <!-- Trip distance + cost + corridor slider -->
                <div class="pt-3 border-t border-dark-text/8 space-y-3">
                  <div class="text-xs font-body text-dark-text text-center">
                    Trip Distance: <span class="font-bold">{{ tripDistance }} {{ tripDistance === 1 ? 'mile' : 'miles' }}</span>
                  </div>
                  @if (tripCost.paidNights > 0 || tripCost.totalCost > 0) {
                    <div class="text-xs font-body text-dark-text text-center">
                      Trip Total: <span class="font-bold">{{ tripCost.paidNights }} {{ tripCost.paidNights === 1 ? 'night' : 'nights' }} · {{ tripCost.totalCost | currency:'USD':'symbol':'1.0-0' }}</span>
                      @if (tripCost.unknownPrice) { <span class="text-muted-text">·  partial</span> }
                    </div>
                  } @else {
                    <div class="text-[0.65rem] text-muted-text text-center italic">Set check-in / check-out dates to estimate cost.</div>
                  }
                  @if (tripFuel) {
                    <div class="text-xs font-body text-dark-text text-center">
                      Trip Fuel: <span class="font-bold">~{{ tripFuel.cost | currency:'USD':'symbol':'1.0-0' }} · {{ tripFuel.gallons | number:'1.0-0' }} gal</span>
                      @if (tripFuel.legsOverRange.length > 0) {
                        <span class="text-trinidad">· {{ tripFuel.legsOverRange.length }} leg{{ tripFuel.legsOverRange.length === 1 ? '' : 's' }} over tank range</span>
                      }
                    </div>
                  } @else if (fuelRequiresMpg && plan.stops.length >= 2) {
                    <div class="text-[0.65rem] text-muted-text text-center italic">
                      <a routerLink="/account" fragment="rig" class="text-trinidad hover:underline">Set MPG on your RV</a> to estimate fuel.
                    </div>
                  }
                  <div>
                    <div class="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold">
                      <span class="text-muted-text">Corridor radius</span>
                      <span class="text-trinidad">{{ plan.corridorMiles || 0 }} mi</span>
                    </div>
                    <input type="range" min="0" max="60" step="5" [ngModel]="plan.corridorMiles || 0" (ngModelChange)="setCorridor($event)" name="corridor" class="w-full mt-1 accent-trinidad">
                    <p class="text-[0.6rem] text-muted-text mt-1">{{ corridorActive ? 'Search results filtered to within this radius of your route.' : 'Set above 0 once you have 2+ stops to filter search to your route corridor.' }}</p>
                  </div>
                </div>

                <!-- Directions (collapsible). Road-routed step list. -->
                @if (plan.stops.length >= 2) {
                  <div class="rounded-xl border border-dark-text/10 bg-white overflow-hidden">
                    <button type="button" (click)="directionsExpanded = !directionsExpanded" [attr.aria-expanded]="directionsExpanded"
                      class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-cream/40 transition-colors">
                      <span class="material-symbols-outlined text-base text-trinidad">directions</span>
                      <span class="flex-1 text-sm font-body font-bold text-dark-text">Driving directions</span>
                      @if (routeLoading) {
                        <!-- P48 — spinner next to the existing copy so the fetch reads as in-flight, not stuck. -->
                        <span class="inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">
                          <span class="material-symbols-outlined text-sm animate-spin" aria-hidden="true">progress_activity</span>
                          Loading…
                        </span>
                      } @else if (activeRoute) {
                        <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">{{ formatMiles(activeRoute.totalMiles) }} · {{ formatMins(activeRoute.totalMinutes) }}</span>
                      }
                      <span class="material-symbols-outlined text-sm text-muted-text">{{ directionsExpanded ? 'expand_less' : 'expand_more' }}</span>
                    </button>
                    @if (directionsExpanded) {
                      @if (!activeRoute && !routeLoading) {
                        <p class="px-3 pb-3 text-xs text-muted-text">Couldn't load driving directions. Showing straight-line route on the map.</p>
                      }
                      @if (activeRoute) {
                        <div class="px-3 pb-3 space-y-4 max-h-[28rem] overflow-y-auto">
                          @for (leg of activeRoute.legs; track leg; let li = $index) {
                            <div>
                              <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad mb-1.5">
                                Leg {{ li + 1 }} · {{ formatMiles(leg.distanceMiles) }} · {{ formatMins(leg.durationMinutes) }}
                              </div>
                              <ol class="space-y-1.5">
                                @for (step of leg.steps; track step) {
                                  <li class="flex items-start gap-2 text-xs font-body text-dark-text cursor-pointer hover:bg-cream/40 rounded px-1 py-0.5 -mx-1"
                                    (click)="flyToStep(step)" role="button" tabindex="0"
                                    (keydown.enter)="flyToStep(step)" (keydown.space)="flyToStep(step)">
                                    <span class="w-1.5 h-1.5 rounded-full bg-trinidad mt-1.5 shrink-0"></span>
                                    <span class="flex-1">{{ step.instruction }}</span>
                                    <span class="text-[0.65rem] text-muted-text shrink-0">{{ formatMiles(step.distanceMiles) }}</span>
                                  </li>
                                }
                              </ol>
                            </div>
                          }
                        </div>
                      }
                    }
                  </div>
                }
              </aside>

              <!-- Map -->
              <div class="rounded-2xl overflow-hidden border border-dark-text/8 bg-white" style="min-height: 70vh;">
                <cnt-trip-planner-map [plan]="plan" [pinDropMode]="pinDropMode"
                  [backgroundListings]="allListings" [backgroundPois]="allPois"
                  [routeGeometry]="routeGeometry"
                  (pinDropped)="onPinDropped($event)"
                  (markerClicked)="onMarkerClicked($event)"
                  (backgroundAdd)="onBackgroundAdd($event)"></cnt-trip-planner-map>
              </div>
            </div>

            <!-- Pin name modal -->
            @if (pendingPin) {
              <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" (click)="cancelPin()">
                <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-[0_24px_64px_rgba(0,0,0,0.18)]" (click)="$event.stopPropagation()">
                  <h3 class="font-headline font-bold text-lg mb-1 text-dark-text">Name this place</h3>
                  <p class="text-xs text-muted-text mb-3">Dropped at {{ pendingPin.lat.toFixed(4) }}, {{ pendingPin.lng.toFixed(4) }}</p>
                  <input type="text" [(ngModel)]="pendingPinName" name="pendingPinName" maxlength="60"
                    placeholder="Grandma's house" (keydown.enter)="confirmPin()" autofocus
                    class="w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body focus:outline-none focus:border-jungle-green">
                  <div class="flex justify-end gap-2 mt-3">
                    <button (click)="cancelPin()" class="px-4 py-2 rounded-full bg-white border border-dark-text/15 text-muted-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Cancel</button>
                    <button (click)="confirmPin()" [disabled]="!pendingPinName.trim()" class="px-4 py-2 rounded-full bg-trinidad text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40">Add pin</button>
                  </div>
                </div>
              </div>
            }
          </div>
        </section>
      }
    </main>

    @if (plan) {
      <section class="cnt-print-only px-6 py-6 text-black font-sans">
        <h1 class="text-2xl font-bold mb-1">{{ plan.name }}</h1>
        <div class="text-sm mb-4">
          @if (tripDateLabel) { {{ tripDateLabel }} · }
          {{ tripDistance }} mi
          @if (activeRoute) { · {{ formatMins(activeRoute.totalMinutes) }} drive }
          @if (tripCost.totalCost > 0) { · {{ tripCost.paidNights }} nights · {{ tripCost.totalCost | currency:'USD':'symbol':'1.0-0' }} }
        </div>

        <h2 class="text-base font-bold mt-4 mb-2 border-b border-gray-300 pb-1">Stops</h2>
        <ol class="space-y-3">
          @for (s of plan.stops; track s.id; let i = $index, last = $last) {
            <li class="cnt-print-stop">
              <div class="flex items-baseline gap-2">
                <span class="font-bold">{{ i + 1 }}.</span>
                <span class="font-bold">{{ s.name }}</span>
                @if (i === 0 && plan.stops.length > 1) { <span class="text-xs">(Start)</span> }
                @else if (last && plan.stops.length > 1) { <span class="text-xs">(Finish)</span> }
              </div>
              @if (s.address) { <div class="text-sm pl-5">{{ s.address }}</div> }
              @if (s.checkInDate || s.checkOutDate) { <div class="text-sm pl-5">{{ stopDateLabel(s) }}</div> }
              @if (s.notes) { <div class="text-sm pl-5 italic">{{ s.notes }}</div> }
            </li>
          }
        </ol>

        @if (activeRoute) {
          <h2 class="text-base font-bold mt-6 mb-2 border-b border-gray-300 pb-1">Driving directions</h2>
          @for (leg of activeRoute.legs; track leg; let li = $index) {
            <div class="cnt-print-leg mb-4">
              <div class="font-bold text-sm">
                Leg {{ li + 1 }}: {{ plan.stops[li].name }} → {{ plan.stops[li + 1].name }}
              </div>
              <div class="text-xs mb-2">
                {{ formatMiles(leg.distanceMiles) }} · {{ formatMins(leg.durationMinutes) }}
                @if (isLongLeg(leg.durationMinutes)) { · ⚠ Long drive — plan a rest stop }
              </div>
              <ol class="text-xs space-y-1 pl-5 list-decimal">
                @for (step of leg.steps; track step) {
                  <li>{{ step.instruction }} <span class="text-gray-600">({{ formatMiles(step.distanceMiles) }})</span></li>
                }
              </ol>
            </div>
          }
        }
      </section>
    }

    <curbnturf-footer class="cnt-print-hide"></curbnturf-footer>
  `,
})
export class TripPlannerEditComponent implements OnInit, OnDestroy {
  @ViewChild('panel', { static: false }) panel?: ElementRef<HTMLElement>;
  @ViewChild(TripPlannerMapComponent) private tripMap?: TripPlannerMapComponent;

  plan: ITripPlan | null = null;
  /** Road-routed trip — refetched on stop-list changes. */
  activeRoute: IRoute | null = null;
  routeLoading = false;
  directionsExpanded = true;
  private routeSub: import('rxjs').Subscription | null = null;
  private lastRouteKey = '';
  rvProfiles: IMyRvProfile[] = [];
  activeRv: IMyRvProfile | null = null;
  rvSwitcherOpen = false;

  query = '';
  searchOpen = false;
  pinDropMode = false;
  locating = false;
  pendingPin: { lat: number; lng: number } | null = null;
  pendingPinName = '';

  readonly rvTypeLabel = rvTypeLabel;
  /** Background browse data for the map — every listing + POI shown at zoom >= 7. */
  readonly allListings = ALL_LISTINGS;
  readonly allPois = MOCK_POIS;

  private sub: Subscription | null = null;
  private planId: string | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private route: ActivatedRoute,
    private router: Router,
    private planner: TripPlannerService,
    private seo: SeoService,
    private toasts: ToastService,
    private routing: RoutingService,
    private cdr: ChangeDetectorRef,
    private bookingSvc: BookingService,
    private availability: ListingAvailabilityService,
    private hostAvailability: HostAvailabilityService,
  ) {}

  /** stopId → reason the stop has a problem with its picked dates.
   *  Drives the header chip and expanded banner. Recomputed whenever
   *  the plan, bookings, or host availability change. */
  stopIssue: Record<string, { kind: 'blocked' | 'min' | 'max'; requiredNights?: number }> = {};
  private hostAvailSub: Subscription | null = null;

  private recomputeStopAvailability(): void {
    const next: Record<string, { kind: 'blocked' | 'min' | 'max'; requiredNights?: number }> = {};
    for (const s of this.plan?.stops ?? []) {
      if (s.kind !== 'private') continue;
      if (typeof s.refId !== 'number') continue;
      if (!s.checkInDate || !s.checkOutDate) continue;
      if (!this.availability.isAvailableForRange(s.refId, s.checkInDate, s.checkOutDate)) {
        next[s.id] = { kind: 'blocked' };
        continue;
      }
      const stay = this.availability.checkStayRule(s.refId, s.checkInDate, s.checkOutDate);
      if (!stay.ok) {
        next[s.id] = { kind: stay.kind, requiredNights: stay.requiredNights };
      }
    }
    this.stopIssue = next;
  }

  /** Banner copy switches on the issue kind. */
  stopIssueMessage(s: ITripStop): string {
    const issue = this.stopIssue[s.id];
    if (!issue) return '';
    const range = this.stopDateBannerLabel(s);
    if (issue.kind === 'min') return `${range} needs at least a ${issue.requiredNights}-night minimum.`;
    if (issue.kind === 'max') return `${range} can't exceed ${issue.requiredNights} nights.`;
    return `${range} isn't available at this listing.`;
  }

  /** Human-readable "Apr 10 – Apr 12" label for the banner. */
  stopDateBannerLabel(s: ITripStop): string {
    const start = parseIsoDate(s.checkInDate);
    const end = parseIsoDate(s.checkOutDate);
    if (!start || !end) return '';
    return `${shortDateLabel(start)} – ${shortDateLabel(end)}`;
  }

  /** Current user's live bookings — drives the "Booked ✓" badge on stops. */
  userBookings: IBooking[] = [];
  private bookingsSub: Subscription | null = null;

  /** Returns the matching booking for a stop (or null) — used by template. */
  bookingForStop(stop: ITripStop): IBooking | null {
    return bookingForStop(stop, this.userBookings);
  }

  initBookingsSub(): void {
    this.bookingsSub = this.bookingSvc.bookings$.subscribe(all => {
      this.userBookings = all;
      this.recomputeStopAvailability();
    });
  }

  ngOnInit(): void {
    this.planId = this.route.snapshot.paramMap.get('id');
    if (!this.planId) { this.router.navigate(['/trip-planner']); return; }
    this.planner.setActiveId(this.planId);
    this.refreshRv();
    this.initBookingsSub();
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
      this.maybeFetchRoute();
      this.recomputeStopAvailability();
    });
    // Reflect host-side block edits live so a host blocking dates on
    // /hosting/calendar in another tab surfaces the warning here without
    // a refresh.
    this.hostAvailSub = this.hostAvailability.all$.subscribe(() => this.recomputeStopAvailability());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.bookingsSub?.unsubscribe();
    this.hostAvailSub?.unsubscribe();
  }

  /** Re-fetch the road route when the stops sequence changes. */
  private maybeFetchRoute(): void {
    const stops = this.plan?.stops ?? [];
    if (stops.length < 2) {
      this.activeRoute = null;
      this.lastRouteKey = '';
      return;
    }
    const key = stops.map(s => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join(';');
    if (key === this.lastRouteKey) return;
    this.lastRouteKey = key;
    this.routeLoading = true;
    this.routeSub?.unsubscribe();
    this.routeSub = this.routing.getRoute(stops).subscribe(r => {
      this.activeRoute = r;
      this.routeLoading = false;
      this.cdr.markForCheck();
    });
  }

  get routeGeometry(): [number, number][] | null { return this.activeRoute?.coordinates ?? null; }

  formatMiles = (mi: number): string => this.routing.formatDistance(mi);
  formatMins = (m: number): string => this.routing.formatDuration(m);
  isLongLeg = (m: number): boolean => isLongLeg(m);

  /** Click a step in the Directions panel → fly the map to its start. */
  flyToStep(step: { start: { lat: number; lng: number } }): void {
    if (!step?.start) return;
    this.tripMap?.flyTo(step.start.lat, step.start.lng, 14);
  }

  /** One-click "Along your route" suggestion adders. Append to the trip
   * without going through the picker UI. */
  addListingSuggestion(l: IListing): void {
    if (!this.plan) return;
    this.planner.addStop(this.plan.id, {
      kind: l.kind === 'boondocking' ? 'boondocking' : 'private',
      refId: l.id, name: l.title, lat: l.lat, lng: l.lng, address: l.location, photo: l.image,
    });
    this.toasts.success('Added.');
  }
  addPoiSuggestion(p: IPoi): void {
    if (!this.plan) return;
    this.planner.addStop(this.plan.id, {
      kind: 'poi', refId: p.id, name: p.name, lat: p.lat, lng: p.lng, address: p.address, photo: p.photos?.[0],
    });
    this.toasts.success('Added.');
  }

  /** Per-stop "expanded" state — single id at a time, accordion-style. */
  expandedStopId: string | null = null;
  toggleStopExpand(stopId: string): void {
    this.expandedStopId = this.expandedStopId === stopId ? null : stopId;
  }

  /** Commit a per-stop field edit (dates, notes) back to storage. */
  updateStopField(stopId: string, patch: Partial<ITripStop>): void {
    if (!this.plan) return;
    this.planner.updateStop(this.plan.id, stopId, patch);
  }

  /** Listing + POI suggestions within the corridor — drives the "Along your
   * route" panel. Empty when corridor is 0 or trip has < 2 stops. */
  get listingSuggestions(): IListing[] {
    if (!this.plan) return [];
    return suggestionsAlongRoute(
      ALL_LISTINGS,
      this.plan.stops,
      this.plan.corridorMiles ?? 0,
      this.plan.stops,
      5,
    );
  }
  get poiSuggestions(): IPoi[] {
    if (!this.plan) return [];
    return suggestionsAlongRoute(
      MOCK_POIS,
      this.plan.stops,
      this.plan.corridorMiles ?? 0,
      this.plan.stops,
      5,
    );
  }
  /** Approximate distance from a candidate point to the existing route — for
   * the "X mi from route" label on each suggestion. */
  milesFromRoute(pt: { lat: number; lng: number }): number {
    if (!this.plan || this.plan.stops.length < 2) return 0;
    return pointToRouteMiles(pt, this.plan.stops);
  }

  /** Routed leg between stops i and i+1, falling back to straight-line. */
  legBetween(i: number): { miles: number; minutes: number } | null {
    if (!this.plan) return null;
    const stops = this.plan.stops;
    if (i < 0 || i >= stops.length - 1) return null;
    const leg = this.activeRoute?.legs?.[i];
    if (leg) return { miles: leg.distanceMiles, minutes: leg.durationMinutes };
    const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
      const R = 3959, toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    return { miles: haversine(stops[i], stops[i + 1]), minutes: 0 };
  }

  /** Close the RV switcher when the user clicks outside the panel. */
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (!this.rvSwitcherOpen) return;
    if (!this.panel?.nativeElement.contains(e.target as Node)) this.rvSwitcherOpen = false;
  }

  // ============ Fields ============
  commit(key: 'name' | 'startDate' | 'endDate', value: string | undefined): void {
    if (!this.plan) return;
    this.planner.update(this.plan.id, { [key]: value || undefined });
  }

  // ============ Date range pickers ============
  tripDatesOpen = false;
  stopDatesOpenId: string | null = null;

  toggleTripDates(): void {
    this.tripDatesOpen = !this.tripDatesOpen;
    if (this.tripDatesOpen) this.stopDatesOpenId = null;
  }
  toggleStopDates(stopId: string): void {
    this.stopDatesOpenId = this.stopDatesOpenId === stopId ? null : stopId;
    if (this.stopDatesOpenId) this.tripDatesOpen = false;
  }

  get tripDateRange(): DateRange<Date> {
    return new DateRange(parseIsoDate(this.plan?.startDate), parseIsoDate(this.plan?.endDate));
  }
  stopDateRange(s: ITripStop): DateRange<Date> {
    return new DateRange(parseIsoDate(s.checkInDate), parseIsoDate(s.checkOutDate));
  }

  get tripDateLabel(): string {
    const s = parseIsoDate(this.plan?.startDate);
    const e = parseIsoDate(this.plan?.endDate);
    if (!s && !e) return 'Pick trip dates';
    if (s && !e) return `${shortDateLabel(s)} → …`;
    if (!s && e) return `… → ${shortDateLabel(e)}`;
    return `${shortDateLabel(s)} → ${shortDateLabel(e)}`;
  }
  stopDateLabel(s: ITripStop): string {
    const ci = parseIsoDate(s.checkInDate);
    const co = parseIsoDate(s.checkOutDate);
    if (!ci && !co) return 'Pick dates';
    if (ci && !co) return `${shortDateLabel(ci)} → …`;
    if (!ci && co) return `… → ${shortDateLabel(co)}`;
    return `${shortDateLabel(ci)} → ${shortDateLabel(co)}`;
  }

  onTripDateSelected(d: Date | null): void {
    if (!this.plan || !d) return;
    const next = this.nextRange(this.tripDateRange, d);
    this.planner.update(this.plan.id, {
      startDate: formatIsoDate(next.start),
      endDate: formatIsoDate(next.end),
    });
  }
  onStopDateSelected(stopId: string, d: Date | null): void {
    if (!this.plan || !d) return;
    const stop = this.plan.stops.find(x => x.id === stopId);
    if (!stop) return;
    const next = this.nextRange(this.stopDateRange(stop), d);
    this.planner.updateStop(this.plan.id, stopId, {
      checkInDate: formatIsoDate(next.start),
      checkOutDate: formatIsoDate(next.end),
    });
    this.recomputeStopAvailability();
  }

  /** Booking-review-style range progression: click 1 = start, click 2 = end,
   *  click on/before start = restart range. */
  private nextRange(current: DateRange<Date>, d: Date): DateRange<Date> {
    if (!current.start || current.end) return new DateRange(d, null);
    if (d < current.start) return new DateRange(d, null);
    return new DateRange(current.start, d);
  }

  setCorridor(value: number): void {
    if (!this.plan) return;
    this.planner.update(this.plan.id, { corridorMiles: value });
  }

  /** Open the browser print dialog so the user can save a PDF or print
   *  a paper copy of the itinerary (print-only block at the bottom of
   *  the template handles the layout). */
  printTrip(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.print();
  }

  /** Build a share URL for the current trip and copy it to the clipboard. */
  async shareTrip(): Promise<void> {
    if (!this.plan || !isPlatformBrowser(this.platformId)) return;
    if (this.plan.stops.length === 0) {
      this.toasts.info('Add at least one stop before sharing.');
      return;
    }
    const payload = encodeTripShare(this.plan);
    const url = `${window.location.origin}/trip/share?t=${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      this.toasts.success('Share link copied to clipboard.');
    } catch {
      this.toasts.info(url);
    }
  }

  // ============ RV profile ============
  private refreshRv(): void {
    this.rvProfiles = listMyRvProfiles(this.platformId);
    this.activeRv = getActiveRvProfile(this.platformId);
  }
  selectRv(id: string): void {
    setActiveRvProfile(this.platformId, id);
    this.refreshRv();
    this.rvSwitcherOpen = false;
    this.toasts.info('Active rig updated.');
  }
  get activeRvInitials(): string {
    const n = this.activeRv?.name;
    if (!n) return '?';
    return n.split(/\s+/).filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase() || '?';
  }
  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  }

  // ============ Search ============
  onSearchBlur(): void {
    // Delay so a click on a result (mousedown) can fire before the dropdown closes.
    setTimeout(() => { this.searchOpen = false; }, 150);
  }

  /** Enter on the search input adds the top result. */
  onSearchEnter(): void {
    const top = this.searchResults[0];
    if (top) this.addHit(top);
  }

  get corridorActive(): boolean {
    return !!(this.plan && (this.plan.corridorMiles ?? 0) > 0 && this.plan.stops.length >= 2);
  }

  get searchResults(): ISearchHit[] {
    if (!this.plan) return [];
    const q = this.query.trim().toLowerCase();
    if (!q) return [];
    const route = this.plan.stops.map(s => ({ lat: s.lat, lng: s.lng }));
    const corridor = this.plan.corridorMiles ?? 0;
    const useCorridor = corridor > 0 && route.length >= 2;
    const inCorridor = (pt: { lat: number; lng: number }) => !useCorridor || pointToRouteMiles(pt, route) <= corridor;

    const listingHits: ISearchHit[] = ALL_LISTINGS
      .filter(l =>
        (l.title.toLowerCase().includes(q) || l.location.toLowerCase().includes(q))
        && inCorridor(l),
      )
      .slice(0, 5)
      .map(l => ({
        id: 'l-' + l.id,
        kind: l.kind === 'boondocking' ? 'boondocking' : 'private',
        name: l.title,
        subtitle: (l.kind === 'boondocking' ? 'Boondocking' : 'Private spot') + ' · ' + l.location,
        lat: l.lat,
        lng: l.lng,
        source: l,
      }));

    const poiHits: ISearchHit[] = MOCK_POIS
      .filter(p =>
        (p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.kind.includes(q))
        && inCorridor(p),
      )
      .slice(0, 5)
      .map(p => ({
        id: 'p-' + p.id,
        kind: 'poi',
        name: p.name,
        subtitle: this.poiKindLabel(p.kind) + ' · ' + p.address,
        lat: p.lat,
        lng: p.lng,
        source: p,
      }));

    return [...listingHits, ...poiHits];
  }

  addHit(hit: ISearchHit): void {
    if (!this.plan) return;
    if (hit.kind === 'poi') {
      const p = hit.source as IPoi;
      this.planner.addStop(this.plan.id, {
        kind: 'poi', refId: p.id, name: p.name, lat: p.lat, lng: p.lng, address: p.address, photo: p.photos?.[0],
      });
    } else {
      const l = hit.source as IListing;
      this.planner.addStop(this.plan.id, {
        kind: hit.kind, refId: l.id, name: l.title, lat: l.lat, lng: l.lng, address: l.location, photo: l.image,
      });
    }
    this.query = '';
    this.searchOpen = false;
    this.toasts.success('Stop added.');
  }

  // ============ My Location ============
  useMyLocation(): void {
    if (!this.plan || !isPlatformBrowser(this.platformId)) return;
    if (!('geolocation' in navigator)) { this.toasts.error('Geolocation not supported on this device.'); return; }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.locating = false;
        if (!this.plan) return;
        this.planner.addStop(this.plan.id, {
          kind: 'custom', name: 'My location', lat: pos.coords.latitude, lng: pos.coords.longitude,
        });
        this.toasts.success('Added your current location.');
      },
      err => {
        this.locating = false;
        this.toasts.error(err.message || 'Could not get your location.');
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  // ============ Stops ============
  onDrop(event: CdkDragDrop<ITripStop[]>): void {
    if (!this.plan) return;
    const stops = this.plan.stops.slice();
    moveItemInArray(stops, event.previousIndex, event.currentIndex);
    this.planner.update(this.plan.id, { stops });
  }

  removeStop(stopId: string): void {
    if (!this.plan) return;
    const plan = this.plan;
    const idx = plan.stops.findIndex(s => s.id === stopId);
    if (idx === -1) return;
    const removed: ITripStop = plan.stops[idx];
    this.planner.removeStop(plan.id, stopId);
    this.toasts.info(`"${removed.name}" removed.`, {
      actionLabel: 'Undo',
      action: () => {
        const current = this.planner.get(plan.id);
        if (!current) return;
        const restored = current.stops.slice();
        restored.splice(Math.min(idx, restored.length), 0, removed);
        this.planner.update(plan.id, { stops: restored });
      },
    });
  }

  // ============ Pin drop ============
  togglePinDrop(): void {
    this.pinDropMode = !this.pinDropMode;
    if (!this.pinDropMode) this.cancelPin();
  }

  onPinDropped(coords: { lat: number; lng: number }): void {
    this.pendingPin = coords;
    this.pendingPinName = '';
  }

  cancelPin(): void {
    this.pendingPin = null;
    this.pendingPinName = '';
  }

  confirmPin(): void {
    if (!this.plan || !this.pendingPin) return;
    const name = this.pendingPinName.trim();
    if (!name) return;
    this.planner.addStop(this.plan.id, {
      kind: 'custom', name, lat: this.pendingPin.lat, lng: this.pendingPin.lng,
    });
    this.pendingPin = null;
    this.pendingPinName = '';
    this.pinDropMode = false;
    this.toasts.success('Pin added.');
  }

  onMarkerClicked(_stopId: string): void { /* reserved for stop details popover */ }

  /** A "Add to trip" popup on a background listing/POI was clicked on the map. */
  onBackgroundAdd(event: { kind: 'listing' | 'poi'; id: number | string }): void {
    if (!this.plan) return;
    if (event.kind === 'listing') {
      const l = ALL_LISTINGS.find(x => x.id === event.id);
      if (!l) return;
      this.planner.addStop(this.plan.id, {
        kind: l.kind === 'boondocking' ? 'boondocking' : 'private',
        refId: l.id, name: l.title, lat: l.lat, lng: l.lng, address: l.location, photo: l.image,
      });
    } else {
      const p = MOCK_POIS.find(x => x.id === event.id);
      if (!p) return;
      this.planner.addStop(this.plan.id, {
        kind: 'poi', refId: p.id, name: p.name, lat: p.lat, lng: p.lng, address: p.address, photo: p.photos?.[0],
      });
    }
    this.toasts.success('Added to trip.');
  }

  // ============ Derived ============
  get tripDistance(): number {
    return this.plan ? totalTripMiles(this.plan) : 0;
  }
  get tripCost(): ITripCost {
    return this.plan
      ? tripCostSummary(this.plan, ALL_LISTINGS)
      : { totalNights: 0, paidNights: 0, totalCost: 0, unknownPrice: false };
  }

  /** Per-leg miles array for fuel range calculation — prefers OSRM legs, falls
   *  back to haversine between consecutive stops when the route hasn't loaded. */
  private get legsMiles(): number[] {
    if (!this.plan || this.plan.stops.length < 2) return [];
    if (this.activeRoute) return this.activeRoute.legs.map(l => l.distanceMiles);
    const miles: number[] = [];
    for (let i = 0; i < this.plan.stops.length - 1; i++) {
      const leg = this.legBetween(i);
      if (leg) miles.push(leg.miles);
    }
    return miles;
  }

  get tripFuel(): ITripFuel | null {
    if (!this.plan) return null;
    return tripFuelEstimate(this.tripDistance, this.legsMiles, this.activeRv?.mpg, this.activeRv?.fuelTankGallons);
  }
  /** True when the active rig has no MPG set — drives the inline "set MPG" hint. */
  get fuelRequiresMpg(): boolean {
    return !this.activeRv?.mpg || this.activeRv.mpg <= 0;
  }
  legExceedsRange(i: number): boolean {
    return !!this.tripFuel?.legsOverRange.includes(i);
  }

  // ============ Labels ============
  kindIcon(k: TripStopKind | 'private' | 'boondocking' | 'poi' | 'custom'): string {
    return ({ private: 'rv_hookup', boondocking: 'landscape', poi: 'pin_drop', custom: 'push_pin' } as Record<string, string>)[k] ?? 'place';
  }
  kindColor(k: TripStopKind | 'private' | 'boondocking' | 'poi' | 'custom'): string {
    return ({ private: '#e3530d', boondocking: '#3b6e3b', poi: '#b3760e', custom: '#6b6b6b' } as Record<string, string>)[k] ?? '#6b6b6b';
  }
  stopMarkerColor(i: number, last: boolean): string {
    if (!this.plan) return '#6b6b6b';
    if (this.plan.stops.length > 1) {
      if (i === 0) return '#295d42';
      if (last) return '#9a3f0a';
    }
    return this.kindColor(this.plan.stops[i]?.kind ?? 'custom');
  }
  stopBadge(i: number, last: boolean): string {
    if (!this.plan) return '';
    if (this.plan.stops.length > 1) {
      if (i === 0) return 'Start';
      if (last) return 'Finish';
    }
    const k = this.plan.stops[i]?.kind;
    return ({ private: 'Private spot', boondocking: 'Boondocking', poi: 'POI', custom: 'Custom pin' } as Record<string, string>)[k as string] ?? '';
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
