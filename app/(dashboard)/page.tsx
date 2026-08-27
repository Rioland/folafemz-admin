import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Enquiry } from '@/lib/types';
import { PublishButton } from '@/components/PublishButton';

export const metadata = { title: 'Overview — Folafemz Admin' };

/** Always read live counts; a cached dashboard would show stale enquiry numbers. */
export const dynamic = 'force-dynamic';

async function countOf(table: string) {
  const supabase = await createClient();
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return error ? null : (count ?? 0);
}

export default async function OverviewPage() {
  const supabase = await createClient();

  const [vehicles, enquiries, newEnquiries, posts] = await Promise.all([
    countOf('vehicles'),
    countOf('enquiries'),
    (async () => {
      const { count } = await supabase
        .from('enquiries').select('*', { count: 'exact', head: true }).eq('status', 'new');
      return count ?? 0;
    })(),
    countOf('posts'),
  ]);

  const { data: recent } = await supabase
    .from('enquiries')
    .select('id, name, phone, vehicle, status, created_at')
    .order('created_at', { ascending: false })
    .limit(8)
    .returns<Pick<Enquiry, 'id' | 'name' | 'phone' | 'vehicle' | 'status' | 'created_at'>[]>();

  const unreachable = vehicles === null;

  return (
    <>
      <div className="main__head">
        <h1>Overview</h1>
        <PublishButton />
      </div>

      {unreachable && (
        <div className="notice notice--error">
          Could not reach the database. Check the Supabase keys in <code>.env.local</code>,
          and that <code>supabase/schema.sql</code> has been run against the project.
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat__label">Vehicles</div>
          <div className="stat__value">{vehicles ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">New enquiries</div>
          <div className="stat__value">{newEnquiries ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Enquiries, all time</div>
          <div className="stat__value">{enquiries ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Blog posts</div>
          <div className="stat__value">{posts ?? '—'}</div>
        </div>
      </div>

      <div className="main__head">
        <h2>Latest enquiries</h2>
        <Link href="/enquiries" className="btn btn--ghost">All enquiries</Link>
      </div>

      {recent && recent.length > 0 ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Received</th><th>Name</th><th>Phone</th><th>Vehicle</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</td>
                  <td>{e.name}</td>
                  <td><a href={`tel:${e.phone.replace(/\s+/g, '')}`}>{e.phone}</a></td>
                  <td>{e.vehicle || '—'}</td>
                  <td><span className={`tag tag--${e.status}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card"><div className="empty">No enquiries yet.</div></div>
      )}
    </>
  );
}
