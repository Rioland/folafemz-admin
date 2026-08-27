'use client';

import { deleteRow } from '@/app/(dashboard)/content/actions';

/** Deleting content can remove a live page, so it asks first. */
export function DeleteRow({
  resourceKey, id, name,
}: {
  resourceKey: string; id: string; name: string;
}) {
  return (
    <form
      action={deleteRow}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="__resource" value={resourceKey} />
      <input type="hidden" name="__id" value={id} />
      <button type="submit" className="btn btn--danger">Delete</button>
    </form>
  );
}
