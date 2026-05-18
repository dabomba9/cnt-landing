/**
 * Public Points of Interest — utility data the user consults mid-trip.
 *
 * Distinct from IListing because POIs have no booking, no host, no reviews
 * (yet). They render as map pins with click-to-modal on /search.
 */

export type PoiKind = 'dumpstation' | 'rest_area' | 'propane' | 'potable_water';

export type PoiCost = 'free' | 'paid' | 'free-with-fuel' | 'unknown';

export interface IPoi {
  id: string;
  kind: PoiKind;
  name: string;
  lat: number;
  lng: number;
  address: string;
  photos: string[];
  /** Short prose note: "Spigot behind store" / "Closed Dec–Mar" */
  notes?: string;
  cost: PoiCost;
  /** Display string when cost === 'paid': "$10" / "$3.49/gal" / "Free with fill-up". */
  priceNote?: string;
  /** ISO date of the last user/community verification (drives stale-info warning). */
  lastVerified: string;
  /** Type-keyed tag list (rendered as chips in the modal). */
  amenities: string[];
  /** Feet — drives the "Will I fit?" answer. */
  maxRigLength?: number;
  /** Bars (1–5). Surfaces for rest areas + remote propane/water. */
  cellSignal?: 1 | 2 | 3 | 4 | 5;
  /** "24/7", "Daylight only", "8am–8pm" */
  hours?: string;
}

export interface IPoiKindMeta {
  label: string;
  /** Material symbol name for the pin glyph + modal header chip. */
  icon: string;
  /** Hex color used for the map pin and the chip background. */
  color: string;
}

export const POI_KIND_META: Record<PoiKind, IPoiKindMeta> = {
  dumpstation:   { label: 'Dump station',  icon: 'plumbing',      color: '#7A5C9E' },  // muted purple
  rest_area:     { label: 'Rest area',     icon: 'local_parking', color: '#3B82A6' },  // muted blue
  propane:       { label: 'Propane',       icon: 'propane_tank',  color: '#C5641D' },  // amber
  potable_water: { label: 'Potable water', icon: 'water_drop',    color: '#4DA3A8' },  // teal
};

/**
 * Per-kind fallback photo. Used when an `IPoi.photos` array is empty (always, in v1).
 * `null` keeps the glyph placeholder for kinds we don't have a stock image for.
 */
export const POI_KIND_PHOTO: Record<PoiKind, string | null> = {
  dumpstation:   null,
  rest_area:     'assets/images/hiw_park.webp',
  propane:       'assets/images/addon_propane_refill.webp',
  potable_water: null,
};
