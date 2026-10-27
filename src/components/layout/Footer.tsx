import Link from 'next/link';
import { getSettings } from '@/lib/commerce/queries';
import { Wordmark } from '@/components/ui/Wordmark';
import { cn, whatsappLink } from '@/lib/utils';

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { href: '/shop', label: 'All Products' },
      { href: '/shop?category=traditional-kites', label: 'Traditional Kites' },
      { href: '/shop?category=dor-string', label: 'Dor & Pinna' },
      { href: '/shop?category=charkhi-spools', label: 'Charkhi & Spools' },
      { href: '/collections/basant-bundles', label: 'Basant Bundles' },
      { href: '/bundle-builder', label: 'Build Your Bundle' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { href: '/track', label: 'Track Your Order' },
      { href: '/account', label: 'Your Account' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/delivery', label: 'Delivery & Charges' },
      { href: '/returns', label: 'Refunds & Returns' },
    ],
  },
  {
    heading: 'About',
    links: [
      { href: '/about', label: 'Our Story' },
      { href: '/safety', label: 'Safety & Compliance' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
];

interface FooterProps {
  /**
   * Remove the gap above the footer, for a page that already ends in a
   * full-bleed band.
   *
   * The default `mt-24` is right for a page that ends in ordinary content —
   * it keeps the last paragraph off the footer rule. But `body` is cream, so
   * on a page closing with a full-width dark section that margin renders as a
   * pale stripe between two dark blocks, which reads as a layout bug. Only
   * the page knows how it ends, so the page decides.
   */
  flush?: boolean;
}

/**
 * Site footer.
 *
 * Contact details, payment terms and the safety notice are read from the
 * `Setting` table rather than written into this component. They are claims
 * about how the business operates, and the owner has to be able to correct
 * them without a code change.
 */
export async function Footer({ flush = false }: FooterProps = {}) {
  const settings = await getSettings();

  const storeName = settings['store.name'] ?? 'Kites92';
  const phone = settings['store.phone'];
  const email = settings['store.email'];
  const address = settings['store.address'];
  const whatsapp = settings['whatsapp.number'];
  const safetyNotice = settings['notice.safety'];
  const salesGate = settings['notice.salesGate'];

  return (
    <footer
      className={cn(
        'border-t border-navy-900/10 bg-navy-900 text-cream/80',
        !flush && 'mt-24',
      )}
    >
      {salesGate && (
        <div className="border-b border-cream/10 bg-navy-950">
          <p className="shell py-3.5 text-center text-xs leading-relaxed text-cream/70">
            {salesGate}
          </p>
        </div>
      )}

      <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Wordmark className="text-3xl" on="dark" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            {settings['store.tagline'] ?? 'Let Your Happiness Fly!'} Traditional kites,
            charkhi and festival collections, delivered across supported areas.
          </p>

          <ul className="mt-5 space-y-2 text-sm">
            {address && <li>{address}</li>}
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-basant">
                  {phone}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="hover:text-basant">
                  {email}
                </a>
              </li>
            )}
          </ul>

          {whatsapp && (
            <a
              href={whatsappLink(whatsapp, settings['whatsapp.greeting'])}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#06310F] transition-transform hover:-translate-y-0.5"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .7.5l.9 2.1c.1.2.1.4 0 .6l-.4.5-.3.4c-.1.1-.2.3 0 .5.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.4.2.1.4.1.5-.1l.8-.9c.2-.2.3-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.3Z" />
              </svg>
              Chat on WhatsApp
            </a>
          )}
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-cream">
              {column.heading}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-basant">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {safetyNotice && (
        <div className="border-t border-cream/10">
          <p className="shell py-5 text-xs leading-relaxed text-cream/60">
            <strong className="font-semibold text-cream/85">Safety:</strong> {safetyNotice}
          </p>
        </div>
      )}

      <div className="border-t border-cream/10">
        <div className="shell flex flex-col items-center justify-between gap-2 py-5 text-xs text-cream/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <p>Prices in Pakistani Rupees (PKR).</p>
        </div>
      </div>
    </footer>
  );
}
