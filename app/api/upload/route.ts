import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKET, UPLOAD_MAX_BYTES } from '@/lib/env';
import { slugify } from '@/lib/types';

export const runtime = 'nodejs';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
};

export async function POST(request: Request) {
  // The proxy already blocks anonymous requests, but an API route is worth
  // checking on its own — it is reachable by anything holding a session cookie.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Images only — JPEG, PNG, WebP or AVIF.' },
      { status: 415 }
    );
  }

  if (file.size > UPLOAD_MAX_BYTES) {
    const mb = Math.round(UPLOAD_MAX_BYTES / 1024 / 1024);
    return NextResponse.json({ error: `That image is larger than ${mb}MB.` }, { status: 413 });
  }

  // Rebuild the filename rather than trusting the one the browser sent: it can
  // contain path separators, spaces and non-ASCII that break object keys.
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
  const key = `fleet/${Date.now()}-${base}.${EXTENSIONS[file.type]}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl, key });
}
