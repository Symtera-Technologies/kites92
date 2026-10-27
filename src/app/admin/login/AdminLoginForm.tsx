'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { adminLogin, type ActionState } from '../actions';

function SubmitButton() {
  // `useFormStatus` must be read from inside the <form>, which is why this is
  // a separate component rather than a flag on the parent.
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-5 w-full py-3.5">
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function AdminLoginForm() {
  const [state, action] = useActionState<ActionState, FormData>(adminLogin, {});

  const field =
    'w-full rounded-xl border border-navy-900/15 bg-cream px-3.5 py-3 text-sm focus:border-royal focus:outline-none';

  return (
    <form action={action} noValidate>
      {state.error && (
        <p role="alert" className="mb-4 rounded-xl bg-vibrant/10 px-3.5 py-2.5 text-sm text-vibrant-600">
          {state.error}
        </p>
      )}

      <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy-900/55">
        Email
      </label>
      <input id="email" name="email" type="email" autoComplete="username" required className={field} />

      <label
        htmlFor="password"
        className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wider text-navy-900/55"
      >
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className={field}
      />

      <SubmitButton />
    </form>
  );
}
