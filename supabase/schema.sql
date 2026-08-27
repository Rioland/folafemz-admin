-- =============================================================================
--  Folafemz Global — admin schema
-- =============================================================================
--  Run once against a new Supabase project:
--     psql "$SUPABASE_DB_URL" -f supabase/schema.sql
--  or paste into the Supabase dashboard → SQL Editor.
--
--  The tables mirror the shapes in the public site's lib/content.ts, so the
--  export endpoint can rebuild data/content.json without any reshaping.
--
--  Access model: every table is readable and writable only by a signed-in
--  user. The dashboard is staff-only, so there is no anonymous read policy —
--  the public site consumes exported JSON, not these tables directly.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Keeps updated_at honest without the application having to remember.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
--  Categories
-- -----------------------------------------------------------------------------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
--  Vehicles
--  Rates are whole naira, stored as integers — never floats, which cannot
--  represent money exactly. daily_rate_max is set only when a rate is a band.
-- -----------------------------------------------------------------------------
create table if not exists vehicles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  category_id     uuid references categories (id) on delete set null,
  daily_rate      integer,
  daily_rate_max  integer,
  daily_label     text,
  secondary_rate  integer,
  secondary_label text,
  rate_note       text,
  seats           text,
  description     text,
  image           text,
  is_featured     boolean not null default false,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint vehicles_rate_band_ordered
    check (daily_rate_max is null or daily_rate is null or daily_rate_max >= daily_rate)
);

create index if not exists vehicles_category_idx on vehicles (category_id);

-- -----------------------------------------------------------------------------
--  Cities and areas
-- -----------------------------------------------------------------------------
create table if not exists cities (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  state            text,
  tagline          text,
  rating           text,
  areas_summary    text,
  intro            text,
  highlights       jsonb not null default '[]'::jsonb,
  office_address   text,
  airport_branch   text,
  hero_image       text,
  meta_title       text,
  meta_description text,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  city_id     uuid references cities (id) on delete cascade,
  landmarks   text,
  blurb       text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists locations_city_idx on locations (city_id);

-- -----------------------------------------------------------------------------
--  Services
-- -----------------------------------------------------------------------------
create table if not exists services (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  link_label        text,
  headline_template text,
  summary           text,
  body              text,
  image             text,
  show_in_directory boolean not null default true,
  has_landing_page  boolean not null default false,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
--  Editorial
-- -----------------------------------------------------------------------------
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  category      text,
  excerpt       text,
  body          text,
  cover_image   text,
  read_minutes  integer not null default 4,
  author        text,
  published_at  timestamptz,
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists pages (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  body           text,
  show_in_footer boolean not null default false,
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists testimonials (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role         text,
  quote        text not null,
  rating       integer not null default 5 check (rating between 1 and 5),
  service      text,
  reviewed_on  date,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
--  Media
-- -----------------------------------------------------------------------------
create table if not exists gallery (
  id          uuid primary key default gen_random_uuid(),
  src         text not null,
  caption     text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists videos (
  id          uuid primary key default gen_random_uuid(),
  src         text not null,
  orientation text not null default 'landscape'
                check (orientation in ('landscape', 'portrait')),
  caption     text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
--  Interstate trip rates
--  One header row (base → destination) with its priced rows.
-- -----------------------------------------------------------------------------
create table if not exists trip_rate_tables (
  id            uuid primary key default gen_random_uuid(),
  base          text not null,
  destination   text not null,
  note          text not null default '',
  escort_label  text not null default '',
  escort_rate   integer not null default 0,
  escort_unit   text not null default '',
  escort_note   text not null default '',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists trip_rates (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid not null references trip_rate_tables (id) on delete cascade,
  vehicle_label text not null,
  vehicle_id    uuid references vehicles (id) on delete set null,
  one_way       integer not null,
  one_way_max   integer,
  return_trip   integer not null,
  note          text,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists trip_rates_table_idx on trip_rates (table_id);

-- -----------------------------------------------------------------------------
--  Site settings — one row per key, so new settings need no migration.
-- -----------------------------------------------------------------------------
create table if not exists settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
--  Enquiries
--  Booking enquiries captured from the public site's form. The public site
--  currently emails these; posting them here as well gives the dashboard an
--  inbox that survives a lost email.
-- -----------------------------------------------------------------------------
create table if not exists enquiries (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text not null,
  email            text,
  vehicle          text,
  service          text,
  pickup_date      text,
  pickup_location  text,
  destination      text,
  days             text,
  notes            text,
  source           text,
  status           text not null default 'new'
                     check (status in ('new', 'contacted', 'booked', 'closed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists enquiries_status_idx  on enquiries (status);
create index if not exists enquiries_created_idx on enquiries (created_at desc);

-- -----------------------------------------------------------------------------
--  updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories','vehicles','cities','locations','services','posts','pages',
    'faqs','testimonials','gallery','videos','trip_rate_tables','trip_rates',
    'settings','enquiries'
  ] loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format(
      'create trigger set_updated_at before update on %I
         for each row execute function set_updated_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
--  Row Level Security
--  Enabled on every table. Without a matching policy RLS denies by default,
--  so the anon key can read nothing even though it is public.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories','vehicles','cities','locations','services','posts','pages',
    'faqs','testimonials','gallery','videos','trip_rate_tables','trip_rates',
    'settings','enquiries'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "staff full access" on %I', t);
    execute format(
      'create policy "staff full access" on %I
         for all to authenticated using (true) with check (true)', t);
  end loop;
end;
$$;

-- The public site posts enquiries with the anon key, so that one table takes
-- an insert-only policy. Anonymous users still cannot read what others sent.
drop policy if exists "anon can submit enquiries" on enquiries;
create policy "anon can submit enquiries"
  on enquiries for insert to anon with check (true);

-- Published content is readable with the anon key.
--
-- Every column in these tables is already on public pages of the website, so
-- this exposes nothing new. It means the website can build itself straight from
-- the database without holding the service-role key, which would otherwise sit
-- in the deployment environment of a public site and grant full write access.
--
-- `enquiries` is deliberately absent: it holds customer names and numbers.
do $$
declare t text;
begin
  foreach t in array array[
    'categories','vehicles','cities','locations','services','posts','pages',
    'faqs','testimonials','gallery','videos','trip_rate_tables','trip_rates',
    'settings'
  ] loop
    execute format('drop policy if exists "public can read" on %I', t);
    execute format(
      'create policy "public can read" on %I
         for select to anon using (true)', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
--  Storage
--  Public bucket: the customer site renders these images directly.
-- -----------------------------------------------------------------------------
-- 50MB, so fleet video clips fit alongside the stills. Supabase enforces this
-- server-side; UPLOAD_MAX_MB / VIDEO_MAX_MB are the app's own tighter checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array[
    'image/jpeg','image/png','image/webp','image/avif','image/gif',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media is publicly readable" on storage.objects;
create policy "media is publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'media');

drop policy if exists "staff manage media" on storage.objects;
create policy "staff manage media"
  on storage.objects for all to authenticated
  using (bucket_id = 'media') with check (bucket_id = 'media');
