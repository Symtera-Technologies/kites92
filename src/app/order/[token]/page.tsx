import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { db } from '@/lib/db';
import { formatPkr, roundRs } from '@/lib/commerce/money';
import { getSettings } from '@/lib/commerce/queries';
import { whatsappLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Order',
  // Contains a customer's name, phone and address. Never index it.
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

/** Order lifecycle, in the sequence a customer experiences it. */
const TIMELINE = [
  { status: 'PENDING_PAYMENT', label: 'Order placed', hint: 'We have your order' },
  { status: 'CONFIRMED', label: 'Confirmed', hint: 'Payment verified' },
  { status: 'PACKED', label: 'Packed', hint: 'Kites packed flat and ready' },
  { status: 'DISPATCHED', label: 'Dispatched', hint: 'On the way to you' },
  { status: 'DELIVERED', label: 'Delivered', hint: 'Enjoy the sky!' },
] as const;

export default async function OrderPage({ params }: { params: Params }) {
  const { token } = await params;

  /**
   * Looked up by the unguessable tracking token, never by order number.
   *
   * Order numbers are short and shown to the customer, so they are guessable;
   * the 128-bit token is what authorises seeing someone's name, phone number
   * and home address without logging in.
   */
  const order = await db.order.findUnique({
    where: { trackingToken: token },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      createdAt: true,
      customerName: true,
      customerPhone: true,
      province: true,
      city: true,
      area: true,
      line1: true,
      line2: true,
      postalCode: true,
      subtotalRs: true,
      discountRs: true,
      shippingRs: true,
      totalRs: true,
      amountPaidRs: true,
      couponCode: true,
      customerNote: true,
      items: {
        select: {
          id: true,
          productName: true,
          variantLabel: true,
          unitPriceRs: true,
          quantity: true,
          lineTotalRs: true,
        },
      },
    },
  });

  if (!order) notFound();

  const settings = await getSettings();
  const whatsapp = settings['whatsapp.number'] ?? '';
  const advancePercent = Number(settings['payment.advancePercent'] ?? 50);
  const advanceDueRs = roundRs((order.totalRs * advancePercent) / 100);

  const cancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const currentStep = TIMELINE.findIndex((step) => step.status === order.status);

  const whatsappMessage = `Assalam-o-Alaikum! This is about order ${order.orderNumber}. I am sending the payment receipt.`;

  return (
    <>
      <Header />

      <main id="main" className="pt-[var(--nav-h)]">
        <div className="shell max-w-4xl py-10">
          <div className="rounded-3xl bg-basant-sweep p-[2px]">
            <div className="rounded-[calc(1.5rem-1px)] bg-cream px-6 py-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-navy-900/55">
                Thank you
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
                Order {order.orderNumber}
              </h1>
              <p className="mt-2 text-navy-900/65">
                Placed on{' '}
                {order.createdAt.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-4 text-sm text-navy-900/60">
                Save this page — the link is how you check your order without an account.
              </p>
            </div>
          </div>

          {/* ── Next action, stated plainly ── */}
          {order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus === 'UNPAID' && (
            <div className="mt-6 rounded-3xl border border-festival/40 bg-festival/10 p-5">
              <h2 className="font-display text-lg font-bold">One more step</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-900/80">
                Send the {advancePercent}% advance of{' '}
                <strong className="tnum">{formatPkr(advanceDueRs)}</strong> to the account
                below, then share the receipt on WhatsApp with your order number. Your
                order is confirmed once we receive it.
              </p>
              <dl className="mt-4 grid gap-1 rounded-2xl bg-white/70 p-4 text-sm sm:grid-cols-2">
                <div className="flex gap-2"><dt className="text-navy-900/50">Bank</dt><dd className="font-semibold">{settings['payment.bankName']}</dd></div>
                <div className="flex gap-2"><dt className="text-navy-900/50">Title</dt><dd className="font-semibold">{settings['payment.accountTitle']}</dd></div>
                <div className="flex gap-2 sm:col-span-2"><dt className="text-navy-900/50">Account</dt><dd className="tnum font-semibold">{settings['payment.accountNumber']}</dd></div>
              </dl>
              {whatsapp && (
                <a
                  href={whatsappLink(whatsapp, whatsappMessage)}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#06310F]"
                >
                  Send receipt on WhatsApp
                </a>
              )}
            </div>
          )}

          {order.paymentMethod === 'COD' && order.status === 'PENDING_PAYMENT' && (
            <div className="mt-6 rounded-3xl border border-sky/40 bg-sky/10 p-5">
              <h2 className="font-display text-lg font-bold">Cash on delivery</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-900/80">
                We will call or message{' '}
                <strong className="tnum">{order.customerPhone}</strong> to confirm this
                order before dispatch. Please keep{' '}
                <strong className="tnum">{formatPkr(order.totalRs)}</strong> ready for the
                courier.
              </p>
            </div>
          )}

          {/* ── Progress ── */}
          {!cancelled && (
            <section className="mt-8" aria-label="Order progress">
              <ol className="grid gap-3 sm:grid-cols-5">
                {TIMELINE.map((step, index) => {
                  const done = currentStep >= 0 && index <= currentStep;
                  const active = index === currentStep;
                  return (
                    <li
                      key={step.status}
                      className={`rounded-2xl border p-3 text-center ${
                        active
                          ? 'border-royal bg-royal/10'
                          : done
                            ? 'border-emerald-600/30 bg-emerald-50'
                            : 'border-navy-900/10 bg-white'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          done ? 'bg-emerald-600 text-white' : 'bg-navy-900/10 text-navy-900/50'
                        }`}
                      >
                        {done ? '✓' : index + 1}
                      </span>
                      <p className="mt-2 text-xs font-bold">{step.label}</p>
                      <p className="mt-0.5 text-[0.68rem] leading-tight text-navy-900/55">
                        {step.hint}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {cancelled && (
            <div className="mt-6 rounded-3xl border border-navy-900/15 bg-navy-900/5 p-5">
              <h2 className="font-display text-lg font-bold">
                This order was {order.status === 'REFUNDED' ? 'refunded' : 'cancelled'}
              </h2>
              <p className="mt-2 text-sm text-navy-900/70">
                Contact us on WhatsApp if you think this is a mistake.
              </p>
            </div>
          )}

          {/* ── Items and totals ── */}
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="rounded-3xl border border-navy-900/10 bg-white">
              <h2 className="border-b border-navy-900/10 px-5 py-4 font-display text-lg font-bold">
                Items
              </h2>
              <ul className="divide-y divide-navy-900/8">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
                    <span className="min-w-0">
                      <span className="block font-semibold">{item.productName}</span>
                      {item.variantLabel && (
                        <span className="block text-xs text-navy-900/50">{item.variantLabel}</span>
                      )}
                      <span className="tnum text-xs text-navy-900/50">
                        {formatPkr(item.unitPriceRs)} × {item.quantity}
                      </span>
                    </span>
                    <span className="tnum shrink-0 font-semibold">{formatPkr(item.lineTotalRs)}</span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-2 border-t border-navy-900/10 px-5 py-4 text-sm">
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
                  <dd className="tnum">
                    {order.shippingRs === 0 ? 'Free' : formatPkr(order.shippingRs)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-navy-900/10 pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="tnum font-display">{formatPkr(order.totalRs)}</dd>
                </div>
                {order.amountPaidRs > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Paid so far</dt>
                    <dd className="tnum font-semibold">{formatPkr(order.amountPaidRs)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <aside className="rounded-3xl border border-navy-900/10 bg-white p-5 text-sm">
              <h2 className="font-display text-base font-bold">Delivering to</h2>
              <address className="mt-3 not-italic leading-relaxed text-navy-900/75">
                {order.customerName}
                <br />
                <span className="tnum">{order.customerPhone}</span>
                <br />
                {order.line1}
                {order.line2 && <><br />{order.line2}</>}
                {order.area && <><br />{order.area}</>}
                <br />
                {order.city}, {order.province}
                {order.postalCode && <><br /><span className="tnum">{order.postalCode}</span></>}
              </address>

              {order.customerNote && (
                <>
                  <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-navy-900/55">
                    Your note
                  </h3>
                  <p className="mt-1 text-navy-900/70">{order.customerNote}</p>
                </>
              )}
            </aside>
          </section>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="btn-ghost">Continue shopping</Link>
            {whatsapp && (
              <a
                href={whatsappLink(whatsapp, `Hello! A question about order ${order.orderNumber}.`)}
                target="_blank" rel="noopener noreferrer"
                className="btn-ghost"
              >
                Contact support
              </a>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
