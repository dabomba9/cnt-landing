/** Curated article lists rendered as rails on /articles. These are
 *  hand-picked because we don't have analytics or editorial-CMS data
 *  yet. Update the IDs as new strong reads land. When real signals
 *  arrive (view counts, editor scores) the rail getters in
 *  ArticlesComponent swap to a service call — these constants are the
 *  v1 placeholder. */

/** Long-form evergreen picks across multiple categories. Shown in the
 *  "Editor's picks" rail directly below the featured mosaic. */
export const EDITOR_PICK_IDS: number[] = [
  1,   // Off-grid boondocking guide (9 min)
  24,  // Long trip-planning read (14 min)
  33,  // Long host read (11 min)
  6,   // Travel story (12 min)
  9,   // Destinations long read (11 min)
];

/** "Popular this month" — a different curated angle from editor picks.
 *  Bias toward host + trip-planning since those are the conversion-
 *  adjacent categories. */
export const POPULAR_IDS: number[] = [
  42,  // Summer prep checklist (host)
  21,  // Host long read (10 min)
  3,   // Trip-planning long (12 min)
  17,  // Destinations
  25,  // Trip-planning (11 min)
];

/** Hero collage backdrop — 8 article IDs whose heroImages drift
 *  behind the Room2Roam masthead at low opacity. Pick visually
 *  varied images (landscape/sky/tents/rigs) spread across
 *  categories so the collage reads as a magazine cover, not a
 *  category preview. Decorative; if any ID is missing, the
 *  template falls back to an empty cell. */
export const HERO_COLLAGE_IDS: number[] = [
  46, 44, 33, 17, 9, 6, 24, 1,
];
