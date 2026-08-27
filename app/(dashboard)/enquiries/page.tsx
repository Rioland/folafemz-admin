import { createClient } from '@/lib/supabase/server';
import { ENQUIRY_STATUSES, type Enquiry } from '@/lib/types';
import { StatusSelect } from '@/components/StatusSelect';

export const metadata = { title: 'Enquiries — Folafemz Admin' };
export const dynamic = 'force-dynamic';

export default async function EnquiriesPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await props.searchParams;
  const filter = ENQUIRY_STATUSES.includes(status as never) ? status : undefined;

  const supabase = await createClient();

  let query = supabase.from('enquiries').select('*').order('created_at', { ascending: false });
  if (filter) query = query.eq('status', filter);

  const { data: enquiries, error } = await query.returns<Enquiry[]>();

  return (
    <>
      <div className="main__head">
        <h1>Enquiries</h1>
        <div className="actions" style={{ margin: 0 }}>
          <a href="/enquiries" className="btn btn--ghost" aria-current={!filter ? 'page' : undefined}>All</a>
          {ENQUIRY_STATUSES.map((s) => (
            <a key={s} href={`/enquiries?status=${s}`} className="btn btn--ghost"
              aria-current={filter === s ? 'page' : undefined}>
              {s}
            </a>
          ))}
        </div>
      </div>

      {error && <div className="notice notice--error">Could not load enquiries: {error.message}</div>}

      {enquiries && enquiries.length > 0 ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Received</th><th>Contact</th><th>Wants</th><th>Details</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(e.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td>
                    <strong>{e.name}</strong>
                    <div><a href={`tel:${e.phone.replace(/\s+/g, '')}`}>{e.phone}</a></div>
                    {e.email && <div><a href={`mailto:${e.email}`}>{e.email}</a></div>}
                  </td>
                  <td>
                    {e.vehicle && <div>{e.vehicle}</div>}
                    {e.service && <div className="tag">{e.service}</div>}
                  </td>
                  <td style={{ maxWidth: '32ch' }}>
                    {e.pickup_date && <div>Pickup: {e.pickup_date}</div>}
                    {e.pickup_location && <div>From: {e.pickup_location}</div>}
                    {e.destination && <div>To: {e.destination}</div>}
                    {e.days && <div>Days: {e.days}</div>}
                    {e.notes && <div style={{ color: 'var(--muted)' }}>{e.notes}</div>}
                    {e.source && <div className="tag">{e.source}</div>}
                  </td>
                  <td><StatusSelect id={e.id} status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && (
          <div className="card">
            <div className="empty">
              <p>{filter ? `No ${filter} enquiries.` : 'No enquiries yet.'}</p>
              <p style={{ fontSize: '.88rem' }}>
                The public site emails enquiries today. Post them to the
                <code> enquiries </code> table as well and they will appear here.
              </p>
            </div>
          </div>
        )
      )}
    </>
  );
}
