'use client';

import { deleteRow } from '@/app/(dashboard)/content/actions';
import { ConfirmDelete } from '@/components/ConfirmDelete';

/** Delete control for any content row, with our own confirmation step. */
export function DeleteRow({
  resourceKey, id, name, kind, consequence,
}: {
  resourceKey: string; id: string; name: string;
  kind?: string; consequence?: string;
}) {
  return (
    <ConfirmDelete
      action={deleteRow}
      fields={{ __resource: resourceKey, __id: id }}
      name={name}
      kind={kind ?? 'item'}
      consequence={consequence}
    />
  );
}
