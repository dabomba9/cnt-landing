import { Component, AfterViewInit, OnDestroy, Input, ElementRef, ViewChild, PLATFORM_ID, ChangeDetectorRef, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { TILE_URL, TILE_ATTRIBUTION } from '@cnt-workspace/ui';

@Component({
  selector: 'cnt-mini-map',
  standalone: true,
  imports: [],
  template: `
    <div class="mini-map-wrap" [class.tiles-loaded]="tilesLoaded">
      <div class="mini-map-skeleton" aria-hidden="true"></div>
      <div #mapEl class="mini-map-el"></div>
      @if (initError) {
        <div class="mini-map-error">
          <span class="material-symbols-outlined text-2xl text-trinidad" style="font-variation-settings: 'FILL' 1;">location_on</span>
          <span class="text-xs text-muted-text font-body">Map preview unavailable</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .mini-map-wrap {
      position: relative;
      width: 100%;
      height: 240px;
      border-radius: 1rem;
      overflow: hidden;
      background: linear-gradient(135deg, #f3ede0, #d4d6c5);
    }
    .mini-map-el { position: absolute; inset: 0; opacity: 0; transition: opacity 280ms ease; }
    .mini-map-wrap.tiles-loaded .mini-map-el { opacity: 1; }
    .mini-map-wrap.tiles-loaded .mini-map-skeleton { opacity: 0; pointer-events: none; }
    .mini-map-skeleton {
      position: absolute; inset: 0;
      background: linear-gradient(110deg, rgba(34, 34, 34, 0.04) 30%, rgba(34, 34, 34, 0.08) 50%, rgba(34, 34, 34, 0.04) 70%);
      background-size: 200% 100%;
      animation: cnt-mini-map-shimmer 1.4s ease-in-out infinite;
      transition: opacity 280ms ease;
    }
    @keyframes cnt-mini-map-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mini-map-skeleton { animation: none; }
      .mini-map-el { transition: none; }
    }
    .mini-map-error {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      background: rgba(255,255,255,0.92);
      z-index: 5;
    }
    :host ::ng-deep .leaflet-control-attribution {
      font-size: 9px;
      background: rgba(255,255,255,0.7);
    }
  `],
})
export class MiniMapComponent implements AfterViewInit, OnDestroy {
  private platformId = inject<Object>(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Input() label: string = '';

  private map: L.Map | null = null;
  initError = '';
  tilesLoaded = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.lat == null || this.lng == null) {
      this.initError = 'No coordinates';
      return;
    }
    setTimeout(() => {
      try {
        this.initMap();
      } catch (err: any) {
        this.initError = err?.message || 'Map failed to load';
        this.cdr.markForCheck();
      }
    }, 0);
  }

  private initMap(): void {
    const center: [number, number] = [this.lat!, this.lng!];
    this.map = L.map(this.mapEl.nativeElement, {
      center,
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      attributionControl: true,
      preferCanvas: true,
    });

    const layer = L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 18,
    }).addTo(this.map);

    layer.on('load', () => {
      this.tilesLoaded = true;
      this.cdr.markForCheck();
    });
    // Failsafe — flip after 2.5s in case tile events don't fire
    setTimeout(() => {
      if (!this.tilesLoaded) {
        this.tilesLoaded = true;
        this.cdr.markForCheck();
      }
    }, 2500);

    // Approximate-radius circle (jungle-green, semi-transparent) — matches Airbnb's "approximate location" pattern
    L.circle(center, {
      radius: 1500,
      color: '#295d42',
      weight: 1,
      fillColor: '#295d42',
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(this.map);

    // Custom trinidad pin
    const pinHtml = `
      <div style="position: relative; width: 40px; height: 52px;">
        <div style="position: absolute; left: 50%; top: 0; transform: translateX(-50%);
                    width: 36px; height: 36px; border-radius: 50%; background: #e3530d;
                    border: 3px solid #fff; box-shadow: 0 6px 16px rgba(0,0,0,0.25);
                    display: flex; align-items: center; justify-content: center;">
          <span style="color: #fff; font-size: 18px; font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 1;">park</span>
        </div>
        <div style="position: absolute; left: 50%; top: 30px; transform: translateX(-50%);
                    width: 0; height: 0; border-left: 8px solid transparent;
                    border-right: 8px solid transparent; border-top: 14px solid #e3530d;
                    filter: drop-shadow(0 4px 4px rgba(0,0,0,0.15));"></div>
      </div>`;
    const icon = L.divIcon({
      html: pinHtml,
      className: 'cnt-mini-pin',
      iconSize: [40, 52],
      iconAnchor: [20, 48],
    });
    L.marker(center, { icon, interactive: false }).addTo(this.map);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
