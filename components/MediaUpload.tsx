'use client';

import { useRef, useState } from 'react';

export type MediaKind = 'image' | 'video' | 'any';

const ACCEPT: Record<MediaKind, string> = {
  image: 'image/*',
  video: 'video/*',
  any: 'image/*,video/*',
};

const looksLikeVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

/**
 * Picks a file from the device or takes a link, for images and videos alike.
 *
 * Uploads go through /api/upload rather than straight from the browser, so the
 * type and size checks run somewhere the user cannot edit them. A link is left
 * exactly as typed: paths like /images/… are served by the public site, and a
 * full URL can point anywhere.
 */
export function MediaUpload({
  value, onChange, kind = 'image', folder,
}: {
  value: string;
  onChange: (url: string) => void;
  kind?: MediaKind;
  /** Storage folder, e.g. "fleet" or "gallery". */
  folder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setProgress(0);

    try {
      const body = new FormData();
      body.append('file', file);
      if (folder) body.append('folder', folder);

      // XMLHttpRequest rather than fetch: it reports upload progress, which
      // matters when a video takes a while on a slow connection.
      const url: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          let json: { url?: string; error?: string } = {};
          try { json = JSON.parse(xhr.responseText); } catch { /* not JSON */ }

          if (xhr.status >= 200 && xhr.status < 300 && json.url) resolve(json.url);
          else reject(new Error(json.error || `Upload failed (${xhr.status}).`));
        };

        xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));
        xhr.send(body);
      });

      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      setProgress(0);
      if (input.current) input.current.value = '';
    }
  }

  const showVideo = kind === 'video' || (kind === 'any' && looksLikeVideo(value));

  return (
    <>
      {error && <div className="notice notice--error">{error}</div>}

      <div className="uploader">
        {value ? (
          showVideo ? (
            <video className="uploader__preview" src={value} controls muted playsInline />
          ) : (
            <img className="uploader__preview" src={value} alt="" />
          )
        ) : (
          <span className="uploader__preview" aria-hidden="true" />
        )}

        <div style={{ flex: '1 1 260px' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={kind === 'video' ? '/videos/clip.mp4 or a full URL' : '/images/photo.jpg or a full URL'}
            aria-label="Link"
          />
          <p className="hint">Paste a link, or choose a file from this device.</p>

          <div className="uploader__actions">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? `Uploading… ${progress}%` : 'Choose file'}
            </button>

            {value && !busy && (
              <button type="button" className="btn btn--ghost" onClick={() => onChange('')}>
                Remove
              </button>
            )}
          </div>

          {busy && (
            <div className="progress" aria-hidden="true">
              <div className="progress__bar" style={{ width: `${progress}%` }} />
            </div>
          )}

          <input
            ref={input}
            type="file"
            accept={ACCEPT[kind]}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </div>
      </div>
    </>
  );
}
