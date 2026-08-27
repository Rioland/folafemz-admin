'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SettingsState = { error?: string; ok?: boolean } | null;

/**
 * Settings are key/value rows, so the form posts whatever keys it renders and
 * this writes them back verbatim. Multi-line fields (phoneAlt, trustPoints)
 * are stored as JSON arrays, one entry per line.
 */
const ARRAY_KEYS = new Set(['phoneAlt', 'trustPoints']);

export async function saveSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const rows: { key: string; value: unknown }[] = [];

  for (const [key, raw] of fd.entries()) {
    if (typeof raw !== 'string') continue;

    const value = ARRAY_KEYS.has(key)
      ? raw.split('\n').map((line) => line.trim()).filter(Boolean)
      : raw.trim();

    rows.push({ key, value });
  }

  if (rows.length === 0) return { error: 'Nothing to save.' };

  const supabase = await createClient();
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });

  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}
