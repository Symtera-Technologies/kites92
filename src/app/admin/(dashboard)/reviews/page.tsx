import { db } from '@/lib/db';
import { deleteReview, setReviewApproval } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reviews' };

/**
 * Review moderation.
 *
 * Reviews are hidden until approved here, which is what keeps the storefront's
 * claim — that every review shown is a genuine one — true. Nothing in the seed
 * or the codebase ever creates a review; they can only arrive from customers.
 */
export default async function AdminReviewsPage() {
  const [pending, approved] = await Promise.all([
    db.review.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        product: { select: { name: true } },
        user: { select: { email: true } },
      },
    }),
    db.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold">Reviews</h1>
      <p className="mt-2 text-sm text-navy-900/60">
        Nothing appears on the storefront until you approve it.
      </p>

      <section className="mt-7">
        <h2 className="font-display text-lg font-bold">
          Awaiting approval
          <span className="tnum ml-2 text-sm font-normal text-navy-900/50">
            ({pending.length})
          </span>
        </h2>

        {pending.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-navy-900/20 px-5 py-10 text-center text-sm text-navy-900/55">
            Nothing waiting. New customer reviews will land here.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((review) => (
              <li key={review.id} className="rounded-2xl border border-festival/30 bg-festival/5 p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-basant-500" aria-label={`${review.rating} out of 5`}>
                    {'★'.repeat(review.rating)}
                    <span className="text-navy-900/20">{'★'.repeat(5 - review.rating)}</span>
                  </span>
                  <span className="font-bold">{review.authorName}</span>
                  <span className="text-xs text-navy-900/50">on {review.product.name}</span>
                  {review.user?.email && (
                    <span className="text-xs text-navy-900/40">({review.user.email})</span>
                  )}
                  <span className="ml-auto text-xs text-navy-900/45">
                    {review.createdAt.toLocaleDateString('en-GB')}
                  </span>
                </div>

                {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
                <p className="mt-1 text-sm leading-relaxed text-navy-900/80">{review.body}</p>

                <div className="mt-4 flex gap-2">
                  <form action={setReviewApproval}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="approve" value="1" />
                    <button
                      type="submit"
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={deleteReview}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-navy-900/15 px-4 py-2 text-xs font-bold text-navy-900/70 hover:border-vibrant hover:text-vibrant"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold">
          Published
          <span className="tnum ml-2 text-sm font-normal text-navy-900/50">
            ({approved.length})
          </span>
        </h2>

        {approved.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-navy-900/20 px-5 py-10 text-center text-sm text-navy-900/55">
            No published reviews yet. The testimonials section on the homepage stays
            hidden until there is at least one.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {approved.map((review) => (
              <li
                key={review.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-navy-900/10 bg-white px-5 py-3"
              >
                <span className="text-basant-500 text-sm" aria-label={`${review.rating} out of 5`}>
                  {'★'.repeat(review.rating)}
                </span>
                <span className="text-sm font-semibold">{review.authorName}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-navy-900/60">
                  {review.title ?? review.body}
                </span>
                <form action={setReviewApproval}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="approve" value="0" />
                  <button
                    type="submit"
                    className="rounded-full border border-navy-900/15 px-3 py-1.5 text-xs font-bold text-navy-900/65 hover:border-navy-900/35 hover:text-navy-900"
                  >
                    Unpublish
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
