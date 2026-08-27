import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { naira, type VehicleWithCategory } from '@/lib/types';

export const metadata = { title: 'Fleet — Folafemz Admin' };
export const dynamic = 'force-dynamic';

export default async function VehiclesPage() {
  const supabase = await createClient();

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*, categories(name, slug)')
    .order('position', { ascending: true })
    .order('name', { ascending: true })
    .returns<VehicleWithCategory[]>();

  return (
    <>
      <div className="main__head">
        <h1>Fleet</h1>
        <Link href="/vehicles/new" className="btn btn--primary">Add vehicle</Link>
      </div>

      {error && (
        <div className="notice notice--error">
          Could not load the fleet: {error.message}
        </div>
      )}

      {vehicles && vehicles.length > 0 ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Seats</th>
                <th className="num">Day rate</th>
                <th className="num">Airport</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    {/* Plain <img>: these are Supabase CDN URLs of unknown dimensions. */}
                    {v.image
                      ? <img className="thumb" src={v.image} alt="" loading="lazy" />
                      : <span className="thumb" aria-hidden="true" />}
                  </td>
                  <td>
                    <Link href={`/vehicles/${v.slug}`}><strong>{v.name}</strong></Link>
                    {v.is_featured && <> <span className="tag tag--featured">Featured</span></>}
                    <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>/{v.slug}</div>
                  </td>
                  <td>{v.categories?.name ?? '—'}</td>
                  <td>{v.seats ?? '—'}</td>
                  <td className="num">
                    {naira(v.daily_rate)}
                    {v.daily_rate_max ? ` – ${naira(v.daily_rate_max)}` : ''}
                  </td>
                  <td className="num">{naira(v.secondary_rate)}</td>
                  <td><Link href={`/vehicles/${v.slug}`} className="btn btn--ghost">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && (
          <div className="card">
            <div className="empty">
              <p>No vehicles yet.</p>
              <p style={{ fontSize: '.88rem' }}>
                Run <code>npm run import</code> to bring across the 27 vehicles already
                in the public site&rsquo;s content.json, or add one by hand.
              </p>
              <Link href="/vehicles/new" className="btn btn--primary">Add vehicle</Link>
            </div>
          </div>
        )
      )}
    </>
  );
}
