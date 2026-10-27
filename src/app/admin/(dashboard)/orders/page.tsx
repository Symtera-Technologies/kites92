import Link from 'next/link';
import { db } from '@/lib/db';
import { formatPkr } from '@/lib/commerce/money';
import { StatusPill } from '@/components/admin/StatusPill';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders' };

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_PAYMENT', label: 'Awaiting payment' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusParam = typeof params.status === 'string' ? params.status : '';
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const page = Math.max(Number(params.page) || 1, 1);
  const perPage = 30;

  const where = {
    ...(statusParam ? { status: statusParam as never } : {}),
    // Staff search by whatever the customer quotes on the phone: an order
    // number, a name, or more often a mobile number.
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query } },
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        city: true,
        totalRs: true,
        amountPaidRs: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold">Orders</h1>
        <p className="tnum text-sm text-navy-900/55">{total} total</p>
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Order number, name or phone"
          className="min-w-56 flex-1 rounded-xl border border-navy-900/15 bg-white px-3.5 py-2.5 text-sm focus:border-royal focus:outline-none"
        />
        <select
          name="status"
          defaultValue={statusParam}
          className="rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-sm focus:border-royal focus:outline-none"
        >
          {FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ghost px-5 py-2.5 text-xs">
          Filter
        </button>
      </form>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-navy-900/10 bg-white">
        {orders.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-navy-900/55">
            No orders match that filter.
          </p>
        ) : (
          <table className="w-full min-w-[54rem] text-sm">
            <thead className="border-b border-navy-900/10 text-left text-xs uppercase tracking-wider text-navy-900/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Order</th>
                <th scope="col" className="px-4 py-3 font-bold">Customer</th>
                <th scope="col" className="px-4 py-3 font-bold">City</th>
                <th scope="col" className="px-4 py-3 font-bold">Payment</th>
                <th scope="col" className="px-4 py-3 font-bold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/8">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-navy-900/[0.03]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="tnum font-mono font-bold text-royal hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-navy-900/45">
                      {order.createdAt.toLocaleDateString('en-GB')} · {order._count.items} items
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{order.customerName}</span>
                    <span className="tnum block text-xs text-navy-900/50">
                      {order.customerPhone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-navy-900/70">{order.city}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={order.paymentStatus} />
                    <span className="mt-1 block text-xs text-navy-900/45">
                      {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Bank transfer'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="tnum font-bold">{formatPkr(order.totalRs)}</span>
                    {order.amountPaidRs > 0 && order.amountPaidRs < order.totalRs && (
                      <span className="tnum block text-xs text-emerald-700">
                        {formatPkr(order.amountPaidRs)} paid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > perPage && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/admin/orders?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(statusParam ? { status: statusParam } : {}), page: String(page - 1) })}`}
              className="btn-ghost px-4 py-2 text-xs"
            >
              Previous
            </Link>
          )}
          <span className="tnum text-sm text-navy-900/55">
            Page {page} of {Math.ceil(total / perPage)}
          </span>
          {page * perPage < total && (
            <Link
              href={`/admin/orders?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(statusParam ? { status: statusParam } : {}), page: String(page + 1) })}`}
              className="btn-ghost px-4 py-2 text-xs"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
