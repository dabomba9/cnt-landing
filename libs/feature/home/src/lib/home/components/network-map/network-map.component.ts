import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as L from 'leaflet';
import { TILE_URL, TILE_ATTRIBUTION } from '@cnt-workspace/ui';
import { ALL_LISTINGS } from '@cnt-workspace/data-access';

/**
 * Live OSM map preview used on the home "Meet the CurbNTurf Community"
 * section. Plots every catalog listing as a small color-coded circle marker
 * (private = trinidad, boondocking = jungle-green) so the section reads as
 * the actual /search canvas, not a static screenshot. Leaflet is dynamically
 * imported and the map only mounts when the section scrolls into view.
 */
@Component({
  selector: 'cnt-home-network-map',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #host class="nm-wrap">
      <div #mapEl class="nm-map"></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .nm-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: #f2efe9; }
    .nm-map  { position: absolute; inset: 0; }
    ::ng-deep .nm-map .leaflet-control-container,
    ::ng-deep .nm-map .leaflet-control-attribution { display: none; }
    ::ng-deep .nm-map { cursor: default; }
  `],
})
export class NetworkMapComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  @ViewChild('host', { static: true }) hostEl!: ElementRef<HTMLElement>;
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLElement>;

  private map: L.Map | null = null;
  private observer: IntersectionObserver | null = null;
  private mounted = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
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

    const pts: [number, number][] = [];
    for (const l of ALL_LISTINGS) {
      const color = l.kind === 'boondocking' ? '#3b6e3b' : '#e3530d';
      L.circleMarker([l.lat, l.lng], {
        radius: 5,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.95,
        interactive: false,
      }).addTo(this.map);
      pts.push([l.lat, l.lng]);
    }
    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts);
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    } else {
      this.map.setView([39.5, -98.35], 4);
    }
  }
}
