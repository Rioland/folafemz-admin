import { createClient } from '@/lib/supabase/server';
import { VehicleForm } from '@/components/VehicleForm';
import { createVehicle } from '../actions';
import { emptyVehicle, type Category } from '@/lib/types';

export const metadata = { title: 'Add vehicle — Folafemz Admin' };

export default async function NewVehiclePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories').select('id, name, slug, position')
    .order('position').returns<Category[]>();

  return (
    <>
      <div className="main__head"><h1>Add vehicle</h1></div>
      <VehicleForm vehicle={emptyVehicle} categories={categories ?? []} action={createVehicle} />
    </>
  );
}
