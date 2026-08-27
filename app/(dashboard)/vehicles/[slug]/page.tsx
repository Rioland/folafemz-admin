import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VehicleForm } from '@/components/VehicleForm';
import { DeleteVehicle } from '@/components/DeleteVehicle';
import { updateVehicle } from '../actions';
import type { Category, Vehicle } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** params and searchParams are Promises in Next.js 16. */
export default async function EditVehiclePage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug } = await props.params;
  const { saved } = await props.searchParams;

  const supabase = await createClient();

  const [{ data: vehicle }, { data: categories }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('slug', slug).maybeSingle<Vehicle>(),
    supabase.from('categories').select('id, name, slug, position')
      .order('position').returns<Category[]>(),
  ]);

  if (!vehicle) notFound();

  return (
    <>
      <div className="main__head">
        <h1>{vehicle.name}</h1>
        <DeleteVehicle id={vehicle.id} name={vehicle.name} />
      </div>

      <VehicleForm
        vehicle={vehicle}
        categories={categories ?? []}
        action={updateVehicle}
        saved={saved === '1'}
      />
    </>
  );
}
