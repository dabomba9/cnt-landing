import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDraftListing, ILandownerContact, LandType, ToastService } from '@cnt-workspace/data-access';
import { TILE_URL, TILE_ATTRIBUTION } from '@cnt-workspace/ui';

// Center of US — sensible default when neither the host nor geolocation has placed a pin yet.
const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
const PINNED_ZOOM = 15;

const EMPTY_LANDOWNER: ILandownerContact = {
  firstName: '', lastName: '', phone: '', address: '', city: '', state: '', zip: '',
};

/**
 * Step 1.2 — address text + GPS pin (lat/lng) + landowner toggle.
 * "Use my current location" calls navigator.geolocation. No real geocoding
 * service in v1 — the user can paste coords or use their phone's GPS.
 */
@Component({
  selector: 'cnt-phase1-address',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Where's your property?
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">
        We'll only share the exact address with confirmed guests.
      </p>

      <!-- Address fields -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <label class="flex flex-col gap-1.5 sm:col-span-2">
          <span class="text-xs font-button uppercase tracking-[0.1em] font-bold text-muted-text">Street address</span>
          <input type="text" [(ngModel)]="street" name="street" (input)="emit()"
            class="bg-white border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-button uppercase tracking-[0.1em] font-bold text-muted-text">City</span>
          <input type="text" [(ngModel)]="city" name="city" (input)="emit()"
            class="bg-white border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-button uppercase tracking-[0.1em] font-bold text-muted-text">State</span>
          <input type="text" [(ngModel)]="state" name="state" maxlength="2" (input)="emit()"
            class="bg-white border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text uppercase focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
        <label class="flex flex-col gap-1.5 sm:col-span-2">
          <span class="text-xs font-button uppercase tracking-[0.1em] font-bold text-muted-text">ZIP code</span>
          <input type="text" [(ngModel)]="zip" name="zip" (input)="emit()"
            class="bg-white border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
      </div>

      <!-- GPS pin -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-8">
        <div class="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 class="font-headline font-bold text-dark-text text-base">Pin your site</h3>
            <p class="text-xs font-body text-muted-text mt-1">Tap below from on-site for the most accurate pin.</p>
          </div>
          <button type="button" (click)="useMyLocation()" [disabled]="locating"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-jungle-green text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-50 transition-opacity">
            <span class="material-symbols-outlined text-base">{{ locating ? 'progress_activity' : 'my_location' }}</span>
            {{ locating ? 'Locating…' : 'Use my current location' }}
          </button>
        </div>
        <!-- Interactive map: drag the marker to fine-tune the pin. -->
        <div #mapEl class="w-full h-[280px] rounded-xl overflow-hidden border border-dark-text/10 mb-2 bg-cream/40"></div>
        <p class="text-[0.65rem] font-body text-muted-text mb-4">Drag the orange pin to refine where guests will park.</p>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Latitude</span>
            <input type="number" step="0.000001" [(ngModel)]="lat" name="lat" (input)="onLatLngInput()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Longitude</span>
            <input type="number" step="0.000001" [(ngModel)]="lng" name="lng" (input)="onLatLngInput()"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
        </div>
      </div>

      <!-- Landowner -->
      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">Are you the landowner?</h3>
        <p class="text-xs font-body text-muted-text mb-4">This isn't shown to guests; it's just for verification if needed.</p>
        <div class="flex gap-2">
          <button type="button" (click)="setLandowner(true)"
            [ngClass]="isLandowner === true ? 'bg-trinidad text-white border-trinidad' : 'bg-white text-dark-text border-dark-text/15'"
            class="px-5 py-2 rounded-full border text-xs uppercase tracking-[0.12em] font-button font-bold transition-colors">
            Yes
          </button>
          <button type="button" (click)="setLandowner(false)"
            [ngClass]="isLandowner === false ? 'bg-trinidad text-white border-trinidad' : 'bg-white text-dark-text border-dark-text/15'"
            class="px-5 py-2 rounded-full border text-xs uppercase tracking-[0.12em] font-button font-bold transition-colors">
            No
          </button>
        </div>

        <!-- Non-landowner sub-flow -->
        @if (isLandowner === false) {
          <div class="mt-6 pt-6 border-t border-dark-text/10 space-y-6">

            <!-- Land type -->
            <div>
              <h4 class="font-headline font-bold text-dark-text text-sm mb-3">What type of land is it?</h4>
              <div class="flex gap-2">
                <button type="button" (click)="setLandType('private')"
                  [ngClass]="landType === 'private' ? 'bg-trinidad text-white border-trinidad' : 'bg-white text-dark-text border-dark-text/15'"
                  class="px-5 py-2 rounded-full border text-xs uppercase tracking-[0.12em] font-button font-bold transition-colors">
                  Private
                </button>
                <button type="button" (click)="setLandType('public')"
                  [ngClass]="landType === 'public' ? 'bg-trinidad text-white border-trinidad' : 'bg-white text-dark-text border-dark-text/15'"
                  class="px-5 py-2 rounded-full border text-xs uppercase tracking-[0.12em] font-button font-bold transition-colors">
                  Public
                </button>
              </div>
            </div>

            <!-- Landowner contact -->
            <div>
              <h4 class="font-headline font-bold text-dark-text text-sm mb-1">Who is the landowner?</h4>
              <p class="text-xs font-body text-muted-text mb-3">For verification only — never shown to guests.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="flex flex-col gap-1.5">
                  <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">First name</span>
                  <input type="text" [(ngModel)]="landowner.firstName" name="loFirstName" (input)="emit()"
                    class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Last name</span>
                  <input type="text" [(ngModel)]="landowner.lastName" name="loLastName" (input)="emit()"
                    class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                </label>
                <label class="flex flex-col gap-1.5 sm:col-span-2">
                  <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Phone</span>
                  <input type="tel" [(ngModel)]="landowner.phone" name="loPhone" (input)="emit()"
                    class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                </label>
                <label class="flex flex-col gap-1.5 sm:col-span-2">
                  <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">Address <span class="normal-case font-body font-normal opacity-70">(optional)</span></span>
                  <input type="text" [(ngModel)]="landowner.address" name="loAddress" (input)="emit()"
                    class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">City <span class="normal-case font-body font-normal opacity-70">(optional)</span></span>
                  <input type="text" [(ngModel)]="landowner.city" name="loCity" (input)="emit()"
                    class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <label class="flex flex-col gap-1.5">
                    <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">State</span>
                    <input type="text" [(ngModel)]="landowner.state" name="loState" maxlength="2" (input)="emit()"
                      class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text uppercase focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                  </label>
                  <label class="flex flex-col gap-1.5">
                    <span class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text">ZIP</span>
                    <input type="text" [(ngModel)]="landowner.zip" name="loZip" (input)="emit()"
                      class="bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
                  </label>
                </div>
              </div>
            </div>

            <!-- Represents landowner -->
            <div>
              <h4 class="font-headline font-bold text-dark-text text-sm mb-3">Do you represent the landowner?</h4>
              <div class="flex gap-2">
                <button type="button" (click)="setRepresents(true)"
                  [ngClass]="representsLandowner === true ? 'bg-trinidad text-white border-trinidad' : 'bg-white text-dark-text border-dark-text/15'"
                  class="px-5 py-2 rounded-full border text-xs uppercase tracking-[0.12em] font-button font-bold transition-colors">
                  Yes
                </button>
                <button type="button" (click)="setRepresents(false)"
                  [ngClass]="representsLandowner === false ? 'bg-trinidad text-white border-trinidad' : 'bg-white text-dark-text border-dark-text/15'"
                  class="px-5 py-2 rounded-full border text-xs uppercase tracking-[0.12em] font-button font-bold transition-colors">
                  No
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class Phase1AddressComponent implements AfterViewInit, OnDestroy {
  private toasts = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('mapEl', { static: false }) mapEl?: ElementRef<HTMLDivElement>;

  @Input() set draft(value: IDraftListing | null) {
    this.street = value?.address?.street ?? '';
    this.city = value?.address?.city ?? '';
    this.state = value?.address?.state ?? '';
    this.zip = value?.address?.zip ?? '';
    this.lat = value?.lat;
    this.lng = value?.lng;
    this.isLandowner = value?.isLandowner;
    this.landType = value?.landType;
    this.landowner = { ...EMPTY_LANDOWNER, ...(value?.landowner ?? {}) };
    this.representsLandowner = value?.representsLandowner;
    // If the map is already up (e.g. edit-mode draft loaded), sync the pin.
    this.syncMapToCoords();
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  street = '';
  city = '';
  state = '';
  zip = '';
  lat?: number;
  lng?: number;
  isLandowner?: boolean;
  landType?: LandType;
  landowner: ILandownerContact = { ...EMPTY_LANDOWNER };
  representsLandowner?: boolean;
  locating = false;

  // Loaded lazily so SSR + non-browser environments don't choke on Leaflet imports.
  private map: import('leaflet').Map | null = null;
  private marker: import('leaflet').Marker | null = null;

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.mapEl) return;
    const L = await import('leaflet');
    const center: [number, number] =
      typeof this.lat === 'number' && typeof this.lng === 'number'
        ? [this.lat, this.lng]
        : DEFAULT_CENTER;
    const zoom = typeof this.lat === 'number' ? PINNED_ZOOM : DEFAULT_ZOOM;
    this.map = L.map(this.mapEl.nativeElement, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      preferCanvas: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(this.map);

    if (typeof this.lat === 'number' && typeof this.lng === 'number') {
      this.placeMarker(L, [this.lat, this.lng]);
    }

    // Click on the map drops or moves the pin — quicker than dragging from a default spot.
    this.map.on('click', e => {
      const { lat, lng } = e.latlng;
      this.lat = +lat.toFixed(6);
      this.lng = +lng.toFixed(6);
      this.placeMarker(L, [this.lat, this.lng]);
      this.emit();
    });
  }

  private placeMarker(L: typeof import('leaflet'), center: [number, number]): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng(center);
      return;
    }
    const pinHtml = `
      <div style="position: relative; width: 36px; height: 48px;">
        <div style="position: absolute; left: 50%; top: 0; transform: translateX(-50%);
                    width: 32px; height: 32px; border-radius: 50%; background: #e3530d;
                    border: 3px solid #fff; box-shadow: 0 6px 16px rgba(0,0,0,0.25);
                    display: flex; align-items: center; justify-content: center;">
          <span style="color: #fff; font-size: 16px; font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 1;">park</span>
        </div>
        <div style="position: absolute; left: 50%; top: 27px; transform: translateX(-50%);
                    width: 0; height: 0; border-left: 7px solid transparent;
                    border-right: 7px solid transparent; border-top: 13px solid #e3530d;
                    filter: drop-shadow(0 4px 4px rgba(0,0,0,0.15));"></div>
      </div>`;
    const icon = L.divIcon({ html: pinHtml, className: 'cnt-addr-pin', iconSize: [36, 48], iconAnchor: [18, 44] });
    this.marker = L.marker(center, { icon, draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => {
      const ll = this.marker!.getLatLng();
      this.lat = +ll.lat.toFixed(6);
      this.lng = +ll.lng.toFixed(6);
      this.emit();
    });
  }

  /** Re-center the map + reposition the marker when lat/lng change externally. */
  private async syncMapToCoords(): Promise<void> {
    if (!this.map) return;
    if (typeof this.lat !== 'number' || typeof this.lng !== 'number') return;
    const center: [number, number] = [this.lat, this.lng];
    this.map.setView(center, Math.max(this.map.getZoom(), PINNED_ZOOM));
    const L = await import('leaflet');
    this.placeMarker(L, center);
  }

  /** Manual lat/lng input — emit + sync the map. */
  onLatLngInput(): void {
    this.emit();
    this.syncMapToCoords();
  }

  ngOnDestroy(): void {
    if (this.map) { this.map.remove(); this.map = null; this.marker = null; }
  }

  setLandowner(value: boolean): void {
    this.isLandowner = value;
    this.emit();
  }

  setLandType(value: LandType): void {
    this.landType = value;
    this.emit();
  }

  setRepresents(value: boolean): void {
    this.representsLandowner = value;
    this.emit();
  }

  useMyLocation(): void {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      this.toasts.error('Geolocation not available in this browser.');
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.lat = +pos.coords.latitude.toFixed(6);
        this.lng = +pos.coords.longitude.toFixed(6);
        this.locating = false;
        this.toasts.success('Pinned your current location.');
        this.emit();
        this.syncMapToCoords();
      },
      err => {
        this.locating = false;
        this.toasts.error(err.code === err.PERMISSION_DENIED
          ? 'Location permission denied.'
          : 'Could not determine your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  emit(): void {
    this.patch.emit({
      address: { street: this.street, city: this.city, state: this.state, zip: this.zip },
      lat: typeof this.lat === 'number' ? this.lat : undefined,
      lng: typeof this.lng === 'number' ? this.lng : undefined,
      isLandowner: this.isLandowner,
      landType: this.landType,
      landowner: { ...this.landowner },
      representsLandowner: this.representsLandowner,
    });
  }
}
