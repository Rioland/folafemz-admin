import { notFound } from 'next/navigation';
import { getResource } from '@/lib/resources';
import { ResourceForm, type Options } from '@/components/ResourceForm';
import { createRow, referenceOptions } from '../../actions';

export default async function NewRowPage(props: {
  params: Promise<{ resource: string }>;
}) {
  const { resource: key } = await props.params;
  const resource = getResource(key);
  if (!resource) notFound();

  const options: Options = {};
  for (const field of resource.fields) {
    if (field.type === 'reference') options[field.column] = await referenceOptions(field);
  }

  return (
    <>
      <div className="main__head"><h1>Add {resource.singular}</h1></div>
      <ResourceForm resource={resource} row={{}} options={options} action={createRow} />
    </>
  );
}
