'use client';

import { useRef, useState } from 'react';

/**
 * Uploads through /api/upload rather than straight from the browser, so the
 * size and type checks run somewhere the user cannot edit them. Returns the
 * public Supabase Storage URL and hands it to the parent form.
 */
export function ImageUpload({
  value, onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Upload failed.');
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <>
      {error && <div className="notice notice--error">{error}</div>}

      <div className="uploader">
        {value
          ? <img className="uploader__preview" src={value} alt="" />
          : <span className="uploader__preview" aria-hidden="true" />}

        <div style={{ flex: '1 1 240px' }}>
          <div className="field">
            <label htmlFor="image-url">Image URL</label>
            <input
              id="image-url" type="text" value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/images/fleet/toyota-prado-2022.jpg"
            />
            <p className="hint">
              A path like <code>/images/…</code> is served from the public site.
              Uploading below replaces it with a Supabase Storage URL.
            </p>
          </div>

          <input
            ref={input} type="file" accept="image/*" disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          {busy && <p className="hint">Uploading…</p>}

          {value && (
            <button type="button" className="btn btn--ghost" style={{ marginTop: '.6rem' }}
              onClick={() => onChange('')}>
              Remove image
            </button>
          )}
        </div>
      </div>
    </>
  );
}
