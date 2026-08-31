import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getResource } from '@/lib/resources';
import { SITE_URL } from '@/lib/env';
import { ResourceForm, type Options } from '@/components/ResourceForm';
import { DeleteRow } from '@/components/DeleteRow';
import { updateRow, referenceOptions } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function EditRowPage(props: {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { resource: key, id } = await props.params;
  const { saved } = await props.searchParams;

  const resource = getResource(key);
  if (!resource) notFound();

  const supabase = await createClient();
  const { data: row } = await supabase
    .from(resource.table)
    .select('*')
    .eq('id', id)
    .maybeSingle<Record<string, unknown>>();

  if (!row) notFound();

  const options: Options = {};
  for (const field of resource.fields) {
    if (field.type === 'reference') options[field.column] = await referenceOptions(field);
  }

  const path = resource.publicPath?.(row) ?? null;
  const heading = String(row[resource.fields[0].column] ?? resource.singular);

  return (
    <>
      <div className="main__head">
        <h1>{heading}</h1>
        <DeleteRow
          resourceKey={key}
          id={id}
          name={heading}
          kind={resource.singular}
          consequence={
            path
              ? `Its page at ${path} will stop working, along with any links to it.`
              : undefined
          }
        />
      </div>

      <ResourceForm
        resource={resource}
        row={row}
        options={options}
        action={updateRow}
        saved={saved === '1'}
        publicUrl={path && SITE_URL ? `${SITE_URL}${path}` : null}
      />
    </>
  );
}
