import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEPLOY_HOOK_URL } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Asks the public site's host to rebuild, so content edits go live.
 *
 * Nothing here writes to the site: it only pokes a deploy hook. With no hook
 * configured it says so rather than pretending to have published.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (!DEPLOY_HOOK_URL) {
    return NextResponse.json(
      { error: 'No DEPLOY_HOOK_URL set in .env.local, so there is nothing to trigger.' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(DEPLOY_HOOK_URL, { method: 'POST' });

    if (!res.ok) {
      return NextResponse.json(
        { error: `The deploy hook replied ${res.status}.` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Rebuild started.' });
  } catch {
    return NextResponse.json({ error: 'Could not reach the deploy hook.' }, { status: 502 });
  }
}
