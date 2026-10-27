import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Wordmark } from '@/components/ui/Wordmark';
import { AdminLoginForm } from './AdminLoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage() {
  // Already signed in as an admin? Skip straight to the dashboard.
  const user = await getCurrentUser();
  if (user?.role === 'ADMIN') redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="text-center">
          <Wordmark className="text-2xl" />
        </p>
        <p className="mt-1 text-center text-sm text-navy-900/55">Store admin</p>

        <div className="mt-7 rounded-3xl border border-navy-900/10 bg-white p-6 shadow-card">
          <AdminLoginForm />
        </div>

        <p className="mt-5 text-center text-xs text-navy-900/45">
          Signed-in sessions last 14 days.
        </p>
      </div>
    </div>
  );
}
