import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in — Folafemz Admin' };

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  // searchParams is a Promise in Next.js 16.
  const { next } = await props.searchParams;

  return (
    <main className="login">
      <div className="login__card">
        <div className="login__brand">Folafemz Global</div>
        <p className="login__sub">Staff dashboard</p>
        <LoginForm next={next ?? '/'} />
      </div>
    </main>
  );
}
