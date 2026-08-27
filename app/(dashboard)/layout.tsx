import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/login/actions';
import { SITE_URL } from '@/lib/env';
import { NavLink } from '@/components/NavLink';
import { RESOURCES } from '@/lib/resources';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="sidebar__brand">
          Folafemz
          <small>Staff dashboard</small>
        </div>

        <NavLink href="/">Overview</NavLink>
        <NavLink href="/vehicles">Fleet</NavLink>
        <NavLink href="/enquiries">Enquiries</NavLink>

        <div className="sidebar__heading">Website</div>
        {RESOURCES.map((r) => (
          <NavLink key={r.key} href={`/content/${r.key}`}>{r.label}</NavLink>
        ))}

        <div className="sidebar__heading">Site</div>
        <NavLink href="/settings">Settings</NavLink>

        <div className="sidebar__foot">
          <div style={{ marginBottom: '.6rem', wordBreak: 'break-word' }}>{user?.email}</div>
          {SITE_URL && (
            <Link href={SITE_URL} target="_blank" rel="noopener" style={{ padding: '.25rem 0' }}>
              View live site ↗
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="btn btn--ghost" style={{ width: '100%', marginTop: '.6rem' }}>
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="main">{children}</main>
    </div>
  );
}
