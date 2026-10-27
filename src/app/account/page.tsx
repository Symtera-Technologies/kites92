import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StatusPill } from '@/components/admin/StatusPill';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatPkr } from '@/lib/commerce/money';
import { PageHeader } from '@/components/layout/PageHeader';
import { logoutCustomer } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Account',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireUser();

  const orders = await db.order.findMany({
    where: {
      // Orders placed while signed in are linked by id. Guest orders placed
      // with the same email belong to this person too, and matching on it
      // means registering later does not hide their earlier purchases.
      OR: [{ userId: user.id }, ...(user.email ? [{ customerEmail: user.email }] : [])],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      trackingToken: true,
      status: true,
      totalRs: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <Header />
      <main id="main" className="pt-[var(--nav-h)]">
        <PageHeader
          title="Your Account"
          intro={user.email}
          aside={
            <form action={logoutCustomer}>
              <button type="submit" className="btn-ghost px-5 py-2.5 text-xs">
                Sign out
              </button>
            </form>
          }
        />

        <div className="shell max-w-4xl py-12">
          <section>
            <h2 className="font-display text-xl font-bold">Your orders</h2>

            {orders.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-navy-900/20 px-6 py-16 text-center">
                <p className="font-display text-lg font-bold">No orders yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-navy-900/60">
                  When you place an order it will appear here with its live status.
                </p>
                <Link href="/shop" className="btn-primary mt-5">
                  Explore Kites
                </Link>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-navy-900/8 overflow-hidden rounded-3xl border border-navy-900/10 bg-white">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/order/${order.trackingToken}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 hover:bg-navy-900/[0.03]"
                    >
                      <span className="tnum font-mono text-sm font-bold text-royal">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-navy-900/50">
                        {order.createdAt.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' · '}
                        {order._count.items} {order._count.items === 1 ? 'item' : 'items'}
                      </span>
                      <span className="ml-auto flex items-center gap-3">
                        <StatusPill status={order.status} />
                        <span className="tnum font-bold">{formatPkr(order.totalRs)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
