import { getSettings } from '@/lib/commerce/queries';
import { clearSampleDataFlag, updateSettings } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

/**
 * Store settings.
 *
 * Everything the storefront says about this business — contact details, bank
 * account, delivery promises, the Basant sales notice, the safety statement —
 * is edited here rather than written into components. The site should never
 * make a claim the owner cannot change.
 */
interface FieldSpec {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
}

const GROUPS: { heading: string; blurb?: string; fields: FieldSpec[] }[] = [
  {
    heading: 'Store',
    fields: [
      { key: 'store.name', label: 'Store name' },
      { key: 'store.tagline', label: 'Tagline' },
      { key: 'store.email', label: 'Contact email' },
      { key: 'store.phone', label: 'Contact phone' },
      { key: 'store.address', label: 'Address' },
    ],
  },
  {
    heading: 'WhatsApp',
    blurb: 'International format, digits only — no plus sign, spaces or dashes.',
    fields: [
      { key: 'whatsapp.number', label: 'WhatsApp number', hint: 'e.g. 923001234567' },
      { key: 'whatsapp.greeting', label: 'Pre-filled message', multiline: true },
    ],
  },
  {
    heading: 'Payment',
    blurb:
      'These bank details are shown to every customer who chooses bank transfer. Check them carefully.',
    fields: [
      { key: 'payment.advancePercent', label: 'Advance required (%)', hint: 'Typically 50' },
      { key: 'payment.bankName', label: 'Bank name' },
      { key: 'payment.accountTitle', label: 'Account title' },
      { key: 'payment.accountNumber', label: 'Account number / IBAN' },
      { key: 'payment.instructions', label: 'Payment instructions', multiline: true },
    ],
  },
  {
    heading: 'Notices',
    blurb:
      'Shown site-wide. The sales notice appears above the footer; the safety notice inside it.',
    fields: [
      { key: 'notice.salesGate', label: 'Sales / legal notice', multiline: true },
      { key: 'notice.safety', label: 'Safety notice', multiline: true },
      { key: 'delivery.note', label: 'Delivery note', multiline: true },
      { key: 'returns.policy', label: 'Refunds & returns', multiline: true },
    ],
  },
  {
    heading: 'Homepage content',
    blurb:
      'Both fields take JSON. Leave them blank to use the built-in defaults (reasons) or to hide the section entirely (gallery).',
    fields: [
      {
        key: 'why.reasons',
        label: 'Why Kites92 — reasons',
        hint: '[{"title":"...","body":"..."}]',
        multiline: true,
      },
      {
        key: 'gallery.images',
        label: 'Basant gallery images',
        hint: '[{"url":"/uploads/roof.jpg","alt":"...","caption":"..."}]',
        multiline: true,
      },
    ],
  },
];

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const isSample = settings['catalogue.sampleData'] === 'true';

  const field =
    'w-full rounded-xl border border-navy-900/15 bg-white px-3.5 py-2.5 text-sm focus:border-royal focus:outline-none';

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold">Settings</h1>
      <p className="mt-2 text-sm text-navy-900/60">
        These values appear on the live storefront as soon as you save.
      </p>

      {isSample && (
        <section className="mt-6 rounded-2xl border border-festival/40 bg-festival/10 p-5">
          <h2 className="font-display text-base font-bold">Sample catalogue notice</h2>
          <p className="mt-1.5 text-sm text-navy-900/75">
            A banner is showing across the admin because the catalogue still contains
            seeded sample data. Clear it once your real products, prices and the
            payment details above are in place.
          </p>
          <form action={clearSampleDataFlag} className="mt-3">
            <button type="submit" className="btn-ghost px-4 py-2 text-xs">
              I have replaced the sample data
            </button>
          </form>
        </section>
      )}

      <form action={updateSettings} className="mt-6 space-y-6">
        {GROUPS.map((group) => (
          <fieldset key={group.heading} className="rounded-2xl border border-navy-900/10 bg-white p-5">
            <legend className="px-2 font-display text-lg font-bold">{group.heading}</legend>
            {group.blurb && (
              <p className="mb-4 text-sm text-navy-900/60">{group.blurb}</p>
            )}

            <div className="space-y-4">
              {group.fields.map((spec) => (
                <div key={spec.key}>
                  <label
                    htmlFor={spec.key}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy-900/55"
                  >
                    {spec.label}
                  </label>
                  {spec.multiline ? (
                    <textarea
                      id={spec.key}
                      name={`setting:${spec.key}`}
                      rows={3}
                      defaultValue={settings[spec.key] ?? ''}
                      className={field}
                    />
                  ) : (
                    <input
                      id={spec.key}
                      name={`setting:${spec.key}`}
                      defaultValue={settings[spec.key] ?? ''}
                      className={field}
                    />
                  )}
                  {spec.hint && (
                    <p className="mt-1 font-mono text-xs text-navy-900/45">{spec.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="sticky bottom-4">
          <button type="submit" className="btn-primary w-full py-3.5 shadow-lift">
            Save all settings
          </button>
        </div>
      </form>
    </div>
  );
}
