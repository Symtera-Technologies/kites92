import type { Metadata } from 'next';
import { ContentPage } from '@/components/layout/ContentPage';
import { formatPkr } from '@/lib/commerce/money';
import { tryDeliveryZones, getSettings } from '@/lib/commerce/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Delivery & Charges',
  description:
    'Where Kites92 delivers, what it costs, and which cities support cash on delivery.',
  alternates: { canonical: '/delivery' },
};

export default async function DeliveryPage() {
  const [zones, settings] = await Promise.all([tryDeliveryZones(), getSettings()]);
  const rows = zones.ok ? zones.data : [];

  // Grouped so a customer scans to their province first, as they would on a form.
  const byProvince = rows.reduce<Record<string, typeof rows>>((acc, zone) => {
    (acc[zone.province] ??= []).push(zone);
    return acc;
  }, {});

  return (
    <ContentPage
      title="Delivery & Charges"
      intro="Charges depend on your city. This table is the same data the checkout uses, so what you see here is what you will be charged."
    >
      {settings['delivery.note'] && <p>{settings['delivery.note']}</p>}

      {/* An outage must not read as "we deliver nowhere" - on a page whose
          whole promise is that this table matches the checkout, that is the
          most damaging thing it could say. */}
      {!zones.ok ? (
        <p className="rounded-2xl border border-dashed border-festival/50 bg-festival/5 p-5 text-center text-sm">
          We can’t load the delivery table right now, which is a fault at our
          end rather than a change to where we deliver. Please try again shortly,
          or message us and we’ll confirm your charge directly.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-navy-900/20 p-5 text-center text-sm">
          No delivery areas are configured yet. Please contact us to check whether we
          can deliver to you.
        </p>
      ) : (
        Object.entries(byProvince).map(([province, provinceZones]) => (
          <section key={province}>
            <h2>{province}</h2>
            <div className="overflow-x-auto rounded-2xl border border-navy-900/10 bg-white">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="border-b border-navy-900/10 text-left text-xs uppercase tracking-wider text-navy-900/50">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-bold">City</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Charge</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Free over</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">COD</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-900/8">
                  {provinceZones.map((zone) => (
                    <tr key={zone.id}>
                      <td className="px-4 py-2.5 font-medium">{zone.city}</td>
                      <td className="tnum px-4 py-2.5">
                        {zone.feeRs === 0 ? 'Free' : formatPkr(zone.feeRs)}
                      </td>
                      <td className="tnum px-4 py-2.5 text-navy-900/65">
                        {zone.freeOverRs != null ? formatPkr(zone.freeOverRs) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {zone.codAvailable ? (
                          <span className="font-semibold text-emerald-700">Yes</span>
                        ) : (
                          <span className="text-navy-900/50">Bank transfer only</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-navy-900/65">
                        {zone.estimateDays ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <h2>Not listed?</h2>
      <p>
        Only cities in this table can be selected at checkout. If yours is missing,
        message us on WhatsApp — we may still be able to arrange something, but we
        would rather tell you honestly than take an order we cannot deliver.
      </p>

      <h2>Packing</h2>
      <p>
        Paper kites crease and tear easily, so orders are packed flat. For larger
        orders we recommend adding a carry bag, which keeps the sails from being
        damaged between the courier and your roof.
      </p>

      <h2>Payment on delivery</h2>
      <p>
        Where cash on delivery is available, please have the exact total ready for the
        courier. Where it is not, the order is confirmed by bank transfer — see the{' '}
        <a href="/returns">refunds page</a> for what happens if something goes wrong.
      </p>
    </ContentPage>
  );
}
