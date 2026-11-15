'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { MailSettings } from '@/lib/types';

export type MailState = { error?: string; ok?: string } | null;

type Row = MailSettings & { smtp_password: string };

const COLUMNS = 'to_address, smtp_host, smtp_port, smtp_user, smtp_password, from_name';

/** The stored row, with the password reduced to a yes/no for the browser. */
export async function loadMailSettings(): Promise<{ settings: MailSettings | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mail_settings')
    .select(COLUMNS)
    .eq('id', 1)
    .maybeSingle<Row>();

  if (error) return { settings: null, error: error.message };
  if (!data) return { settings: null };

  const { smtp_password, ...rest } = data;
  return { settings: { ...rest, has_password: smtp_password !== '' } };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();

/**
 * Saves the one row. A blank password keeps the one already stored, so the
 * form never has to echo the secret back to the browser to avoid wiping it.
 */
export async function saveMailSettings(_prev: MailState, fd: FormData): Promise<MailState> {
  const to_address = field(fd, 'to_address');
  const smtp_host = field(fd, 'smtp_host');
  const smtp_user = field(fd, 'smtp_user');
  const from_name = field(fd, 'from_name') || 'Website enquiry';
  const password = String(fd.get('smtp_password') ?? '');
  const smtp_port = Number(field(fd, 'smtp_port') || 465);

  if (to_address && !EMAIL.test(to_address)) return { error: 'The enquiry address does not look like an email address.' };
  if (!Number.isInteger(smtp_port) || smtp_port < 1 || smtp_port > 65535) return { error: 'The SMTP port must be a number between 1 and 65535.' };
  if (smtp_user && !EMAIL.test(smtp_user)) return { error: 'The SMTP username is normally the full mailbox address.' };

  const supabase = await createClient();

  const update: Record<string, unknown> = {
    id: 1, to_address, smtp_host, smtp_port, smtp_user, from_name,
    updated_at: new Date().toISOString(),
  };
  if (password !== '') update.smtp_password = password;

  const { error } = await supabase.from('mail_settings').upsert(update, { onConflict: 'id' });
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { ok: 'Email settings saved.' };
}

/**
 * Sends a short message to the enquiry address with the saved SMTP account,
 * so a wrong host or password shows up here rather than in a lost enquiry.
 */
export async function sendTestEmail(): Promise<MailState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mail_settings')
    .select(COLUMNS)
    .eq('id', 1)
    .maybeSingle<Row>();

  if (error) return { error: error.message };
  if (!data?.to_address) return { error: 'Save an enquiry address first.' };
  if (!data.smtp_host || !data.smtp_user || !data.smtp_password) {
    return { error: 'Fill in the SMTP host, username and password, save, then try again.' };
  }

  const nodemailer = (await import('nodemailer')).default;
  const transport = nodemailer.createTransport({
    host: data.smtp_host,
    port: data.smtp_port,
    secure: data.smtp_port === 465,
    auth: { user: data.smtp_user, pass: data.smtp_password },
    connectionTimeout: 15_000,
  });

  try {
    await transport.sendMail({
      from: `"${data.from_name || 'Website enquiry'}" <${data.smtp_user}>`,
      to: data.to_address,
      subject: 'Test message from the Folafemz admin',
      text: 'If you are reading this, booking enquiries from the website will reach this inbox.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `The mail server refused the message: ${message}` };
  }

  return { ok: `Test message sent to ${data.to_address}. Check the inbox (and spam).` };
}
