#!/usr/bin/env node
/**
 * Build-time sitemap generator.
 *
 * Takes the hand-maintained src/sitemap.xml as the source of static
 * URLs, then appends:
 *   - 46 article URLs from articles.data.ts
 *   - 10 category landing pages from articles.types.ts
 *   - /articles (magazine index)
 *
 * Outputs the merged sitemap to dist/cnt-workspace/sitemap.xml so
 * the deployed build advertises all our editorial routes.
 *
 * Intentionally does not include /articles/saved — that's a
 * personalized, localStorage-driven view; nothing for crawlers.
 *
 * Runs as `postbuild`; reads TS source as text to avoid a Node TS
 * loader. Article + category records use a stable JSON shape so a
 * regex grab is reliable. If the importer ever changes shape, this
 * script throws loudly rather than silently emitting an incomplete
 * sitemap.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.curbnturf.com';
const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');

const STATIC_SITEMAP = resolve(ROOT, 'src/sitemap.xml');
const ARTICLES_DATA = resolve(ROOT, 'libs/feature/content/src/lib/articles/articles.data.ts');
const ARTICLES_TYPES = resolve(ROOT, 'libs/feature/content/src/lib/articles/articles.types.ts');
const OUT = resolve(ROOT, 'dist/cnt-workspace/sitemap.xml');

async function readSourceArticles() {
  const text = await readFile(ARTICLES_DATA, 'utf8');
  const articles = [];
  const re = /"id":\s*(\d+)[\s\S]*?"slug":\s*"([^"]+)"[\s\S]*?"publishedAt":\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    articles.push({ id: parseInt(m[1], 10), slug: m[2], publishedAt: m[3] });
  }
  if (articles.length === 0) {
    throw new Error('generate-sitemap: no articles parsed from articles.data.ts — importer shape may have changed.');
  }
  return articles;
}

async function readCategoryKeys() {
  const text = await readFile(ARTICLES_TYPES, 'utf8');
  const block = text.match(/CATEGORY_META[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error('generate-sitemap: could not find CATEGORY_META block.');
  const keys = [];
  const re = /'([\w-]+)':\s*\{\s*key:\s*'\1'/g;
  let m;
  while ((m = re.exec(block[1])) !== null) keys.push(m[1]);
  if (keys.length === 0) throw new Error('generate-sitemap: no category keys parsed.');
  return keys;
}

function urlBlock(loc, changefreq, priority, lastmod) {
  const lines = [`  <url>`, `    <loc>${loc}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join('\n');
}

async function main() {
  const staticXml = await readFile(STATIC_SITEMAP, 'utf8');
  const articles = await readSourceArticles();
  const categories = await readCategoryKeys();

  const extras = [];
  extras.push(urlBlock(`${BASE}/articles`, 'weekly', '0.8'));
  for (const k of categories) {
    extras.push(urlBlock(`${BASE}/article/category/${k}`, 'weekly', '0.7'));
  }
  for (const a of articles) {
    extras.push(urlBlock(`${BASE}/article/${a.id}/${a.slug}`, 'monthly', '0.6', a.publishedAt));
  }

  const merged = staticXml.replace(/\n*<\/urlset>/, `\n\n${extras.join('\n\n')}\n\n</urlset>`);

  if (!existsSync(dirname(OUT))) await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, merged, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`sitemap: wrote ${OUT} (${1 + categories.length + articles.length} dynamic URLs added)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
