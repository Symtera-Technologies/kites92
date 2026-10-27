'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginCustomer, registerCustomer, type AuthState } from '@/app/account/actions';

const field =
  'w-full rounded-xl border border-navy-900/15 bg-cream px-3.5 py-3 text-sm focus:border-royal focus:outline-none';
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy-900/55';

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-5 w-full py-3.5">
      {pending ? busy : idle}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(loginCustomer, {});

  return (
    <form action={action} noValidate>
      {state.error && (
        <p role="alert" className="mb-4 rounded-xl bg-vibrant/10 px-3.5 py-2.5 text-sm text-vibrant-600">
          {state.error}
        </p>
      )}

      <label htmlFor="login-email" className={label}>Email</label>
      <input id="login-email" name="email" type="email" autoComplete="username" required className={field} />

      <label htmlFor="login-password" className={`${label} mt-4`}>Password</label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className={field}
      />

      <Submit idle="Sign in" busy="Signing in…" />

      <p className="mt-4 text-center text-sm text-navy-900/60">
        New here?{' '}
        <Link href="/account/register" className="font-semibold text-royal hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-navy-900/50">
        You can also{' '}
        <Link href="/track" className="font-semibold text-royal hover:underline">
          track an order without an account
        </Link>
        .
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(registerCustomer, {});

  return (
    <form action={action} noValidate>
      {state.error && (
        <p role="alert" className="mb-4 rounded-xl bg-vibrant/10 px-3.5 py-2.5 text-sm text-vibrant-600">
          {state.error}
        </p>
      )}

      <label htmlFor="reg-name" className={label}>Full name</label>
      <input id="reg-name" name="name" autoComplete="name" required className={field} />

      <label htmlFor="reg-email" className={`${label} mt-4`}>Email</label>
      <input id="reg-email" name="email" type="email" autoComplete="username" required className={field} />

      <label htmlFor="reg-phone" className={`${label} mt-4`}>Mobile number (optional)</label>
      <input
        id="reg-phone"
        name="phone"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0300 1234567"
        className={field}
      />

      <label htmlFor="reg-password" className={`${label} mt-4`}>Password</label>
      <input
        id="reg-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        className={field}
      />
      <p className="mt-1 text-xs text-navy-900/50">At least 10 characters.</p>

      <Submit idle="Create account" busy="Creating…" />

      <p className="mt-4 text-center text-sm text-navy-900/60">
        Already have one?{' '}
        <Link href="/account/login" className="font-semibold text-royal hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
