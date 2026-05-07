import {
  Component, AfterViewInit, OnDestroy, OnChanges, SimpleChanges,
  Input, Output, EventEmitter, ElementRef, ViewChild, Inject, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { Listing, CATEGORY_META } from './mock-listings.data';
import {
  TILE_URL, TILE_ATTRIBUTION, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM,
} from './map-config';

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
  @Input() listings: Listing[] = [];
  @Input() hoveredId: number | null = null;
  @Input() popupId: number | null = null;
  @Input() favoriteIds: Set<number> = new Set<number>();
  @Input() viewMode: 'split' | 'map-only' = 'split';
  @Output() markerHover = new EventEmitter<number | null>();
  @Output() markerClick = new EventEmitter<number>();
  @Output() popupClosed = new EventEmitter<void>();
  @Output() favoriteToggle = new EventEmitter<{ id: number; next: boolean }>();
  @Output() viewModeChange = new EventEmitter<'split' | 'map-only'>();
  /** Fires whenever the map's visible bounds change (pan / zoom / initial fit). */
  @Output() boundsChange = new EventEmitter<{ north: number; south: number; east: number; west: number }>();

  private map: L.Map | null = null;
  private cluster: any = null;
  private markers = new Map<number, L.Marker>();
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

    // Emit bounds whenever the map idles after pan/zoom (debounced by Leaflet's moveend).
    this.map.on('moveend', () => this.emitBounds());
    // Notify parent when the user dismisses a popup so it can clear selectedId.
    this.map.on('popupclose', () => this.popupClosed.emit());

    // Event delegation for the heart button inside popups (popup HTML lives in the map container).
    this.map.getContainer().addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target.closest?.('.popup-favorite') as HTMLButtonElement | null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
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

  private buildPopupHtml(listing: Listing): string {
    const photo = listing.image;
    const title = this.escapeHtml(listing.title);
    const location = this.escapeHtml(listing.location);
    const cat = CATEGORY_META[listing.category];
    const catLabel = this.escapeHtml(cat.label);
    const instantChip = listing.instantBook
      ? `<span class="popup-instant"><span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bolt</span>Instant Book</span>`
      : '';
    const isFav = this.favoriteIds.has(listing.id);
    return `
      <div class="cnt-listing-popup-card">
        <a href="/listing?id=${listing.id}" class="popup-photo-link" aria-label="View ${title}">
          <img src="${photo}" alt="${title}" loading="lazy">
          <span class="popup-photo-fade"></span>
          <span class="popup-cat-pennant" style="--cat:${cat.color}" title="${catLabel}">
            <span class="material-symbols-outlined">${cat.icon}</span>
          </span>
          ${instantChip}
        </a>
        <button type="button" class="popup-favorite${isFav ? ' is-fav' : ''}" data-fav-id="${listing.id}"
          aria-label="${isFav ? 'Remove from favorites' : 'Save to favorites'}"
          aria-pressed="${isFav ? 'true' : 'false'}">
          <span class="material-symbols-outlined">favorite</span>
        </button>
        <div class="popup-body">
          <div class="popup-meta-row">
            <span class="popup-rating">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star</span>
              <span>${listing.rating.toFixed(1)}</span>
              <span class="popup-reviews">(${listing.reviewCount})</span>
            </span>
            <span class="popup-dot" aria-hidden="true">·</span>
            <span class="popup-location">${location}</span>
          </div>
          <h3 class="popup-title">${title}</h3>
          <div class="popup-price-row">
            <div>
              <span class="popup-price">$${listing.price}</span>
              <span class="popup-per">/ night</span>
            </div>
            <a href="/listing?id=${listing.id}" class="popup-cta" aria-label="View ${title} details">
              View details
              <span class="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>`;
  }

  private escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
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
      const color = CATEGORY_META[listing.category].color;
      const icon = L.divIcon({
        html: `<div class="cnt-price-marker" data-id="${listing.id}" style="--cat:${color}">$${listing.price}</div>`,
        className: 'cnt-price-marker-wrap',
        iconSize: [60, 30],
        iconAnchor: [30, 30],
      });

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
      const inner = el.querySelector('.cnt-price-marker') as HTMLElement | null;
      if (inner) inner.classList.toggle('is-hovered', id === this.hoveredId);
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
