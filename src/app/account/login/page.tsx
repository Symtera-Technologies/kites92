import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoginForm } from '@/components/account/AuthForms';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: true },
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/account');

  return (
    <>
      <Header />
      <main id="main" className="pt-[var(--nav-h)]">
        <div className="shell max-w-md py-16">
          <h1 className="text-center text-display-sm">Sign In</h1>
          <div className="mt-7 rounded-3xl border border-navy-900/10 bg-white p-6 shadow-card">
            <LoginForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
