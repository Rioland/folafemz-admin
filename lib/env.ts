/**
 * Environment access in one place, so a missing key fails with a sentence that
 * says what to do rather than "undefined is not a string" three layers down.
 *
 * NEXT_PUBLIC_* values are read through static `process.env.NAME` member access
 * on purpose. Next.js substitutes those at build time by matching the literal
 * expression, so a dynamic lookup like `process.env[name]` would survive into
 * the browser bundle unreplaced and evaluate to undefined at runtime.
 */

const PUBLIC = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

function must(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in — ` +
        'the value is in your Supabase dashboard under Project Settings → API.'
    );
  }
  return value;
}

export const SUPABASE_URL = () =>
  must(PUBLIC.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');

export const SUPABASE_ANON_KEY = () =>
  must(PUBLIC.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

/** Server-only: never referenced from a client component, so no inlining concern. */
export const SUPABASE_SERVICE_KEY = () =>
  must(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');

export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';

export const UPLOAD_MAX_BYTES =
  Number(process.env.UPLOAD_MAX_MB || 8) * 1024 * 1024;

/** Videos are allowed to be much larger than stills. */
export const VIDEO_MAX_BYTES =
  Number(process.env.VIDEO_MAX_MB || 50) * 1024 * 1024;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const DEPLOY_HOOK_URL = process.env.DEPLOY_HOOK_URL || '';

/**
 * Optional allowlist. Empty means "any user in Supabase Auth may sign in",
 * which is safe because there is no public sign-up — users are created by
 * hand in the Supabase dashboard.
 */
export function emailAllowed(email: string | null | undefined): boolean {
  const raw = (process.env.ADMIN_ALLOWED_EMAILS || '').trim();
  if (!raw) return true;
  if (!email) return false;

  const allowed = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
