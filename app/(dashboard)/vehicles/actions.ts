'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/types';

export type FormState = { error?: string } | null;

/** "" → null, so an emptied field clears the column instead of storing a blank. */
const text = (fd: FormData, key: string): string | null => {
  const v = String(fd.get(key) ?? '').trim();
  return v === '' ? null : v;
};

/**
 * Money and counts. Rejects negatives and anything non-numeric rather than
 * letting NaN reach Postgres, where it would fail with a less useful message.
 */
function integer(fd: FormData, key: string): number | null | { error: string } {
  const raw = String(fd.get(key) ?? '').trim().replace(/[, ]/g, '');
  if (raw === '') return null;

  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return { error: `${key.replace(/_/g, ' ')} must be a whole number of naira.` };
  }
  return n;
}

function payloadFrom(fd: FormData): Record<string, unknown> | { error: string } {
  const name = String(fd.get('name') ?? '').trim();
  if (!name) return { error: 'The vehicle needs a name.' };

  const slug = slugify(String(fd.get('slug') ?? '').trim() || name);
  if (!slug) return { error: 'That name does not produce a usable web address.' };

  const numbers: Record<string, number | null> = {};
  for (const key of ['daily_rate', 'daily_rate_max', 'secondary_rate', 'position']) {
    const value = integer(fd, key);
    if (value !== null && typeof value === 'object') return value;
    numbers[key] = value;
  }

  if (
    numbers.daily_rate !== null && numbers.daily_rate_max !== null &&
    numbers.daily_rate_max! < numbers.daily_rate!
  ) {
    return { error: 'The top of the rate band cannot be lower than the bottom.' };
  }

  return {
    name,
    slug,
    category_id: text(fd, 'category_id'),
    daily_rate: numbers.daily_rate,
    daily_rate_max: numbers.daily_rate_max,
    daily_label: text(fd, 'daily_label'),
    secondary_rate: numbers.secondary_rate,
    secondary_label: text(fd, 'secondary_label'),
    rate_note: text(fd, 'rate_note'),
    seats: text(fd, 'seats'),
    description: text(fd, 'description'),
    image: text(fd, 'image'),
    is_featured: fd.get('is_featured') === 'on',
    position: numbers.position ?? 0,
  };
}

/** Postgres 23505 is a unique-violation; the only unique column here is the slug. */
const friendly = (code?: string, message?: string) =>
  code === '23505'
    ? 'Another vehicle already uses that web address. Change the slug.'
    : message || 'Could not save the vehicle.';

export async function createVehicle(_prev: FormState, fd: FormData): Promise<FormState> {
  const payload = payloadFrom(fd);
  if ('error' in payload) return payload as FormState;

  const supabase = await createClient();
  const { data, error } = await supabase.from('vehicles').insert(payload).select('slug').single();

  if (error) return { error: friendly(error.code, error.message) };

  revalidatePath('/vehicles');
  redirect(`/vehicles/${data.slug}?saved=1`);
}

export async function updateVehicle(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id') ?? '');
  if (!id) return { error: 'Missing vehicle id.' };

  const payload = payloadFrom(fd);
  if ('error' in payload) return payload as FormState;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vehicles').update(payload).eq('id', id).select('slug').single();

  if (error) return { error: friendly(error.code, error.message) };

  revalidatePath('/vehicles');
  revalidatePath(`/vehicles/${data.slug}`);
  redirect(`/vehicles/${data.slug}?saved=1`);
}

export async function deleteVehicle(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  await supabase.from('vehicles').delete().eq('id', id);

  revalidatePath('/vehicles');
  redirect('/vehicles');
}
