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
    :host { display: block; width: 100%; }
    .map-wrap { position: relative; width: 100%; height: 70vh; min-height: 500px; background: #dde7e1; }
    .map-el { position: absolute; inset: 0; }
  `],
  template: `
    <div class="map-wrap">
      <div #mapEl class="map-el"></div>
      <button type="button" (click)="locateMe()"
        class="absolute top-4 right-4 z-[400] w-12 h-12 rounded-full bg-trinidad shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        title="Center on my location">
        <span class="material-symbols-outlined text-white">rv_hookup</span>
      </button>
      @if (geoError) {
        <div class="absolute top-20 right-4 z-[400] bg-white px-3 py-2 rounded-lg shadow text-xs font-body text-trinidad">{{ geoError }}</div>
      }
      @if (initError) {
        <div class="absolute inset-0 z-[500] flex items-center justify-center p-8 bg-white/95">
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
  @Output() markerHover = new EventEmitter<number | null>();
  @Output() markerClick = new EventEmitter<number>();

  private map: L.Map | null = null;
  private cluster: any = null;
  private markers = new Map<number, L.Marker>();
  geoError = '';
  initError = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Defer heavy leaflet init so navigation/render isn't blocked
    setTimeout(() => {
      try {
        this.initMap();
      } catch (err: any) {
        this.initError = err?.message || String(err);
        console.error('[search-map] init failed', err);
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

    L.control.zoom({ position: 'topleft' }).addTo(this.map);

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

    setTimeout(() => this.map?.invalidateSize(), 50);
    setTimeout(() => this.map?.invalidateSize(), 300);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listings'] && this.cluster) {
      this.renderMarkers();
    }
    if (changes['hoveredId'] && this.markers.size) {
      this.updateHoverHighlight();
    }
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
        this.map?.setView([pos.coords.latitude, pos.coords.longitude], 8, { animate: true });
      },
      (err) => {
        this.geoError = err.code === err.PERMISSION_DENIED
          ? 'Location permission denied.'
          : 'Could not determine your location.';
        setTimeout(() => (this.geoError = ''), 4000);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    this.markers.clear();
  }
}
