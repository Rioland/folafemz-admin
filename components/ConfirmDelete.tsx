'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Delete button with a confirmation step of our own.
 *
 * The browser's confirm() was doing this job, but it cannot be styled, reads
 * as a browser warning rather than part of the dashboard, and on some mobile
 * browsers can be suppressed entirely — which would delete without asking.
 *
 * Built on <dialog>, so focus trapping, Escape-to-close and the backdrop are
 * the browser's own rather than something reimplemented here.
 */

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--danger" disabled={pending}>
      {pending ? 'Deleting…' : label}
    </button>
  );
}

export function ConfirmDelete({
  action,
  fields,
  name,
  kind = 'item',
  consequence,
  triggerLabel = 'Delete',
  triggerClassName = 'btn btn--danger',
}: {
  /** Server action that performs the delete. */
  action: (fd: FormData) => void | Promise<void>;
  /** Hidden values the action needs, e.g. { __resource: 'posts', __id: '…' }. */
  fields: Record<string, string>;
  /** What is being deleted, shown in the dialog. */
  name: string;
  /** Noun for the sentence: "post", "vehicle", "enquiry". */
  kind?: string;
  /** Extra warning, e.g. "Its landing pages will disappear from the site." */
  consequence?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  // showModal() rather than the open attribute: only the former makes it modal,
  // traps focus and enables the ::backdrop.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      <dialog
        ref={dialog}
        className="modal"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        aria-labelledby="confirm-title"
      >
        <form ref={form} action={action}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}

          <h2 id="confirm-title">Delete this {kind}?</h2>

          <p className="modal__body">
            <strong>{name}</strong> will be removed permanently. This cannot be undone.
          </p>

          {consequence && <p className="modal__warn">{consequence}</p>}

          <div className="modal__actions">
            {/* Cancel is focused first, so a stray Enter dismisses rather than deletes. */}
            <button
              type="button"
              className="btn btn--ghost"
              autoFocus
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <ConfirmButton label={`Delete ${kind}`} />
          </div>
        </form>
      </dialog>
    </>
  );
}
