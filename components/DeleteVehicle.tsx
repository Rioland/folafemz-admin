'use client';

import { deleteVehicle } from '@/app/(dashboard)/vehicles/actions';
import { ConfirmDelete } from '@/components/ConfirmDelete';

export function DeleteVehicle({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDelete
      action={deleteVehicle}
      fields={{ id }}
      name={name}
      kind="vehicle"
      consequence="It will disappear from the fleet on the website at the next publish."
    />
  );
}
