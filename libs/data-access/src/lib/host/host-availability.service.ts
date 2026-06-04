import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, map } from 'rxjs';

/** External calendar feed registered on a listing (Airbnb, VRBO, Google
 *  Cal, etc). `url` is optional because some feeds are paste-only
 *  (browsers can't fetch arbitrary cross-origin ICS URLs). */
export interface IHostExternalFeed {
  url?: string;
  sourceLabel: string;
  lastSyncAt: string;
}

/** Seasonal pricing tier covering a date range. Sits between the
 *  listing's base price and per-day overrides — host names the band,
 *  sets one nightly rate, and the calendar applies it across the range
 *  without stamping individual overrides. */
export interface IPricingTier {
  id: string;
  name: string;
  start: string;       // ISO YYYY-MM-DD, inclusive
  end: string;         // ISO YYYY-MM-DD, inclusive
  nightlyPrice: number;
}

/** Min/max-stay rule covering a date range. The rule applies to
 *  reservations whose check-in date falls inside [start, end]. */
export interface IStayRule {
  id: string;
  start: string;       // ISO YYYY-MM-DD, inclusive
  end: string;         // ISO YYYY-MM-DD, inclusive
  minNights?: number;
  maxNights?: number;  // reserved — no UI in v1
}

/** Per-listing host-controlled availability and pricing overrides. */
export interface IHostAvailability {
  /** ISO YYYY-MM-DD dates the host has manually blocked. */
  blocked: string[];
  /** Per-day price overrides keyed by ISO YYYY-MM-DD. */
  prices: Record<string, number>;
  /** ISO dates imported from external feeds, grouped by source label so a
   *  re-sync can wipe and replace just one source. */
  externalBlocks?: Record<string, string[]>;
  /** Registered external feeds — the host's reference list, not the
   *  source of truth for blocks (that's externalBlocks). */
  feeds?: IHostExternalFeed[];
  /** Min/max-stay rules per date range. Booking widget + search +
   *  trip planner all enforce against these. */
  stayRules?: IStayRule[];
  /** Seasonal pricing tiers — applied beneath per-day overrides and
   *  above the listing's base price. */
  pricingTiers?: IPricingTier[];
}

const AVAILABILITY_KEY = 'cnt-host-availability';
const EMPTY: IHostAvailability = { blocked: [], prices: {} };

function clone(a: IHostAvailability): IHostAvailability {
  return {
    blocked: [...a.blocked],
    prices: { ...a.prices },
    externalBlocks: a.externalBlocks
      ? Object.fromEntries(Object.entries(a.externalBlocks).map(([k, v]) => [k, [...v]]))
      : undefined,
    feeds: a.feeds ? a.feeds.map(f => ({ ...f })) : undefined,
    stayRules: a.stayRules ? a.stayRules.map(r => ({ ...r })) : undefined,
    pricingTiers: a.pricingTiers ? a.pricingTiers.map(t => ({ ...t })) : undefined,
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class HostAvailabilityService {
  private readonly _all$ = new BehaviorSubject<Record<number, IHostAvailability>>({});
  readonly all$: Observable<Record<number, IHostAvailability>> = this._all$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._all$.next(this.read());
  }

  /** Live availability for one listing — re-emits when any listing's data changes. */
  forListing$(listingId: number): Observable<IHostAvailability> {
    return this.all$.pipe(map(all => all[listingId] || EMPTY));
  }

  get(listingId: number): IHostAvailability {
    return this._all$.value[listingId] || EMPTY;
  }

  /** Block or unblock a set of ISO dates for a listing. */
  setBlocked(listingId: number, dates: string[], blocked: boolean): void {
    if (dates.length === 0) return;
    const current = clone(this.get(listingId));
    const set = new Set(current.blocked);
    for (const d of dates) blocked ? set.add(d) : set.delete(d);
    current.blocked = [...set].sort();
    this.patch(listingId, current);
  }

  /** Apply (or clear, when price is null) a per-day price override across a set of dates. */
  setPrice(listingId: number, dates: string[], price: number | null): void {
    if (dates.length === 0) return;
    const current = clone(this.get(listingId));
    for (const d of dates) {
      if (price === null || isNaN(price)) delete current.prices[d];
      else current.prices[d] = Math.round(price);
    }
    this.patch(listingId, current);
  }

  /** Drop all overrides + blocks for the given dates. */
  resetDates(listingId: number, dates: string[]): void {
    if (dates.length === 0) return;
    const current = clone(this.get(listingId));
    const blockedSet = new Set(current.blocked);
    for (const d of dates) {
      blockedSet.delete(d);
      delete current.prices[d];
    }
    current.blocked = [...blockedSet].sort();
    this.patch(listingId, current);
  }

  private patch(listingId: number, next: IHostAvailability): void {
    const all = { ...this._all$.value, [listingId]: next };
    this.write(all);
  }

  // ============ Bulk fan-out for the /hosting/calendar multi-listing editor ============
  /** Block or unblock a set of dates across multiple listings in one write. */
  setBlockedBulk(listingIds: number[], dates: string[], blocked: boolean): void {
    if (listingIds.length === 0 || dates.length === 0) return;
    const all = { ...this._all$.value };
    for (const id of listingIds) {
      const current = clone(all[id] || EMPTY);
      const set = new Set(current.blocked);
      for (const d of dates) blocked ? set.add(d) : set.delete(d);
      current.blocked = [...set].sort();
      all[id] = current;
    }
    this.write(all);
  }

  /** Apply (or clear) a per-day price override across multiple listings. */
  setPriceBulk(listingIds: number[], dates: string[], price: number | null): void {
    if (listingIds.length === 0 || dates.length === 0) return;
    const all = { ...this._all$.value };
    for (const id of listingIds) {
      const current = clone(all[id] || EMPTY);
      for (const d of dates) {
        if (price === null || isNaN(price)) delete current.prices[d];
        else current.prices[d] = Math.round(price);
      }
      all[id] = current;
    }
    this.write(all);
  }

  /** Reset all blocks + overrides on a set of dates across multiple listings. */
  resetDatesBulk(listingIds: number[], dates: string[]): void {
    if (listingIds.length === 0 || dates.length === 0) return;
    const all = { ...this._all$.value };
    for (const id of listingIds) {
      const current = clone(all[id] || EMPTY);
      const blockedSet = new Set(current.blocked);
      for (const d of dates) {
        blockedSet.delete(d);
        delete current.prices[d];
      }
      current.blocked = [...blockedSet].sort();
      all[id] = current;
    }
    this.write(all);
  }

  // ============ External calendar feeds (T2.2 iCal import) ============

  /** Insert or update a registered feed by sourceLabel. Idempotent. */
  upsertFeed(listingId: number, feed: { url?: string; sourceLabel: string }): void {
    if (!feed.sourceLabel.trim()) return;
    const current = clone(this.get(listingId));
    const feeds = current.feeds ?? [];
    const idx = feeds.findIndex(f => f.sourceLabel === feed.sourceLabel);
    const stamp = new Date().toISOString();
    if (idx === -1) {
      feeds.push({ url: feed.url, sourceLabel: feed.sourceLabel, lastSyncAt: stamp });
    } else {
      feeds[idx] = { ...feeds[idx], url: feed.url ?? feeds[idx].url };
    }
    current.feeds = feeds;
    this.patch(listingId, current);
  }

  /** Drop a feed + every external block tagged with that source. */
  removeFeed(listingId: number, sourceLabel: string): void {
    const current = clone(this.get(listingId));
    if (current.feeds) current.feeds = current.feeds.filter(f => f.sourceLabel !== sourceLabel);
    if (current.externalBlocks) {
      const next = { ...current.externalBlocks };
      delete next[sourceLabel];
      current.externalBlocks = Object.keys(next).length ? next : undefined;
    }
    this.patch(listingId, current);
  }

  /** Replace the blocked-date set for one source. Sync semantics — a
   *  re-import wipes the prior list rather than merging, so removed
   *  external bookings disappear from CurbNTurf too. Bumps lastSyncAt
   *  on the matching feed if present. */
  applyExternalBlocks(listingId: number, sourceLabel: string, isoDates: string[]): void {
    if (!sourceLabel.trim()) return;
    const current = clone(this.get(listingId));
    const ext = { ...(current.externalBlocks ?? {}) };
    const sorted = [...new Set(isoDates)].sort();
    if (sorted.length === 0) delete ext[sourceLabel];
    else ext[sourceLabel] = sorted;
    current.externalBlocks = Object.keys(ext).length ? ext : undefined;
    if (current.feeds) {
      const idx = current.feeds.findIndex(f => f.sourceLabel === sourceLabel);
      if (idx !== -1) current.feeds[idx] = { ...current.feeds[idx], lastSyncAt: new Date().toISOString() };
    }
    this.patch(listingId, current);
  }

  /** Clear all blocks for one source without removing the feed itself. */
  clearExternalBlocks(listingId: number, sourceLabel: string): void {
    this.applyExternalBlocks(listingId, sourceLabel, []);
  }

  // ============ Min/max-stay rules (T2.3) ============

  /** Insert (no id) or update (with id) a stay rule. Returns the stored rule.
   *  Validates start <= end and minNights >= 1; bad input is a no-op return null. */
  upsertStayRule(
    listingId: number,
    rule: { id?: string; start: string; end: string; minNights?: number; maxNights?: number },
  ): IStayRule | null {
    if (!rule.start || !rule.end || rule.start > rule.end) return null;
    if (rule.minNights != null && rule.minNights < 1) return null;
    if (rule.maxNights != null && rule.maxNights < 1) return null;
    const current = clone(this.get(listingId));
    const rules = current.stayRules ?? [];
    const next: IStayRule = {
      id: rule.id ?? newId(),
      start: rule.start,
      end: rule.end,
      minNights: rule.minNights,
      maxNights: rule.maxNights,
    };
    const idx = rules.findIndex(r => r.id === next.id);
    if (idx === -1) rules.push(next);
    else rules[idx] = next;
    current.stayRules = rules;
    this.patch(listingId, current);
    return next;
  }

  removeStayRule(listingId: number, ruleId: string): void {
    const current = clone(this.get(listingId));
    if (!current.stayRules) return;
    current.stayRules = current.stayRules.filter(r => r.id !== ruleId);
    if (current.stayRules.length === 0) current.stayRules = undefined;
    this.patch(listingId, current);
  }

  /** Bulk fan-out for the /hosting/calendar editor — each scoped listing
   *  gets its own copy with its own id, so per-listing removal stays clean. */
  setStayRuleBulk(
    listingIds: number[],
    rule: { start: string; end: string; minNights?: number; maxNights?: number },
  ): void {
    if (listingIds.length === 0) return;
    if (!rule.start || !rule.end || rule.start > rule.end) return;
    const all = { ...this._all$.value };
    for (const id of listingIds) {
      const current = clone(all[id] || EMPTY);
      const rules = current.stayRules ?? [];
      rules.push({
        id: newId(),
        start: rule.start,
        end: rule.end,
        minNights: rule.minNights,
        maxNights: rule.maxNights,
      });
      current.stayRules = rules;
      all[id] = current;
    }
    this.write(all);
  }

  // ============ Pricing tiers (T3.1) ============

  upsertPricingTier(
    listingId: number,
    tier: { id?: string; name: string; start: string; end: string; nightlyPrice: number },
  ): IPricingTier | null {
    if (!tier.name?.trim()) return null;
    if (!tier.start || !tier.end || tier.start > tier.end) return null;
    if (!Number.isFinite(tier.nightlyPrice) || tier.nightlyPrice <= 0) return null;
    const current = clone(this.get(listingId));
    const tiers = current.pricingTiers ?? [];
    const next: IPricingTier = {
      id: tier.id ?? newId(),
      name: tier.name.trim(),
      start: tier.start,
      end: tier.end,
      nightlyPrice: Math.round(tier.nightlyPrice),
    };
    const idx = tiers.findIndex(t => t.id === next.id);
    if (idx === -1) tiers.push(next);
    else tiers[idx] = next;
    current.pricingTiers = tiers;
    this.patch(listingId, current);
    return next;
  }

  removePricingTier(listingId: number, tierId: string): void {
    const current = clone(this.get(listingId));
    if (!current.pricingTiers) return;
    current.pricingTiers = current.pricingTiers.filter(t => t.id !== tierId);
    if (current.pricingTiers.length === 0) current.pricingTiers = undefined;
    this.patch(listingId, current);
  }

  setPricingTierBulk(
    listingIds: number[],
    tier: { name: string; start: string; end: string; nightlyPrice: number },
  ): void {
    if (listingIds.length === 0) return;
    if (!tier.name?.trim()) return;
    if (!tier.start || !tier.end || tier.start > tier.end) return;
    if (!Number.isFinite(tier.nightlyPrice) || tier.nightlyPrice <= 0) return;
    const all = { ...this._all$.value };
    for (const id of listingIds) {
      const current = clone(all[id] || EMPTY);
      const tiers = current.pricingTiers ?? [];
      tiers.push({
        id: newId(),
        name: tier.name.trim(),
        start: tier.start,
        end: tier.end,
        nightlyPrice: Math.round(tier.nightlyPrice),
      });
      current.pricingTiers = tiers;
      all[id] = current;
    }
    this.write(all);
  }

  /** Aggregate a single day's state across a set of scoped listings — drives
   *  the day-cell render on the bulk calendar. `bookedByListing` is built once
   *  per render from the bookings stream so this stays cheap per cell. */
  aggregateDayState(
    listingIds: number[],
    iso: string,
    bookedByListing: Record<number, Set<string>>,
  ): { open: number; booked: number; blocked: number; priced: number; uniformPrice: number | null } {
    let open = 0, booked = 0, blocked = 0, priced = 0;
    const prices: number[] = [];
    for (const id of listingIds) {
      const avail = this._all$.value[id] || EMPTY;
      if (bookedByListing[id]?.has(iso)) { booked++; continue; }
      if (avail.blocked.includes(iso)) { blocked++; continue; }
      // External-feed blocks count as blocked in the aggregate. We don't
      // distinguish them visually in the bulk grid — single-listing
      // editor does that with its own tone.
      if (avail.externalBlocks && Object.values(avail.externalBlocks).some(arr => arr.includes(iso))) { blocked++; continue; }
      open++;
      const p = avail.prices[iso];
      if (typeof p === 'number') { priced++; prices.push(p); }
    }
    const uniformPrice =
      prices.length > 0 && prices.length === open && prices.every(p => p === prices[0])
        ? prices[0]
        : null;
    return { open, booked, blocked, priced, uniformPrice };
  }

  private read(): Record<number, IHostAvailability> {
    if (!isPlatformBrowser(this.platformId)) return {};
    try {
      const raw = localStorage.getItem(AVAILABILITY_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }

  private write(all: Record<number, IHostAvailability>): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(all)); } catch { /* quota */ }
    }
    this._all$.next(all);
  }
}
