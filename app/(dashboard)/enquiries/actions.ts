'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ENQUIRY_STATUSES, type EnquiryStatus } from '@/lib/types';

export async function setStatus(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  const status = String(fd.get('status') ?? '') as EnquiryStatus;

  // Guard the value: it reaches a CHECK-constrained column, and an invalid
  // one would fail as a database error rather than a handled rejection.
  if (!id || !ENQUIRY_STATUSES.includes(status)) return;

  const supabase = await createClient();
  await supabase.from('enquiries').update({ status }).eq('id', id);

  revalidatePath('/enquiries');
  revalidatePath('/');
}

/**
 * Removes an enquiry outright.
 *
 * Enquiries are a record of someone asking for a quote, so this is deliberate
 * rather than routine — the dashboard asks before calling it. Marking one
 * "closed" is usually the better move; this is for spam and duplicates.
 */
export async function deleteEnquiry(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  await supabase.from('enquiries').delete().eq('id', id);

  revalidatePath('/enquiries');
}
