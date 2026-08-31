'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { MediaUpload } from '@/components/MediaUpload';
import { slugify } from '@/lib/types';
import type { Field, FormResource } from '@/lib/resources';
import type { FormState } from '@/app/(dashboard)/content/actions';

export type Options = Record<string, { id: string; label: string }[]>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

/** Database value → the string an input expects. */
function toInput(field: Field, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (field.type === 'lines') {
    return Array.isArray(value) ? value.join('\n') : String(value);
  }
  if (field.type === 'date') {
    // Postgres hands back a timestamp; <input type="date"> wants YYYY-MM-DD.
    return String(value).slice(0, 10);
  }
  return String(value);
}

function FieldInput({
  field, value, options, onSlugSource, folder,
}: {
  field: Field;
  value: unknown;
  options: Options;
  onSlugSource?: (v: string) => void;
  /** Storage folder for uploads, named after the section. */
  folder?: string;
}) {
  const initial = toInput(field, value);
  const [media, setMedia] = useState(initial);

  const id = field.column;

  switch (field.type) {
    case 'boolean':
      return (
        <div className="check">
          <input id={id} name={id} type="checkbox" defaultChecked={Boolean(value)} />
          <label htmlFor={id}>{field.label}</label>
        </div>
      );

    case 'image':
    case 'video':
      return (
        <>
          <label>{field.label}</label>
          <MediaUpload
            value={media}
            onChange={setMedia}
            kind={field.type === 'video' ? 'video' : 'image'}
            folder={folder}
          />
          <input type="hidden" name={id} value={media} />
        </>
      );

    case 'select':
      return (
        <>
          <label htmlFor={id}>{field.label}</label>
          <select id={id} name={id} defaultValue={initial}>
            {!field.required && <option value="">— none —</option>}
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </>
      );

    case 'reference':
      return (
        <>
          <label htmlFor={id}>{field.label}</label>
          <select id={id} name={id} defaultValue={initial}>
            <option value="">— none —</option>
            {(options[field.column] ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </>
      );

    case 'textarea':
    case 'richtext':
      return (
        <>
          <label htmlFor={id}>{field.label}</label>
          <textarea
            id={id} name={id} defaultValue={initial}
            style={field.type === 'richtext' ? { minHeight: '260px' } : undefined}
          />
        </>
      );

    case 'lines':
      return (
        <>
          <label htmlFor={id}>{field.label}</label>
          <textarea id={id} name={id} defaultValue={initial} />
        </>
      );

    case 'number':
      return (
        <>
          <label htmlFor={id}>{field.label}</label>
          <input id={id} name={id} type="number" step="1" defaultValue={initial} />
        </>
      );

    case 'date':
      return (
        <>
          <label htmlFor={id}>{field.label}</label>
          <input id={id} name={id} type="date" defaultValue={initial} />
        </>
      );

    default:
      return (
        <>
          <label htmlFor={id}>{field.label}</label>
          <input
            id={id} name={id} type="text" defaultValue={initial}
            required={field.required}
            onChange={onSlugSource ? (e) => onSlugSource(e.target.value) : undefined}
          />
        </>
      );
  }
}

export function ResourceForm({
  resource, row, options, action, saved, publicUrl,
}: {
  resource: FormResource;
  row: Record<string, unknown>;
  options: Options;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  saved?: boolean;
  publicUrl?: string | null;
}) {
  const [state, formAction] = useActionState(action, null);

  const hasSlug = resource.fields.some((f) => f.column === 'slug');
  const titleColumn = resource.fields[0]?.column;
  const [slug, setSlug] = useState(String(row.slug ?? ''));

  // Autofill the slug only while it is still empty — never rewrite one that
  // already exists, because that would break a published URL.
  const onSlugSource = hasSlug && !row.id
    ? (v: string) => setSlug((current) => (current === '' ? slugify(v) : current))
    : undefined;

  return (
    <form action={formAction}>
      {saved && <div className="notice notice--ok">Saved.</div>}
      {state?.error && <div className="notice notice--error">{state.error}</div>}
      {resource.note && <div className="notice notice--info">{resource.note}</div>}

      <input type="hidden" name="__resource" value={resource.key} />
      {row.id ? <input type="hidden" name="__id" value={String(row.id)} /> : null}

      <div className="card card__pad">
        <div className="row">
          {resource.fields.map((field) => {
            // The slug field is controlled so it can follow the title.
            if (field.column === 'slug') {
              return (
                <div className="field" key={field.column}>
                  <label htmlFor="slug">{field.label}</label>
                  <input
                    id="slug" name="slug" type="text" value={slug}
                    required={field.required}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <p className="hint">/{slug || '…'}</p>
                </div>
              );
            }

            return (
              <div
                className="field"
                key={field.column}
                style={field.wide ? { gridColumn: '1 / -1' } : undefined}
              >
                <FieldInput
                  field={field}
                  value={row[field.column]}
                  options={options}
                  onSlugSource={field.column === titleColumn ? onSlugSource : undefined}
                  folder={resource.key}
                />
                {field.hint && <p className="hint">{field.hint}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="actions">
        <Submit label={row.id ? 'Save changes' : `Create ${resource.singular}`} />
        <Link href={`/content/${resource.key}`} className="btn btn--ghost">Cancel</Link>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noopener" className="btn btn--ghost">
            View on site ↗
          </a>
        )}
      </div>
    </form>
  );
}
