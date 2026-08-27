'use client';

import { useState } from 'react';

/** Downloads the exported content, and optionally kicks off a site rebuild. */
export function PublishButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch('/api/publish', { method: 'POST' });
      const json = await res.json();
      setMessage(res.ok ? json.message : json.error);
    } catch {
      setMessage('Could not reach the publish endpoint.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="actions" style={{ margin: 0 }}>
      {message && <span className="tag">{message}</span>}
      <a className="btn btn--ghost" href="/api/export?download=1">Download content.json</a>
      <button type="button" className="btn btn--primary" onClick={publish} disabled={busy}>
        {busy ? 'Publishing…' : 'Publish to site'}
      </button>
    </div>
  );
}
