import Link from 'next/link';

/**
 * The result of the last catalogue action, named by a `?notice=` code.
 *
 * The codes are a closed set defined here, so a value in the URL can only
 * ever select one of these sentences — it can never put its own text on the
 * page. Anything unrecognised renders nothing.
 */
const NOTICES: Record<string, { tone: 'ok' | 'bad'; text: string }> = {
  // Products
  created: { tone: 'ok', text: 'Product created as a draft. Add photographs and at least one variant, then publish.' },
  saved: { tone: 'ok', text: 'Saved. The storefront is already showing the change.' },
  'saved-slug-changed': {
    tone: 'ok',
    text: 'Saved, and the web address changed. Any link or printed QR code pointing at the old address will now 404.',
  },
  invalid: { tone: 'bad', text: 'Check the name and price: a name of at least two characters and a price of at least Rs. 1 are required.' },
  'no-variants': {
    tone: 'bad',
    text: 'Not published: this product has no active variant, so its page would have no price and a dead buy button. Add one below first.',
  },
  'compare-price': {
    tone: 'bad',
    text: 'Not saved: the “was” price has to be higher than the asking price, or the struck-through figure advertises a discount that is not real.',
  },
  'slug-impossible': {
    tone: 'bad',
    text: 'Not saved: the web address needs at least one Latin letter or digit. An Urdu-only name needs a slug typed in as well.',
  },
  'tawa-size': { tone: 'bad', text: 'Not saved: tawa size has to be a positive number, for example 0.75, 1 or 1.5.' },
  'confirm-mismatch': { tone: 'bad', text: 'Nothing was deleted — the web address you typed did not match.' },
  gone: { tone: 'bad', text: 'That product no longer exists.' },
  noop: { tone: 'ok', text: 'That photograph is already at the end of the row.' },

  // Images
  'image-added': { tone: 'ok', text: 'Photograph added. It is live on the storefront now.' },
  'image-alt-saved': { tone: 'ok', text: 'Description saved.' },
  'image-moved': { tone: 'ok', text: 'Order changed. The first photograph is the one used on cards and in link previews.' },
  'image-deleted': { tone: 'ok', text: 'Photograph deleted, both the record and the file.' },
  'alt-required': {
    tone: 'bad',
    text: 'A description of at least four characters is required. It is what a screen reader reads out and what Google indexes, so it cannot be skipped.',
  },
  'upload-empty': { tone: 'bad', text: 'No file was chosen.' },
  'upload-too-large': { tone: 'bad', text: 'That image is over 6 MB. Resize it — a 1600px-wide JPEG or WebP is plenty for this site.' },
  'upload-not-image': {
    tone: 'bad',
    text: 'That file is not a JPEG, PNG, WebP or AVIF image. SVG is refused on purpose: an SVG served from this domain can run scripts in a visitor’s browser.',
  },
  'upload-write-failed': {
    tone: 'bad',
    text: 'The file could not be written to the uploads folder. On cPanel this is almost always a permissions problem — see the server log for the path it tried.',
  },

  // Variants
  'variant-added': { tone: 'ok', text: 'Variant added.' },
  'variant-saved': { tone: 'ok', text: 'Variant saved.' },
  'variant-deleted': { tone: 'ok', text: 'Variant deleted. Past orders keep their own copy of the label and price.' },
  'variant-hidden': { tone: 'ok', text: 'Variant hidden from the storefront. It still exists, and its SKU is still taken.' },
  'variant-shown': { tone: 'ok', text: 'Variant is back on the storefront.' },
  'variant-invalid': {
    tone: 'bad',
    text: 'Check the variant: a label, a price of at least Rs. 1 and a whole-number stock count are required. A colour, if given, must be a six-digit hex such as #1f3a93.',
  },
  'variant-last': {
    tone: 'bad',
    text: 'Not deleted: this is the only way to buy a published product. Unpublish the product first, or hide the variant instead.',
  },
  'variant-last-hide': {
    tone: 'bad',
    text: 'Not hidden: it is the only way to buy a published product, and hiding it would leave a live page with nothing to add to a basket. Set the product to Draft instead.',
  },
  'sku-taken': { tone: 'bad', text: 'That SKU belongs to another variant. SKUs are unique across the whole catalogue, including hidden and draft products.' },
  'sku-invalid': { tone: 'bad', text: 'That SKU came out empty. Type one in.' },

  // List page
  deleted: { tone: 'ok', text: 'Product deleted.' },
  'deleted-from-bundles': {
    tone: 'ok',
    text: 'Product deleted. It was part of one or more bundles, which are now short an item — check their prices.',
  },
};

/**
 * `dismissTo` is the URL the × returns to: the same page without the notice,
 * so a refresh does not reprint a message about something that already
 * happened.
 */
export function Notice({ code, dismissTo }: { code?: string; dismissTo: string }) {
  const notice = code ? NOTICES[code] : undefined;
  if (!notice) return null;

  const ok = notice.tone === 'ok';

  return (
    <div
      role="status"
      className={`mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-vibrant/30 bg-vibrant/5 text-vibrant-600'
      }`}
    >
      <span aria-hidden className="mt-0.5 font-bold">
        {ok ? '✓' : '!'}
      </span>
      <p className="flex-1">{notice.text}</p>
      <Link
        href={dismissTo}
        aria-label="Dismiss"
        className="shrink-0 rounded px-1 font-bold opacity-50 hover:opacity-100"
      >
        ×
      </Link>
    </div>
  );
}
