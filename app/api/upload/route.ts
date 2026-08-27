import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKET, UPLOAD_MAX_BYTES, VIDEO_MAX_BYTES } from '@/lib/env';
import { slugify } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Accepted types and the extension each is stored with. Rebuilding the
 * extension from the MIME type, rather than trusting the uploaded filename,
 * keeps a mislabelled or hostile name from deciding the object key.
 */
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/avif': 'avif', 'image/gif': 'gif',
};

const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
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
  // Which folder to file it under; falls back to a sensible default.
  const folder = slugify(String(form.get('folder') ?? '')) || 'uploads';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }

  const isImage = file.type in IMAGE_TYPES;
  const isVideo = file.type in VIDEO_TYPES;

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: 'Images (JPEG, PNG, WebP, AVIF, GIF) and videos (MP4, WebM, MOV) only.' },
      { status: 415 }
    );
  }

  const limit = isVideo ? VIDEO_MAX_BYTES : UPLOAD_MAX_BYTES;
  if (file.size > limit) {
    const mb = Math.round(limit / 1024 / 1024);
    const kind = isVideo ? 'video' : 'image';
    return NextResponse.json(
      { error: `That ${kind} is ${Math.round(file.size / 1024 / 1024)}MB — the limit is ${mb}MB.` },
      { status: 413 }
    );
  }

  const extension = isVideo ? VIDEO_TYPES[file.type] : IMAGE_TYPES[file.type];
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'file';
  const key = `${folder}/${Date.now()}-${base}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return NextResponse.json({
    url: data.publicUrl,
    key,
    kind: isVideo ? 'video' : 'image',
  });
}
