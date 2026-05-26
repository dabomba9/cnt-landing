import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject,
  Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';
import { TILE_URL, TILE_ATTRIBUTION } from '@cnt-workspace/ui';
import { ITripPlan, TripStopKind } from '@cnt-workspace/data-access';

/** Color + icon for each stop kind — keeps markers self-describing on the map. */
const KIND_STYLE: Record<TripStopKind | 'start' | 'end', { color: string; icon: string }> = {
  start:        { color: '#295d42', icon: 'flag' },
  end:          { color: '#9a3f0a', icon: 'sports_score' },
  private:      { color: '#e3530d', icon: 'rv_hookup' },
  boondocking:  { color: '#3b6e3b', icon: 'landscape' },
  poi:          { color: '#b3760e', icon: 'pin_drop' },
  custom:       { color: '#6b6b6b', icon: 'push_pin' },
};

@Component({
  selector: 'cnt-trip-planner-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tp-map-wrap" [class.tp-map--dropping]="pinDropMode">
      <div #mapEl class="tp-map-el"></div>
      @if (pinDropMode) {
        <div class="tp-map-hint">Click the map to drop a pin.</div>
      }
      @if (initError) {
        <div class="tp-map-error">
          <span class="material-symbols-outlined text-2xl text-trinidad" style="font-variation-settings: 'FILL' 1;">map</span>
          <span class="text-xs text-muted-text font-body">Map unavailable</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .tp-map-wrap { position: relative; width: 100%; height: 100%; border-radius: 1rem; overflow: hidden; background: #e6e8d8; }
    .tp-map-el { position: absolute; inset: 0; }
    .tp-map--dropping .tp-map-el { cursor: crosshair; }
    .tp-map-hint {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      padding: 6px 14px; border-radius: 999px;
      background: #222; color: #fff;
      font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700;
      z-index: 500; pointer-events: none;
    }
    .tp-map-error {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      background: rgba(255,255,255,0.95);
    }
    :host ::ng-deep .leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,0.7); }
    :host ::ng-deep .tp-marker { background: transparent; border: none; }
  `],
})
export class TripPlannerMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  @Input() plan: ITripPlan | null = null;
  /** When true, clicking the map emits pinDropped instead of normal behavior. */
  @Input() pinDropMode = false;

  @Output() pinDropped = new EventEmitter<{ lat: number; lng: number }>();
  @Output() markerClicked = new EventEmitter<string>();

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private polyline: L.Polyline | null = null;
  initError = '';

  constructor(@Inject(PLATFORM_ID) private platformId: object, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      try { this.initMap(); this.render(); } catch (err: unknown) {
        this.initError = err instanceof Error ? err.message : 'Map failed';
        this.cdr.markForCheck();
      }
    }, 0);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.map) return;
    this.render();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private initMap(): void {
    // Center on the continental US until a plan with points is provided.
    this.map = L.map(this.mapEl.nativeElement, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: true,
      preferCanvas: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.pinDropMode) return;
      this.pinDropped.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  /** Wipe + redraw all markers + the polyline. Called on plan changes.
   *  First stop = Start (green flag), last = Finish (trinidad), middle = numbered. */
  private render(): void {
    if (!this.map) return;
    for (const m of this.markers) m.remove();
    this.markers = [];
    this.polyline?.remove();
    this.polyline = null;
    if (!this.plan) return;

    const stops = this.plan.stops;
    const lastIdx = stops.length - 1;

    stops.forEach((stop, i) => {
      let kind: keyof typeof KIND_STYLE;
      let index: number | null;
      if (i === 0 && stops.length > 1)            { kind = 'start'; index = null; }
      else if (i === lastIdx && stops.length > 1) { kind = 'end';   index = null; }
      else                                         { kind = stop.kind; index = stops.length > 1 ? i : null; }
      const m = L.marker([stop.lat, stop.lng], { icon: this.makeIcon(kind, index), title: stop.name });
      m.on('click', () => this.markerClicked.emit(stop.id));
      m.addTo(this.map!);
      this.markers.push(m);
    });

    if (stops.length >= 2) {
      const latlngs: L.LatLngExpression[] = stops.map(s => [s.lat, s.lng] as [number, number]);
      this.polyline = L.polyline(latlngs, { color: '#e3530d', weight: 4, opacity: 0.85, dashArray: '8,8' }).addTo(this.map);
      this.map.fitBounds(this.polyline.getBounds(), { padding: [40, 40], maxZoom: 11 });
    } else if (stops.length === 1) {
      this.map.setView([stops[0].lat, stops[0].lng], 9);
    }
  }

  private makeIcon(kind: keyof typeof KIND_STYLE, index: number | null): L.DivIcon {
    const style = KIND_STYLE[kind];
    const badge = index != null
      ? `<div style="position:absolute;top:-6px;right:-6px;background:#222;color:#fff;font-size:10px;font-weight:700;
                     width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                     border:2px solid #fff;">${index}</div>`
      : '';
    const html = `
      <div style="position:relative;width:36px;height:48px;">
        <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);
                    width:32px;height:32px;border-radius:50%;background:${style.color};
                    border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.25);
                    display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-family:'Material Symbols Outlined';font-size:16px;font-variation-settings:'FILL' 1;">${style.icon}</span>
        </div>
        <div style="position:absolute;left:50%;top:26px;transform:translateX(-50%);
                    width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
                    border-top:12px solid ${style.color};
                    filter:drop-shadow(0 3px 3px rgba(0,0,0,0.15));"></div>
        ${badge}
      </div>`;
    return L.divIcon({ html, className: 'tp-marker', iconSize: [36, 48], iconAnchor: [18, 44] });
  }
}
