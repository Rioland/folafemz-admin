'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { ImageUpload } from '@/components/ImageUpload';
import { slugify, type Category, type Vehicle } from '@/lib/types';
import type { FormState } from '@/app/(dashboard)/vehicles/actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function VehicleForm({
  vehicle, categories, action, saved,
}: {
  vehicle: Partial<Vehicle>;
  categories: Category[];
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  saved?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);

  const [name, setName] = useState(vehicle.name ?? '');
  const [slug, setSlug] = useState(vehicle.slug ?? '');
  const [image, setImage] = useState(vehicle.image ?? '');
  const isNew = !vehicle.id;

  // Only autofill the slug while it still matches the name, so a hand-edited
  // slug is never silently overwritten — changing it would break a live URL.
  const slugLocked = slug !== '' && slug !== slugify(name);

  return (
    <form action={formAction}>
      {saved && <div className="notice notice--ok">Saved.</div>}
      {state?.error && <div className="notice notice--error">{state.error}</div>}

      {vehicle.id && <input type="hidden" name="id" value={vehicle.id} />}

      <div className="card card__pad" style={{ marginBottom: '1.25rem' }}>
        <div className="row">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name" name="name" type="text" required value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugLocked) setSlug(slugify(e.target.value));
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="slug">Web address</label>
            <input id="slug" name="slug" type="text" value={slug}
              onChange={(e) => setSlug(e.target.value)} />
            <p className="hint">/{slug || 'vehicle-name'}</p>
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="category_id">Category</label>
            <select id="category_id" name="category_id" defaultValue={vehicle.category_id ?? ''}>
              <option value="">— none —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="seats">Seats</label>
            <input id="seats" name="seats" type="text" defaultValue={vehicle.seats ?? ''}
              placeholder="6 seats" />
            <p className="hint">Passengers, excluding the driver.</p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" defaultValue={vehicle.description ?? ''} />
        </div>
      </div>

      <div className="card card__pad" style={{ marginBottom: '1.25rem' }}>
        <h2>Photograph</h2>
        <ImageUpload value={image} onChange={setImage} />
        <input type="hidden" name="image" value={image} />
      </div>

      <div className="card card__pad" style={{ marginBottom: '1.25rem' }}>
        <h2>Rates</h2>
        <div className="row">
          <div className="field">
            <label htmlFor="daily_rate">Day rate (NGN)</label>
            <input id="daily_rate" name="daily_rate" type="number" min="0" step="1"
              defaultValue={vehicle.daily_rate ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="daily_rate_max">Top of band (NGN)</label>
            <input id="daily_rate_max" name="daily_rate_max" type="number" min="0" step="1"
              defaultValue={vehicle.daily_rate_max ?? ''} />
            <p className="hint">Only when the rate is quoted as a range.</p>
          </div>
          <div className="field">
            <label htmlFor="daily_label">Day rate label</label>
            <input id="daily_label" name="daily_label" type="text"
              defaultValue={vehicle.daily_label ?? ''} placeholder="Per day in Akure" />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="secondary_rate">Secondary rate (NGN)</label>
            <input id="secondary_rate" name="secondary_rate" type="number" min="0" step="1"
              defaultValue={vehicle.secondary_rate ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="secondary_label">Secondary label</label>
            <input id="secondary_label" name="secondary_label" type="text"
              defaultValue={vehicle.secondary_label ?? ''} placeholder="Airport" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="rate_note">Rate note</label>
          <input id="rate_note" name="rate_note" type="text" defaultValue={vehicle.rate_note ?? ''} />
          <p className="hint">Shown instead of a price when there is no day rate.</p>
        </div>
      </div>

      <div className="card card__pad">
        <div className="row">
          <div className="field">
            <label htmlFor="position">Sort position</label>
            <input id="position" name="position" type="number" min="0" step="1"
              defaultValue={vehicle.position ?? 0} />
            <p className="hint">Lower numbers come first.</p>
          </div>
          <div className="field check" style={{ marginTop: '1.6rem' }}>
            <input id="is_featured" name="is_featured" type="checkbox"
              defaultChecked={vehicle.is_featured ?? false} />
            <label htmlFor="is_featured">Feature on the homepage</label>
          </div>
        </div>
      </div>

      <div className="actions">
        <Submit label={isNew ? 'Create vehicle' : 'Save changes'} />
        <Link href="/vehicles" className="btn btn--ghost">Cancel</Link>
      </div>
    </form>
  );
}
