#!/usr/bin/env node
/**
 * One-shot importer for the 46 live articles at curbnturf.com.
 *
 * - Reads pre-downloaded raw HTML from /tmp/cnt-articles/{id}.html.
 *   (Run `curl` first to populate that dir; see plan P11/A.)
 * - For each article, extracts title, hero image URL, publish date,
 *   category, and the rich-text body.
 * - Downloads the hero image into src/assets/articles/{id}.jpg.
 * - Emits libs/feature/content/src/lib/articles/articles.data.ts
 *   sorted newest-first.
 *
 * Run with: `node scripts/import-articles.mjs`.
 * Re-run safe: idempotent; overwrites local images + data file.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SRC_HTML_DIR = '/tmp/cnt-articles';
const OUT_IMG_DIR = resolve(REPO_ROOT, 'src/assets/articles');
const OUT_DATA_FILE = resolve(
  REPO_ROOT,
  'libs/feature/content/src/lib/articles/articles.data.ts',
);

/** Map the live site's slug-cased category to our canonical key. */
const CATEGORY_SLUG_TO_KEY = {
  'boondocking': 'boondocking',
  'camping-tips': 'camping-tips',
  'trip-planning': 'trip-planning',
  'curbnturf-host': 'host',
  'cooking-and-recipes': 'cooking',
  'travel-destinations': 'destinations',
  'maintenance-and-repairs': 'maintenance',
  'gear-and-accessories': 'gear',
  'safety-and-security': 'safety',
  'travel-stories': 'travel-stories',
};

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseHumanDate(str) {
  // e.g. "May 13, 2024" → "2024-05-13"
  const m = str.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Find the deepest <div class="rich-text w-richtext"> and return its
 *  inner HTML. The Webflow pattern nests them; we want the body. */
function extractBody(html) {
  const re = /<div [^>]*class="[^"]*rich-text w-richtext[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/curbnturf-article-side-bar>/i;
  const m = html.match(re);
  if (m) return m[1];
  // Fallback — looser match.
  const looser = html.match(/<div [^>]*class="rich-text w-richtext"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  return looser ? looser[1] : '';
}

/** Remove Webflow's _ngcontent-ng-c* + data-w-id + role="list"
 *  attribute noise from the body HTML. Keeps the markup readable
 *  and shrinks bundle size. */
function cleanBodyHtml(body) {
  return body
    .replace(/\s+_ngcontent-ng-c\d+(?:="")?/g, '')
    .replace(/\s+data-w-id="[^"]*"/g, '')
    .replace(/\s+role="list"/g, '')
    .replace(/\s+style="opacity:[^"]*"/g, '')
    .replace(/\s+class="w-richtext-align-center w-richtext-figure-type-image"/g, ' class="article-figure"')
    .replace(/\s+style="\s*"/g, '')
    .trim();
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*class="display"[^>]*>([\s\S]*?)<\/h1>/);
  return m ? decodeEntities(m[1].trim()) : null;
}

function extractDate(html) {
  // The hero strip shows "Month DD, YYYY" inside a div near the title.
  const m = html.match(/article-card-bg-date[^"]*"[^>]*>[\s\S]*?<div[^>]*>([A-Z][a-z]+ \d{1,2}, \d{4})<\/div>/);
  return m ? parseHumanDate(m[1]) : null;
}

function extractHeroImage(html) {
  // Prefer og:image — it's the cleanest source.
  const m = html.match(/<meta property="og:image" content="([^"]+)"/);
  return m ? m[1] : null;
}

function extractHeroAlt(html) {
  const m = html.match(/class="article-card-bg-image"[^>]*alt="([^"]+)"/);
  return m ? decodeEntities(m[1]) : '';
}

function extractCategory(html) {
  const m = html.match(/href="https:\/\/www\.curbnturf\.com\/article\/category\/([a-z-]+)"[^>]*>\s*([^<]+?)\s*</);
  if (!m) return { key: 'travel-stories', label: 'Travel Stories' };
  const slug = m[1].trim();
  const label = m[2].trim();
  return { key: CATEGORY_SLUG_TO_KEY[slug] ?? 'travel-stories', label };
}

function extractAuthor(html) {
  const m = html.match(/author-container[^>]*>[\s\S]*?<div[^>]*>([^<]+)<\/div>\s*<\/div>/);
  return m ? m[1].trim() : 'CurbNTurf';
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function strip(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function excerptFrom(bodyHtml) {
  // First non-empty paragraph, stripped + clamped.
  const paras = bodyHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
  for (const p of paras) {
    const txt = strip(p);
    if (txt.length > 40) return txt.length > 240 ? txt.slice(0, 237).trim() + '…' : txt;
  }
  return '';
}

function readTime(bodyHtml) {
  const words = strip(bodyHtml).split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return buf.length;
}

async function ensureDir(p) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

const SLUG_INDEX = [
  [46, 'best-private-rv-stays-near-yellowstone-glacier-and-grand-teton'],
  [45, 'rving-with-kids-private-farm-camping'],
  [44, 'master-hot-weather-rving-without-hookups'],
  [43, 'first-curbnturf-booking-step-by-step-guide'],
  [42, 'get-your-rig-ready-the-ultimate-summer-rv-prep-checklist'],
  [41, 'seasonal-agritourism-rv-stay-calendar'],
  [40, 'make-your-curbnturf-listing-irresistible-5-tips-ai-prompts'],
  [39, 'is-curbnturf-free-membership-myths'],
  [38, 'rv-foodie-tour-local-flavors-farm-stays'],
  [37, 'agritourism-hosting-rvers-farm-ranch-business'],
  [36, 'rv-amenities-curbnturf'],
  [35, 'rv-road-trip-planning-vineyards-valleys'],
  [34, 'beginner-tips-private-rv-parking-landowners'],
  [33, 'become-a-curbnturf-host-land-income'],
  [32, 'best-private-rv-camping-smoky-mountains'],
  [31, 'unexpected-private-land-rv-stays'],
  [30, '2026-state-of-curbnturf-growth-plans'],
  [29, 'winter-rv-stays-private-land-campgrounds'],
  [28, 'host-google-business-profile-rv-spot-more-curbnturf-bookings'],
  [27, 'fall-rv-host-seasonal-checklist'],
  [26, 'turn-land-into-cash-rv-hosting-income'],
  [25, 'curbnturf-rv-vacationing-private-land-camping'],
  [24, 'unlock-your-ultimate-rv-adventure-with-rvshare-and-curbnturf'],
  [23, 'elevate-your-curbnturf-listing-with-a-google-business-profile'],
  [22, 'how-to-promote-your-listing-on-curbnturf'],
  [21, 'how-hosts-can-improve-their-campsites'],
  [20, 'best-national-parks-for-rv-wildlife-viewing'],
  [19, 'rv-camping-and-photography'],
  [18, 'rv-boondocking-locations'],
  [17, 'snowbirding-more-than-just-escaping-the-cold'],
  [16, 'rv-winterizing-get-your-rv-ready'],
  [15, 'rv-camping-etiquette'],
  [14, 'why-rvers-love-curbnturf-fall-adventures'],
  [13, 'the-impact-of-harvest-hosts-acquisitions-on-rvers'],
  [12, 'pros-and-cons-of-rv-rentals'],
  [11, 'rv-camping-tailgating-game-day-fun-tips'],
  [10, 'rv-camping-remote-work-tips'],
  [9, 'agribusiness-are-ideal-to-host-rvers'],
  [8, 'essential-rv-gear-22-accessories-for-rv-travel-in-2024'],
  [7, 'top-rv-safety-essential-tips-for-safe-travels-this-season'],
  [6, '2024-day-3-speakers'],
  [5, '2024-day-2-speakers'],
  [4, '2024-day-1-speakers'],
  [3, 'rv-camping-with-pets'],
  [2, 'discover-the-top-five-rv-destinations-for-families'],
  [1, 'your-essential-off-grid-adventure-rv-boondocking-guide'],
];

async function main() {
  await ensureDir(OUT_IMG_DIR);
  const articles = [];
  const failures = [];

  for (const [id, slug] of SLUG_INDEX) {
    const htmlPath = resolve(SRC_HTML_DIR, `${id}.html`);
    if (!existsSync(htmlPath)) { failures.push({ id, slug, reason: 'no html' }); continue; }
    const html = await readFile(htmlPath, 'utf8');

    const title = extractTitle(html);
    const date = extractDate(html);
    const heroUrl = extractHeroImage(html);
    const heroAlt = extractHeroAlt(html);
    const category = extractCategory(html);
    const author = extractAuthor(html);
    const body = cleanBodyHtml(extractBody(html));

    if (!title || !date || !heroUrl || !body) {
      failures.push({ id, slug, reason: `missing field — title:${!!title} date:${!!date} hero:${!!heroUrl} body:${body.length}` });
      continue;
    }

    // Download hero (jpeg from the CDN by default).
    const localImg = `${id}.jpg`;
    const localImgPath = resolve(OUT_IMG_DIR, localImg);
    try {
      const bytes = await downloadImage(heroUrl, localImgPath);
      console.log(`OK ${id} · ${(bytes / 1024).toFixed(0)}KB · ${title.slice(0, 60)}`);
    } catch (e) {
      failures.push({ id, slug, reason: `image fetch: ${e.message}` });
      continue;
    }

    const excerpt = excerptFrom(body);
    articles.push({
      id, slug, title, category: category.key, categoryLabel: category.label,
      author, publishedAt: date,
      heroImage: `assets/articles/${localImg}`,
      heroAlt, excerpt, body, readTimeMinutes: readTime(body),
    });
  }

  // Sort newest-first.
  articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // Emit TS data file.
  const banner = `/* AUTO-GENERATED by scripts/import-articles.mjs. DO NOT EDIT BY HAND.
 * Re-run the importer when curbnturf.com publishes new articles or
 * when the live HTML structure changes. */
`;
  const body = `import { IArticle } from './articles.types';\n\nexport const ARTICLES: IArticle[] = ${JSON.stringify(articles, null, 2)};\n`;
  await writeFile(OUT_DATA_FILE, banner + body, 'utf8');

  console.log(`\nDone. ${articles.length} articles written; ${failures.length} failures.`);
  if (failures.length) console.log(failures);
}

main().catch(e => { console.error(e); process.exit(1); });
