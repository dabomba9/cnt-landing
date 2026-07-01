import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { TILE_URL, TILE_ATTRIBUTION } from '@cnt-workspace/ui';
import { IListing, CATEGORY_META } from '@cnt-workspace/data-access';

/**
 * Interactive map for the /explore/:state page. Drops a category-colored
 * pin for every listing in the state, auto-fits the viewport to all
 * pins, and routes to /listing?id=N on click.
 */
@Component({
  selector: 'cnt-explore-map',
  standalone: true,
  imports: [],
  template: `
    <div class="explore-map-wrap" [class.tiles-loaded]="tilesLoaded">
      <div class="explore-map-skeleton" aria-hidden="true"></div>
      <div #mapEl class="explore-map-el"></div>
      @if (initError) {
        <div class="explore-map-error">
          <span class="material-symbols-outlined text-2xl text-trinidad" style="font-variation-settings: 'FILL' 1;">location_off</span>
          <span class="text-xs text-muted-text font-body">Map preview unavailable</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .explore-map-wrap {
      position: relative; width: 100%; height: 100%;
      background: linear-gradient(135deg, #f3ede0, #d4d6c5);
    }
    .explore-map-el { position: absolute; inset: 0; opacity: 0; transition: opacity 280ms ease; }
    .explore-map-wrap.tiles-loaded .explore-map-el { opacity: 1; }
    .explore-map-wrap.tiles-loaded .explore-map-skeleton { opacity: 0; pointer-events: none; }
    .explore-map-skeleton {
      position: absolute; inset: 0;
      background: linear-gradient(110deg, rgba(34, 34, 34, 0.04) 30%, rgba(34, 34, 34, 0.08) 50%, rgba(34, 34, 34, 0.04) 70%);
      background-size: 200% 100%;
      animation: cnt-explore-map-shimmer 1.4s ease-in-out infinite;
      transition: opacity 280ms ease;
    }
    @keyframes cnt-explore-map-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .explore-map-skeleton { animation: none; }
      .explore-map-el { transition: none; }
    }
    .explore-map-error {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      background: rgba(255,255,255,0.92);
      z-index: 5;
    }
    :host ::ng-deep .leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,0.7); }
  `],
})
export class ExploreMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @Input() listings: IListing[] = [];

  initError = '';
  tilesLoaded = false;
  private map: L.Map | null = null;
  private pins: L.Marker[] = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      try { this.initMap(); }
      catch (err) { this.initError = (err as Error)?.message || 'Map failed to load'; this.cdr.markForCheck(); }
    }, 0);
  }

  ngOnChanges(): void {
    if (this.map) this.refreshPins();
  }

  ngOnDestroy(): void {
    if (this.map) { this.map.remove(); this.map = null; }
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: false,
      preferCanvas: true,
    });
    const layer = L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(this.map);
    layer.on('load', () => { this.tilesLoaded = true; this.cdr.markForCheck(); });
    setTimeout(() => { if (!this.tilesLoaded) { this.tilesLoaded = true; this.cdr.markForCheck(); } }, 2500);

    this.refreshPins();
  }

  private refreshPins(): void {
    if (!this.map) return;
    // Drop old pins
    for (const m of this.pins) m.remove();
    this.pins = [];

    const points: L.LatLngTuple[] = [];
    for (const l of this.listings) {
      if (typeof l.lat !== 'number' || typeof l.lng !== 'number') continue;
      const color = CATEGORY_META[l.category]?.color || '#e3530d';
      const html = `
        <div style="position: relative; width: 32px; height: 42px;">
          <div style="position: absolute; left: 50%; top: 0; transform: translateX(-50%);
                      width: 28px; height: 28px; border-radius: 50%; background: ${color};
                      border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.25);"></div>
          <div style="position: absolute; left: 50%; top: 22px; transform: translateX(-50%);
                      width: 0; height: 0; border-left: 6px solid transparent;
                      border-right: 6px solid transparent; border-top: 12px solid ${color};
                      filter: drop-shadow(0 3px 3px rgba(0,0,0,0.15));"></div>
        </div>`;
      const icon = L.divIcon({ html, className: 'cnt-explore-pin', iconSize: [32, 42], iconAnchor: [16, 38] });
      const marker = L.marker([l.lat, l.lng], { icon, title: l.title }).addTo(this.map);
      marker.on('click', () => this.router.navigate(['/listing'], { queryParams: { id: l.id } }));
      this.pins.push(marker);
      points.push([l.lat, l.lng]);
    }

    if (points.length === 0) {
      // Fallback to a US-wide view if the state somehow has no geocoded listings
      this.map.setView([39.5, -98.35], 4);
    } else if (points.length === 1) {
      this.map.setView(points[0], 10);
    } else {
      this.map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 9 });
    }
  }
}
