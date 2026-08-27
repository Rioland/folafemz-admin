import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from '@/lib/env';

/**
 * Service-role client. Bypasses Row Level Security entirely, so it must never
 * reach the browser — the `server-only` import above turns any client-side
 * import of this file into a build error rather than a silent key leak.
 *
 * Only for work the signed-in user's own client genuinely cannot do, such as
 * the content export reading every table in one pass.
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL(), SUPABASE_SERVICE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
