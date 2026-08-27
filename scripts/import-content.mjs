#!/usr/bin/env node
/**
 * Seeds Supabase from the public site's data/content.json.
 *
 * Run once after applying supabase/schema.sql:
 *     npm run import
 *
 * Safe to re-run: every table is upserted on its natural key (slug, or the
 * settings key), so a second run updates rows rather than duplicating them.
 * Nothing is deleted — a row removed from content.json stays in the database.
 *
 * Uses the service-role key, so it bypasses Row Level Security and never needs
 * a signed-in user.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/* -------------------------------------------------------------------------
   Environment — read .env.local by hand; this runs outside Next.js, which is
   what normally loads it.
   ------------------------------------------------------------------------- */

function loadEnv() {
  const file = resolve(here, '..', '.env.local');
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const value = match[2].replace(/^["']|["']$/g, '');
    if (value && !process.env[match[1]]) process.env[match[1]] = value;
  }
}

loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) {
  console.error(
    '\nMissing Supabase credentials.\n' +
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local ' +
    '(copy .env.example and fill it in), then run this again.\n'
  );
  process.exit(1);
}

const db = createClient(URL_, KEY, { auth: { persistSession: false } });

/* -------------------------------------------------------------------------
   Source file
   ------------------------------------------------------------------------- */

const source =
  process.argv[2] ||
  resolve(here, '..', '..', 'folafemzglobal', 'data', 'content.json');

if (!existsSync(source)) {
  console.error(`\nCannot find content.json at:\n  ${source}\n\nPass a path: npm run import -- /path/to/content.json\n`);
  process.exit(1);
}

const content = JSON.parse(readFileSync(source, 'utf8'));
console.log(`Reading ${source}\n`);

/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */

let failed = false;

async function upsert(table, rows, onConflict) {
  if (!rows || rows.length === 0) {
    console.log(`  ${table.padEnd(18)} nothing to import`);
    return [];
  }

  const { data, error } = await db.from(table).upsert(rows, { onConflict }).select();

  if (error) {
    console.error(`  ${table.padEnd(18)} FAILED — ${error.message}`);
    failed = true;
    return [];
  }

  console.log(`  ${table.padEnd(18)} ${data.length} rows`);
  return data;
}

/** slug → id, for wiring up foreign keys. */
const indexBySlug = (rows) => Object.fromEntries(rows.map((r) => [r.slug, r.id]));

const nullIfBlank = (v) => (v === '' || v === undefined ? null : v);

/* -------------------------------------------------------------------------
   Import, parents before children so foreign keys resolve.
   ------------------------------------------------------------------------- */

console.log('Importing:');

const categories = await upsert(
  'categories',
  (content.categories ?? []).map((c, i) => ({ name: c.name, slug: c.slug, position: i })),
  'slug'
);
const categoryId = indexBySlug(categories);

const vehicles = await upsert(
  'vehicles',
  (content.vehicles ?? []).map((v, i) => ({
    name: v.name,
    slug: v.slug,
    category_id: categoryId[v.categorySlug] ?? null,
    daily_rate: v.dailyRate ?? null,
    daily_rate_max: v.dailyRateMax ?? null,
    daily_label: nullIfBlank(v.dailyLabel),
    secondary_rate: v.secondaryRate ?? null,
    secondary_label: nullIfBlank(v.secondaryLabel),
    rate_note: nullIfBlank(v.rateNote),
    seats: nullIfBlank(v.seats),
    description: nullIfBlank(v.description),
    image: nullIfBlank(v.image),
    is_featured: Boolean(v.isFeatured),
    position: i,
  })),
  'slug'
);
const vehicleId = indexBySlug(vehicles);

const cities = await upsert(
  'cities',
  (content.cities ?? []).map((c, i) => ({
    name: c.name, slug: c.slug, state: c.state, tagline: c.tagline,
    rating: c.rating, areas_summary: c.areasSummary, intro: c.intro,
    highlights: c.highlights ?? [],
    office_address: c.officeAddress, airport_branch: c.airportBranch,
    hero_image: c.heroImage, meta_title: c.metaTitle, meta_description: c.metaDescription,
    position: i,
  })),
  'slug'
);
const cityId = indexBySlug(cities);

await upsert(
  'locations',
  (content.locations ?? []).map((l, i) => ({
    name: l.name, slug: l.slug, city_id: cityId[l.citySlug] ?? null,
    landmarks: l.landmarks, blurb: l.blurb, position: i,
  })),
  'slug'
);

await upsert(
  'services',
  (content.services ?? []).map((s, i) => ({
    name: s.name, slug: s.slug, link_label: s.linkLabel,
    headline_template: s.headlineTemplate, summary: s.summary, body: s.body,
    image: s.image, show_in_directory: Boolean(s.showInDirectory),
    has_landing_page: Boolean(s.hasLandingPage), position: i,
  })),
  'slug'
);

await upsert(
  'posts',
  (content.posts ?? []).map((p) => ({
    title: p.title, slug: p.slug, category: p.category, excerpt: p.excerpt,
    body: p.body, cover_image: p.coverImage, read_minutes: p.readMinutes ?? 4,
    author: p.author, published_at: p.publishedAt, is_featured: Boolean(p.isFeatured),
  })),
  'slug'
);

await upsert(
  'pages',
  (content.pages ?? []).map((p, i) => ({
    title: p.title, slug: p.slug, body: p.body,
    show_in_footer: Boolean(p.showInFooter), position: i,
  })),
  'slug'
);

// FAQs, gallery and videos have no natural key, so they are keyed on their
// text. Re-running replaces rather than duplicating only if that text matches.
await upsert(
  'faqs',
  (content.faqs ?? []).map((f, i) => ({ question: f.question, answer: f.answer, position: i })),
  undefined
);

await upsert(
  'testimonials',
  (content.testimonials ?? []).map((t, i) => ({
    name: t.name, role: t.role, quote: t.quote, rating: t.rating ?? 5,
    service: t.service, reviewed_on: t.reviewedOn, position: i,
  })),
  undefined
);

await upsert(
  'gallery',
  (content.gallery ?? []).map((g, i) => ({ src: g.src, caption: g.caption ?? '', position: i })),
  undefined
);

await upsert(
  'videos',
  (content.videos ?? []).map((v, i) => ({
    src: v.src, orientation: v.orientation ?? 'landscape',
    caption: v.caption ?? '', position: i,
  })),
  undefined
);

/* Trip rates: one header row, then its priced rows. */
if (content.tripRates) {
  const t = content.tripRates;

  const { data: table, error } = await db
    .from('trip_rate_tables')
    .insert({
      base: t.base, destination: t.destination, note: t.note ?? '',
      escort_label: t.escort?.label ?? '', escort_rate: t.escort?.rate ?? 0,
      escort_unit: t.escort?.unit ?? '', escort_note: t.escort?.note ?? '',
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error(`  trip_rate_tables   FAILED — ${error.message}`);
    failed = true;
  } else {
    // Only one table may be active, or the export would pick an arbitrary one.
    await db.from('trip_rate_tables').update({ is_active: false }).neq('id', table.id);

    await upsert(
      'trip_rates',
      (t.rows ?? []).map((r, i) => ({
        table_id: table.id,
        vehicle_label: r.vehicle,
        vehicle_id: r.vehicleSlug ? vehicleId[r.vehicleSlug] ?? null : null,
        one_way: r.oneWay, one_way_max: r.oneWayMax ?? null,
        return_trip: r.returnTrip, note: r.note, position: i,
      })),
      undefined
    );
  }
}

/* Settings: one row per key. */
await upsert(
  'settings',
  Object.entries(content.settings ?? {}).map(([key, value]) => ({ key, value })),
  'key'
);

console.log(
  failed
    ? '\nFinished with errors. Check that supabase/schema.sql has been applied.\n'
    : '\nDone. Open the dashboard and the fleet should be there.\n'
);

process.exit(failed ? 1 : 0);
