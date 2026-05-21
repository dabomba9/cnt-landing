import type { Amenity, RvType, CancellationTier, IAddOn, Category } from './mock-listings.data';

// ─────────────────────── Amenity grouping + presets ───────────────────────

/** Five visual groupings for the wizard amenities step. */
export type AmenityGroup = 'site-access' | 'power-water' | 'connectivity' | 'comfort' | 'outdoor';

export const AMENITY_GROUP_LABELS: Record<AmenityGroup, string> = {
  'site-access': 'Site access',
  'power-water': 'Power & water',
  'connectivity': 'Connectivity',
  'comfort':      'Comfort',
  'outdoor':      'Outdoor life',
};

export const AMENITY_GROUPS_ORDER: AmenityGroup[] = [
  'site-access', 'power-water', 'connectivity', 'comfort', 'outdoor',
];

/** Which group each amenity belongs to — drives the wizard step layout. */
export const AMENITY_GROUP_FOR: Record<Amenity, AmenityGroup> = {
  // Site access
  'back-in':           'site-access',
  'pull-through':      'site-access',
  'vehicles-allowed':  'site-access',
  'tents-allowed':     'site-access',
  'wheelchair':        'site-access',
  'lockable-storage':  'site-access',
  // Power & water
  'electricity':       'power-water',
  'potable-water':     'power-water',
  'sewage':            'power-water',
  'dump-station':      'power-water',
  'water-fill':        'power-water',
  'ev-charging':       'power-water',
  'generator-ok':      'power-water',
  // Connectivity
  'cell-coverage':     'connectivity',
  'wifi':              'connectivity',
  // Comfort
  'picnic-table':      'comfort',
  'toilet':            'comfort',
  'shower':            'comfort',
  'laundry':           'comfort',
  'hot-tub':           'comfort',
  'outdoor-lighting':  'comfort',
  'sunshade':          'comfort',
  // Outdoor life
  'campfires':         'outdoor',
  'fire-ring':         'outdoor',
  'outdoor-grill':     'outdoor',
  'pets':              'outdoor',
  'trash':             'outdoor',
  'recycle':           'outdoor',
};

/** Quick-pick presets — additive bundles of amenities for fast setup. */
export interface IAmenityPreset {
  key: string;
  label: string;
  description: string;
  icon: string;
  amenities: Amenity[];
}

export const AMENITY_PRESETS: IAmenityPreset[] = [
  {
    key: 'full-hookups-rv',
    label: 'Full hookups RV park',
    description: 'Electric, water, sewage, wifi, trash',
    icon: 'rv_hookup',
    amenities: ['electricity', 'potable-water', 'sewage', 'dump-station', 'wifi', 'trash', 'vehicles-allowed', 'generator-ok'],
  },
  {
    key: 'backcountry-minimal',
    label: 'Backcountry minimal',
    description: 'Fire, trash, recycle — pack-it-in vibes',
    icon: 'park',
    amenities: ['campfires', 'fire-ring', 'trash', 'recycle'],
  },
  {
    key: 'standard-farm-stay',
    label: 'Standard farm stay',
    description: 'Water, toilet, pets, picnic table',
    icon: 'agriculture',
    amenities: ['potable-water', 'toilet', 'pets', 'picnic-table', 'trash'],
  },
];

/** Max custom amenities a host can add — keeps the chip list scannable. */
export const MAX_CUSTOM_AMENITIES = 8;

/** Power amperages the host can claim when electricity is selected. */
export type ElectricityAmps = '20A' | '30A' | '50A';

/** Wifi speed buckets the host can claim when wifi is selected. */
export type WifiSpeed = 'slow' | 'decent' | 'fast';

/** Pet policy when pets are selected. */
export type PetsPolicy = 'free' | 'fee' | 'size-limit';

/**
 * Tent allowance on the Vehicles step.
 *   'allowed'    — tents OK alongside the host's accepted RV types.
 *   'tents-only' — tents only, no RVs accepted.
 *   undefined    — tents not accepted (default).
 */
export type TentMode = 'allowed' | 'tents-only';

/**
 * Primary property type — single-select on the first wizard step. Drives the
 * listing-descriptor phrasing ("Brewery stay in Minneapolis, MN") and maps
 * into the platform-wide `Category` bucket for the visual pennant + amenities.
 */
export type PrimaryPropertyType =
  | 'winery' | 'brewery' | 'distillery'
  | 'farm' | 'specialty-farm' | 'orchard' | 'ranch'
  | 'golf-course' | 'church' | 'rv-park'
  | 'woodlands' | 'private-home' | 'custom';

/** Max custom secondary descriptors the host can add — keeps the chip row from sprawling. */
export const MAX_CUSTOM_DESCRIPTORS = 5;

/** Visual grouping for the wizard's primary-type tiles. */
export type PrimaryPropertyGroup = 'hospitality' | 'land' | 'other';

export const PRIMARY_GROUP_LABELS: Record<PrimaryPropertyGroup, string> = {
  hospitality: 'Hospitality',
  land:        'Land-based business',
  other:       'Other venues',
};

/**
 * Secondary descriptors — multi-select setting/landscape qualifiers that
 * further describe the property. Optional; the primary type alone is enough
 * to publish.
 */
export type PropertyDescriptor =
  | 'backyard' | 'driveway' | 'curbside'
  | 'beach' | 'coastal' | 'lake' | 'river-stream'
  | 'mountains' | 'desert' | 'canyon' | 'forest'
  | 'hot-spring' | 'waterfall' | 'wetlands' | 'plain-prairie'
  | 'urban' | 'suburban';

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

/** Whether the property sits on private or public land. */
export type LandType = 'private' | 'public';

/**
 * Address-step (Phase 1, step 1) validity. Requires city + state + a map pin,
 * plus — when the host is NOT the landowner — the land type, the landowner's
 * name + phone, and the represents-landowner answer. Shared by the wizard
 * service and the phase hub so the two never drift.
 */
export function isAddressStepValid(d: IDraftListing): boolean {
  const baseOk = !!d.address?.city && !!d.address?.state && typeof d.lat === 'number';
  if (!baseOk) return false;
  if (d.isLandowner === false) {
    return !!d.landType
      && !!d.landowner?.firstName?.trim()
      && !!d.landowner?.lastName?.trim()
      && !!d.landowner?.phone?.trim()
      && d.representsLandowner !== undefined;
  }
  return true;
}

/** Landowner contact captured when the host is not the owner — verification only, never shown to guests. */
export interface ILandownerContact {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

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
  /** Single-select business type — required. Drives category + descriptor phrase. */
  primaryType?: PrimaryPropertyType;
  /** Required when `primaryType === 'custom'` — the host's own label. */
  customPrimaryLabel?: string;
  /** Multi-select setting descriptors — optional. */
  descriptors?: PropertyDescriptor[];
  /** Free-text secondary descriptors the host added — optional. */
  customDescriptors?: string[];
  address?: { street: string; city: string; state: string; zip: string };
  lat?: number;
  lng?: number;
  isLandowner?: boolean;
  /** Set only when `isLandowner === false`. */
  landType?: LandType;
  landowner?: ILandownerContact;
  representsLandowner?: boolean;
  access?: { pullThrough: boolean; backIn: boolean };
  maxRig?: { length: number; width: number; height: number };
  guestCapacity?: number;
  wheelchairAccessible?: boolean;
  amenities?: Amenity[];
  /** Free-text amenities the host added (e.g., "Mini fridge"). Max 8. */
  customAmenities?: string[];
  /** Sub-detail: which amperages are available when 'electricity' is selected. */
  electricityAmps?: ElectricityAmps[];
  /** Sub-detail: rough wifi speed bucket when 'wifi' is selected. */
  wifiSpeed?: WifiSpeed;
  /** Sub-detail: pets policy when 'pets' is selected. */
  petsPolicy?: PetsPolicy;
  /** Sub-detail: whether the shower has hot water when 'shower' is selected. */
  showerHotWater?: boolean;
  vehicleTypes?: RvType[];
  /** Whether tents are allowed (and whether RVs are excluded). */
  tentMode?: TentMode;

  // ─────────────── Phase 2 — Make it stand out ───────────────
  /** Downscaled JPEG data URLs (~1200px max dimension, ~85% quality). */
  photos?: string[];
  /** Optional per-photo captions, index-aligned with `photos`. */
  photoCaptions?: string[];
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

/**
 * Primary-type metadata. `category` is the 5-bucket platform category the
 * listing belongs to (for the pennant + amenities pool). `descriptorPhrase`
 * leads the listing detail's title line ("Brewery stay in Minneapolis, MN").
 * `description` is a one-line explainer shown beneath the tile label.
 * `group` drives the wizard's sub-section grouping. `sampleListingId` (when
 * present) lets the "Help me pick" modal show a real example.
 */
export const PRIMARY_PROPERTY_TYPE_META: Record<PrimaryPropertyType, {
  label: string;
  icon: string;
  category: Category;
  descriptorPhrase: string;
  description: string;
  group: PrimaryPropertyGroup;
  sampleListingId?: number;
}> = {
  'winery':         { label: 'Winery',         icon: 'wine_bar',       category: 'vineyard',   descriptorPhrase: 'Winery stay',         description: 'Tasting room, vineyard rows, wine production.', group: 'hospitality', sampleListingId: 1 },
  'brewery':        { label: 'Brewery',        icon: 'sports_bar',     category: 'brewery',    descriptorPhrase: 'Brewery stay',        description: 'Taproom, beer garden, on-site brewing.',         group: 'hospitality', sampleListingId: 21 },
  'distillery':     { label: 'Distillery',     icon: 'science',        category: 'brewery',    descriptorPhrase: 'Distillery stay',     description: 'Spirits production with public tasting space.',  group: 'hospitality' },
  'rv-park':        { label: 'RV Park',        icon: 'rv_hookup',      category: 'attraction', descriptorPhrase: 'RV-park stay',        description: 'Established campground with multiple sites.',    group: 'hospitality' },
  'farm':           { label: 'Farm',           icon: 'agriculture',    category: 'farm',       descriptorPhrase: 'Farm stay',           description: 'Working farm — crops, livestock, or mixed-use.', group: 'land',        sampleListingId: 11 },
  'specialty-farm': { label: 'Specialty farm', icon: 'local_florist',  category: 'farm',       descriptorPhrase: 'Specialty-farm stay', description: 'Lavender, dairy, herbs, hemp, hops, flowers.',   group: 'land' },
  'orchard':        { label: 'Orchard',        icon: 'park',           category: 'farm',       descriptorPhrase: 'Orchard stay',        description: 'Apple, peach, citrus — fruit-tree property.',    group: 'land' },
  'ranch':          { label: 'Ranch',          icon: 'pets',           category: 'farm',       descriptorPhrase: 'Ranch stay',          description: 'Cattle, horses, larger working acreage.',        group: 'land' },
  'woodlands':      { label: 'Woodlands',      icon: 'forest',         category: 'offgrid',    descriptorPhrase: 'Woodlands stay',      description: 'Privately-held forested land.',                  group: 'land' },
  'golf-course':    { label: 'Golf course',    icon: 'golf_course',    category: 'attraction', descriptorPhrase: 'Golf-course stay',    description: 'Course-adjacent or on-property hosting.',        group: 'other' },
  'church':         { label: 'Church',         icon: 'church',         category: 'attraction', descriptorPhrase: 'Church stay',         description: 'Parking lot or grounds of a place of worship.',  group: 'other' },
  'private-home':   { label: 'Private home',   icon: 'home',           category: 'offgrid',    descriptorPhrase: 'Private-home stay',   description: 'Backyard, driveway, or residential land.',       group: 'other', sampleListingId: 51 },
  'custom':         { label: 'Other (custom)',  icon: 'edit_note',      category: 'offgrid',    descriptorPhrase: 'Custom stay',         description: "Doesn't fit the buckets above? Name your own.", group: 'other' },
};

/**
 * Resolve the descriptor phrase for a draft, honoring the host's custom
 * label when `primaryType === 'custom'`. Single source so the wizard's
 * subhead, the phase-3 review fact strip, and (future) listing-detail use
 * the same string.
 */
export function primaryDescriptorPhrase(d: IDraftListing | null | undefined): string {
  if (!d?.primaryType) return 'Brewery stay';
  if (d.primaryType === 'custom') {
    const label = (d.customPrimaryLabel || '').trim();
    return label ? `${label} stay` : 'Custom stay';
  }
  return PRIMARY_PROPERTY_TYPE_META[d.primaryType].descriptorPhrase;
}

/** Display metadata for the secondary descriptors — label + material icon. */
export const PROPERTY_DESCRIPTOR_META: Record<PropertyDescriptor, { label: string; icon: string }> = {
  'backyard':      { label: 'Backyard',       icon: 'yard' },
  'driveway':      { label: 'Driveway',       icon: 'directions_car' },
  'curbside':      { label: 'Curbside',       icon: 'route' },
  'beach':         { label: 'Beach',          icon: 'beach_access' },
  'coastal':       { label: 'Coastal',        icon: 'waves' },
  'lake':          { label: 'Lake',           icon: 'water' },
  'river-stream':  { label: 'River / Stream', icon: 'water_drop' },
  'mountains':     { label: 'Mountains',      icon: 'landscape' },
  'desert':        { label: 'Desert',         icon: 'wb_sunny' },
  'canyon':        { label: 'Canyon',         icon: 'landscape' },
  'forest':        { label: 'Forest',         icon: 'forest' },
  'hot-spring':    { label: 'Hot Spring',     icon: 'hot_tub' },
  'waterfall':     { label: 'Waterfall',      icon: 'water' },
  'wetlands':      { label: 'Wetlands',       icon: 'grass' },
  'plain-prairie': { label: 'Plain / Prairie',icon: 'grass' },
  'urban':         { label: 'Urban',          icon: 'location_city' },
  'suburban':      { label: 'Suburban',       icon: 'home' },
};
