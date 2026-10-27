import Link from 'next/link';
import { db } from '@/lib/db';
import { formatPkr } from '@/lib/commerce/money';
import { StatusPill } from '@/components/admin/StatusPill';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Dashboard' };

/** Orders in these states still need someone to do something. */
const OPEN_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'PACKED'] as const;

export default async function AdminDashboard() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [openOrders, recentOrders, revenue, lowStock, pendingReviews, productCount] =
    await Promise.all([
      db.order.count({ where: { status: { in: [...OPEN_STATUSES] } } }),
      db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          city: true,
          totalRs: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      // Revenue counts delivered and dispatched orders only. Counting
      // pending ones would report money that may never arrive.
      db.order.aggregate({
        _sum: { totalRs: true },
        _count: true,
        where: {
          createdAt: { gte: since },
          status: { in: ['DISPATCHED', 'DELIVERED'] },
        },
      }),
      db.productVariant.findMany({
        where: { isActive: true, stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
        take: 8,
        select: {
          id: true,
          label: true,
          stock: true,
          product: { select: { name: true, slug: true } },
        },
      }),
      db.review.count({ where: { isApproved: false } }),
      db.product.count({ where: { status: 'ACTIVE' } }),
    ]);

  const stats = [
    { label: 'Orders needing action', value: String(openOrders), href: '/admin/orders' },
    {
      label: 'Fulfilled revenue (30 days)',
      value: formatPkr(revenue._sum.totalRs ?? 0),
      hint: `${revenue._count} orders dispatched or delivered`,
    },
    { label: 'Active products', value: String(productCount), href: '/admin/products' },
    { label: 'Reviews awaiting approval', value: String(pendingReviews), href: '/admin/reviews' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold">Dashboard</h1>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const card = (
            <div className="h-full rounded-2xl border border-navy-900/10 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-navy-900/50">
                {stat.label}
              </p>
              <p className="tnum mt-2 font-display text-2xl font-extrabold">{stat.value}</p>
              {stat.hint && <p className="mt-1 text-xs text-navy-900/45">{stat.hint}</p>}
            </div>
          );
          return (
            <li key={stat.label}>
              {stat.href ? (
                <Link href={stat.href} className="block transition-transform hover:-translate-y-0.5">
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border border-navy-900/10 bg-white">
          <div className="flex items-center justify-between border-b border-navy-900/10 px-5 py-3.5">
            <h2 className="font-display text-lg font-bold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-royal hover:underline">
              All orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-navy-900/55">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-navy-900/8">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-navy-900/[0.03]"
                  >
                    <span className="tnum font-mono text-sm font-bold">{order.orderNumber}</span>
                    <span className="text-sm">{order.customerName}</span>
                    <span className="text-xs text-navy-900/50">{order.city}</span>
                    <span className="ml-auto flex items-center gap-3">
                      <StatusPill status={order.status} />
                      <span className="tnum text-sm font-bold">{formatPkr(order.totalRs)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-navy-900/10 bg-white">
          <h2 className="border-b border-navy-900/10 px-5 py-3.5 font-display text-lg font-bold">
            Low stock
          </h2>
          {lowStock.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-navy-900/55">
              Nothing running low.
            </p>
          ) : (
            <ul className="divide-y divide-navy-900/8">
              {lowStock.map((variant) => (
                <li key={variant.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {variant.product.name}
                    </span>
                    <span className="block truncate text-xs text-navy-900/50">{variant.label}</span>
                  </span>
                  <span
                    className={`tnum shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      variant.stock === 0
                        ? 'bg-vibrant/15 text-vibrant-600'
                        : 'bg-festival/15 text-festival-600'
                    }`}
                  >
                    {variant.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
