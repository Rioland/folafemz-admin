'use client';

import { useActionState, useState } from 'react';
import { MediaUpload } from '@/components/MediaUpload';
import { useFormStatus } from 'react-dom';
import { saveSettings } from '@/app/(dashboard)/settings/actions';

/** Field list mirrors the Settings type in the public site's lib/content.ts. */
const GROUPS: {
  title: string;
  hint?: string;
  fields: [key: string, label: string, kind?: 'area' | 'lines' | 'image' | 'video'][];
}[] = [
  {
    title: 'Business',
    fields: [
      ['siteName', 'Site name'],
      ['tagline', 'Tagline'],
      ['logo', 'Logo', 'image'],
    ],
  },
  {
    title: 'Contact',
    fields: [
      ['phone', 'Main phone'],
      ['phoneAlt', 'Other phones (one per line)', 'lines'],
      ['whatsapp', 'WhatsApp number (international, no +)'],
      ['email', 'Email'],
      ['addressPrimary', 'Address, primary'],
      ['addressSecondary', 'Address, secondary'],
      ['businessHours', 'Business hours'],
    ],
  },
  {
    title: 'Homepage',
    fields: [
      ['heroEyebrow', 'Hero eyebrow'],
      ['heroHeading', 'Hero heading'],
      ['heroSubheading', 'Hero subheading', 'area'],
      ['heroImage', 'Hero image', 'image'],
      ['heroVideo', 'Hero video', 'video'],
      ['aboutImage', 'About photograph', 'image'],
      ['fleetNote', 'Fleet note', 'area'],
      ['aboutHeading', 'About heading'],
      ['aboutBody', 'About body', 'area'],
      ['trustPoints', 'Trust points (one per line)', 'lines'],
    ],
  },
  {
    title: 'Figures',
    fields: [
      ['statYears', 'Years'],
      ['statClients', 'Clients'],
      ['statVehicles', 'Vehicles'],
      ['statRating', 'Rating'],
    ],
  },
  {
    title: 'Social links',
    hint:
      'Paste the full address of each profile. Leave one empty and it simply ' +
      'does not appear on the website.',
    fields: [
      ['facebookUrl', 'Facebook'],
      ['instagramUrl', 'Instagram'],
      ['twitterUrl', 'X (Twitter)'],
      ['tiktokUrl', 'TikTok'],
      ['youtubeUrl', 'YouTube'],
      ['linkedinUrl', 'LinkedIn'],
    ],
  },
  {
    title: 'Search engines',
    fields: [
      ['metaTitle', 'Meta title'],
      ['metaDescription', 'Meta description', 'area'],
      ['metaKeywords', 'Meta keywords'],
      ['ogImage', 'Share image', 'image'],
    ],
  },
];

/** Shown greyed-out in empty fields, so the expected format is obvious. */
const PLACEHOLDERS: Record<string, string> = {
  facebookUrl: 'https://facebook.com/folafemzglobal',
  instagramUrl: 'https://instagram.com/folafemzglobal',
  twitterUrl: 'https://x.com/folafemzglobal',
  tiktokUrl: 'https://tiktok.com/@folafemzglobal',
  youtubeUrl: 'https://youtube.com/@folafemzglobal',
  linkedinUrl: 'https://linkedin.com/company/folafemzglobal',
};

/** Arrays render one per line; everything else as its string value. */
function toField(value: unknown): string {
  if (Array.isArray(value)) return value.join('\n');
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Media settings render the same picker the rest of the dashboard uses. */
function MediaField({
  name, label, value, kind,
}: {
  name: string; label: string; value: string; kind: 'image' | 'video';
}) {
  const [current, setCurrent] = useState(value);

  return (
    <>
      <label>{label}</label>
      <MediaUpload value={current} onChange={setCurrent} kind={kind} folder="site" />
      <input type="hidden" name={name} value={current} />
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save settings'}
    </button>
  );
}

export function SettingsForm({ settings }: { settings: Record<string, unknown> }) {
  const [state, action] = useActionState(saveSettings, null);

  return (
    <form action={action}>
      {state?.ok && <div className="notice notice--ok">Settings saved.</div>}
      {state?.error && <div className="notice notice--error">{state.error}</div>}

      {GROUPS.map((group) => (
        <div className="card card__pad" key={group.title} style={{ marginBottom: '1.25rem' }}>
          <h2>{group.title}</h2>
          {group.hint && <p className="hint" style={{ marginTop: '-.35rem' }}>{group.hint}</p>}
          <div className="row">
            {group.fields.map(([key, label, kind]) => (
              <div className="field" key={key}
                style={kind ? { gridColumn: '1 / -1' } : undefined}>
                {kind === 'image' || kind === 'video' ? (
                  <MediaField
                    name={key} label={label} kind={kind}
                    value={toField(settings[key])}
                  />
                ) : (
                  <>
                    <label htmlFor={key}>{label}</label>
                    {kind
                      ? <textarea id={key} name={key} defaultValue={toField(settings[key])} />
                      : <input
                          id={key} name={key} type="text"
                          defaultValue={toField(settings[key])}
                          placeholder={PLACEHOLDERS[key]}
                        />}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="actions"><Submit /></div>
    </form>
  );
}
