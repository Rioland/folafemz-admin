#!/usr/bin/env node
/**
 * Moves the website's media out of the repository and into Supabase Storage,
 * then repoints every database row at the uploaded copy.
 *
 * Run once:  node scripts/migrate-media.mjs [--dry-run]
 *
 * Safe to re-run. Uploads use upsert, so a second pass overwrites rather than
 * duplicating, and rows already pointing at Storage are left alone.
 *
 * Local files are NOT deleted. Verify the live site first, then remove them.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');

for (const line of readFileSync(resolve(here, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';
const PUBLIC_DIR = resolve(here, '..', '..', 'folafemzglobal', 'public');

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

/* ---------------------------------------------------------------------------
   1. Collect every media file under public/
   --------------------------------------------------------------------------- */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (MIME[extname(entry).toLowerCase()]) out.push(full);
  }
  return out;
}

const files = walk(PUBLIC_DIR).sort();
console.log(`\n  ${files.length} media files under public/\n`);

/* ---------------------------------------------------------------------------
   2. Upload, keeping the same folder layout so keys stay recognisable
   --------------------------------------------------------------------------- */

/** "/images/fleet/prado.jpg"  ->  public Storage URL */
const urlFor = new Map();
let uploaded = 0, failed = 0, bytes = 0;

for (const file of files) {
  // Path as the website refers to it, and the key it takes in the bucket.
  const sitePath = '/' + relative(PUBLIC_DIR, file).split('\\').join('/');
  const key = sitePath.slice(1);
  const contentType = MIME[extname(file).toLowerCase()];
  const body = readFileSync(file);

  if (DRY) {
    urlFor.set(sitePath, `(dry-run)/${key}`);
    continue;
  }

  const { error } = await db.storage
    .from(BUCKET)
    .upload(key, body, { contentType, upsert: true });

  if (error) {
    console.log(`  FAILED  ${sitePath} — ${error.message}`);
    failed++;
    continue;
  }

  const { data } = db.storage.from(BUCKET).getPublicUrl(key);
  urlFor.set(sitePath, data.publicUrl);
  uploaded++;
  bytes += body.length;
}

console.log(`  uploaded ${uploaded}, failed ${failed}, ${(bytes / 1024 / 1024).toFixed(1)}MB\n`);
if (failed) process.exit(1);

/* ---------------------------------------------------------------------------
   3. Repoint the database
   --------------------------------------------------------------------------- */

/** Only rewrite site-relative paths we actually uploaded. */
const remap = (value) =>
  typeof value === 'string' && urlFor.has(value) ? urlFor.get(value) : null;

const TARGETS = [
  ['vehicles', 'image'],
  ['cities', 'hero_image'],
  ['posts', 'cover_image'],
  ['services', 'image'],
  ['gallery', 'src'],
  ['videos', 'src'],
];

console.log('  repointing rows:');

for (const [table, column] of TARGETS) {
  const { data, error } = await db.from(table).select(`id, ${column}`);
  if (error) { console.log(`    ${table}: FAILED — ${error.message}`); failed++; continue; }

  let changed = 0;
  for (const row of data ?? []) {
    const next = remap(row[column]);
    if (!next) continue;

    if (!DRY) {
      const { error: uErr } = await db.from(table).update({ [column]: next }).eq('id', row.id);
      if (uErr) { console.log(`    ${table} ${row.id}: ${uErr.message}`); failed++; continue; }
    }
    changed++;
  }
  console.log(`    ${table}.${column}`.padEnd(28) + `${changed} of ${(data ?? []).length}`);
}

/* Settings hold media too, as individual key/value rows. */
const MEDIA_SETTINGS = ['logo', 'heroImage', 'ogImage', 'heroVideo', 'aboutImage'];
const { data: settingRows } = await db.from('settings').select('key, value');

let settingsChanged = 0;
for (const row of settingRows ?? []) {
  if (!MEDIA_SETTINGS.includes(row.key)) continue;

  const next = remap(row.value);
  if (!next) continue;

  if (!DRY) {
    const { error } = await db.from('settings').update({ value: next }).eq('key', row.key);
    if (error) { console.log(`    settings.${row.key}: ${error.message}`); failed++; continue; }
  }
  settingsChanged++;
}
console.log('    settings'.padEnd(28) + `${settingsChanged} of ${MEDIA_SETTINGS.length}`);

console.log(
  failed
    ? `\n  finished with ${failed} failures\n`
    : `\n  ${DRY ? 'dry run complete — nothing written' : 'migration complete'}\n`
);

process.exit(failed ? 1 : 0);
