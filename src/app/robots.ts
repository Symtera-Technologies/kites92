import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kites92.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private, per-visitor or transactional routes. `/order/` in particular
      // holds customer names, phone numbers and addresses behind an
      // unguessable token — it must never be crawled.
      disallow: ['/admin', '/admin/', '/account', '/account/', '/cart', '/checkout', '/order/', '/api/', '/search'],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
