# Folafemz Admin

Staff dashboard for [folafemzglobal.com](https://folafemzglobal.com) — fleet,
content, settings and the booking-enquiry inbox. Next.js 16 on the App Router,
with Supabase for the database, authentication and file storage.

It is a **separate application** from the public site in `../folafemzglobal`.
Nothing here is customer-facing, and the whole app sits behind a login.

---

## Getting set up

### 1. Create a Supabase project

<https://supabase.com/dashboard> → New project. Note the database password —
it appears once, and the connection string needs it.

### 2. Fill in the environment

```bash
cp .env.example .env.local
```

Every key is documented in `.env.example`. The four you cannot start without:

| Key | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (**secret**) |
| `DIRECT_URL` | Project Settings → Database → Connection string, session mode (port 5432) |

`.env.local` is gitignored. `.env.example` is committed and must never hold a
real value.

### 3. Create the tables

```bash
psql "$DIRECT_URL" -f supabase/schema.sql
```

Use `DIRECT_URL` here, not `DATABASE_URL`. The session-mode pooler on port
5432 holds one backend connection for the whole session; the transaction-mode
pooler on 6543 hands each statement to a different connection, which breaks the
multi-statement `DO $$ ... $$` blocks this schema uses for its triggers and RLS
policies.

No `psql` to hand? Paste the file into the Supabase dashboard's SQL Editor and
run it. It creates 15 tables, their `updated_at` triggers, Row Level Security
policies, and the public `media` storage bucket.

### 4. Bring across the existing content

```bash
npm install
npm run import
```

This reads `../folafemzglobal/data/content.json` and loads all of it — 27
vehicles, 5 cities, 29 areas, 10 services, the posts, FAQs, trip rates and every
site setting. Re-running updates rows in place instead of duplicating them, so
it is safe to run more than once.

Importing from somewhere else:

```bash
npm run import -- /path/to/content.json
```

### 5. Create your login

Supabase dashboard → Authentication → Users → **Add user**, with "Auto confirm"
ticked. There is deliberately no sign-up page: accounts are made by hand.

To restrict which addresses may sign in, list them in `ADMIN_ALLOWED_EMAILS`,
comma-separated. Leaving it empty allows any user in the project.

### 6. Run it

```bash
npm run dev
```

<http://localhost:3001> — port 3001, so it can run alongside the public site on
3000.

---

## Getting changes onto the live site

The public site does not read Supabase. It compiles `data/content.json` at build
time, which is what makes it fast and cheap to host. So publishing is two steps:

1. **Download content.json** — the button on the Overview page, or
   `GET /api/export?download=1`. Drop the file into
   `../folafemzglobal/data/content.json` and commit it.
2. **Publish to site** — posts to `DEPLOY_HOOK_URL`, triggering a rebuild.
   Without that key set, the button says so rather than pretending.

To close the loop properly, point the public site at `/api/export` in a build
step, or have this app commit the file for you. Both are worth doing; neither is
built yet.

---

## How it fits together

```
app/
  login/              Sign-in. The only route outside the auth gate.
  (dashboard)/        Everything behind the login.
    page.tsx          Counts and the latest enquiries.
    vehicles/         Fleet list, editor, create, delete.
    enquiries/        Booking inbox with status tracking.
    content/          Every other website section, driven by lib/resources.ts.
      [resource]/     List, create and edit for each one.
    settings/         Site-wide settings, grouped.
  api/
    upload/           Image upload → Supabase Storage.
    export/           Rebuilds content.json from the database.
    publish/          Pokes the public site's deploy hook.
lib/
  resources.ts        Field definitions for every editable section.
  supabase/server.ts  Server client. cookies() is async in Next 16.
  supabase/client.ts  Browser client.
  supabase/admin.ts   Service-role client. server-only.
  export.ts           Database → the public site's JSON shape.
proxy.ts              The auth gate.
supabase/schema.sql   Tables, triggers, RLS, storage bucket.
scripts/              One-off content import.
```

## Editing the website

Every section is editable from the sidebar: fleet categories, cities, areas,
services, blog posts, pages, FAQs, testimonials, gallery, videos and the
interstate trip rates. Vehicles and settings have their own screens; the rest
are generated from a single config.

To add a field to a section, or add a section entirely, edit `lib/resources.ts`.
Each entry names its table, the columns to show in the list, and one `Field` per
editable column. The list view, the form, validation and the database write all
read from that, so nothing else needs changing.

Field types available: `text`, `textarea`, `richtext`, `number`, `boolean`,
`lines` (a JSON array, one entry per line), `select`, `reference` (a dropdown
of rows from another table), `image` (with upload) and `date`.

Where a row has a page on the live site, the list and editor show a **View**
link straight to it, built from `NEXT_PUBLIC_SITE_URL`.

### Two notes on Next.js 16

- **`proxy.ts`, not `middleware.ts`.** Version 16 renamed the convention; the
  exported function must be called `proxy`, and it runs on the Node.js runtime.
- **Request APIs are async.** `cookies()`, `params` and `searchParams` are all
  Promises now — the synchronous access allowed during version 15 was removed.

### On the keys

`NEXT_PUBLIC_*` values are compiled into the browser bundle and are readable by
anyone who loads the page. The anon key is meant to be public: it can only do
what the RLS policies in `schema.sql` permit, which is why those policies are
the real access control.

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS completely. It is imported only through
`lib/supabase/admin.ts`, which is marked `server-only` so that importing it from
a client component fails the build rather than leaking the key. If it is ever
exposed, rotate it in the Supabase dashboard.
