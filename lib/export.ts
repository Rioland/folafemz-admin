import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Rebuilds the exact object the public site's data/content.json holds.
 *
 * This is the successor to the Laravel scripts/export-content.php: the shapes
 * and key names below must match lib/content.ts on the public site, because
 * that file consumes this output with no transformation of its own.
 */
export async function buildContent() {
  const db = createAdminClient();

  const [
    settingRows, categories, vehicles, cities, locations,
    services, posts, faqs, pages, testimonials,
    tripTables, gallery, videos,
  ] = await Promise.all([
    db.from('settings').select('key, value'),
    db.from('categories').select('*').order('position'),
    db.from('vehicles').select('*, categories(name, slug)').order('position').order('name'),
    db.from('cities').select('*').order('position'),
    db.from('locations').select('*, cities(name, slug)').order('position'),
    db.from('services').select('*').order('position'),
    db.from('posts').select('*').order('published_at', { ascending: false }),
    db.from('faqs').select('*').order('position'),
    db.from('pages').select('*').order('position'),
    db.from('testimonials').select('*').order('position'),
    db.from('trip_rate_tables').select('*').eq('is_active', true).limit(1),
    db.from('gallery').select('*').order('position'),
    db.from('videos').select('*').order('position'),
  ]);

  const firstError = [
    settingRows, categories, vehicles, cities, locations, services,
    posts, faqs, pages, testimonials, tripTables, gallery, videos,
  ].find((r) => r.error)?.error;

  if (firstError) throw new Error(firstError.message);

  const settings: Record<string, unknown> = {};
  for (const row of settingRows.data ?? []) settings[row.key] = row.value;

  const table = tripTables.data?.[0];
  let tripRates: unknown = null;

  if (table) {
    const { data: rows } = await db
      .from('trip_rates').select('*, vehicles(slug)')
      .eq('table_id', table.id).order('position');

    tripRates = {
      base: table.base,
      destination: table.destination,
      note: table.note,
      rows: (rows ?? []).map((r) => ({
        vehicle: r.vehicle_label,
        vehicleSlug: r.vehicles?.slug ?? null,
        oneWay: r.one_way,
        oneWayMax: r.one_way_max,
        returnTrip: r.return_trip,
        note: r.note,
      })),
      escort: {
        label: table.escort_label,
        rate: table.escort_rate,
        unit: table.escort_unit,
        note: table.escort_note,
      },
    };
  }

  return {
    settings,
    categories: (categories.data ?? []).map((c) => ({ name: c.name, slug: c.slug })),
    vehicles: (vehicles.data ?? []).map((v) => ({
      name: v.name,
      slug: v.slug,
      category: v.categories?.name ?? '',
      categorySlug: v.categories?.slug ?? '',
      dailyRate: v.daily_rate,
      dailyLabel: v.daily_label,
      secondaryRate: v.secondary_rate,
      secondaryLabel: v.secondary_label,
      rateNote: v.rate_note,
      seats: v.seats,
      description: v.description,
      image: v.image,
      isFeatured: v.is_featured,
      dailyRateMax: v.daily_rate_max,
    })),
    cities: (cities.data ?? []).map((c) => ({
      name: c.name, slug: c.slug, state: c.state, tagline: c.tagline,
      rating: c.rating, areasSummary: c.areas_summary, intro: c.intro,
      highlights: c.highlights ?? [],
      officeAddress: c.office_address, airportBranch: c.airport_branch,
      heroImage: c.hero_image, metaTitle: c.meta_title, metaDescription: c.meta_description,
    })),
    locations: (locations.data ?? []).map((l) => ({
      name: l.name, slug: l.slug,
      city: l.cities?.name ?? '', citySlug: l.cities?.slug ?? '',
      landmarks: l.landmarks, blurb: l.blurb,
    })),
    services: (services.data ?? []).map((s) => ({
      name: s.name, slug: s.slug, linkLabel: s.link_label,
      headlineTemplate: s.headline_template, summary: s.summary, body: s.body,
      image: s.image, showInDirectory: s.show_in_directory, hasLandingPage: s.has_landing_page,
    })),
    posts: (posts.data ?? []).map((p) => ({
      title: p.title, slug: p.slug, category: p.category, excerpt: p.excerpt,
      body: p.body, coverImage: p.cover_image, readMinutes: p.read_minutes,
      author: p.author, publishedAt: p.published_at, isFeatured: p.is_featured,
    })),
    faqs: (faqs.data ?? []).map((f) => ({ question: f.question, answer: f.answer })),
    pages: (pages.data ?? []).map((p) => ({
      title: p.title, slug: p.slug, body: p.body, showInFooter: p.show_in_footer,
    })),
    testimonials: (testimonials.data ?? []).map((t) => ({
      name: t.name, role: t.role, quote: t.quote,
      rating: t.rating, service: t.service, reviewedOn: t.reviewed_on,
    })),
    tripRates,
    gallery: (gallery.data ?? []).map((g) => ({ src: g.src, caption: g.caption })),
    videos: (videos.data ?? []).map((v) => ({
      src: v.src, orientation: v.orientation, caption: v.caption,
    })),
  };
}
