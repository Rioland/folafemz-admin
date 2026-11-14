'use client';

import { useActionState, useTransition, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveMailSettings, sendTestEmail, type MailState } from '@/app/(dashboard)/settings/mail-actions';
import type { MailSettings } from '@/lib/types';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save email settings'}
    </button>
  );
}

/**
 * Where enquiries go and the account that sends them. Lives in its own table
 * and its own form: the password must not travel with the public settings,
 * and saving one should not depend on the other.
 */
export function MailSettingsForm({ settings }: { settings: MailSettings | null }) {
  const [state, action] = useActionState(saveMailSettings, null);
  const [testState, setTestState] = useState<MailState>(null);
  const [testing, startTest] = useTransition();

  const s = settings ?? {
    to_address: '', smtp_host: '', smtp_port: 465, smtp_user: '',
    from_name: 'Website enquiry', has_password: false,
  };

  return (
    <form action={action}>
      {state?.ok && <div className="notice notice--ok">{state.ok}</div>}
      {state?.error && <div className="notice notice--error">{state.error}</div>}

      <div className="card card__pad" style={{ marginBottom: '1.25rem' }}>
        <h2>Enquiry email</h2>
        <p className="hint" style={{ marginTop: '-.35rem' }}>
          Every booking enquiry from the website is emailed here. This is separate
          from the email shown to visitors under Contact.
        </p>
        <div className="row">
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="to_address">Send enquiries to</label>
            <input id="to_address" name="to_address" type="email" inputMode="email"
                   defaultValue={s.to_address} placeholder="you@example.com" />
          </div>
        </div>
      </div>

      <div className="card card__pad" style={{ marginBottom: '1.25rem' }}>
        <h2>Outgoing mail (SMTP)</h2>
        <p className="hint" style={{ marginTop: '-.35rem' }}>
          The mailbox the website sends from. Your email provider lists these
          under SMTP or “outgoing server” settings. Port 465 uses SSL; 587 uses STARTTLS.
        </p>
        <div className="row">
          <div className="field">
            <label htmlFor="smtp_host">SMTP host</label>
            <input id="smtp_host" name="smtp_host" type="text" defaultValue={s.smtp_host}
                   placeholder="smtp.example.com" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="smtp_port">Port</label>
            <input id="smtp_port" name="smtp_port" type="number" min={1} max={65535}
                   defaultValue={s.smtp_port} />
          </div>
          <div className="field">
            <label htmlFor="smtp_user">Username (mailbox address)</label>
            <input id="smtp_user" name="smtp_user" type="email" defaultValue={s.smtp_user}
                   placeholder="bookings@example.com" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="smtp_password">Password</label>
            <input id="smtp_password" name="smtp_password" type="password"
                   placeholder={s.has_password ? 'Saved — leave blank to keep it' : 'Mailbox password'}
                   autoComplete="new-password" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="from_name">Sender name</label>
            <input id="from_name" name="from_name" type="text" defaultValue={s.from_name}
                   placeholder="Website enquiry" />
          </div>
        </div>
      </div>

      {testState?.ok && <div className="notice notice--ok">{testState.ok}</div>}
      {testState?.error && <div className="notice notice--error">{testState.error}</div>}

      <div className="actions">
        <Submit />
        <button
          type="button"
          className="btn"
          disabled={testing}
          onClick={() => startTest(async () => setTestState(await sendTestEmail()))}
        >
          {testing ? 'Sending…' : 'Send test email'}
        </button>
      </div>
      <p className="hint">
        Save first, then send a test. It uses the settings as stored, not what is typed above.
      </p>
    </form>
  );
}
