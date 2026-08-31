'use client';

import { deleteEnquiry } from '@/app/(dashboard)/enquiries/actions';
import { ConfirmDelete } from '@/components/ConfirmDelete';

export function DeleteEnquiry({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDelete
      action={deleteEnquiry}
      fields={{ id }}
      name={name}
      kind="enquiry"
      consequence="Marking it closed keeps the record instead. Deleting loses who asked and what they wanted."
      triggerLabel="Delete"
      triggerClassName="btn btn--ghost"
    />
  );
}
