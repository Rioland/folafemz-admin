import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { columnLabel, getResource } from '@/lib/resources';
import { SITE_URL } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Renders a cell without dumping raw JSON or an unreadable uuid into the table. */
function cell(value: unknown, labels: Record<string, string>): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;

  const text = String(value);

  // Reference columns store a uuid; show what it points at instead.
  if (labels[text]) return labels[text];

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return new Date(text).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return text.length > 70 ? `${text.slice(0, 70)}…` : text;
}

export default async function ResourceListPage(props: {
  params: Promise<{ resource: string }>;
}) {
  const { resource: key } = await props.params;
  const resource = getResource(key);
  if (!resource) notFound();

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from(resource.table)
    .select('*')
    .order(resource.orderBy, { ascending: resource.ascending ?? true })
    .returns<Record<string, unknown>[]>();

  // Resolve every reference column in one query per referenced table, so the
  // list shows names rather than uuids.
  const labels: Record<string, string> = {};
  for (const field of resource.fields) {
    if (field.type !== 'reference' || !field.refTable || !field.refLabel) continue;

    const { data: refs } = await supabase
      .from(field.refTable)
      .select(`id, ${field.refLabel}`)
      .returns<Record<string, unknown>[]>();

    for (const ref of refs ?? []) {
      labels[String(ref.id)] = String(ref[field.refLabel] ?? '');
    }
  }

  return (
    <>
      <div className="main__head">
        <h1>{resource.label}</h1>
        <Link href={`/content/${key}/new`} className="btn btn--primary">
          Add {resource.singular}
        </Link>
      </div>

      {resource.note && <div className="notice notice--info">{resource.note}</div>}
      {error && <div className="notice notice--error">Could not load: {error.message}</div>}

      {rows && rows.length > 0 ? (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {resource.list.map((c) => <th key={c}>{columnLabel(resource, c)}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const path = resource.publicPath?.(row) ?? null;
                return (
                  <tr key={String(row.id)}>
                    {resource.list.map((c, i) => (
                      <td key={c}>
                        {i === 0
                          ? <Link href={`/content/${key}/${row.id}`}>
                              <strong>{cell(row[c], labels)}</strong>
                            </Link>
                          : cell(row[c], labels)}
                      </td>
                    ))}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link href={`/content/${key}/${row.id}`} className="btn btn--ghost">Edit</Link>
                      {path && SITE_URL && (
                        <>
                          {' '}
                          <a href={`${SITE_URL}${path}`} target="_blank" rel="noopener"
                            className="btn btn--ghost">View ↗</a>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !error && (
          <div className="card">
            <div className="empty">
              <p>Nothing here yet.</p>
              <Link href={`/content/${key}/new`} className="btn btn--primary">
                Add {resource.singular}
              </Link>
            </div>
          </div>
        )
      )}
    </>
  );
}
