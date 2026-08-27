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
