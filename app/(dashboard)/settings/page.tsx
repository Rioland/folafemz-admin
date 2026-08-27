import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/SettingsForm';
import type { SettingRow } from '@/lib/types';

export const metadata = { title: 'Settings — Folafemz Admin' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('settings').select('key, value').returns<SettingRow[]>();

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) settings[row.key] = row.value;

  return (
    <>
      <div className="main__head"><h1>Settings</h1></div>

      {error && <div className="notice notice--error">Could not load settings: {error.message}</div>}

      {!error && (data ?? []).length === 0 && (
        <div className="notice notice--info">
          No settings stored yet. Run <code>npm run import</code> to bring across the
          values already in the public site&rsquo;s content.json.
        </div>
      )}

      <SettingsForm settings={settings} />
    </>
  );
}
