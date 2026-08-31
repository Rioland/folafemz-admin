'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getResource, type Field, type Resource } from '@/lib/resources';

export type FormState = { error?: string } | null;

/**
 * Turns submitted form values into a database row, using the resource's field
 * definitions to decide how each column should be read.
 */
function buildRow(resource: Resource, fd: FormData): Record<string, unknown> | { error: string } {
  const row: Record<string, unknown> = {};

  for (const field of resource.fields) {
    const raw = fd.get(field.column);
    const value = typeof raw === 'string' ? raw.trim() : '';

    switch (field.type) {
      case 'boolean':
        // An unchecked box submits nothing at all, which is the false case.
        row[field.column] = fd.get(field.column) === 'on';
        break;

      case 'number': {
        if (value === '') {
          if (field.required) return { error: `${field.label} is required.` };
          row[field.column] = field.fallback ?? null;
          break;
        }
        const n = Number(value.replace(/[, ]/g, ''));
        if (!Number.isFinite(n)) {
          return { error: `${field.label} must be a number.` };
        }
        row[field.column] = n;
        break;
      }

      case 'lines':
        // Stored as a JSON array; blank lines are dropped rather than saved.
        row[field.column] = value.split('\n').map((l) => l.trim()).filter(Boolean);
        break;

      case 'reference':
        if (value === '') {
          if (field.required) return { error: `${field.label} is required.` };
          row[field.column] = null;
        } else {
          row[field.column] = value;
        }
        break;

      case 'date':
        row[field.column] = value === '' ? null : value;
        break;

      default:
        if (field.required && value === '') {
          return { error: `${field.label} is required.` };
        }
        // Empty stores the declared fallback where the column is NOT NULL, and
        // otherwise clears it rather than saving a blank string.
        row[field.column] = value === '' ? (field.fallback ?? null) : value;
    }
  }

  return row;
}

const friendly = (code?: string, message?: string) => {
  if (code === '23505') return 'Another entry already uses that web address.';
  if (code === '23503') return 'That reference points at something that no longer exists.';
  return message || 'Could not save.';
};

export async function createRow(_prev: FormState, fd: FormData): Promise<FormState> {
  const key = String(fd.get('__resource') ?? '');
  const resource = getResource(key);
  if (!resource) return { error: 'Unknown section.' };

  const row = buildRow(resource, fd);
  if ('error' in row) return row as FormState;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(resource.table)
    .insert(row as Record<string, unknown>)
    .select('id')
    .single();

  if (error) return { error: friendly(error.code, error.message) };

  revalidatePath(`/content/${key}`);
  redirect(`/content/${key}/${data.id}?saved=1`);
}

export async function updateRow(_prev: FormState, fd: FormData): Promise<FormState> {
  const key = String(fd.get('__resource') ?? '');
  const id = String(fd.get('__id') ?? '');
  const resource = getResource(key);

  if (!resource) return { error: 'Unknown section.' };
  if (!id) return { error: 'Missing id.' };

  const row = buildRow(resource, fd);
  if ('error' in row) return row as FormState;

  const supabase = await createClient();
  const { error } = await supabase
    .from(resource.table)
    .update(row as Record<string, unknown>)
    .eq('id', id);

  if (error) return { error: friendly(error.code, error.message) };

  // Only one trip rate table may be active, or the export picks arbitrarily.
  if (resource.table === 'trip_rate_tables' && row.is_active === true) {
    await supabase.from('trip_rate_tables').update({ is_active: false }).neq('id', id);
  }

  revalidatePath(`/content/${key}`);
  revalidatePath(`/content/${key}/${id}`);
  redirect(`/content/${key}/${id}?saved=1`);
}

export async function deleteRow(fd: FormData) {
  const key = String(fd.get('__resource') ?? '');
  const id = String(fd.get('__id') ?? '');
  const resource = getResource(key);

  if (!resource || !id) return;

  const supabase = await createClient();
  await supabase.from(resource.table).delete().eq('id', id);

  revalidatePath(`/content/${key}`);
  redirect(`/content/${key}`);
}

/** Options for a reference field, loaded server-side for the form. */
export async function referenceOptions(field: Field) {
  if (!field.refTable || !field.refLabel) return [];

  const supabase = await createClient();
  // The select list is built at runtime, so the client cannot infer a row type
  // from it — .returns<>() supplies one instead of letting inference fail.
  const { data } = await supabase
    .from(field.refTable)
    .select(`id, ${field.refLabel}`)
    .order(field.refLabel)
    .returns<Record<string, unknown>[]>();

  return (data ?? []).map((row) => ({
    id: String(row.id),
    label: String(row[field.refLabel as string] ?? ''),
  }));
}
