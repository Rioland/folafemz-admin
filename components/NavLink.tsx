'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Sidebar link that marks itself current, including on nested routes. */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}
