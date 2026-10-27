import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RegisterForm } from '@/components/account/AuthForms';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create Account',
  robots: { index: false, follow: true },
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/account');

  return (
    <>
      <Header />
      <main id="main" className="pt-[var(--nav-h)]">
        <div className="shell max-w-md py-16">
          <h1 className="text-center text-display-sm">Create Account</h1>
          <p className="mt-2 text-center text-sm text-navy-900/60">
            An account keeps your order history and addresses. You can also check out
            as a guest.
          </p>
          <div className="mt-7 rounded-3xl border border-navy-900/10 bg-white p-6 shadow-card">
            <RegisterForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
