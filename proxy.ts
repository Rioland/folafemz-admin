import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth gate for the whole dashboard.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`; the exported
 * function must be named `proxy` and runs on the Node.js runtime, which is
 * not configurable here.
 *
 * Two jobs, in order:
 *   1. Refresh the Supabase session cookie so a signed-in user is not logged
 *      out mid-session. This has to happen on the response that is actually
 *      returned, which is why the cookie writes are mirrored onto `response`.
 *   2. Bounce anonymous requests to /login, and signed-in ones away from it.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without these, createServerClient throws and every single route returns an
  // unexplained 500 — this gate runs before all of them. Say what is wrong
  // instead, and keep failing closed: nobody reaches the dashboard either way.
  //
  // NEXT_PUBLIC_* values are inlined when the app is built, so setting them on
  // the host is not enough on its own; the app has to be rebuilt afterwards.
  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
      !supabaseKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ].filter(Boolean).join(' and ');

    return new NextResponse(
      `This dashboard is not configured: ${missing} is missing.\n\n` +
      'Set it in the hosting project\'s environment variables, then redeploy — ' +
      'these values are compiled in at build time, so a redeploy is required.\n',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getUser() revalidates against Supabase. getSession() only decodes the
  // cookie, which a client could have tampered with, so it is not a gate.
  //
  // A network failure here must not 500 every route: treat an unreachable
  // Supabase as "not signed in" so the app fails closed at the login page
  // rather than crashing behind it.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/login';

  if (!user && !isLogin) {
    // API callers get JSON. Redirecting them to an HTML login page would make
    // fetch() succeed with markup, and res.json() then fails on "<" rather
    // than reporting the real problem, which is an expired session.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Remember where they were headed so login can return them there.
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /**
   * Everything except Next's own assets, the favicon and image files. Without
   * this the gate would also run on CSS and JS, redirecting them to /login and
   * leaving an unstyled page behind.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
