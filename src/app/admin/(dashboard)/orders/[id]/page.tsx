import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatPkr, roundRs } from '@/lib/commerce/money';
import { getSetting } from '@/lib/commerce/queries';
import { whatsappLink } from '@/lib/utils';
import { StatusPill } from '@/components/admin/StatusPill';
import { recordPayment, updateOrderStatus } from '../../../actions';

export const dynamic = 'force-dynamic';

const STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetail({ params }: { params: Params }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  const [whatsapp, advancePercentRaw] = await Promise.all([
    getSetting('whatsapp.number'),
    getSetting('payment.advancePercent', '50'),
  ]);
  const advanceDueRs = roundRs((order.totalRs * Number(advancePercentRaw || 50)) / 100);

  const field =
    'w-full rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-sm focus:border-royal focus:outline-none';

  return (
    <div>
      <Link href="/admin/orders" className="text-sm font-semibold text-royal hover:underline">
        ← All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="tnum font-display text-2xl font-extrabold">{order.orderNumber}</h1>
        <StatusPill status={order.status} />
        <StatusPill status={order.paymentStatus} />
        <span className="text-sm text-navy-900/50">
          {order.createdAt.toLocaleString('en-GB')}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-navy-900/10 bg-white">
            <h2 className="border-b border-navy-900/10 px-5 py-3.5 font-display text-lg font-bold">
              Items
            </h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-navy-900/50">
                <tr>
                  <th scope="col" className="px-5 py-2 font-bold">Product</th>
                  <th scope="col" className="px-5 py-2 text-center font-bold">Qty</th>
                  <th scope="col" className="px-5 py-2 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/8">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-2.5">
                      <span className="block font-medium">{item.productName}</span>
                      {item.variantLabel && (
                        <span className="block text-xs text-navy-900/50">{item.variantLabel}</span>
                      )}
                      <span className="tnum block text-xs text-navy-900/45">
                        {formatPkr(item.unitPriceRs)} each
                      </span>
                    </td>
                    <td className="tnum px-5 py-2.5 text-center">{item.quantity}</td>
                    <td className="tnum px-5 py-2.5 text-right font-semibold">
                      {formatPkr(item.lineTotalRs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="space-y-1.5 border-t border-navy-900/10 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-900/60">Subtotal</dt>
                <dd className="tnum">{formatPkr(order.subtotalRs)}</dd>
              </div>
              {order.discountRs > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount {order.couponCode && `(${order.couponCode})`}</dt>
                  <dd className="tnum">−{formatPkr(order.discountRs)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-navy-900/60">Delivery</dt>
                <dd className="tnum">{formatPkr(order.shippingRs)}</dd>
              </div>
              <div className="flex justify-between border-t border-navy-900/10 pt-2 font-bold">
                <dt>Total</dt>
                <dd className="tnum">{formatPkr(order.totalRs)}</dd>
              </div>
              <div className="flex justify-between text-navy-900/60">
                <dt>Paid</dt>
                <dd className="tnum">{formatPkr(order.amountPaidRs)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-festival-600">
                <dt>Outstanding</dt>
                <dd className="tnum">{formatPkr(order.totalRs - order.amountPaidRs)}</dd>
              </div>
            </dl>
          </section>

          {order.customerNote && (
            <section className="rounded-2xl border border-navy-900/10 bg-white p-5">
              <h2 className="font-display text-base font-bold">Customer note</h2>
              <p className="mt-1.5 text-sm text-navy-900/75">{order.customerNote}</p>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <h2 className="font-display text-base font-bold">Customer</h2>
            <address className="mt-2.5 text-sm not-italic leading-relaxed text-navy-900/80">
              {order.customerName}
              <br />
              <a href={`tel:${order.customerPhone}`} className="tnum text-royal hover:underline">
                {order.customerPhone}
              </a>
              {order.customerEmail && (
                <>
                  <br />
                  <a href={`mailto:${order.customerEmail}`} className="text-royal hover:underline">
                    {order.customerEmail}
                  </a>
                </>
              )}
              <br />
              <br />
              {order.line1}
              {order.line2 && <><br />{order.line2}</>}
              {order.area && <><br />{order.area}</>}
              <br />
              {order.city}, {order.province}
              {order.postalCode && <><br /><span className="tnum">{order.postalCode}</span></>}
            </address>

            {whatsapp && (
              <a
                href={whatsappLink(
                  order.customerPhone,
                  `Assalam-o-Alaikum ${order.customerName}, this is Kites92 about your order ${order.orderNumber}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-full bg-[#25D366] px-4 py-2.5 text-center text-sm font-bold text-[#06310F]"
              >
                Message customer
              </a>
            )}
          </section>

          <section className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <h2 className="font-display text-base font-bold">Update status</h2>
            <form action={updateOrderStatus} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <select name="status" defaultValue={order.status} className={field}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ').toLowerCase()}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary w-full py-2.5 text-xs">
                Save status
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <h2 className="font-display text-base font-bold">Record payment</h2>
            <p className="mt-1 text-xs text-navy-900/55">
              Enter the total received so far. The payment state and order
              confirmation follow from the amount.
            </p>
            <form action={recordPayment} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <label htmlFor="amountRs" className="sr-only">
                Amount received in rupees
              </label>
              <input
                id="amountRs"
                name="amountRs"
                type="number"
                min={0}
                step={1}
                defaultValue={order.amountPaidRs}
                className={`${field} tnum`}
              />
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-navy-900/5 px-2.5 py-1">
                  {advancePercentRaw}% advance = {formatPkr(advanceDueRs)}
                </span>
                <span className="rounded-full bg-navy-900/5 px-2.5 py-1">
                  Full = {formatPkr(order.totalRs)}
                </span>
              </div>
              <button type="submit" className="btn-ghost w-full py-2.5 text-xs">
                Save payment
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <h2 className="font-display text-base font-bold">Customer link</h2>
            <p className="mt-1 text-xs text-navy-900/55">
              The tracking page this customer sees.
            </p>
            <Link
              href={`/order/${order.trackingToken}`}
              target="_blank"
              className="mt-2 block break-all text-xs font-medium text-royal hover:underline"
            >
              /order/{order.trackingToken}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
