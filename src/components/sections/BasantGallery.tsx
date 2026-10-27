import { Reveal } from '@/components/ui/Reveal';

export interface GalleryImage {
  url: string;
  alt: string;
  caption?: string;
}

/**
 * Section G — the Basant gallery.
 *
 * Renders nothing until real photographs are configured (the `gallery.images`
 * setting, a JSON array of `{ url, alt, caption }`). An empty gallery of
 * invented or stock "Lahore rooftop" images would be presenting pictures that
 * are not this business's own, so the section simply stays out of the page
 * until the owner uploads theirs.
 *
 * Horizontal scrolling is native CSS scroll-snap rather than a hijacked wheel
 * handler: it works with a trackpad, a touch swipe, a scrollbar drag and the
 * keyboard, all of which a custom implementation tends to break.
 */
export function BasantGallery({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) return null;

  return (
    <section className="bg-cream py-20 sm:py-28" aria-labelledby="gallery-heading">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-royal">
            From the rooftops
          </p>
          <h2 id="gallery-heading" className="mt-3 text-display-sm">
            Basant Gallery
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-900/65">
            Scroll sideways through the season.
          </p>
        </Reveal>
      </div>

      <div className="mask-x mt-10">
        <ul
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc((100vw-86rem)/2+2.5rem))] pb-5"
          // A horizontally scrollable region must be reachable and operable by
          // keyboard, which requires it to be focusable and labelled.
          tabIndex={0}
          role="region"
          aria-label="Basant photo gallery, scroll horizontally"
        >
          {images.map((image, index) => (
            <li
              key={`${image.url}-${index}`}
              className="group relative w-[78vw] shrink-0 snap-center overflow-hidden rounded-3xl bg-navy-900/5 sm:w-[46vw] lg:w-[30rem]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {image.caption && (
                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent p-5 text-sm font-medium text-cream">
                  {image.caption}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
