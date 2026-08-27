import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildContent } from '@/lib/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns the whole site's content as the JSON the public site expects.
 *
 * Download it and drop it in as data/content.json, or have a build step fetch
 * it. Signed-in staff only — it is the entire dataset in one response.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const content = await buildContent();
    const download = new URL(request.url).searchParams.get('download') === '1';

    return new NextResponse(JSON.stringify(content, null, 4) + '\n', {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        ...(download
          ? { 'content-disposition': 'attachment; filename="content.json"' }
          : {}),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Export failed.' },
      { status: 500 }
    );
  }
}
