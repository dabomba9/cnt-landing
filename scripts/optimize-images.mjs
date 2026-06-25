#!/usr/bin/env node
/**
 * P54/B — Resize oversized webps in place.
 *
 * The category + host webps under src/assets/images/ ship at 1024×1024
 * but display at 220-360 px in the home grid. Lighthouse flagged the
 * largest of them (winery_category.webp) as worth 154 KB of savings.
 * This script walks every webp, and for any image > 800×800 generates
 * a 640×640 variant (quality 82) in place. Re-run safe: the
 * already-resized variants are below the threshold and get skipped.
 *
 * 640×640 is comfortably above the largest display size (360 px) so
 * Retina (2×) still looks crisp.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const DIR = resolve(ROOT, 'src/assets/images');
const RESIZE_TRIGGER = 800; // any image with width > 800 gets resized
const TARGET = 640;
const QUALITY = 82;

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  const files = (await readdir(DIR)).filter(f => f.toLowerCase().endsWith('.webp'));
  let totalBefore = 0;
  let totalAfter = 0;
  let touched = 0;
  for (const f of files) {
    const fp = resolve(DIR, f);
    const meta = await sharp(fp).metadata();
    const before = (await stat(fp)).size;
    if ((meta.width ?? 0) <= RESIZE_TRIGGER) {
      console.log(`skip   ${f.padEnd(34)} ${meta.width}×${meta.height} (${fmt(before)})`);
      continue;
    }
    const buf = await sharp(fp)
      .resize(TARGET, TARGET, { fit: 'cover', position: 'centre' })
      .webp({ quality: QUALITY })
      .toBuffer();
    // Skip if the recompression didn't actually save bytes (already-
    // optimized files would otherwise regress).
    if (buf.length >= before) {
      console.log(`keep   ${f.padEnd(34)} ${meta.width}×${meta.height} (resize would grow file: ${fmt(before)} → ${fmt(buf.length)})`);
      continue;
    }
    await writeFile(fp, buf);
    const after = buf.length;
    totalBefore += before;
    totalAfter += after;
    touched++;
    console.log(`resize ${f.padEnd(34)} ${meta.width}×${meta.height} → ${TARGET}×${TARGET}  ${fmt(before)} → ${fmt(after)}`);
  }
  if (touched > 0) {
    const saved = totalBefore - totalAfter;
    const pct = ((saved / totalBefore) * 100).toFixed(1);
    console.log(`\n${touched} files resized · ${fmt(totalBefore)} → ${fmt(totalAfter)} · saved ${fmt(saved)} (${pct}%)`);
  } else {
    console.log('\nno files needed resizing.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
