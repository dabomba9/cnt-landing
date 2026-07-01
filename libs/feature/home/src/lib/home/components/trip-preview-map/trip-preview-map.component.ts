import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, OnDestroy,
  PLATFORM_ID, ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as L from 'leaflet';
import { TILE_URL, TILE_ATTRIBUTION } from '@cnt-workspace/ui';

/** Sample trip the preview renders — a Northern California road-trip stub:
 *  Napa Valley → Yosemite Valley → Mono Lake. Coordinates chosen to fit nicely
 *  inside a square map at a fitBounds + ~40px padding. */
const SAMPLE_STOPS: { name: string; lat: number; lng: number; role: 'start' | 'mid' | 'end' }[] = [
  { name: 'Napa Valley',     lat: 38.5025, lng: -122.265, role: 'start' },
  { name: 'Yosemite Valley', lat: 37.7459, lng: -119.589, role: 'mid'   },
  { name: 'Mono Lake',       lat: 38.0086, lng: -118.965, role: 'end'   },
];

const MARKER_STYLE = {
  start: { color: '#295d42', icon: 'flag' },
  mid:   { color: '#e3530d', icon: 'place', index: 2 },
  end:   { color: '#9a3f0a', icon: 'sports_score' },
};

/**
 * A live, non-interactive Leaflet map used on the home page promo so the
 * preview matches the real /search and /trip-planner aesthetics 1:1 — same
 * OSM tiles, same Trinidad polyline, same marker treatment as
 * trip-planner-map.component. Leaflet is dynamically imported the first
 * time the section scrolls into view, keeping it out of the home page's
 * initial bundle.
 */
@Component({
  selector: 'cnt-home-trip-preview',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #host class="tp-preview-wrap">
      <div #mapEl class="tp-preview-map"></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .tp-preview-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 1.75rem; background: #f2efe9; }
    .tp-preview-map  { position: absolute; inset: 0; }
    /* Hide map controls & make the canvas non-interactive — pure preview. */
    ::ng-deep .tp-preview-map .leaflet-control-container,
    ::ng-deep .tp-preview-map .leaflet-control-attribution { display: none; }
    ::ng-deep .tp-preview-map { cursor: default; }
    ::ng-deep .tp-marker-preview { pointer-events: none; }
  `],
})
export class TripPreviewMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostEl!: ElementRef<HTMLElement>;
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLElement>;

  private map: L.Map | null = null;
  private observer: IntersectionObserver | null = null;
  private mounted = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    // Defer Leaflet load until the section scrolls in — keeps home initial
    // paint fast for users who never reach the promo.
    this.observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && !this.mounted) {
        this.mounted = true;
        this.observer?.disconnect();
        this.mount();
      }
    }, { rootMargin: '200px' });
    this.observer.observe(this.hostEl.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.map?.remove();
  }

  private async mount(): Promise<void> {
    const L = await import('leaflet');

    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      preferCanvas: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(this.map);

    // Markers
    SAMPLE_STOPS.forEach(s => {
      const style = MARKER_STYLE[s.role];
      L.marker([s.lat, s.lng], {
        icon: this.makeIcon(style.color, style.icon, 'index' in style ? style.index : null, L),
        interactive: false,
      }).addTo(this.map!);
    });

    // Polyline — same trinidad color and weight as the editor's straight-line
    // fallback so the preview matches what users see before a route loads.
    const latlngs = SAMPLE_STOPS.map(s => [s.lat, s.lng]) as [number, number][];
    const line = L.polyline(latlngs, { color: '#e3530d', weight: 5, opacity: 0.9 }).addTo(this.map);
    this.map.fitBounds(line.getBounds(), { padding: [36, 36], maxZoom: 8 });
  }

  private makeIcon(color: string, icon: string, index: number | null, LRef: typeof L): L.DivIcon {
    const badge = index != null
      ? `<div style="position:absolute;top:-6px;right:-6px;background:#222;color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;">${index}</div>`
      : '';
    const html = `
      <div style="position:relative;width:36px;height:48px;">
        <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:32px;height:32px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-family:'Material Symbols Outlined';font-size:16px;font-variation-settings:'FILL' 1;">${icon}</span>
        </div>
        <div style="position:absolute;left:50%;top:26px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid ${color};filter:drop-shadow(0 3px 3px rgba(0,0,0,0.15));"></div>
        ${badge}
      </div>`;
    return LRef.divIcon({ html, className: 'tp-marker-preview', iconSize: [36, 48], iconAnchor: [18, 44] });
  }
}
