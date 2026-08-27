'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signIn } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, null);

  return (
    <form action={action}>
      {state?.error && <div className="notice notice--error">{state.error}</div>}

      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <Submit />

      <p className="hint" style={{ marginTop: '1rem' }}>
        Accounts are created in the Supabase dashboard under Authentication → Users.
        There is no public sign-up.
      </p>
    </form>
  );
}
