import {
  Component, AfterViewInit, OnDestroy, OnChanges, SimpleChanges,
  Input, Output, EventEmitter, ElementRef, ViewChild, Inject, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { IListing, IBoondockingListing, CATEGORY_META, IPoi, PoiKind, POI_KIND_META, POI_KIND_PHOTO, AGENCY_META, ITripPlan } from '@cnt-workspace/data-access';
import {
  TILE_URL, TILE_ATTRIBUTION, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM,
} from '@cnt-workspace/ui';

@Component({
  selector: 'cnt-search-map',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .map-wrap { position: relative; width: 100%; height: 100%; min-height: 500px; background: #dde7e1; }
    .map-el { position: absolute; inset: 0; }

    /* View-mode toggle pill — single button that swaps Map only / Split view. */
    .cnt-view-toggle-pill {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #ffffff;
      color: #222222;
      border: 1px solid rgba(34, 34, 34, 0.08);
      border-radius: 999px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      font-family: 'Asap Condensed', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }
    .cnt-view-toggle-pill:hover {
      transform: translateX(-50%) translateY(-1px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
      background: #fff;
    }
    .cnt-view-toggle-pill .material-symbols-outlined { font-size: 16px; color: #e3530d; }

    @media (max-width: 767px) {
      .cnt-view-toggle-pill { display: none; }
    }
  `],
  template: `
    <div class="map-wrap">
      <div #mapEl class="map-el"></div>

      <!-- View-mode toggle (single conditional pill). -->
      @if (viewMode === 'split') {
        <button type="button" class="cnt-view-toggle-pill" (click)="viewModeChange.emit('map-only')">
          <span class="material-symbols-outlined">open_in_full</span>
          Map only
        </button>
      } @else {
        <button type="button" class="cnt-view-toggle-pill" (click)="viewModeChange.emit('split')">
          <span class="material-symbols-outlined">view_sidebar</span>
          Split view
        </button>
      }

      <button type="button" (click)="locateMe()"
        class="absolute bottom-6 right-6 z-[var(--z-map-overlay)] w-12 h-12 rounded-full bg-trinidad shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        title="Center on my location" aria-label="Center map on my location">
        <span class="material-symbols-outlined text-white">rv_hookup</span>
      </button>
      @if (geoError) {
        <div class="absolute bottom-20 right-6 z-[var(--z-map-overlay)] bg-white px-3 py-2 rounded-lg shadow text-xs font-body text-trinidad" role="status">{{ geoError }}</div>
      }
      @if (initError) {
        <div class="absolute inset-0 z-[var(--z-map-error)] flex items-center justify-center p-8 bg-white/95">
          <div class="text-center max-w-md">
            <span class="material-symbols-outlined text-5xl text-trinidad">error</span>
            <p class="font-headline text-xl font-bold mt-3">Map failed to load</p>
            <p class="text-sm text-muted-text mt-2 font-body">{{ initError }}</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class SearchMapComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @Input() listings: IListing[] = [];
  @Input() hoveredId: number | null = null;
  @Input() popupId: number | null = null;
  @Input() favoriteIds: Set<number> = new Set<number>();
  /** Canonical "poi:<id>" keys of favorited POIs — drives the heart fill in popup cards. */
  @Input() poiFavoriteKeys: Set<string> = new Set<string>();
  @Input() viewMode: 'split' | 'map-only' = 'split';
  /** Visible POIs as an overlay layer (not clustered). */
  @Input() pois: IPoi[] = [];
  /** Active trip plan — when set, overlays the route polyline + start/finish
   *  markers, and adds an "Add to trip" button to every popup. */
  @Input() activePlan: ITripPlan | null = null;
  /** Optional road-following route geometry [lng, lat][] — when present,
   *  replaces the straight-line dashed polyline with a solid roads line. */
  @Input() routeGeometry: [number, number][] | null = null;
  @Output() markerHover = new EventEmitter<number | null>();
  @Output() markerClick = new EventEmitter<number>();
  @Output() popupClosed = new EventEmitter<void>();
  @Output() favoriteToggle = new EventEmitter<{ id: number; next: boolean }>();
  @Output() viewModeChange = new EventEmitter<'split' | 'map-only'>();
  /** Fires when a POI pin is clicked. Parent opens the modal. */
  @Output() poiClick = new EventEmitter<IPoi>();
  /** Heart click inside a POI popup card. Parent persists to localStorage. */
  @Output() poiFavoriteToggle = new EventEmitter<{ poi: IPoi; next: boolean }>();
  /** "Add to trip" click inside a popup. Parent looks up the source + persists. */
  @Output() addToTrip = new EventEmitter<{ kind: 'listing' | 'poi'; id: number | string }>();
  /** Fires whenever the map's visible bounds change (pan / zoom / initial fit). */
  @Output() boundsChange = new EventEmitter<{ north: number; south: number; east: number; west: number }>();

  private map: L.Map | null = null;
  private cluster: any = null;
  private markers = new Map<number, L.Marker>();
  /** Separate cluster instance for POIs so utility pins don't mix with stay pins in the same bubbles. */
  private poiCluster: any = null;
  private poiMarkers = new Map<string, L.Marker>();
  /** Route overlay layer — polyline + start/finish/intermediate markers. */
  private routeLayer: L.LayerGroup | null = null;
  private destroyed = false;
  private geoErrorTimer: ReturnType<typeof setTimeout> | null = null;
  geoError = '';
  initError = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Defer heavy leaflet init so navigation/render isn't blocked
    setTimeout(() => {
      if (this.destroyed) return;
      try {
        this.initMap();
      } catch (err: any) {
        if (this.destroyed) return;
        this.initError = err?.message || String(err);
      }
    }, 0);
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      zoomControl: false,
      preferCanvas: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 18,
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 56,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="cnt-cluster">${count}</div>`,
          className: 'cnt-cluster-wrap',
          iconSize: [44, 44],
        });
      },
    });

    this.map.addLayer(this.cluster);
    this.renderMarkers();
    this.renderPois();

    // Emit bounds whenever the map idles after pan/zoom (debounced by Leaflet's moveend).
    this.map.on('moveend', () => this.emitBounds());
    // Notify parent when the user dismisses a popup so it can clear selectedId.
    this.map.on('popupclose', () => this.popupClosed.emit());

    // Event delegation for popup-internal buttons (heart on listings + "View details" on POI popups).
    this.map.getContainer().addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;

      // "Add to trip" pill — present in any popup when an active plan is set.
      const tpBtn = target.closest?.('.popup-add-to-trip') as HTMLButtonElement | null;
      if (tpBtn) {
        e.preventDefault();
        e.stopPropagation();
        const kind = tpBtn.getAttribute('data-tp-kind') as 'listing' | 'poi' | null;
        const idAttr = tpBtn.getAttribute('data-tp-id');
        if (!kind || !idAttr) return;
        const id: number | string = kind === 'listing' ? parseInt(idAttr, 10) : idAttr;
        this.map?.closePopup();
        this.addToTrip.emit({ kind, id });
        return;
      }

      // POI "View details" → close popup, open modal.
      const poiBtn = target.closest?.('.popup-poi-details') as HTMLButtonElement | null;
      if (poiBtn) {
        e.preventDefault();
        e.stopPropagation();
        const poiId = poiBtn.getAttribute('data-poi-id');
        const poi = poiId ? this.pois.find(p => p.id === poiId) : null;
        if (poi) {
          this.map?.closePopup();
          this.poiClick.emit(poi);
        }
        return;
      }

      const btn = target.closest?.('.popup-favorite') as HTMLButtonElement | null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      // POI favorite — string id, distinct emitter so the parent persists with the right kind.
      const poiFavAttr = btn.getAttribute('data-poi-fav-id');
      if (poiFavAttr) {
        const poi = this.pois.find(p => p.id === poiFavAttr);
        if (!poi) return;
        const wasFav = btn.classList.contains('is-fav');
        const next = !wasFav;
        btn.classList.toggle('is-fav', next);
        btn.setAttribute('aria-pressed', next ? 'true' : 'false');
        btn.setAttribute('aria-label', next ? 'Remove from favorites' : 'Save to favorites');
        this.poiFavoriteToggle.emit({ poi, next });
        return;
      }

      const idAttr = btn.getAttribute('data-fav-id');
      const id = idAttr ? parseInt(idAttr, 10) : NaN;
      if (!Number.isFinite(id)) return;
      const wasFav = btn.classList.contains('is-fav');
      const next = !wasFav;
      // Toggle the visual immediately (optimistic) so the user sees the change without re-rendering markers.
      btn.classList.toggle('is-fav', next);
      btn.setAttribute('aria-pressed', next ? 'true' : 'false');
      btn.setAttribute('aria-label', next ? 'Remove from favorites' : 'Save to favorites');
      this.favoriteToggle.emit({ id, next });
    });
    // Initial bounds emission once the map has size.
    setTimeout(() => { this.map?.invalidateSize(); this.emitBounds(); }, 50);
    setTimeout(() => { this.map?.invalidateSize(); this.emitBounds(); }, 300);
  }

  private lastIdSignature = '';
  private lastPoiSignature = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listings'] && this.cluster) {
      // Skip the rebuild if the listing set hasn't actually changed (prevents
      // wiping markers — and any open popup — every change-detection cycle when
      // the parent uses a getter that returns a fresh array reference).
      const sig = this.listings.map(l => l.id).join(',');
      if (sig !== this.lastIdSignature) {
        this.lastIdSignature = sig;
        this.renderMarkers();
      }
    }
    if (changes['hoveredId'] && this.markers.size) {
      this.updateHoverHighlight();
    }
    if (changes['popupId']) {
      this.handlePopupChange();
    }
    if (changes['viewMode'] && this.map) {
      // Container width changes when toggling split <-> map-only. Tell Leaflet
      // to recompute its size so tiles fill the new bounds and the bounds-filter
      // updates.
      setTimeout(() => {
        this.map?.invalidateSize();
        this.emitBounds();
      }, 60);
      setTimeout(() => this.map?.invalidateSize(), 320);
    }
    if (changes['activePlan'] && this.map) {
      this.renderRouteOverlay();
      // Re-render markers so popups pick up the new "Add to trip" pill state.
      this.lastIdSignature = '';
      this.lastPoiSignature = '';
      this.renderMarkers?.();
      this.renderPois();
    }
    if (changes['routeGeometry'] && this.map) {
      this.renderRouteOverlay();
    }
    if (changes['pois'] && this.map) {
      // Signature guard mirrors the listing-cluster guard (line ~200): the parent
      // computes `pois` via a getter that returns a fresh array each CD cycle, so
      // without this, every cycle would wipe the POI layer and close any open popup
      // the user just clicked open.
      const sig = this.pois.map(p => p.id).join(',');
      if (sig !== this.lastPoiSignature) {
        this.lastPoiSignature = sig;
        this.renderPois();
      }
    }
  }

  /** Build / refresh the POI cluster layer. Re-runs when the `pois` input *signature* changes. */
  private renderPois(): void {
    if (!this.map) return;
    if (!this.poiCluster) {
      // Cluster bubbles for utility POIs — separate from the stay cluster so we don't mix
      // listings + dump stations in the same bubble. iconCreateFunction colors the bubble
      // by the dominant child kind so it reads against the existing legend.
      this.poiCluster = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 48,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster: any) => {
          const children = cluster.getAllChildMarkers();
          const counts: Record<string, number> = {};
          for (const child of children) {
            const k = (child as any)._cntPoiKind as PoiKind | undefined;
            if (!k) continue;
            counts[k] = (counts[k] || 0) + 1;
          }
          let dominant: PoiKind = 'dumpstation';
          let max = -1;
          for (const k of Object.keys(counts) as PoiKind[]) {
            if (counts[k] > max) { max = counts[k]; dominant = k; }
          }
          const color = POI_KIND_META[dominant].color;
          return L.divIcon({
            html: `<div class="cnt-poi-cluster" style="--poi:${color}">${cluster.getChildCount()}</div>`,
            className: 'cnt-poi-cluster-wrap',
            iconSize: [36, 36],
          });
        },
      });
      this.map.addLayer(this.poiCluster);
    } else {
      this.poiCluster.clearLayers();
    }
    this.poiMarkers.clear();
    for (const p of this.pois) {
      const meta = POI_KIND_META[p.kind];
      const html = `
        <div style="position: relative; width: 28px; height: 28px;
                    border-radius: 50%; background: ${meta.color};
                    border: 2px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.25);
                    display: flex; align-items: center; justify-content: center;
                    color: #fff;">
          <span style="font-family: 'Material Symbols Outlined'; font-size: 16px; font-variation-settings: 'FILL' 1;">${meta.icon}</span>
        </div>`;
      const icon = L.divIcon({ html, className: 'cnt-poi-pin', iconSize: [28, 28], iconAnchor: [14, 14] });
      const marker = L.marker([p.lat, p.lng], { icon, title: `${meta.label}: ${p.name}` });
      // Tag the marker with its kind so the cluster icon callback can color by dominant kind.
      (marker as any)._cntPoiKind = p.kind;
      marker.bindPopup(this.buildPoiPopupHtml(p), {
        closeButton: false,
        maxWidth: 260,
        minWidth: 240,
        className: 'cnt-listing-popup cnt-poi-popup',
        offset: [0, -6],
        autoPanPadding: [40, 40],
        keepInView: true,
      });
      this.poiCluster.addLayer(marker);
      this.poiMarkers.set(p.id, marker);
    }
  }

  /** Compact POI popup card. The "View details" CTA opens the full modal via event delegation. */
  private buildPoiPopupHtml(poi: IPoi): string {
    const meta = POI_KIND_META[poi.kind];
    const name = this.escapeHtml(poi.name);
    const address = this.escapeHtml(poi.address);
    const label = this.escapeHtml(meta.label);
    const costLabel = poi.priceNote
      ? this.escapeHtml(poi.priceNote)
      : poi.cost === 'free' ? 'Free'
      : poi.cost === 'paid' ? 'Paid'
      : poi.cost === 'free-with-fuel' ? 'Free with fill-up'
      : 'Cost unknown';
    const costColor = poi.cost === 'free' || poi.cost === 'free-with-fuel' ? '#295d42' : '#b3760e';
    // Photo: per-entry photos[] first, then per-kind fallback, then glyph placeholder.
    const photoSrc = poi.photos.length > 0
      ? poi.photos[0]
      : POI_KIND_PHOTO[poi.kind];
    const photoBlock = photoSrc
      ? `<img src="${this.escapeHtml(photoSrc)}" alt="${name}" loading="lazy">`
      : `<div class="popup-poi-glyph" style="background:${meta.color}14;color:${meta.color}">
           <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${meta.icon}</span>
         </div>`;
    const isFav = this.poiFavoriteKeys.has(`poi:${poi.id}`);
    // "Last verified" decay chip — surfaces stale community data (90+ days).
    const staleChip = this.isStale(poi.lastVerified)
      ? `<span class="popup-stale" title="Community data may be out of date">
           <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">schedule</span>
           ${this.verifiedAgoLabel(poi.lastVerified)}
         </span>`
      : '';
    return `
      <div class="cnt-listing-popup-card cnt-poi-popup-card" data-poi-id="${this.escapeHtml(poi.id)}">
        <div class="popup-photo-link popup-poi-photo">
          ${photoBlock}
          <span class="popup-instant" style="background:${meta.color}">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${meta.icon}</span>
            ${label}
          </span>
        </div>
        <button type="button" class="popup-favorite${isFav ? ' is-fav' : ''}" data-poi-fav-id="${this.escapeHtml(poi.id)}"
          aria-label="${isFav ? 'Remove from favorites' : 'Save to favorites'}"
          aria-pressed="${isFav ? 'true' : 'false'}">
          <span class="material-symbols-outlined">favorite</span>
        </button>
        <div class="popup-body">
          <h3 class="popup-title">${name}</h3>
          <div class="popup-meta-row">
            <span class="popup-location">${address}</span>
          </div>
          ${staleChip}
          <div class="popup-price-row">
            <span class="popup-price" style="color:${costColor};font-size:14px">${this.escapeHtml(costLabel)}</span>
            <button type="button" class="popup-cta popup-poi-details" data-poi-id="${this.escapeHtml(poi.id)}" aria-label="View ${name} details">
              View details
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          ${this.addToTripHtml('poi', poi.id)}
        </div>
      </div>`;
  }

  /** "Add to trip" pill rendered in every popup. When there's no active plan
   *  the parent opens a drawer in "pick a trip" mode for this pending stop. */
  private addToTripHtml(kind: 'listing' | 'poi', id: number | string): string {
    const label = this.activePlan
      ? `Add to &ldquo;${this.escapeHtml(this.activePlan.name)}&rdquo;`
      : 'Add to a trip…';
    return `
      <button type="button" class="popup-add-to-trip"
        data-tp-kind="${kind}" data-tp-id="${this.escapeHtml(String(id))}"
        aria-label="Add this stop to a trip">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">add_location</span>
        ${label}
      </button>`;
  }

  /** True when a POI's `lastVerified` is more than 90 days old. */
  private isStale(lastVerified: string): boolean {
    const t = Date.parse(lastVerified);
    if (Number.isNaN(t)) return false;
    return (Date.now() - t) > 90 * 86_400_000;
  }

  /** "4 mo ago" / "Last verified 5 mo ago" — concise stale label. */
  private verifiedAgoLabel(lastVerified: string): string {
    const t = Date.parse(lastVerified);
    if (Number.isNaN(t)) return 'verified date unknown';
    const days = Math.floor((Date.now() - t) / 86_400_000);
    if (days < 60) return `Verified ${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Verified ${months} mo ago`;
    const years = Math.floor(months / 12);
    return `Verified ${years} yr+ ago`;
  }

  private handlePopupChange(): void {
    if (!this.map || !this.cluster) return;
    if (this.popupId == null) {
      this.map.closePopup();
      return;
    }
    const marker = this.markers.get(this.popupId);
    if (!marker) return;
    const latlng = marker.getLatLng();
    // If the marker is currently inside a cluster, zoom to reveal it first.
    const reveal = (this.cluster as any).zoomToShowLayer?.bind(this.cluster);
    if (reveal) {
      reveal(marker, () => {
        this.map?.panTo(latlng, { animate: true, duration: 0.5 });
        marker.openPopup();
      });
    } else {
      this.map.panTo(latlng, { animate: true, duration: 0.5 });
      marker.openPopup();
    }
  }

  private buildPopupHtml(listing: IListing): string {
    const photo = listing.image;
    const title = this.escapeHtml(listing.title);
    const location = this.escapeHtml(listing.location);
    const cat = CATEGORY_META[listing.category];
    const catLabel = this.escapeHtml(cat.label);
    const chip = listing.kind === 'boondocking'
      ? `<span class="popup-instant" style="background:#295d42"><span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">landscape</span>${this.escapeHtml(listing.agency || 'Boondocking')}</span>`
      : (listing.instantBook
        ? `<span class="popup-instant"><span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bolt</span>Instant Book</span>`
        : '');
    const priceBlock = listing.kind === 'boondocking'
      ? `<span class="popup-per" style="color:#295d42">Public land</span>`
      : `<span class="popup-price">$${listing.price}</span><span class="popup-per">/ night</span>`;
    const ratingBlock = listing.kind === 'boondocking'
      ? `<span class="popup-location">${location}</span>`
      : `<span class="popup-rating">
           <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star</span>
           <span>${listing.rating.toFixed(1)}</span>
           <span class="popup-reviews">(${listing.reviewCount})</span>
         </span>
         <span class="popup-dot" aria-hidden="true">·</span>
         <span class="popup-location">${location}</span>`;
    const isFav = this.favoriteIds.has(listing.id);
    return `
      <div class="cnt-listing-popup-card">
        <a href="/listing?id=${listing.id}" class="popup-photo-link" aria-label="View ${title}">
          <img src="${photo}" alt="${title}" loading="lazy">
          <span class="popup-photo-fade"></span>
          <span class="popup-cat-pennant" style="--cat:${cat.color}" title="${catLabel}">
            <span class="material-symbols-outlined">${cat.icon}</span>
          </span>
          ${chip}
        </a>
        <button type="button" class="popup-favorite${isFav ? ' is-fav' : ''}" data-fav-id="${listing.id}"
          aria-label="${isFav ? 'Remove from favorites' : 'Save to favorites'}"
          aria-pressed="${isFav ? 'true' : 'false'}">
          <span class="material-symbols-outlined">favorite</span>
        </button>
        <div class="popup-body">
          <div class="popup-meta-row">
            ${ratingBlock}
          </div>
          <h3 class="popup-title">${title}</h3>
          <div class="popup-price-row">
            <div>
              ${priceBlock}
            </div>
            <a href="/listing?id=${listing.id}" class="popup-cta" aria-label="View ${title} details">
              View details
              <span class="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
          ${this.addToTripHtml('listing', listing.id)}
        </div>
      </div>`;
  }

  private escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }

  /** Draws (or removes) the active trip's polyline + start/finish markers as a
   *  dedicated layer ABOVE the listing + POI clusters. Re-runs on plan change. */
  private renderRouteOverlay(): void {
    if (!this.map) return;
    if (this.routeLayer) { this.routeLayer.remove(); this.routeLayer = null; }
    const stops = this.activePlan?.stops ?? [];
    if (stops.length === 0) return;
    const layer = L.layerGroup();
    if (stops.length >= 2) {
      const useRoute = this.routeGeometry && this.routeGeometry.length >= 2;
      const latlngs: L.LatLngExpression[] = useRoute
        ? this.routeGeometry!.map(c => [c[1], c[0]] as [number, number])
        : stops.map(s => [s.lat, s.lng] as [number, number]);
      L.polyline(latlngs, {
        color: '#e3530d',
        weight: useRoute ? 5 : 4,
        opacity: useRoute ? 0.9 : 0.7,
        dashArray: useRoute ? undefined : '8,8',
        interactive: false,
      }).addTo(layer);
    }
    const lastIdx = stops.length - 1;
    stops.forEach((s, i) => {
      const isStart = i === 0 && stops.length > 1;
      const isEnd = i === lastIdx && stops.length > 1;
      const color = isStart ? '#295d42' : isEnd ? '#9a3f0a' : '#e3530d';
      const icon = isStart ? 'flag' : isEnd ? 'sports_score' : '';
      const label = icon ? '' : String(i);
      const html = `
        <div style="position:relative;width:28px;height:36px;">
          <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);
                      width:24px;height:24px;border-radius:50%;background:${color};
                      border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.3);
                      display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">
            ${icon ? `<span style="font-family:'Material Symbols Outlined';font-size:13px;font-variation-settings:'FILL' 1;">${icon}</span>` : label}
          </div>
          <div style="position:absolute;left:50%;top:20px;transform:translateX(-50%);
                      width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
                      border-top:9px solid ${color};filter:drop-shadow(0 3px 3px rgba(0,0,0,0.18));"></div>
        </div>`;
      const m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ html, className: 'cnt-trip-overlay-marker', iconSize: [28, 36], iconAnchor: [14, 32] }),
        zIndexOffset: 1000,
        interactive: false,
      });
      m.addTo(layer);
    });
    layer.addTo(this.map);
    this.routeLayer = layer;
  }

  private emitBounds(): void {
    if (!this.map) return;
    const b = this.map.getBounds();
    this.boundsChange.emit({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }

  private renderMarkers(): void {
    if (!this.cluster) return;

    this.cluster.clearLayers();
    this.markers.clear();

    for (const listing of this.listings) {
      let icon: L.DivIcon;
      if (listing.kind === 'boondocking') {
        icon = L.divIcon({
          html: `<div class="cnt-boondocking-marker" data-id="${listing.id}">
                   <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">landscape</span>
                   <span>${this.agencyCode(listing.agency)}</span>
                 </div>`,
          className: 'cnt-price-marker-wrap',
          iconSize: [76, 30],
          iconAnchor: [38, 30],
        });
      } else {
        const color = CATEGORY_META[listing.category].color;
        icon = L.divIcon({
          html: `<div class="cnt-price-marker" data-id="${listing.id}" style="--cat:${color}">$${listing.price}</div>`,
          className: 'cnt-price-marker-wrap',
          iconSize: [60, 30],
          iconAnchor: [30, 30],
        });
      }

      const marker = L.marker([listing.lat, listing.lng], { icon });
      marker.bindPopup(this.buildPopupHtml(listing), {
        closeButton: false,
        maxWidth: 280,
        minWidth: 280,
        className: 'cnt-listing-popup',
        offset: [0, -10],
        autoPanPadding: [40, 40],
        keepInView: true,
      });
      marker.on('mouseover', () => this.markerHover.emit(listing.id));
      marker.on('mouseout', () => this.markerHover.emit(null));
      marker.on('click', () => this.markerClick.emit(listing.id));

      this.cluster.addLayer(marker);
      this.markers.set(listing.id, marker);
    }
  }

  private updateHoverHighlight(): void {
    for (const [id, marker] of this.markers) {
      const el: HTMLElement | null = (marker as any).getElement?.();
      if (!el) continue;
      const inner = el.querySelector('.cnt-price-marker, .cnt-boondocking-marker') as HTMLElement | null;
      if (inner) inner.classList.toggle('is-hovered', id === this.hoveredId);
    }
  }

  /** Short, map-legible code for a boondocking agency — fits inside the pin. */
  private agencyCode(agency: IBoondockingListing['agency'] | undefined): string {
    switch (agency) {
      case 'State Park': return 'STATE';
      case 'Army Corps': return 'COE';
      case 'County':     return 'CTY';
      case 'Other':      return 'PUB';
      case undefined:    return 'BOON';
      default:           return agency; // BLM / USFS / NPS
    }
  }

  locateMe(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation || !this.map) return;
    this.geoError = '';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (this.destroyed) return;
        this.map?.setView([pos.coords.latitude, pos.coords.longitude], 8, { animate: true });
      },
      (err) => {
        if (this.destroyed) return;
        this.geoError = err.code === err.PERMISSION_DENIED
          ? 'Location permission denied.'
          : 'Could not determine your location.';
        this.geoErrorTimer = setTimeout(() => {
          if (this.destroyed) return;
          this.geoError = '';
          this.geoErrorTimer = null;
        }, 4000);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.geoErrorTimer) {
      clearTimeout(this.geoErrorTimer);
      this.geoErrorTimer = null;
    }
    if (this.map) this.map.remove();
    this.markers.clear();
  }
}
