import type { Amenity, RvType, CancellationTier, IAddOn } from './mock-listings.data';

/**
 * Property descriptors — multi-select on the first wizard step. Mirrors the 22 tile
 * options from the host-onboarding wireframes.
 */
export type PropertyDescriptor =
  | 'backyard' | 'beach' | 'brewery' | 'canyon' | 'coastal' | 'curbside'
  | 'desert' | 'distillery' | 'driveway' | 'farmland' | 'forest' | 'hot-spring'
  | 'lake' | 'mountains' | 'orchard' | 'plain-prairie' | 'river-stream'
  | 'suburban' | 'urban' | 'waterfall' | 'wetlands' | 'winery';

/** What guests can see from the site. Multi-select. */
export type VisibilityKind = 'secluded' | 'home-visible' | 'neighbors' | 'other-guests';

/** Noise level — single-select radio. */
export type NoiseLevel = 'silence' | 'sounds-of-nature' | 'periodic' | 'constant';

/** Road conditions to reach the site. Multi-select. */
export type RoadCondition = 'paved' | 'smooth-gravel' | 'poor-gravel' | 'high-clearance' | 'off-road';

/** Check-in process. */
export type CheckInProcess = 'meet-greet' | 'self-checkin' | 'lockbox';

/** Whether bookings are auto-confirmed or require host approval. */
export type Bookability = 'instant' | 'request';

/** House-rule toggles. */
export interface IHouseRules {
  noSmoking: boolean;
  noParties: boolean;
  quietHours: boolean;
  noFireworks: boolean;
  noFirearms: boolean;
}

/**
 * Draft state for the host onboarding wizard. Persisted to `cnt-listing-draft`
 * in localStorage; transformed to `IPrivateListing` on publish.
 *
 * All step fields are optional so a host can save & exit at any point. The
 * service validates required fields at publish time.
 */
export interface IDraftListing {
  id: string;                          // draft UUID
  createdAt: string;                   // ISO
  updatedAt: string;                   // ISO
  /** Which phase the host is currently on (1, 2, or 3). */
  currentPhase: 1 | 2 | 3;
  /** Step index within the current phase (0-based). */
  currentStep: number;

  // ─────────────── Phase 1 — Tell us about your place ───────────────
  descriptors?: PropertyDescriptor[];
  address?: { street: string; city: string; state: string; zip: string };
  lat?: number;
  lng?: number;
  isLandowner?: boolean;
  access?: { pullThrough: boolean; backIn: boolean };
  maxRig?: { length: number; width: number; height: number };
  guestCapacity?: number;
  wheelchairAccessible?: boolean;
  amenities?: Amenity[];
  vehicleTypes?: RvType[];

  // ─────────────── Phase 2 — Make it stand out ───────────────
  /** Downscaled JPEG data URLs (~1200px max dimension, ~85% quality). */
  photos?: string[];
  title?: string;
  description?: string;
  visibility?: VisibilityKind[];
  noiseLevel?: NoiseLevel;
  roadConditions?: RoadCondition[];
  hasHazards?: boolean;
  hazardsNote?: string;
  profilePhoto?: string;

  // ─────────────── Phase 3 — Finish up & publish ───────────────
  checkInTime?: string;
  checkOutTime?: string;
  minNights?: number;
  maxNights?: number;
  minNoticeHours?: number;
  maxNoticeWeeks?: number;
  checkInProcess?: CheckInProcess;
  bookability?: Bookability;
  rules?: IHouseRules;
  customRules?: string;
  cancellationTier?: CancellationTier;
  nightlyPrice?: number;

  // ─────────────── Edit-only (post-publish) ───────────────
  /** Add-ons offered to guests. Editable only via /hosting/listings/:id/edit. */
  addOns?: IAddOn[];

  // ─────────────── Status ───────────────
  publishedAt?: string;
  publishedListingId?: number;
}

/** Display metadata for the property descriptors — label + material icon. */
export const PROPERTY_DESCRIPTOR_META: Record<PropertyDescriptor, { label: string; icon: string }> = {
  'backyard':      { label: 'Backyard',       icon: 'yard' },
  'beach':         { label: 'Beach',          icon: 'beach_access' },
  'brewery':       { label: 'Brewery',        icon: 'sports_bar' },
  'canyon':        { label: 'Canyon',         icon: 'landscape' },
  'coastal':       { label: 'Coastal',        icon: 'waves' },
  'curbside':      { label: 'Curbside',       icon: 'route' },
  'desert':        { label: 'Desert',         icon: 'wb_sunny' },
  'distillery':    { label: 'Distillery',     icon: 'science' },
  'driveway':      { label: 'Driveway',       icon: 'directions_car' },
  'farmland':      { label: 'Farmland',       icon: 'agriculture' },
  'forest':        { label: 'Forest',         icon: 'forest' },
  'hot-spring':    { label: 'Hot Spring',     icon: 'hot_tub' },
  'lake':          { label: 'Lake',           icon: 'water' },
  'mountains':     { label: 'Mountains',      icon: 'landscape' },
  'orchard':       { label: 'Orchard',        icon: 'park' },
  'plain-prairie': { label: 'Plain / Prairie',icon: 'grass' },
  'river-stream':  { label: 'River / Stream', icon: 'water_drop' },
  'suburban':      { label: 'Suburban',       icon: 'home' },
  'urban':         { label: 'Urban',          icon: 'location_city' },
  'waterfall':     { label: 'Waterfall',      icon: 'water' },
  'wetlands':      { label: 'Wetlands',       icon: 'grass' },
  'winery':        { label: 'Winery',         icon: 'wine_bar' },
};
