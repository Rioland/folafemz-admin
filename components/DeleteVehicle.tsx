'use client';

import { deleteVehicle } from '@/app/(dashboard)/vehicles/actions';

/** Deleting a vehicle removes a live page, so it asks first. */
export function DeleteVehicle({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteVehicle}
      onSubmit={(e) => {
        if (!confirm(`Delete ${name}? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn--danger">Delete</button>
    </form>
  );
}
