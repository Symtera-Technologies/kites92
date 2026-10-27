import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';

export interface Testimonial {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  product: { name: string; slug: string } | null;
}

/**
 * Section H — customer reviews.
 *
 * Renders only genuine, staff-approved reviews from the database, and
 * disappears entirely when there are none. Seeding plausible-sounding
 * testimonials is the easiest thing in the world to do and would mean putting
 * words in the mouths of customers who do not exist — so this section starts
 * empty and fills up as real people review their orders.
 */
export function Testimonials({ reviews }: { reviews: Testimonial[] }) {
  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-sky/25 via-cream to-cream py-20 sm:py-28"
      aria-labelledby="reviews-heading"
    >
      <div className="shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-festival">
            From our customers
          </p>
          <h2 id="reviews-heading" className="mt-3 text-display-sm">
            What flyers say
          </h2>
          <p className="tnum mt-3 text-navy-900/65">
            <span className="text-basant-500" aria-hidden>
              {'★'.repeat(Math.round(average))}
            </span>{' '}
            {average.toFixed(1)} average from {reviews.length}{' '}
            {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <Reveal as="li" key={review.id} delay={index * 70}>
              <figure className="flex h-full flex-col rounded-3xl border border-navy-900/10 bg-white p-6 shadow-card transition-transform duration-300 hover:-translate-y-1">
                <span className="text-basant-500" aria-label={`${review.rating} out of 5 stars`}>
                  {'★'.repeat(review.rating)}
                  <span className="text-navy-900/15">{'★'.repeat(5 - review.rating)}</span>
                </span>

                <blockquote className="mt-3 flex-1">
                  {review.title && (
                    <p className="font-display font-bold text-navy-900">{review.title}</p>
                  )}
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-900/75">{review.body}</p>
                </blockquote>

                <figcaption className="mt-4 border-t border-navy-900/8 pt-3 text-xs">
                  <span className="font-bold text-navy-900">{review.authorName}</span>
                  {review.product && (
                    <>
                      <span className="text-navy-900/40"> on </span>
                      <Link
                        href={`/product/${review.product.slug}`}
                        className="font-semibold text-royal hover:underline"
                      >
                        {review.product.name}
                      </Link>
                    </>
                  )}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
