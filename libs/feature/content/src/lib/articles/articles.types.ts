/** Canonical category keys for the article catalog. Map 1:1 to the
 *  live curbnturf.com /article/category/* URL slugs (transformed via
 *  the CATEGORY_SLUG_TO_KEY map in scripts/import-articles.mjs). */
export type ArticleCategoryKey =
  | 'boondocking'
  | 'camping-tips'
  | 'trip-planning'
  | 'host'
  | 'cooking'
  | 'destinations'
  | 'maintenance'
  | 'gear'
  | 'safety'
  | 'travel-stories';

export interface ICategoryMeta {
  key: ArticleCategoryKey;
  label: string;
  icon: string;        // Material Symbols name
}

export const CATEGORY_META: Record<ArticleCategoryKey, ICategoryMeta> = {
  'boondocking':     { key: 'boondocking',     label: 'Boondocking',          icon: 'campaign' },
  'camping-tips':    { key: 'camping-tips',    label: 'Camping Tips',         icon: 'park' },
  'trip-planning':   { key: 'trip-planning',   label: 'Trip Planning',        icon: 'route' },
  'host':            { key: 'host',            label: 'CurbNTurf Host',       icon: 'home_work' },
  'cooking':         { key: 'cooking',         label: 'Cooking & Recipes',    icon: 'restaurant' },
  'destinations':    { key: 'destinations',    label: 'Travel Destinations',  icon: 'pin_drop' },
  'maintenance':     { key: 'maintenance',     label: 'Maintenance & Repairs',icon: 'build' },
  'gear':            { key: 'gear',            label: 'Gear & Accessories',   icon: 'backpack' },
  'safety':          { key: 'safety',          label: 'Safety & Security',    icon: 'health_and_safety' },
  'travel-stories':  { key: 'travel-stories',  label: 'Travel Stories',       icon: 'auto_stories' },
};

export interface IArticle {
  /** Live curbnturf.com URL id — drives /article/:id/:slug routing. */
  id: number;
  /** URL slug, matches the live site so inbound links from external
   *  sources resolve here too. */
  slug: string;
  title: string;
  category: ArticleCategoryKey;
  /** Human label captured at import time so we don't depend on the
   *  CATEGORY_META lookup at render time if the key drifts. */
  categoryLabel: string;
  author: string;
  /** ISO YYYY-MM-DD. */
  publishedAt: string;
  /** Relative path under `src/assets/articles/` — e.g. `assets/articles/1.jpg`. */
  heroImage: string;
  heroAlt: string;
  /** 1–2 sentence excerpt for cards + meta description. */
  excerpt: string;
  /** Full article body — cleaned Webflow rich-text HTML. Bound via
   *  `[innerHTML]` on the detail component; sanitized at import time
   *  (no script tags, no inline event handlers). */
  body: string;
  /** Derived from word count at import time (~220 wpm). */
  readTimeMinutes: number;
}

export interface IAuthor {
  /** Display name — must match the article's `author` string field. */
  name: string;
  /** Two-letter initials for the avatar circle. */
  initials: string;
  /** One-line bio rendered under the name in the byline strip. */
  bio: string;
}

/** Known authors with bios + avatar initials. Articles whose `author`
 *  field doesn't appear here fall back to initials derived from the
 *  name. All 46 imported articles are by Dustin Reed today. */
export const AUTHORS: Record<string, IAuthor> = {
  'Dustin Reed': {
    name: 'Dustin Reed',
    initials: 'DR',
    bio: 'Founder of CurbNTurf. Writes about life on the road, boondocking, and what it takes to host RVers well.',
  },
};

/** Fallback initials when an author isn't in AUTHORS. Takes the first
 *  letter of the first and last word. */
export function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0].length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
