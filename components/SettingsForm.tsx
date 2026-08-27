'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveSettings } from '@/app/(dashboard)/settings/actions';

/** Field list mirrors the Settings type in the public site's lib/content.ts. */
const GROUPS: { title: string; fields: [key: string, label: string, kind?: 'area' | 'lines'][] }[] = [
  {
    title: 'Business',
    fields: [
      ['siteName', 'Site name'],
      ['tagline', 'Tagline'],
      ['logo', 'Logo path'],
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
      ['heroImage', 'Hero image path'],
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
    title: 'Search and social',
    fields: [
      ['metaTitle', 'Meta title'],
      ['metaDescription', 'Meta description', 'area'],
      ['metaKeywords', 'Meta keywords'],
      ['ogImage', 'Share image path'],
      ['facebookUrl', 'Facebook URL'],
      ['instagramUrl', 'Instagram URL'],
      ['twitterUrl', 'X URL'],
      ['tiktokUrl', 'TikTok URL'],
    ],
  },
];

/** Arrays render one per line; everything else as its string value. */
function toField(value: unknown): string {
  if (Array.isArray(value)) return value.join('\n');
  if (value === null || value === undefined) return '';
  return String(value);
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
          <div className="row">
            {group.fields.map(([key, label, kind]) => (
              <div className="field" key={key}
                style={kind ? { gridColumn: '1 / -1' } : undefined}>
                <label htmlFor={key}>{label}</label>
                {kind
                  ? <textarea id={key} name={key} defaultValue={toField(settings[key])} />
                  : <input id={key} name={key} type="text" defaultValue={toField(settings[key])} />}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="actions"><Submit /></div>
    </form>
  );
}
